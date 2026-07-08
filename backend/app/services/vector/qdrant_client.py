import logging
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self):
        if settings.QDRANT_URL:
            self.client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
            logger.info("VectorStore: Connected to Qdrant at %s", settings.QDRANT_URL)
        else:
            self.client = QdrantClient(":memory:")
            logger.warning("VectorStore: Using in-memory Qdrant (no QDRANT_URL set)")

    # ------------------------------------------------------------------
    # Collection management
    # ------------------------------------------------------------------

    def _get_collection_vector_size(self, collection_name: str) -> int | None:
        """Return the configured vector size of an existing collection, or None."""
        from qdrant_client.http.exceptions import UnexpectedResponse
        try:
            info = self.client.get_collection(collection_name)
            vectors_config = info.config.params.vectors
            if isinstance(vectors_config, dict):
                # Using the default named vector or the first available
                if "" in vectors_config:
                    size = vectors_config[""].size
                else:
                    size = next(iter(vectors_config.values())).size
            else:
                size = vectors_config.size
                
            logger.info(
                "Collection '%s' already exists with vector_size=%d", collection_name, size
            )
            return size
        except UnexpectedResponse as e:
            if e.status_code == 404:
                return None
            logger.error("Failed to get collection size for '%s': %s", collection_name, e)
            return None
        except Exception as e:
            logger.error("Failed to get collection size for '%s': %s", collection_name, e)
            return None

    def create_collection(self, collection_name: str, vector_size: int):
        """
        Create a Qdrant collection with the given vector_size.

        If the collection already exists:
          - Same dimension  → reuse it (no-op).
          - Wrong dimension → delete and recreate with the correct dimension.
        """
        existing_size = self._get_collection_vector_size(collection_name)

        if existing_size is not None:
            if existing_size == vector_size:
                logger.info(
                    "Collection '%s' already has the correct vector_size=%d – reusing it.",
                    collection_name,
                    vector_size,
                )
                return  # Nothing to do
            else:
                logger.warning(
                    "Dimension mismatch for collection '%s': stored=%d, required=%d. "
                    "Deleting and recreating the collection.",
                    collection_name,
                    existing_size,
                    vector_size,
                )
                self.client.delete_collection(collection_name)

        self.client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        logger.info(
            "Created collection '%s' with vector_size=%d", collection_name, vector_size
        )

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def upsert_vectors(self, collection_name: str, points: list):
        if not points:
            logger.warning("upsert_vectors called with empty points list – skipping.")
            return

        # Validate that every vector matches the collection dimension
        expected_size = self._get_collection_vector_size(collection_name)
        if expected_size is not None:
            for p in points:
                actual = len(p.vector)
                if actual != expected_size:
                    raise ValueError(
                        f"Vector dimension mismatch before upsert: "
                        f"collection '{collection_name}' expects {expected_size} dims, "
                        f"but got {actual} dims."
                    )

        self.client.upsert(collection_name=collection_name, points=points)
        logger.info("Upserted %d vectors into collection '%s'", len(points), collection_name)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def search(self, collection_name: str, query_vector: list, limit: int = 5):
        actual_dim = len(query_vector)
        expected_size = self._get_collection_vector_size(collection_name)
        if expected_size is not None and actual_dim != expected_size:
            raise ValueError(
                f"Vector dimension mismatch during search: "
                f"collection '{collection_name}' expects {expected_size} dims, "
                f"but query vector has {actual_dim} dims."
            )

        logger.info(
            "Searching collection '%s' with query vector of dim=%d, limit=%d",
            collection_name,
            actual_dim,
            limit,
        )
        response = self.client.query_points(
            collection_name=collection_name,
            query=query_vector,
            limit=limit,
            with_payload=True,
        )
        return response.points


vector_store = VectorStore()
