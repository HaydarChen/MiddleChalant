"use client";

import { TopNav } from "@/components/top-nav";
import { GlassCard } from "@/components/glass-card";
import { GradientButton } from "@/components/gradient-button";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Shield,
  Users,
  Zap,
  Lock,
  CheckCircle2,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const features = [
  {
    icon: Shield,
    title: "Secure Escrow",
    description:
      "Funds are held in audited smart contracts until both parties agree to release.",
  },
  {
    icon: Users,
    title: "Bot-Guided Flow",
    description:
      "An automated bot guides both parties through role selection, amount agreement, and release.",
  },
  {
    icon: Zap,
    title: "Multi-Chain Support",
    description:
      "Support for Ethereum and BSC networks with USDT as the escrow currency.",
  },
  {
    icon: Lock,
    title: "Dispute Resolution",
    description:
      "Built-in dispute mechanism with admin review for fair conflict resolution.",
  },
];

const stats = [
  { label: "Transactions", value: "1,000+" },
  { label: "Total Volume", value: "$2.5M+" },
  { label: "Success Rate", value: "99.5%" },
  { label: "Networks", value: "2" },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="flex min-h-screen flex-col">
      <TopNav />

      {/* Hero Section */}
      <section className="flex-1 px-4 pb-16 pt-12 sm:px-6 lg:pt-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Powered by Smart Contracts
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
              P2P Escrow for{" "}
              <span className="bg-gradient-blue-green bg-clip-text text-transparent">
                USDT Transactions
              </span>
            </h1>
            <p className="max-w-xl text-balance text-lg text-slate-400">
              A secure, bot-guided escrow platform for peer-to-peer USDT
              transactions. Create a room, agree on terms, and let smart
              contracts handle the rest.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={isAuthenticated ? "/dashboard" : "/register"}>
                <GradientButton className="group">
                  {isAuthenticated ? "Go to Dashboard" : "Get Started"}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </GradientButton>
              </Link>
              <Link href="/transactions">
                <Button variant="outline" className="group">
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  View Transactions
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Card */}
          <div className="flex-1">
            <GlassCard className="border border-slate-800/80 p-6">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-400">
                How It Works
              </h2>
              <div className="space-y-4">
                <Step number={1} title="Create or Join Room">
                  Start a new escrow room or join with a code shared by your
                  counterparty.
                </Step>
                <Step number={2} title="Agree on Terms">
                  Bot guides you through role selection, amount, and fee split
                  agreement.
                </Step>
                <Step number={3} title="Deposit Funds">
                  Sender deposits USDT to the generated escrow address.
                </Step>
                <Step number={4} title="Release or Refund">
                  Both parties confirm to release funds to receiver, or cancel
                  to refund sender.
                </Step>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-900/30 px-4 py-3">
                <span className="text-xs text-slate-400">
                  1% platform fee on completed transactions
                </span>
                <span className="h-6 w-px bg-slate-800" />
                <span className="text-xs font-medium text-emerald-400">
                  Fully non-custodial
                </span>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-800/60 bg-slate-950/50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-semibold text-slate-50">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
              Built for Security & Simplicity
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              Every transaction is protected by smart contracts and guided by
              our automated workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <GlassCard
                  key={feature.title}
                  className="border border-slate-800/80 p-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/10">
                    <Icon className="h-5 w-5 text-accent-blue" />
                  </div>
                  <h3 className="mt-4 font-medium text-slate-200">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {feature.description}
                  </p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <GlassCard className="border border-slate-800/80 p-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-50">
              Ready to start a secure transaction?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Create an account and set up your first escrow room in minutes.
              No wallet connection required to get started.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link href={isAuthenticated ? "/rooms/new" : "/register"}>
                <GradientButton>
                  {isAuthenticated ? "Create Room" : "Create Account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </GradientButton>
              </Link>
              {!isAuthenticated && (
                <Link href="/login">
                  <Button variant="outline">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-500">
              MiddleChalant Escrow - Secure P2P Transactions
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/transactions" className="hover:text-slate-300">
                Transactions
              </Link>
              <span className="h-4 w-px bg-slate-800" />
              <span>Powered by Smart Contracts</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-sm font-medium text-accent-blue">
        {number}
      </div>
      <div>
        <p className="font-medium text-slate-200">{title}</p>
        <p className="mt-0.5 text-sm text-slate-400">{children}</p>
      </div>
    </div>
  );
}
