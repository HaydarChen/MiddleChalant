"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Users,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { GradientButton } from "@/components/gradient-button";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/auth-context";
import { roomsApi, transactionsApi } from "@/lib/api";
import type { Room, TransactionStats } from "@/lib/types";
import { ROOM_STATUSES, ROOM_STEPS } from "@/lib/types";

function getRoomStatusInfo(room: Room) {
  if (room.status === ROOM_STATUSES.COMPLETED) {
    return { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10" };
  }
  if (room.status === ROOM_STATUSES.CANCELLED) {
    return { label: "Cancelled", color: "text-slate-400", bg: "bg-slate-500/10" };
  }
  if (room.status === ROOM_STATUSES.EXPIRED) {
    return { label: "Expired", color: "text-amber-400", bg: "bg-amber-500/10" };
  }
  if (room.status === ROOM_STATUSES.DISPUTED) {
    return { label: "Disputed", color: "text-red-400", bg: "bg-red-500/10" };
  }

  // Open room - check step
  switch (room.step) {
    case ROOM_STEPS.WAITING_FOR_PEER:
      return { label: "Waiting for peer", color: "text-amber-400", bg: "bg-amber-500/10" };
    case ROOM_STEPS.ROLE_SELECTION:
      return { label: "Role selection", color: "text-sky-400", bg: "bg-sky-500/10" };
    case ROOM_STEPS.AMOUNT_AGREEMENT:
      return { label: "Amount agreement", color: "text-sky-400", bg: "bg-sky-500/10" };
    case ROOM_STEPS.FEE_SELECTION:
      return { label: "Fee selection", color: "text-sky-400", bg: "bg-sky-500/10" };
    case ROOM_STEPS.AWAITING_DEPOSIT:
      return { label: "Awaiting deposit", color: "text-amber-400", bg: "bg-amber-500/10" };
    case ROOM_STEPS.FUNDED:
      return { label: "Funded", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    case ROOM_STEPS.RELEASING:
      return { label: "Releasing", color: "text-sky-400", bg: "bg-sky-500/10" };
    case ROOM_STEPS.CANCELLING:
      return { label: "Cancelling", color: "text-amber-400", bg: "bg-amber-500/10" };
    default:
      return { label: "Open", color: "text-sky-400", bg: "bg-sky-500/10" };
  }
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getChainName(chainId: number) {
  switch (chainId) {
    case 1: return "Ethereum";
    case 56: return "BSC";
    case 11155111: return "Sepolia";
    case 97: return "BSC Testnet";
    default: return `Chain ${chainId}`;
  }
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [roomsData, statsData] = await Promise.all([
          roomsApi.getMyRooms(),
          transactionsApi.getStats(),
        ]);
        setRooms(roomsData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const activeRooms = rooms.filter((r) => r.status === ROOM_STATUSES.OPEN);
  const completedRooms = rooms.filter(
    (r) =>
      r.status === ROOM_STATUSES.COMPLETED || r.status === ROOM_STATUSES.CANCELLED
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">
          Welcome back, {user?.name || "User"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your escrow rooms and track transactions
        </p>
      </header>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="border border-slate-800/80 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
              <Users className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">
                {activeRooms.length}
              </p>
              <p className="text-xs text-slate-400">Active Rooms</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border border-slate-800/80 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">
                {stats?.completedCount || 0}
              </p>
              <p className="text-xs text-slate-400">Completed</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border border-slate-800/80 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <XCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">
                {stats?.refundedCount || 0}
              </p>
              <p className="text-xs text-slate-400">Refunded</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="border border-slate-800/80 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <AlertCircle className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-50">
                {stats?.totalTransactions || 0}
              </p>
              <p className="text-xs text-slate-400">Total Transactions</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/rooms/new">
            <GradientButton className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Room
            </GradientButton>
          </Link>
          <Link href="/rooms/join">
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Join Room
            </Button>
          </Link>
          <Link href="/transactions">
            <Button variant="ghost" className="flex items-center gap-2">
              View All Transactions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Active Rooms */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Active Rooms</h2>
          <Link
            href="/rooms"
            className="text-sm text-slate-400 hover:text-slate-200"
          >
            View all
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {activeRooms.length === 0 ? (
          <GlassCard className="border border-slate-800/80 p-8 text-center">
            <p className="text-slate-400">No active rooms</p>
            <p className="mt-2 text-sm text-slate-500">
              Create a new room to get started with secure escrow transactions.
            </p>
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeRooms.slice(0, 6).map((room) => {
              const statusInfo = getRoomStatusInfo(room);
              return (
                <Link key={room.id} href={`/rooms/${room.id}`}>
                  <GlassCard className="group h-full cursor-pointer border border-slate-800/80 p-4 transition hover:border-accent-blue/50 hover:bg-slate-900/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-slate-50 group-hover:text-accent-blue">
                          {room.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {getChainName(room.chainId)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono">{room.roomCode}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(room.lastActivityAt)}
                      </span>
                    </div>

                    {room.amount && (
                      <div className="mt-2 text-sm font-medium text-slate-200">
                        {(Number(room.amount) / 1e6).toFixed(2)} USDT
                      </div>
                    )}
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Completed */}
      {completedRooms.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-50">
              Recently Completed
            </h2>
          </div>

          <div className="space-y-2">
            {completedRooms.slice(0, 5).map((room) => {
              const statusInfo = getRoomStatusInfo(room);
              return (
                <Link key={room.id} href={`/rooms/${room.id}`}>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-900/30 px-4 py-3 transition hover:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {room.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getChainName(room.chainId)} - {room.roomCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {room.amount && (
                        <span className="text-sm text-slate-300">
                          {(Number(room.amount) / 1e6).toFixed(2)} USDT
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
