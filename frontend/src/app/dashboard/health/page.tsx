"use client";

import { motion } from "framer-motion";
import { Activity, TrendingUp, AlertTriangle, CheckCircle, Clock, FileCode } from "lucide-react";

const stats = [
  { label: "Total Files Analyzed", value: "1,284", icon: FileCode, color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Avg. Complexity Score", value: "6.2", icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10" },
  { label: "Issues Found", value: "14", icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { label: "Tests Passing", value: "98%", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
];

const recentActivity = [
  { repo: "next-commerce", event: "Analysis completed", time: "2 hours ago", status: "success" },
  { repo: "fastapi-backend", event: "3 new issues detected", time: "5 hours ago", status: "warning" },
  { repo: "react-dashboard", event: "Re-indexed 42 files", time: "Yesterday", status: "success" },
  { repo: "next-commerce", event: "Dependency graph updated", time: "2 days ago", status: "success" },
];

export default function HealthPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Health Analytics</h2>
        <p className="text-zinc-400 mt-1">Monitor the quality and health of your analyzed repositories</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-zinc-400 text-sm">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Health Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl bg-white/5 border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Overall Codebase Health</h3>
          <span className="text-emerald-400 font-bold text-lg">82%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "82%" }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span>Poor</span>
          <span>Good</span>
          <span>Excellent</span>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-2xl bg-white/5 border border-white/10"
      >
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-rose-400" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === "success" ? "bg-emerald-400" : "bg-yellow-400"}`} />
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm">{item.event}</span>
                <span className="text-purple-400 text-sm"> · {item.repo}</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-500 text-xs flex-shrink-0">
                <Clock className="w-3 h-3" />
                {item.time}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
