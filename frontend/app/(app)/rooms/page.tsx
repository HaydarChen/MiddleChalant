"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Loader2,
  Clock,
  Copy,
  Check,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { GlassPanel } from "@/components/glass-panel";
import { GradientButton } from "@/components/gradient-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/lib/auth-context";
import { roomsApi, chainsApi } from "@/lib/api";
import type { Room, ChainConfig } from "@/lib/types";
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

  switch (room.step) {
    case ROOM_STEPS.WAITING_FOR_PEER:
      return { label: "Waiting", color: "text-amber-400", bg: "bg-amber-500/10" };
    case ROOM_STEPS.FUNDED:
      return { label: "Funded", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    case ROOM_STEPS.AWAITING_DEPOSIT:
      return { label: "Awaiting Deposit", color: "text-amber-400", bg: "bg-amber-500/10" };
    default:
      return { label: "In Progress", color: "text-sky-400", bg: "bg-sky-500/10" };
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

// Create Room Modal
function CreateRoomModal({
  isOpen,
  onClose,
  chains,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  chains: ChainConfig[];
  onCreated: (room: Room) => void;
}) {
  const [name, setName] = useState("");
  const [chainId, setChainId] = useState<number>(chains[0]?.chainId || 11155111);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const room = await roomsApi.createRoom({ name, chainId });
      onCreated(room);
      onClose();
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-md border border-slate-800/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Create Room</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Room Name
            </label>
            <Input
              placeholder="e.g., Design Project Escrow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Network
            </label>
            <div className="grid grid-cols-2 gap-2">
              {chains.map((chain) => (
                <button
                  key={chain.chainId}
                  type="button"
                  onClick={() => setChainId(chain.chainId)}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    chainId === chain.chainId
                      ? "border-accent-blue bg-accent-blue/10 text-slate-50"
                      : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="font-medium">{chain.name}</div>
                  <div className="text-xs text-slate-500">
                    {chain.isTestnet ? "Testnet" : "Mainnet"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <GradientButton
              type="submit"
              className="flex-1"
              disabled={isLoading || !name}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Room
            </GradientButton>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}

// Join Room Modal
function JoinRoomModal({
  isOpen,
  onClose,
  onJoined,
}: {
  isOpen: boolean;
  onClose: () => void;
  onJoined: (room: Room) => void;
}) {
  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const room = await roomsApi.joinRoom({ roomCode: roomCode.toUpperCase() });
      onJoined(room);
      onClose();
      setRoomCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-md border border-slate-800/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Join Room</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Room Code
            </label>
            <Input
              placeholder="Enter 6-character code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center font-mono text-lg tracking-widest"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500">
              Enter the room code shared by the other party
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <GradientButton
              type="submit"
              className="flex-1"
              disabled={isLoading || roomCode.length !== 6}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Join Room
            </GradientButton>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}

// Room Code Copy Component
function RoomCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded bg-slate-800/50 px-2 py-1 font-mono text-xs text-slate-300 transition hover:bg-slate-700/50"
    >
      {code}
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

export default function RoomsPage() {
  const { user, isLoading: authLoading } = useRequireAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [chains, setChains] = useState<ChainConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [roomsData, chainsData] = await Promise.all([
          roomsApi.getMyRooms(),
          chainsApi.getChains(),
        ]);
        setRooms(roomsData);
        setChains(chainsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rooms");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleRoomCreated = (room: Room) => {
    setRooms((prev) => [room, ...prev]);
    router.push(`/rooms/${room.id}`);
  };

  const handleRoomJoined = (room: Room) => {
    setRooms((prev) => {
      const exists = prev.find((r) => r.id === room.id);
      if (exists) return prev;
      return [room, ...prev];
    });
    router.push(`/rooms/${room.id}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const filteredRooms = rooms.filter((room) => {
    if (filter === "active") return room.status === ROOM_STATUSES.OPEN;
    if (filter === "completed")
      return (
        room.status === ROOM_STATUSES.COMPLETED ||
        room.status === ROOM_STATUSES.CANCELLED ||
        room.status === ROOM_STATUSES.EXPIRED
      );
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
            Escrow Rooms
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your escrow transactions in dedicated rooms
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Join Room
          </Button>
          <GradientButton
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Room
          </GradientButton>
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "active", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "bg-slate-800 text-slate-50"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <GlassCard className="border border-slate-800/80 p-8 text-center">
          <p className="text-slate-400">
            {filter === "all"
              ? "No rooms yet"
              : filter === "active"
              ? "No active rooms"
              : "No completed rooms"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Create a new room or join an existing one to get started.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => setShowJoinModal(true)}>
              Join Room
            </Button>
            <GradientButton onClick={() => setShowCreateModal(true)}>
              Create Room
            </GradientButton>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
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

                  <div className="mt-4 flex items-center justify-between">
                    <RoomCodeBadge code={room.roomCode} />
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(room.lastActivityAt)}
                    </span>
                  </div>

                  {room.amount && (
                    <div className="mt-3 border-t border-slate-800/50 pt-3">
                      <span className="text-sm font-medium text-slate-200">
                        {(Number(room.amount) / 1e6).toFixed(2)} USDT
                      </span>
                    </div>
                  )}
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        chains={chains}
        onCreated={handleRoomCreated}
      />

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoined={handleRoomJoined}
      />
    </div>
  );
}
