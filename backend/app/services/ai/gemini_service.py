from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from app.core.config import settings

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or ""
        
        if not self.api_key:
            print("Warning: GEMINI_API_KEY is not set.")
        
        # We use Flash for high speed and large context windows
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=self.api_key,
            temperature=0.2,
        )
        
        # Embeddings for Qdrant
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=self.api_key
        )

    def get_embeddings(self, text: str):
        return self.embeddings.embed_query(text)
        
    def get_batch_embeddings(self, texts: list[str]):
        return self.embeddings.embed_documents(texts)

gemini_service = GeminiService()
