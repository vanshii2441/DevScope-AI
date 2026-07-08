"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { User, Bell, Shield, Palette, Key, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@clerk/nextjs";

const sections = [
  { id: "profile", label: "Profile", icon: User, description: "Manage your personal information" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Configure alert preferences" },
  { id: "security", label: "Security", icon: Shield, description: "Password and authentication" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme and display options" },
  { id: "api", label: "API Keys", icon: Key, description: "Manage access tokens" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [notifications, setNotifications] = useState({ email: true, analysis: true, weekly: false });
  const [theme, setTheme] = useState("dark");

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Settings</h2>
        <p className="text-zinc-400 mt-1">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                activeSection === section.id
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <section.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">{section.label}</span>
              {activeSection === section.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6"
          >
            {activeSection === "profile" && (
              <div className="flex justify-center">
                <UserProfile 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "bg-transparent shadow-none border border-white/10 w-full",
                      navbar: "hidden", // Hide clerk navbar if we want to use our own, or keep it.
                      pageScrollBox: "p-0",
                    },
                    variables: {
                      colorBackground: "transparent",
                      colorText: "white",
                      colorPrimary: "#9333ea", // purple-600
                      colorTextSecondary: "#a1a1aa", // zinc-400
                      colorInputBackground: "rgba(255, 255, 255, 0.05)",
                      colorInputBorder: "rgba(255, 255, 255, 0.1)",
                    }
                  }}
                />
              </div>
            )}

            {activeSection === "notifications" && (
              <>
                <h3 className="text-white font-semibold text-lg">Notification Preferences</h3>
                <div className="space-y-4">
                  {[
                    { key: "email" as const, label: "Email notifications", desc: "Receive updates via email" },
                    { key: "analysis" as const, label: "Analysis complete", desc: "Notify when repo analysis finishes" },
                    { key: "weekly" as const, label: "Weekly digest", desc: "Summary of activity every week" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                      <div>
                        <div className="text-white text-sm font-medium">{item.label}</div>
                        <div className="text-zinc-500 text-xs mt-0.5">{item.desc}</div>
                      </div>
                      <button
                        onClick={() => setNotifications((n) => ({ ...n, [item.key]: !n[item.key] }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${notifications[item.key] ? "bg-purple-600" : "bg-white/10"}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications[item.key] ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeSection === "security" && (
              <>
                <h3 className="text-white font-semibold text-lg">Security</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Your account is secured with Clerk Authentication
                  </div>
                  <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl">
                    Change Password
                  </Button>
                  <Button variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-xl">
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              </>
            )}

            {activeSection === "appearance" && (
              <>
                <h3 className="text-white font-semibold text-lg">Appearance</h3>
                <div className="space-y-3">
                  {["dark", "light", "system"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        theme === t ? "border-purple-500/50 bg-purple-500/10 text-purple-300" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <span className="capitalize text-sm font-medium">{t} mode</span>
                      {theme === t && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeSection === "api" && (
              <>
                <h3 className="text-white font-semibold text-lg">API Keys</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-white text-sm font-medium">Default API Key</div>
                      <div className="text-zinc-500 text-xs font-mono mt-1">rm_••••••••••••••••3f2a</div>
                    </div>
                    <Button size="sm" variant="outline" className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg text-xs">
                      Reveal
                    </Button>
                  </div>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl border-0">
                    <Key className="w-4 h-4 mr-2" />
                    Generate New Key
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
