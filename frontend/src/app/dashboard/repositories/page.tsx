"use client";

import { motion } from "framer-motion";
import { FolderGit2, Plus, Search, GitBranch, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { useEffect, useState } from "react";
import { getRepositories } from "@/app/actions/repository";

// Helper for formatting relative time
function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

const langColors: Record<string, string> = {
  TypeScript: "bg-blue-500",
  Python: "bg-yellow-500",
  JavaScript: "bg-yellow-400",
  Go: "bg-cyan-400",
  Rust: "bg-orange-500",
};

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRepos() {
      const result = await getRepositories();
      if (result.success) {
        setRepos(result.data);
      }
      setLoading(false);
    }
    loadRepos();
  }, []);
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Repositories</h2>
          <p className="text-zinc-400 mt-1">Manage and explore your analyzed codebases</p>
        </div>
        <Link href="/dashboard">
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl border-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Repository
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search repositories..."
          className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </div>

      {/* Repo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-zinc-400">Loading repositories...</div>
        ) : repos.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-400">No repositories found.</div>
        ) : repos.map((repo, i) => (
          <motion.div
            key={repo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-purple-500/30 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
            <div className="flex items-start justify-between mb-4">
              <FolderGit2 className="w-8 h-8 text-purple-400" />
              <div className="flex items-center gap-1 text-zinc-400 text-sm">
                <Star className="w-3.5 h-3.5" />
                {repo.stars || 0}
              </div>
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">{repo.name}</h3>
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-500 text-sm">{repo.branch || "main"}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${langColors[repo.language] ?? "bg-zinc-500"}`} />
                <span className="text-zinc-400 text-sm">{repo.language || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-500 text-xs">
                <Clock className="w-3 h-3" />
                {timeAgo(repo.updated_at || repo.created_at)}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Empty state card */}
        <motion.div
          transition={{ delay: repos.length * 0.08 }}
          className="p-6 rounded-2xl border-2 border-dashed border-white/10 hover:border-purple-500/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[180px] text-zinc-500 hover:text-purple-400 group"
        >
          <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Add new repository</span>
        </motion.div>
      </div>
    </div>
  );
}
