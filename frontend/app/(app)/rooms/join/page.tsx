"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users, Shield, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { GradientButton } from "@/components/gradient-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/lib/auth-context";
import { roomsApi } from "@/lib/api";

export default function JoinRoomPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useRequireAuth();

  const [roomCode, setRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const room = await roomsApi.joinRoom({ roomCode: roomCode.trim().toUpperCase() });
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric characters, max 6
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setRoomCode(value);
  };

  if (authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <Link href="/rooms">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-50">Join Room</h1>
            <p className="mt-1 text-sm text-slate-400">
              Enter a room code to join an existing escrow room
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <GlassCard className="space-y-6 border border-slate-800/80 p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Room Code Input */}
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium text-slate-300">
              Room Code
            </label>
            <Input
              id="code"
              type="text"
              placeholder="ABC123"
              value={roomCode}
              onChange={handleCodeChange}
              className="bg-slate-900/50 text-center font-mono text-2xl tracking-[0.5em] uppercase"
              required
              disabled={isLoading}
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-slate-500">
              Enter the 6-character code shared by the room creator
            </p>
          </div>

          {/* Code Preview */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`flex h-12 w-10 items-center justify-center rounded-lg border text-xl font-mono font-bold ${
                  roomCode[i]
                    ? "border-accent-blue bg-accent-blue/10 text-slate-50"
                    : "border-slate-700 bg-slate-900/50 text-slate-600"
                }`}
              >
                {roomCode[i] || "-"}
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent-blue" />
              <div>
                <p className="text-sm font-medium text-slate-200">What to expect</p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-accent-blue" />
                    You'll join a chat room with the room creator
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-accent-blue" />
                    A bot will guide you through role selection and agreement
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-accent-blue" />
                    Both parties must confirm before funds are deposited
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <GradientButton
              type="submit"
              disabled={isLoading || roomCode.length !== 6}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Users className="mr-2 h-4 w-4" />
              )}
              Join Room
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
