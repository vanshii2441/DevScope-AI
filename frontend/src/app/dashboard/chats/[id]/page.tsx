"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const params = useParams();
  const { getToken, userId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: "system-1", role: "assistant", content: "Hello! I am RepoMind AI. I have analyzed this repository. Ask me anything about its architecture, codebase, or how it works." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const token = await getToken();
      
      const response = await fetch(`/api/v1/chats/${params.id}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          ...(userId && { "X-User-Id": userId })
        },
        body: JSON.stringify({ message: userMessage.content })
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "");
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                assistantMessage += data.text;
                setMessages(prev => 
                  prev.map(m => m.id === assistantMessageId ? { ...m, content: assistantMessage } : m)
                );
              }
              if (data.error) {
                console.error(data.error);
              }
            } catch (e) {
              // Incomplete chunk, skip
            }
          }
        }
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error while processing your request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
        <Bot className="w-8 h-8 text-purple-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Repository Assistant</h2>
          <p className="text-sm text-zinc-400">Ask questions about the codebase</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
            )}
            
            <div className={`px-5 py-3.5 rounded-2xl max-w-[80%] ${
              m.role === "user" 
                ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-sm" 
                : "bg-[#111] border border-white/5 text-zinc-200 rounded-bl-sm"
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>

            {m.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                <User className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div className="px-5 py-3.5 rounded-2xl bg-[#111] border border-white/5 text-zinc-400 rounded-bl-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-6 mt-4">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Ask about the architecture, how authentication works, etc..."
            className="w-full h-14 pl-6 pr-14 bg-[#111] border border-white/10 rounded-full text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 transition-all"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
