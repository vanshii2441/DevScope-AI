"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FolderGit2, 
  MessageSquare, 
  Settings, 
  LogOut,
  BrainCircuit,
  Activity
} from "lucide-react";
import { useClerk, UserButton } from "@clerk/nextjs";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-purple-500",
  },
  {
    label: "Repositories",
    icon: FolderGit2,
    href: "/dashboard/repositories",
    color: "text-blue-500",
  },
  {
    label: "Chats",
    icon: MessageSquare,
    href: "/dashboard/chats",
    color: "text-emerald-500",
  },
  {
    label: "Health Analytics",
    icon: Activity,
    href: "/dashboard/health",
    color: "text-rose-500",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    color: "text-zinc-400",
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#0a0a0a] border-r border-white/5 text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14 gap-2">
          <BrainCircuit className="w-8 h-8 text-purple-500" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            RepoMind AI
          </h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={`text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/5 rounded-lg transition-colors ${
                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
              }`}
            >
              <div className="flex items-center flex-1">
                <route.icon className={`h-5 w-5 mr-3 ${route.color}`} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-6 py-4 flex items-center gap-4 mt-auto border-t border-white/5">
        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-10 h-10" } }} />
        <div className="flex flex-col">
          <span className="text-sm font-medium">My Account</span>
          <button onClick={() => signOut()} className="text-xs text-zinc-500 hover:text-zinc-300 text-left transition-colors">Sign Out</button>
        </div>
      </div>
    </div>
  );
};
