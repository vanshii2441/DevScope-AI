"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, GitFork, Code2, GitBranch, Zap, Sparkles, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 overflow-hidden relative">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-indigo-500/20 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-purple-500" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            RepoMind AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button className="bg-white text-black hover:bg-zinc-200 rounded-full px-6">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center max-w-4xl mx-auto"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 mb-8 backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            <span>The intelligent way to explore codebases</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
            Understand any GitHub repository in <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">seconds.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl">
            RepoMind AI analyzes, indexes, and visualizes complex codebases. Chat with your repository, explore architecture graphs, and generate documentation instantly.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="h-14 px-8 text-base bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-full border-0 shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] group">
                Start Analyzing
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white backdrop-blur-md">
                <GitFork className="w-5 h-5 mr-2" />
                View Demo Repo
              </Button>
            </a>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-3 gap-6 mt-32 text-left"
        >
          <motion.div variants={itemVariants} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors" />
            <Code2 className="w-10 h-10 text-purple-400 mb-6" />
            <h3 className="text-xl font-semibold mb-3">Semantic Search</h3>
            <p className="text-zinc-400 leading-relaxed">Search through thousands of files instantly using natural language to find exactly what you need.</p>
          </motion.div>

          <motion.div variants={itemVariants} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
            <GitBranch className="w-10 h-10 text-blue-400 mb-6" />
            <h3 className="text-xl font-semibold mb-3">Architecture Graphs</h3>
            <p className="text-zinc-400 leading-relaxed">Visualize dependencies, data flows, and component relationships in an interactive graph.</p>
          </motion.div>

          <motion.div variants={itemVariants} className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors" />
            <Zap className="w-10 h-10 text-indigo-400 mb-6" />
            <h3 className="text-xl font-semibold mb-3">AI Code Chat</h3>
            <p className="text-zinc-400 leading-relaxed">Ask questions about architecture, authentication flows, or specific functions and get instant answers.</p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
