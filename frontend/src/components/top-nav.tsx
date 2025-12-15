import Link from "next/link";
import { Wallet2, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-blue-green hover-glow hover-lift p-1">
            <Handshake className="text-xs font-black text-slate-950"/>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-slate-50">
              MiddleChalant Escrow
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Escrow coordination for crypto teams.
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-medium text-slate-400 sm:inline">
            Network: <span className="text-slate-200">Not connected</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 rounded-full hover-glow hover-lift"
          >
            <Wallet2 className="h-3.5 w-3.5 text-accent-blue" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              Connect Wallet
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}


