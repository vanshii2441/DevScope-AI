import os
import uuid
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

        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Cloning {repo.url} into {temp_dir}")
            subprocess.run(["git", "clone", "--depth", "1", repo.url, temp_dir], check=True, capture_output=True)
            
            # Step 2: Parse files
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            all_chunks = []
            file_paths_for_graph = []
            
            base_path = Path(temp_dir)
            for root, dirs, files in os.walk(base_path):
                # Filter out ignored directories
                dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
                
                for file in files:
                    file_path = Path(root) / file
                    if file_path.suffix.lower() in IGNORED_EXTS:
                        continue
                        
                    try:
                        # Attempt to read as utf-8
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        
                        relative_path = str(file_path.relative_to(base_path))
                        # Basic empty file check
                        if not content.strip():
                            continue
                            
                        file_paths_for_graph.append(relative_path)
                        
                        # Chunk the document
                        chunks = text_splitter.split_text(content)
                        for chunk in chunks:
                            all_chunks.append({
                                "text": chunk,
                                "file_path": relative_path,
                                "repo_id": repo_id
                            })
                            
                    except UnicodeDecodeError:
                        # Skip binary files that slipped through extension check
                        continue
                    except Exception as e:
                        print(f"Error reading file {file_path}: {e}")
                        continue
            
            # Step 3: Create embeddings & store in Qdrant
            collection_name = f"repo_{repo_id}"
            vector_store.create_collection(collection_name)
            
            # Process in batches to avoid rate limits (e.g., 50 at a time)
            BATCH_SIZE = 50
            for i in range(0, len(all_chunks), BATCH_SIZE):
                batch = all_chunks[i:i + BATCH_SIZE]
                texts = [item["text"] for item in batch]
                
                try:
                    embeddings = gemini_service.get_batch_embeddings(texts)
                    points = []
                    
                    for j, item in enumerate(batch):
                        point_id = str(uuid.uuid4())
                        points.append(
                            PointStruct(
                                id=point_id,
                                vector=embeddings[j],
                                payload={
                                    "text": item["text"],
                                    "file_path": item["file_path"],
                                    "repo_id": item["repo_id"]
                                }
                            )
                        )
                    vector_store.upsert_vectors(collection_name, points)
                except Exception as e:
                    print(f"Error generating embeddings for batch {i}: {e}")

            # Step 4: Extract graph relationships & store in Neo4j
            if graph_store.driver:
                try:
                    # Create Repository node
                    repo_query = """
                    MERGE (r:Repository {id: $repo_id})
                    SET r.url = $repo_url, r.name = $repo_name
                    """
                    graph_store.execute_write(repo_query, {
                        "repo_id": repo_id,
                        "repo_url": repo.url,
                        "repo_name": repo.name
                    })
                    
                    # Create File nodes and relationships
                    for file_path in file_paths_for_graph:
                        file_query = """
                        MATCH (r:Repository {id: $repo_id})
                        MERGE (f:File {path: $file_path, repo_id: $repo_id})
                        MERGE (r)-[:CONTAINS]->(f)
                        """
                        graph_store.execute_write(file_query, {
                            "repo_id": repo_id,
                            "file_path": file_path
                        })
                except Exception as e:
                    print(f"Error updating Neo4j graph: {e}")

        # Mark as completed
        repo.status = RepositoryStatus.COMPLETED
        db.commit()
    except Exception as e:
        print(f"Failed to process repository: {e}")
        repo.status = RepositoryStatus.FAILED
        db.commit()
    finally:
        db.close()
