'use client'

import Link from "next/link";
import { LayoutDashboard, MessagesSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/rooms", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rooms", label: "Rooms", icon: MessagesSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-800/80 bg-black/70 px-3 py-4 backdrop-blur-xl md:block">
      <nav className="flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-400 transition-colors",
                "hover:bg-slate-900/80 hover:text-slate-50",
                isActive &&
                  "bg-slate-950 text-slate-50 ring-1 ring-accent-blue/60",
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-slate-300 group-hover:bg-slate-900 group-hover:text-slate-50">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


