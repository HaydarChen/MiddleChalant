"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Zap, Shield, Globe } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { GradientButton } from "@/components/gradient-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/lib/auth-context";
import { roomsApi, chainsApi } from "@/lib/api";
import type { ChainConfig } from "@/lib/types";

export default function CreateRoomPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();

  const [chains, setChains] = useState<ChainConfig[]>([]);
  const [name, setName] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const chainsData = await chainsApi.getChains();
        setChains(chainsData);
        if (chainsData.length > 0) {
          setSelectedChainId(chainsData[0].chainId);
        }
      } catch (err) {
        console.error("Failed to fetch chains:", err);
      }
    };

    fetchChains();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedChainId) return;

    setIsLoading(true);
    setError("");

    try {
      const room = await roomsApi.createRoom({
        name: name.trim(),
        chainId: selectedChainId,
      });
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const selectedChain = chains.find((c) => c.chainId === selectedChainId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <Link href="/rooms">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-50">Create New Room</h1>
            <p className="mt-1 text-sm text-slate-400">
              Set up a new escrow room for your transaction
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <GlassCard className="space-y-6 border border-slate-800/80 p-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Room Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">
              Room Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Website Development Payment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-900/50"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500">
              A descriptive name for this escrow transaction
            </p>
          </div>

          {/* Network Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">
              Select Network
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {chains.map((chain) => (
                <button
                  key={chain.chainId}
                  type="button"
                  onClick={() => setSelectedChainId(chain.chainId)}
                  disabled={isLoading}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    selectedChainId === chain.chainId
                      ? "border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue/30"
                      : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      chain.isTestnet ? "bg-amber-500/10" : "bg-emerald-500/10"
                    }`}
                  >
                    <Globe
                      className={`h-5 w-5 ${
                        chain.isTestnet ? "text-amber-400" : "text-emerald-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-200">{chain.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {chain.nativeCurrency} - USDT
                    </p>
                    {chain.isTestnet && (
                      <span className="mt-1 inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        Testnet
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent-blue" />
              <div>
                <p className="text-sm font-medium text-slate-200">How it works</p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-accent-blue" />
                    You'll get a unique room code to share with your counterparty
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-accent-blue" />
                    Both parties must agree on roles, amount, and fee split
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-accent-blue" />
                    Funds are held in a secure escrow contract until released
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <GradientButton
              type="submit"
              disabled={isLoading || !name.trim() || !selectedChainId}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Room
            </GradientButton>
            <Link href="/rooms">
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </Link>
          </div>
        </GlassCard>
      </form>
    </div>
  );
}
