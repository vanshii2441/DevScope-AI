import os
import uuid
import logging
import tempfile
import subprocess
from pathlib import Path
from qdrant_client.models import PointStruct
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models.repository import RepositoryStatus
from app.core.database import SessionLocal
from app.models.repository import Repository
from app.services.vector.qdrant_client import vector_store
from app.services.graph.neo4j_client import graph_store
from app.services.ai.gemini_service import gemini_service

logger = logging.getLogger(__name__)

IGNORED_DIRS = {".git", "node_modules", "venv", ".venv", "__pycache__", ".next", "dist", "build"}
IGNORED_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf", ".zip", ".tar", ".gz", ".mp4", ".mp3", ".wav"}


def process_repository(repo_id: str):
    """
    Background task to clone, parse, and index a GitHub repository.
    """
    db = SessionLocal()
    repo = db.query(Repository).filter(Repository.id == repo_id).first()

    if not repo:
        db.close()
        return

    try:
        repo.status = RepositoryStatus.INDEXING
        db.commit()

        # ── Log which embedding model / dimension we are using ────────────
        logger.info(
            "[Ingestion] repo_id=%s  embedding_model=%s  vector_dim=%d",
            repo_id,
            gemini_service.embedding_model_name,
            gemini_service.embedding_dim,
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            if repo.url.startswith("local://"):
                import zipfile
                zip_path = repo.url.replace("local://", "")
                logger.info("Extracting %s into %s", zip_path, temp_dir)
                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    zip_ref.extractall(temp_dir)
            else:
                logger.info("Cloning %s into %s", repo.url, temp_dir)
                subprocess.run(
                    ["git", "clone", "--depth", "1", repo.url, temp_dir],
                    check=True,
                    capture_output=True,
                )

            # ── Step 2: Parse files ──────────────────────────────────────
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            all_chunks = []
            file_paths_for_graph = []

            base_path = Path(temp_dir)
            for root, dirs, files in os.walk(base_path):
                dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]

                for file in files:
                    file_path = Path(root) / file
                    if file_path.suffix.lower() in IGNORED_EXTS:
                        continue

                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()

                        relative_path = str(file_path.relative_to(base_path))
                        if not content.strip():
                            continue

                        file_paths_for_graph.append(relative_path)

                        chunks = text_splitter.split_text(content)
                        for chunk in chunks:
                            all_chunks.append({
                                "text": chunk,
                                "file_path": relative_path,
                                "repo_id": repo_id,
                            })

                    except UnicodeDecodeError:
                        continue
                    except Exception as e:
                        logger.warning("Error reading file %s: %s", file_path, e)
                        continue

            logger.info(
                "[Ingestion] repo_id=%s  total_chunks=%d", repo_id, len(all_chunks)
            )

            # ── Step 3: Create / verify Qdrant collection ────────────────
            # Pass the runtime-detected dimension – no hardcoding.
            collection_name = f"repo_{repo_id}"
            
            # Check model consistency on existing collection
            try:
                results = vector_store.client.scroll(
                    collection_name=collection_name,
                    limit=1,
                    with_payload=True,
                    with_vectors=False
                )
                points = results[0]
                if points:
                    existing_model = points[0].payload.get("embedding_model")
                    if existing_model and existing_model != gemini_service.embedding_model_name:
                        logger.warning(
                            "Model mismatch for collection '%s': stored=%s, required=%s. "
                            "Deleting collection to re-index.",
                            collection_name, existing_model, gemini_service.embedding_model_name
                        )
                        vector_store.client.delete_collection(collection_name)
            except Exception:
                pass # collection might not exist, ignore

            vector_store.create_collection(
                collection_name,
                vector_size=gemini_service.embedding_dim,
            )

            # ── Step 4: Embed & upsert in batches ───────────────────────
            BATCH_SIZE = 50
            for i in range(0, len(all_chunks), BATCH_SIZE):
                batch = all_chunks[i : i + BATCH_SIZE]
                texts = [item["text"] for item in batch]

                try:
                    embeddings = gemini_service.get_batch_embeddings(texts)

                    # Validate dimension before building PointStructs
                    for j, vec in enumerate(embeddings):
                        if len(vec) != gemini_service.embedding_dim:
                            raise ValueError(
                                f"Unexpected embedding dim {len(vec)} for chunk {i+j}; "
                                f"expected {gemini_service.embedding_dim}"
                            )

                    points = [
                        PointStruct(
                            id=str(uuid.uuid4()),
                            vector=embeddings[j],
                            payload={
                                "text": item["text"],
                                "file_path": item["file_path"],
                                "repo_id": item["repo_id"],
                                "embedding_model": gemini_service.embedding_model_name,
                            },
                        )
                        for j, item in enumerate(batch)
                    ]
                    vector_store.upsert_vectors(collection_name, points)
                    logger.info(
                        "[Ingestion] Upserted batch %d/%d (%d points)",
                        i // BATCH_SIZE + 1,
                        -(-len(all_chunks) // BATCH_SIZE),
                        len(points),
                    )

                except Exception as e:
                    logger.error("Error generating/upserting embeddings for batch %d: %s", i, e)

            # ── Step 5: Neo4j graph ──────────────────────────────────────
            if graph_store.driver:
                try:
                    graph_store.execute_write(
                        """
                        MERGE (r:Repository {id: $repo_id})
                        SET r.url = $repo_url, r.name = $repo_name
                        """,
                        {"repo_id": repo_id, "repo_url": repo.url, "repo_name": repo.name},
                    )

                    for file_path in file_paths_for_graph:
                        graph_store.execute_write(
                            """
                            MATCH (r:Repository {id: $repo_id})
                            MERGE (f:File {path: $file_path, repo_id: $repo_id})
                            MERGE (r)-[:CONTAINS]->(f)
                            """,
                            {"repo_id": repo_id, "file_path": file_path},
                        )
                except Exception as e:
                    logger.error("Error updating Neo4j graph: %s", e)

        repo.status = RepositoryStatus.COMPLETED
        db.commit()
        logger.info("[Ingestion] repo_id=%s  status=COMPLETED", repo_id)

    except Exception as e:
        logger.error("Failed to process repository %s: %s", repo_id, e)
        repo.status = RepositoryStatus.FAILED
        db.commit()
    finally:
        db.close()
