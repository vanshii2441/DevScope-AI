from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool

from app.services.ai.gemini_service import gemini_service
from app.services.vector.qdrant_client import vector_store
from app.services.graph.neo4j_client import graph_store

class AgentState(TypedDict):
    messages: Sequence[BaseMessage]
    repo_id: str

@tool
def search_codebase(query: str, repo_id: str) -> str:
    """Search the codebase semantically for relevant code snippets."""
    query_vector = gemini_service.get_embeddings(query)
    try:
        results = vector_store.search(f"repo_{repo_id}", query_vector)
        # Mocking for now since we don't have real ingestion yet
        if not results:
            return "No relevant code snippets found in vector database."
        return str([res.payload for res in results])
    except Exception as e:
        return f"Error searching codebase: {str(e)}"

@tool
def get_architecture_dependencies(file_name: str, repo_id: str) -> str:
    """Get the dependencies and architecture relationships for a specific file."""
    # Mocking for now
    query = "MATCH (f:File {name: $file_name, repo_id: $repo_id})-[:IMPORTS]->(dep) RETURN dep.name"
    results = graph_store.execute_read(query, {"file_name": file_name, "repo_id": repo_id})
    if not results:
         return "No architecture dependencies found."
    return str(results)

tools = [search_codebase, get_architecture_dependencies]
tool_node = ToolNode(tools)

# Bind tools to Gemini
model = gemini_service.llm.bind_tools(tools)

def should_continue(state: AgentState) -> str:
    messages = state["messages"]
    last_message = messages[-1]
    
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return "end"
    return "continue"

def call_model(state: AgentState):
    messages = state["messages"]
    repo_id = state["repo_id"]
    
    # We could inject repo context into the system prompt here
    response = model.invoke(messages)
    return {"messages": [response]}

# Build Graph
workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("action", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "continue": "action",
        "end": END,
    }
)
workflow.add_edge("action", "agent")

app_agent = workflow.compile()
