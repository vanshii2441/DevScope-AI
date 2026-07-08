from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
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
    except ValueError as e:
        if "dimension mismatch" in str(e).lower():
            return "Error: The repository was indexed with a different embedding model dimension. Please re-index the repository to fix this issue."
        return f"Error searching codebase: {str(e)}"
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
    
    system_prompt = f"""You are a helpful expert Repository Assistant. 
You are currently helping the user understand and analyze their codebase. 
The current repository ID is: {repo_id}.
Always use the provided tools to search the codebase and understand the architecture before answering the user's questions. 
When using tools, you MUST include the repo_id: '{repo_id}' in your tool calls. 
If the user asks general questions about the repository (e.g., 'how it works', 'architecture'), use the search_codebase tool with broad queries to get started, and formulate a comprehensive response based on the results."""

    messages_with_system = [SystemMessage(content=system_prompt)] + list(messages)
    response = model.invoke(messages_with_system)
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
