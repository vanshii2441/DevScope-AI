from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from app.core.config import settings

class VectorStore:
    def __init__(self):
        # Fallback to local memory if Qdrant URL is missing (for local testing without Qdrant)
        if settings.QDRANT_URL:
            self.client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        else:
            self.client = QdrantClient(":memory:")

    def create_collection(self, collection_name: str, vector_size: int = 768): # 768 is default for Gemini embeddings
        collections = self.client.get_collections()
        if collection_name not in [c.name for c in collections.collections]:
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
            )

    def upsert_vectors(self, collection_name: str, points: list):
        self.client.upsert(
            collection_name=collection_name,
            points=points
        )

    def search(self, collection_name: str, query_vector: list, limit: int = 5):
        return self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit
        )

vector_store = VectorStore()
