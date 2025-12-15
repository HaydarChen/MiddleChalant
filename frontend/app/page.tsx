import { TopNav } from "@/components/top-nav";
import { GlassCard } from "@/components/glass-card";
import { GradientButton } from "@/components/gradient-button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopNav />
      <section className="flex-1 px-4 pb-16 pt-10 sm:px-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <div className="flex-1 space-y-6">
            <h1 className="text-balance text-4xl font-medium tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
              On-chain escrow coordination,{" "}
              <span className="bg-gradient-blue-green bg-clip-text text-transparent">
                without the chaos.
              </span>
            </h1>
            <p className="max-w-6xl text-balance text-slate-300">
              MiddleChalant Escrow gives counterparties a shared room to chat,
              track deposits, and release funds with confidence. Built for DAOs,
              freelance agreements, and high-trust crypto deals.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/rooms">
                <GradientButton className="group">
                  Browse rooms
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </GradientButton>
              </Link>
              <Link
                href="/rooms"
                className="text-sm font-medium text-slate-300 underline-offset-4 hover:text-slate-50 hover:underline"
              >
                View escrow flow
              </Link>
            </div>
          </div>
          <div className="flex-1">
            <GlassCard className="border border-slate-800/80 p-6 sm:p-7 lg:p-8">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                Live escrow snapshot
              </h2>
              <div className="space-y-5">
                <div className="flex items-center justify-between rounded-xl bg-black/70 py-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                      Room
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-50">
                      Design bounty / Q4 launch
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    Funded
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-black/70 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                      Locked in escrow
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-50">
                      2.5 ETH
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Counterparty funds held on-chain.
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/70 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                      Next action
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-50">
                      Awaiting milestone review
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Escrow can be released or refunded.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-black/80 px-4 py-3">
                  <div className="flex flex-col text-xs text-slate-400">
                    <span>Secure by design.</span>
                    <span>Chat, state, and transactions in one place.</span>
                  </div>
                  <span className="h-8 w-px bg-gradient-to-b from-accent-blue via-accent-green to-accent-blue/70" />
                  <span className="text-xs font-medium text-slate-200">
                    Built for on-chain trust.
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>
    </main>
  );
}


