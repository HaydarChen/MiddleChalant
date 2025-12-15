import { notFound } from "next/navigation";
import { GlassPanel } from "@/components/glass-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowDownRight,
  ArrowUpRight,
  CornerDownLeft,
  Lock,
} from "lucide-react";

const dummyRoomById = {
  "design-bounty": {
    id: "design-bounty",
    title: "Design bounty / Q4 launch",
    summary: "Milestone-based design escrow between Founder DAO and Studio Orbit.",
  },
  "audit-escrow": {
    id: "audit-escrow",
    title: "Protocol audit escrow",
    summary: "USDC escrow for a protocol security review.",
  },
} as const;

interface RoomDetailPageProps {
  params: { roomId: string };
}

export default function RoomDetailPage({ params }: RoomDetailPageProps) {
  const room = dummyRoomById[params.roomId as keyof typeof dummyRoomById];

  if (!room) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-4">
      <section className="space-y-4">
        <header>
          <h1 className="text-lg font-semibold text-slate-50">
            {room.title}
          </h1>
          <p className="mt-1 text-xs text-slate-400">{room.summary}</p>
        </header>

        <GlassPanel className="flex h-[420px] flex-col border border-slate-800/80 p-4 hover-glow hover-lift">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Room chat</span>
            <span className="rounded-full bg-black/80 px-2 py-1 text-[11px]">
              2 participants
            </span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1 text-xs">
            <ChatBubble
              author="You"
              role="Mediator"
              alignment="right"
              tone="neutral"
            >
              Funds are locked. Let&apos;s confirm final deliverables before
              releasing escrow.
            </ChatBubble>
            <ChatBubble
              author="Studio Orbit"
              role="Provider"
              alignment="left"
              tone="positive"
            >
              All design files and source assets are uploaded. Happy to walk
              through anything live.
            </ChatBubble>
            <ChatBubble
              author="Founder DAO"
              role="Client"
              alignment="left"
              tone="neutral"
            >
              Reviewing now. If everything matches the brief we can release in
              this room.
            </ChatBubble>
          </div>
          <form className="mt-3 flex items-center gap-2 text-xs">
            <Input
              placeholder="Send a message to keep everyone aligned…"
              className="h-9 bg-black/80 text-xs"
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 rounded-full px-3 text-xs"
            >
              <CornerDownLeft className="mr-1 h-3 w-3" />
              Send
            </Button>
          </form>
        </GlassPanel>
      </section>

      <section className="mt-2 flex w-full flex-col gap-4">
        <GlassPanel className="border border-slate-800/80 p-4 hover-glow hover-lift">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-200">Escrow state</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
              <Lock className="h-3 w-3" />
              Funds locked
            </span>
          </div>
          <ol className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
            <EscrowStep
              label="Awaiting deposit"
              state="done"
              icon={<ArrowDownRight className="h-3 w-3" />}
            />
            <EscrowStep
              label="Funded"
              state="current"
              icon={<Lock className="h-3 w-3" />}
            />
            <EscrowStep
              label="Release / refund"
              state="upcoming"
              icon={<ArrowUpRight className="h-3 w-3" />}
            />
          </ol>
          <p className="mt-3 text-[11px] text-slate-400">
            Actions here are illustrative only. Smart contract integration will
            connect to your wallet and submit transactions from this panel.
          </p>
        </GlassPanel>

        <GlassPanel className="border border-slate-800/80 p-4 text-xs text-slate-300 hover-glow hover-lift">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-slate-200">Current terms</span>
            <span className="rounded-full bg-slate-900/80 px-2 py-1 text-[11px] text-slate-400">
              Static preview
            </span>
          </div>
          <dl className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">Amount</dt>
              <dd className="font-medium text-slate-100">2.5 ETH</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-400">Release condition</dt>
              <dd className="text-right">
                Mediator confirms deliverables match agreed scope.
              </dd>
            </div>
          </dl>
        </GlassPanel>
      </section>
    </div>
  );
}

interface ChatBubbleProps {
  author: string;
  role: string;
  alignment: "left" | "right";
  tone: "neutral" | "positive";
  children: React.ReactNode;
}

function ChatBubble({
  author,
  role,
  alignment,
  tone,
  children,
}: ChatBubbleProps) {
  const isRight = alignment === "right";

  return (
    <div
      className={`flex ${isRight ? "justify-end" : "justify-start"} text-[11px]`}
    >
      <div
        className={`max-w-[80%] rounded-xl px-3 py-2 ${
          isRight
            ? "bg-gradient-to-br from-accent-blue to-accent-green text-slate-950"
            : "bg-black/80 text-slate-100 border border-slate-800/80"
        }`}
      >
        <div className="mb-0.5 flex items-center gap-2 text-[10px]">
          <span className="font-semibold">{author}</span>
          <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-300">
            {role}
          </span>
        </div>
        <p className="leading-snug">
          {children}
        </p>
        {tone === "positive" && (
          <p className="mt-1 text-[10px] text-emerald-300">
            Looks good from our side.
          </p>
        )}
      </div>
    </div>
  );
}

interface EscrowStepProps {
  label: string;
  state: "done" | "current" | "upcoming";
  icon: React.ReactNode;
}

function EscrowStep({ label, state, icon }: EscrowStepProps) {
  const baseCircle =
    "flex h-7 w-7 items-center justify-center rounded-full border text-slate-200";

  const circleClass =
    state === "done"
      ? "border-emerald-400/80 bg-emerald-500/20"
      : state === "current"
        ? "border-sky-400/80 bg-sky-500/20"
        : "border-slate-600/60 bg-slate-900/80";

  const labelClass =
    state === "upcoming"
      ? "text-slate-500"
      : "text-slate-200";

  return (
    <li className="flex flex-col items-center gap-1 text-center">
      <div className={`${baseCircle} ${circleClass}`}>{icon}</div>
      <span className={labelClass}>{label}</span>
    </li>
  );
}


