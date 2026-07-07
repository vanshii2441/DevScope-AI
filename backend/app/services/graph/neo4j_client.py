from neo4j import GraphDatabase
from app.core.config import settings

class GraphStore:
    def __init__(self):
        self.driver = None
        if settings.NEO4J_URI and settings.NEO4J_USERNAME and settings.NEO4J_PASSWORD:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
            )

    def close(self):
        if self.driver:
            self.driver.close()

    def execute_write(self, query: str, parameters: dict = None):
        if not self.driver:
            return None
        with self.driver.session() as session:
            result = session.write_transaction(lambda tx: tx.run(query, parameters).data())
            return result
            
    def execute_read(self, query: str, parameters: dict = None):
        if not self.driver:
            return None
        with self.driver.session() as session:
            result = session.read_transaction(lambda tx: tx.run(query, parameters).data())
            return result

graph_store = GraphStore()
