"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessagesSquare,
  ArrowLeftRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rooms", label: "Rooms", icon: MessagesSquare },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-800/80 bg-black/70 px-3 py-4 backdrop-blur-xl md:block">
      <nav className="flex h-full flex-col">
        <div className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors",
                  "hover:bg-slate-900/80 hover:text-slate-50",
                  isActive && "bg-slate-900 text-slate-50 ring-1 ring-accent-blue/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors",
                    "group-hover:text-slate-50",
                    isActive && "bg-accent-blue/10 text-accent-blue"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User section at bottom */}
        {user && (
          <div className="mt-auto border-t border-slate-800/60 pt-4">
            <div className="mb-3 px-3">
              <p className="truncate text-sm font-medium text-slate-200">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg">
                <LogOut className="h-4 w-4" />
              </span>
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}
