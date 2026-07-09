from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool

import logging
from app.services.ai.gemini_service import gemini_service, QuotaExceededError
from app.services.vector.qdrant_client import vector_store
from app.services.graph.neo4j_client import graph_store
from app.services.ingestion import process_repository

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    repo_id: str

@tool
def search_codebase(query: str, repo_id: str) -> str:
    """Search the codebase semantically for relevant code snippets."""
    query_vector = gemini_service.get_embeddings(query)
    try:
        results = vector_store.search(f"repo_{repo_id}", query_vector)
        if not results:
            return "No relevant code snippets found in vector database."
        
        # Format results into readable context for the LLM
        formatted_chunks = []
        for i, res in enumerate(results, 1):
            payload = res.payload or {}
            file_path = payload.get("file_path", "unknown file")
            text = payload.get("text", "")
            # Truncate very long chunks to keep context manageable
            if len(text) > 2000:
                text = text[:2000] + "... (truncated)"
            formatted_chunks.append(
                f"--- Result {i} ---\n"
                f"File: {file_path}\n"
                f"Content:\n{text}"
            )
        return "\n\n".join(formatted_chunks)
    except QuotaExceededError as e:
        logger.warning(f"Quota exceeded during codebase search for repo {repo_id}: {e}")
        return "The Gemini API quota has been exceeded. Please notify the user that their embedding quota limits were reached and they should try again later or check their API limits."
    except ValueError as e:
        if "dimension mismatch" in str(e).lower():
            import threading
            logger.warning(f"Dimension mismatch detected for repo {repo_id}. Re-indexing repository in background...")
            try:
                # Start re-indexing in a background thread so we don't block the chat
                thread = threading.Thread(target=process_repository, args=(repo_id,))
                thread.start()
                return "The repository vector database is out of date and requires re-indexing. I have started the indexing process in the background. Please wait a few minutes before asking questions about the codebase."
            except Exception as reindex_error:
                logger.error(f"Failed to start background re-indexing for repo {repo_id}: {reindex_error}")
                return f"Error: Dimension mismatch detected, and failed to start automatic re-indexing: {str(reindex_error)}"
            
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

IMPORTANT RULES:
1. Always use the provided tools to search the codebase and understand the architecture before answering.
2. When using tools, you MUST include the repo_id: '{repo_id}' in your tool calls.
3. NEVER return raw tool output, JSON, Python dicts, or payload data to the user. Always synthesize the information into a clear, well-structured, human-readable explanation.
4. Use markdown formatting (headings, bullet points, code blocks) to make your answers easy to read.
5. If the user asks general questions (e.g., 'how it works', 'architecture'), use the search_codebase tool with broad queries and then formulate a comprehensive, well-organized response.
6. When referencing code, use proper code blocks with the language specified.
7. Focus on explaining concepts, patterns, and architecture — not dumping raw data."""

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
