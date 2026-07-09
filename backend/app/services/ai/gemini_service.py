import logging
import time
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from app.core.config import settings

logger = logging.getLogger(__name__)

class QuotaExceededError(Exception):
    """Raised when the API quota is permanently exceeded."""
    pass

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
            # We must define _with_retries first or just call it if it's defined later
            # Wait, _with_retries is defined below, but we can call it if we pass self.embeddings.embed_query
            probe = self._with_retries(self.embeddings.embed_query, "dimension probe")
            self.embedding_dim = len(probe)
            logger.info(
                "Embedding model: %s  |  vector dimension: %d",
                self.embedding_model_name,
                self.embedding_dim,
            )
        except Exception as e:
            logger.warning(
                "Could not probe embedding dimension for model %s: %s. Falling back to default dimension 768.",
                self.embedding_model_name,
                e,
            )
            self.embedding_dim = 768

    def _with_retries(self, func, *args, **kwargs):
        max_retries = 5
        base_delay = 2
        for attempt in range(max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_msg = str(e).lower()
                if "429" in error_msg or "resource_exhausted" in error_msg or "quota" in error_msg:
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"Rate limit hit (429). Retrying in {delay} seconds... (Attempt {attempt+1}/{max_retries})")
                        time.sleep(delay)
                        continue
                    else:
                        logger.error("API quota permanently exceeded after retries.")
                        raise QuotaExceededError("The Gemini API quota has been exceeded.")
                raise e

    def get_embeddings(self, text: str) -> list[float]:
        vector = self._with_retries(self.embeddings.embed_query, text)
        logger.debug(
            "get_embeddings: model=%s  dim=%d", self.embedding_model_name, len(vector)
        )
        return vector

    def get_batch_embeddings(self, texts: list[str]) -> list[list[float]]:
        vectors = self._with_retries(self.embeddings.embed_documents, texts)
        if vectors:
            logger.debug(
                "get_batch_embeddings: model=%s  batch=%d  dim=%d",
                self.embedding_model_name,
                len(vectors),
                len(vectors[0]),
            )
        return vectors


gemini_service = GeminiService()
