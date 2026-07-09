"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, GitFork, FolderArchive, ArrowRight, Loader2, FolderGit2, Star, GitBranch, Clock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { submitRepository, getRepositories } from "@/app/actions/repository";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const langColors: Record<string, string> = {
  TypeScript: "bg-blue-500",
  Python: "bg-yellow-500",
  JavaScript: "bg-yellow-400",
  Go: "bg-cyan-400",
  Rust: "bg-orange-500",
};

export default function DashboardPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [recentRepos, setRecentRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  useEffect(() => {
    async function loadRepos() {
      const result = await getRepositories();
      if (result.success) {
        // Just take the first 3 for recent
        setRecentRepos(result.data.slice(0, 3));
      }
      setLoadingRepos(false);
    }
    loadRepos();
  }, []);


  const handleAnalyze = () => {
    if (!repoUrl) return;
    setError(null);
    startTransition(async () => {
      const result = await submitRepository(repoUrl);
      if (result.success) {
        setRepoUrl("");
        // Redirect to repository view or show success state
        router.push(`/dashboard/repositories`);
      } else {
        setError(result.error);
      }
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setUploadError("Please select a .zip file.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);

    try {
      // Call the backend directly from the browser to avoid Next.js Server Action
      // binary FormData corruption (which causes "Unexpected end of form" errors).
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/api/v1/repos/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { "X-User-Id": userId } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setUploadError(errorData.detail || "Upload failed.");
      } else {
        router.push("/dashboard/repositories");
      }
    } catch (err) {
      console.error("Upload error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setUploadError(`Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard</h2>
      </div>

      {/* Import Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-1 rounded-3xl bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-transparent"
      >
        <div className="bg-[#0a0a0a] rounded-[22px] p-8 md:p-12 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl font-semibold text-white mb-4">Analyze a new repository</h3>
            <p className="text-zinc-400 mb-8 text-lg">Paste a GitHub URL or upload a ZIP file to start analyzing the codebase.</p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-purple-400 transition-colors">
                  <GitFork className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={isPending}
                  className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={isPending || !repoUrl}
                className="h-14 px-8 rounded-2xl bg-white text-black hover:bg-zinc-200 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  <>
                    Analyze
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-4 text-red-400 text-sm">{error}</div>
            )}

            <div className="mt-6 flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-white/5" />
              <span className="text-sm font-medium text-zinc-500 uppercase tracking-wider">OR</span>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              onClick={handleUploadClick}
              disabled={isUploading || isPending}
              className="mt-6 w-full h-14 rounded-2xl border-2 border-dashed border-white/10 text-zinc-400 hover:border-purple-500/50 hover:text-purple-400 hover:bg-purple-500/5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading ZIP...
                </>
              ) : (
                <>
                  <FolderArchive className="w-5 h-5" />
                  Upload Repository ZIP
                </>
              )}
            </button>

            {uploadError && (
              <div className="mt-3 text-red-400 text-sm">{uploadError}</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recent Repositories */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-white">Recent Repositories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingRepos ? (
            <div className="col-span-full py-12 text-center text-zinc-400">Loading repositories...</div>
          ) : recentRepos.length === 0 ? (
            <div className="col-span-full py-12 text-center border border-white/5 rounded-3xl bg-white/[0.02]">
              <FolderGit2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No repositories yet</h4>
              <p className="text-zinc-400">Import your first repository to get started.</p>
            </div>
          ) : recentRepos.map((repo, i) => (
            <Link href={`/dashboard/chats/${repo.chat_id}`} key={repo.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-purple-500/30 transition-all cursor-pointer relative overflow-hidden h-full"
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
