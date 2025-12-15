import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { GradientButton } from "@/components/gradient-button";
import { Button } from "@/components/ui/button";

const dummyRooms = [
  {
    id: "design-bounty",
    title: "Design bounty / Q4 launch",
    amount: "2.5 ETH",
    role: "You are the mediator",
    status: "Funded",
    counterparties: "Founder DAO ↔ Studio Orbit",
  },
  {
    id: "audit-escrow",
    title: "Protocol audit escrow",
    amount: "12,000 USDC",
    role: "You are the client",
    status: "Awaiting deposit",
    counterparties: "Hydra Labs ↔ Shellshock Audits",
  },
];

export default function RoomsPage() {
  return (
    <div className="mx-auto flex flex-col gap-6">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
            Escrow rooms
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Spin up dedicated spaces for each agreement, then invite
            counterparties and lock funds on-chain.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2 rounded-full"
          >
            <Users className="h-4 w-4" />
            Join existing
          </Button>
          <GradientButton className="flex items-center gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            New room
          </GradientButton>
        </div>
      </header>

      <section className="mt-2 grid max-w-3xl gap-4">
        {dummyRooms.map((room) => (
          <Link key={room.id} href={`/rooms/${room.id}`}>
            <GlassCard className="group flex h-full cursor-pointer flex-col justify-between border border-slate-800/80 p-4 transition hover:border-accent-blue/70 hover:bg-black hover-glow hover-lift">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-50">
                    {room.title}
                  </h2>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    {room.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{room.counterparties}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium">
                  Locked amount:{" "}
                  <span className="text-slate-50">{room.amount}</span>
                </span>
                <span className="text-slate-400">{room.role}</span>
              </div>
            </GlassCard>
          </Link>
        ))}
      </section>
    </div>
  );
}


