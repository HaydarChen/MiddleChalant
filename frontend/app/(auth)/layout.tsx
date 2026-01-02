import type { ReactNode } from "react";
import Link from "next/link";
import { Handshake } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-blue-green p-1.5">
            <Handshake className="text-slate-950" />
          </div>
          <span className="text-xl font-semibold text-slate-50">
            MiddleChalant
          </span>
        </Link>
      </div>
      {children}
    </main>
  );
}
