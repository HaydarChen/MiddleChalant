import type { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col">
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
          {children}
        </div>
      </div>
    </main>
  );
}


