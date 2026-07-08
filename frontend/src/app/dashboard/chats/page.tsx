"use client";

import { motion } from "framer-motion";
import { MessageSquare, Plus, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { useEffect, useState } from "react";
import { getRepositories } from "@/app/actions/repository";

// Helper for formatting relative time
function timeAgo(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function ChatsPage() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChats() {
      const result = await getRepositories();
      if (result.success) {
        // Filter out repos without a chat_id just in case
        setRepos(result.data.filter((r: any) => r.chat_id));
      }
      setLoading(false);
    }
    loadChats();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Chats</h2>
          <p className="text-zinc-400 mt-1">Your AI conversations about your codebases</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl border-0">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search conversations..."
          className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </div>

      {/* Chat List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-zinc-400">Loading chats...</div>
        ) : repos.map((repo, i) => (
          <motion.div
            key={repo.chat_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link href={`/dashboard/chats/${repo.chat_id}`}>
              <div className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-purple-500/30 transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">Chat — {repo.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">{repo.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-zinc-500 text-xs flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {timeAgo(repo.updated_at || repo.created_at)}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}

        {!loading && repos.length === 0 && (
          <div className="py-16 text-center border border-white/5 rounded-2xl bg-white/[0.02]">
            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No conversations yet</h4>
            <p className="text-zinc-400">Start a new chat to ask questions about your repositories.</p>
          </div>
        )}
      </div>
    </div>
  );
}
