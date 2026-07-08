import logging
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from app.core.config import settings

logger = logging.getLogger(__name__)

# Single source of truth for the embedding model used everywhere.
# Changing this one constant keeps indexing and querying in sync automatically.
EMBEDDING_MODEL = "models/gemini-embedding-2"


class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or ""

        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set – embedding / LLM calls will fail.")

        # LLM for chat / agent reasoning
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=self.api_key,
            temperature=0.2,
        )

        # Embeddings – MUST be the same model for both indexing and querying.
        self.embedding_model_name = EMBEDDING_MODEL
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=self.embedding_model_name,
            google_api_key=self.api_key,
        )

        # Detect the actual vector dimension by embedding a probe string once.
        # This avoids every hardcoded dimension being wrong when the model changes.
        try:
            probe = self.embeddings.embed_query("dimension probe")
            self.embedding_dim = len(probe)
            logger.info(
                "Embedding model: %s  |  vector dimension: %d",
                self.embedding_model_name,
                self.embedding_dim,
            )
        except Exception as e:
            logger.error(
                "Could not probe embedding dimension for model %s: %s",
                self.embedding_model_name,
                e,
            )
            raise ValueError(f"Failed to probe embedding dimension for {self.embedding_model_name}: {e}")

    def get_embeddings(self, text: str) -> list[float]:
        vector = self.embeddings.embed_query(text)
        logger.debug(
            "get_embeddings: model=%s  dim=%d", self.embedding_model_name, len(vector)
        )
        return vector

    def get_batch_embeddings(self, texts: list[str]) -> list[list[float]]:
        vectors = self.embeddings.embed_documents(texts)
        if vectors:
            logger.debug(
                "get_batch_embeddings: model=%s  batch=%d  dim=%d",
                self.embedding_model_name,
                len(vectors),
                len(vectors[0]),
            )
        return vectors


gemini_service = GeminiService()
