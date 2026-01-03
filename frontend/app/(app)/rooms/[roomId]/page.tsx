"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Lock,
  Loader2,
  Send,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Clock,
  Users,
  Bot,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequireAuth } from "@/lib/auth-context";
import { roomsApi, messagesApi, botActionsApi, chainsApi } from "@/lib/api";
import type {
  Room,
  Participant,
  Message,
  BotMessageMetadata,
  ChainConfig,
  DepositInfo,
  Role,
  FeePayer,
} from "@/lib/types";
import { ROOM_STEPS, ROOM_STATUSES, ROLES, FEE_PAYERS } from "@/lib/types";

// ============ Helper Functions ============

function getRoomStepInfo(step: string) {
  switch (step) {
    case ROOM_STEPS.WAITING_FOR_PEER:
      return { label: "Waiting for peer", progress: 1, color: "amber" };
    case ROOM_STEPS.ROLE_SELECTION:
      return { label: "Role Selection", progress: 2, color: "sky" };
    case ROOM_STEPS.AMOUNT_AGREEMENT:
      return { label: "Amount Agreement", progress: 3, color: "sky" };
    case ROOM_STEPS.FEE_SELECTION:
      return { label: "Fee Selection", progress: 4, color: "sky" };
    case ROOM_STEPS.AWAITING_DEPOSIT:
      return { label: "Awaiting Deposit", progress: 5, color: "amber" };
    case ROOM_STEPS.FUNDED:
      return { label: "Funded", progress: 6, color: "emerald" };
    case ROOM_STEPS.RELEASING:
      return { label: "Releasing", progress: 7, color: "sky" };
    case ROOM_STEPS.CANCELLING:
      return { label: "Cancelling", progress: 7, color: "amber" };
    default:
      return { label: step, progress: 0, color: "slate" };
  }
}

function formatAmount(amount: string | undefined): string {
  if (!amount) return "0.00";
  const num = Number(amount) / 1e6;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============ Main Component ============

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const { user, isLoading: authLoading } = useRequireAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chain, setChain] = useState<ChainConfig | null>(null);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Input states for various flows
  const [amountInput, setAmountInput] = useState("");
  const [addressInput, setAddressInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  // Current user's participant data
  const currentParticipant = participants.find((p) => p.userId === user?.id);
  const otherParticipant = participants.find((p) => p.userId !== user?.id);

  // ============ Data Fetching ============

  const fetchRoomData = useCallback(async () => {
    try {
      const [roomData, participantsData, chainsData] = await Promise.all([
        roomsApi.getRoomById(roomId),
        roomsApi.getParticipants(roomId),
        chainsApi.getChains(),
      ]);

      setRoom(roomData);
      setParticipants(participantsData);

      const chainConfig = chainsData.find((c) => c.chainId === roomData.chainId);
      setChain(chainConfig || null);

      // Fetch deposit info if in deposit/funded stage
      if (
        roomData.step === ROOM_STEPS.AWAITING_DEPOSIT ||
        roomData.step === ROOM_STEPS.FUNDED ||
        roomData.step === ROOM_STEPS.RELEASING ||
        roomData.step === ROOM_STEPS.CANCELLING
      ) {
        const depInfo = await roomsApi.getDepositInfo(roomId);
        setDepositInfo(depInfo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load room");
    }
  }, [roomId]);

  const fetchMessages = useCallback(async () => {
    try {
      const messagesData = await messagesApi.getMessages(roomId);
      setMessages(messagesData.reverse());
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [roomId]);

  // Initial load
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchRoomData(), fetchMessages()]);
      setIsLoading(false);
    };

    loadData();
  }, [user, fetchRoomData, fetchMessages]);

  // Polling for updates
  useEffect(() => {
    if (!user || !room) return;

    // Only poll if room is active
    if (room.status !== ROOM_STATUSES.OPEN) return;

    const interval = setInterval(() => {
      fetchRoomData();
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, room, fetchRoomData, fetchMessages]);

  // Scroll to bottom only once when first loading the room
  useEffect(() => {
    if (!initialScrollDone.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      initialScrollDone.current = true;
    }
  }, [messages]);

  // ============ Actions ============

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending) return;

    setIsSending(true);
    try {
      await messagesApi.sendMessage(roomId, { text: messageInput });
      setMessageInput("");
      await fetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleAction = async (buttonId: string, data?: unknown) => {
    setActionLoading(buttonId);
    try {
      switch (buttonId) {
        // Role selection (button IDs from backend)
        case "select_sender":
          await botActionsApi.selectRole(roomId, ROLES.SENDER);
          break;
        case "select_receiver":
          await botActionsApi.selectRole(roomId, ROLES.RECEIVER);
          break;
        case "confirm_roles":
          await botActionsApi.confirmRoles(roomId);
          break;
        case "reset_roles":
          await botActionsApi.resetRoles(roomId);
          break;
        // Amount agreement
        case "submit_amount":
          if (amountInput) {
            await botActionsApi.proposeAmount(roomId, amountInput);
            setAmountInput("");
          }
          break;
        case "confirm_amount":
          await botActionsApi.confirmAmount(roomId, true);
          break;
        case "reject_amount":
          await botActionsApi.confirmAmount(roomId, false);
          break;
        // Fee selection
        case "fee_sender":
          await botActionsApi.selectFeePayer(roomId, FEE_PAYERS.SENDER);
          break;
        case "fee_receiver":
          await botActionsApi.selectFeePayer(roomId, FEE_PAYERS.RECEIVER);
          break;
        case "fee_split":
          await botActionsApi.selectFeePayer(roomId, FEE_PAYERS.SPLIT);
          break;
        case "confirm_fee":
          await botActionsApi.confirmFee(roomId);
          break;
        case "change_fee":
          await botActionsApi.changeFee(roomId);
          break;
        // Deposit
        case "check-deposit":
          await botActionsApi.checkDeposit(roomId);
          break;
        case "mock-deposit":
          await botActionsApi.mockDeposit(roomId);
          break;
        // Release flow
        case "release":
          await botActionsApi.initiateRelease(roomId);
          break;
        case "confirm_release":
          await botActionsApi.confirmRelease(roomId);
          break;
        case "cancel_release":
          await botActionsApi.cancelRelease(roomId);
          break;
        case "submit_payout_address":
          if (addressInput) {
            await botActionsApi.submitPayoutAddress(roomId, addressInput);
            setAddressInput("");
          }
          break;
        case "confirm_address":
          await botActionsApi.confirmPayoutAddress(roomId);
          break;
        case "change_address":
          await botActionsApi.changePayoutAddress(roomId);
          break;
        // Cancel flow
        case "cancel":
          await botActionsApi.initiateCancel(roomId);
          break;
        case "confirm_cancel":
          await botActionsApi.confirmCancel(roomId);
          break;
        case "reject_cancel":
          await botActionsApi.rejectCancel(roomId);
          break;
        case "submit_refund_address":
          if (addressInput) {
            await botActionsApi.submitRefundAddress(roomId, addressInput);
            setAddressInput("");
          }
          break;
        case "confirm_refund":
          await botActionsApi.confirmRefundAddress(roomId);
          break;
        case "change_refund":
          await botActionsApi.changeRefundAddress(roomId);
          break;
        // Close room flow
        case "close_room":
          await botActionsApi.initiateClose(roomId);
          break;
        case "confirm_close_room":
          await botActionsApi.confirmClose(roomId);
          break;
        case "reject_close_room":
          await botActionsApi.rejectClose(roomId);
          break;
        default:
          console.warn("Unknown action:", buttonId);
      }

      await Promise.all([fetchRoomData(), fetchMessages()]);
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // ============ Loading State ============

  if (authLoading || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-3xl">
        <GlassCard className="border border-red-500/30 p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="mt-4 text-lg font-semibold text-slate-50">
            {error || "Room not found"}
          </h2>
          <Link href="/rooms">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Rooms
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const stepInfo = getRoomStepInfo(room.step);

  // ============ Render ============

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Link href="/rooms">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-50">{room.name}</h1>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                <span className="font-mono">{room.roomCode}</span>
                <span>{chain?.name || `Chain ${room.chainId}`}</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participants.length}/2
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium bg-${stepInfo.color}-500/10 text-${stepInfo.color}-400`}
          >
            {stepInfo.label}
          </span>
          {room.status !== ROOM_STATUSES.OPEN && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                room.status === ROOM_STATUSES.COMPLETED
                  ? "bg-emerald-500/10 text-emerald-400"
                  : room.status === ROOM_STATUSES.CANCELLED
                    ? "bg-slate-500/10 text-slate-400"
                    : "bg-red-500/10 text-red-400"
              }`}
            >
              {room.status}
            </span>
          )}
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <GlassCard className="flex h-[600px] flex-col border border-slate-800/80">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3">
              <span className="text-sm font-medium text-slate-200">Room Chat</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  fetchRoomData();
                  fetchMessages();
                }}
                className="h-7 px-2 text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 space-y-3 overflow-y-auto p-4"
            >
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No messages yet. The bot will guide you through the process.
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    currentUserId={user?.id}
                    onAction={handleAction}
                    actionLoading={actionLoading}
                    amountInput={amountInput}
                    setAmountInput={setAmountInput}
                    addressInput={addressInput}
                    setAddressInput={setAddressInput}
                    currentParticipant={currentParticipant}
                    room={room}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-slate-800/60 p-4"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-900/50"
                  disabled={isSending || room.status !== ROOM_STATUSES.OPEN}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSending || !messageInput.trim() || room.status !== ROOM_STATUSES.OPEN}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Progress Steps */}
          <GlassCard className="border border-slate-800/80 p-4">
            <h3 className="mb-3 text-sm font-medium text-slate-200">Progress</h3>
            <div className="space-y-2">
              <ProgressStep
                step={1}
                label="Peer Joined"
                isActive={room.step === ROOM_STEPS.WAITING_FOR_PEER}
                isComplete={
                  room.step !== ROOM_STEPS.WAITING_FOR_PEER &&
                  participants.length === 2
                }
              />
              <ProgressStep
                step={2}
                label="Roles Selected"
                isActive={room.step === ROOM_STEPS.ROLE_SELECTION}
                isComplete={
                  [
                    ROOM_STEPS.AMOUNT_AGREEMENT,
                    ROOM_STEPS.FEE_SELECTION,
                    ROOM_STEPS.AWAITING_DEPOSIT,
                    ROOM_STEPS.FUNDED,
                    ROOM_STEPS.RELEASING,
                    ROOM_STEPS.CANCELLING,
                  ].includes(room.step as any)
                }
              />
              <ProgressStep
                step={3}
                label="Amount Agreed"
                isActive={room.step === ROOM_STEPS.AMOUNT_AGREEMENT}
                isComplete={
                  [
                    ROOM_STEPS.FEE_SELECTION,
                    ROOM_STEPS.AWAITING_DEPOSIT,
                    ROOM_STEPS.FUNDED,
                    ROOM_STEPS.RELEASING,
                    ROOM_STEPS.CANCELLING,
                  ].includes(room.step as any)
                }
              />
              <ProgressStep
                step={4}
                label="Fee Selected"
                isActive={room.step === ROOM_STEPS.FEE_SELECTION}
                isComplete={
                  [
                    ROOM_STEPS.AWAITING_DEPOSIT,
                    ROOM_STEPS.FUNDED,
                    ROOM_STEPS.RELEASING,
                    ROOM_STEPS.CANCELLING,
                  ].includes(room.step as any)
                }
              />
              <ProgressStep
                step={5}
                label="Deposit Received"
                isActive={room.step === ROOM_STEPS.AWAITING_DEPOSIT}
                isComplete={
                  [ROOM_STEPS.FUNDED, ROOM_STEPS.RELEASING, ROOM_STEPS.CANCELLING].includes(
                    room.step as any
                  )
                }
              />
              <ProgressStep
                step={6}
                label="Complete"
                isActive={
                  room.step === ROOM_STEPS.FUNDED ||
                  room.step === ROOM_STEPS.RELEASING ||
                  room.step === ROOM_STEPS.CANCELLING
                }
                isComplete={
                  room.status === ROOM_STATUSES.COMPLETED ||
                  room.status === ROOM_STATUSES.CANCELLED
                }
              />
            </div>
          </GlassCard>

          {/* Participants */}
          <GlassCard className="border border-slate-800/80 p-4">
            <h3 className="mb-3 text-sm font-medium text-slate-200">
              Participants
            </h3>
            <div className="space-y-3">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">
                      {p.user?.name || "User"}
                      {p.userId === user?.id && (
                        <span className="ml-1 text-xs text-slate-500">(You)</span>
                      )}
                    </p>
                    {p.role && (
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.role === ROLES.SENDER
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {p.role === ROLES.SENDER ? "Sender" : "Receiver"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {participants.length < 2 && (
                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-3 py-4 text-center">
                  <p className="text-xs text-slate-500">Waiting for peer to join...</p>
                  <p className="mt-1 font-mono text-sm text-slate-400">
                    {room.roomCode}
                  </p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Close Room Button - Only show before deposit phase */}
          {room.status === ROOM_STATUSES.OPEN &&
            [
              ROOM_STEPS.WAITING_FOR_PEER,
              ROOM_STEPS.ROLE_SELECTION,
              ROOM_STEPS.AMOUNT_AGREEMENT,
              ROOM_STEPS.FEE_SELECTION,
              ROOM_STEPS.AWAITING_DEPOSIT,
            ].includes(room.step as any) && (
              <GlassCard className="border border-red-500/20 bg-red-500/5 p-4">
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-3">
                    Want to close this room? Both parties must confirm.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleAction("close_room")}
                    disabled={actionLoading === "close_room"}
                  >
                    {actionLoading === "close_room" ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-3 w-3" />
                    )}
                    Close Room
                  </Button>
                </div>
              </GlassCard>
            )}

          {/* Deal Info */}
          {room.amount && (
            <GlassCard className="border border-slate-800/80 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-200">Deal Info</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Amount</dt>
                  <dd className="font-medium text-slate-100">
                    {formatAmount(room.amount)} USDT
                  </dd>
                </div>
                {room.feePayer && (
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">Fee Payer</dt>
                    <dd className="capitalize text-slate-100">{room.feePayer}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">Fee (1%)</dt>
                  <dd className="text-slate-100">
                    {formatAmount(((Number(room.amount) * 0.01)).toString())} USDT
                  </dd>
                </div>
              </dl>
            </GlassCard>
          )}

          {/* Deposit Info */}
          {depositInfo?.escrowAddress && (
            <GlassCard className="border border-slate-800/80 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-200">
                Escrow Deposit
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400">Deposit Address</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-slate-900 px-2 py-1 text-xs text-slate-200">
                      {depositInfo.escrowAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => copyToClipboard(depositInfo.escrowAddress!)}
                    >
                      {copiedAddress ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {depositInfo.expectedAmount && (
                  <div>
                    <p className="text-xs text-slate-400">Expected Amount</p>
                    <p className="mt-1 text-sm font-medium text-slate-200">
                      {depositInfo.expectedAmount} USDT
                    </p>
                  </div>
                )}

                {depositInfo.depositTxHash && (
                  <div>
                    <p className="text-xs text-slate-400">Deposit Transaction</p>
                    <a
                      href={`${depositInfo.explorerUrl}/tx/${depositInfo.depositTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs text-accent-blue hover:underline"
                    >
                      {shortenAddress(depositInfo.depositTxHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {room.step === ROOM_STEPS.AWAITING_DEPOSIT && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleAction("check-deposit")}
                      disabled={actionLoading === "check-deposit"}
                    >
                      {actionLoading === "check-deposit" ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-3 w-3" />
                      )}
                      Check Deposit
                    </Button>
                    {/* Mock Deposit for testing on testnet */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full border-dashed text-xs opacity-70 hover:opacity-100"
                      onClick={() => handleAction("mock-deposit")}
                      disabled={actionLoading === "mock-deposit"}
                    >
                      {actionLoading === "mock-deposit" ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : null}
                      Simulate Deposit (Testnet)
                    </Button>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Sub Components ============

// Simple markdown renderer for **bold** text
function renderMarkdownText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

interface MessageBubbleProps {
  message: Message;
  currentUserId?: string;
  onAction: (action: string, data?: unknown) => void;
  actionLoading: string | null;
  amountInput: string;
  setAmountInput: (value: string) => void;
  addressInput: string;
  setAddressInput: (value: string) => void;
  currentParticipant?: Participant;
  room: Room;
}

function MessageBubble({
  message,
  currentUserId,
  onAction,
  actionLoading,
  amountInput,
  setAmountInput,
  addressInput,
  setAddressInput,
  currentParticipant,
  room,
}: MessageBubbleProps) {
  const isCurrentUser = message.senderId === currentUserId;
  const isBot = message.senderType === "bot";
  const isSystem = message.senderType === "system";

  // Parse metadata if it's a string
  let metadata: BotMessageMetadata | undefined;
  if (message.metadata) {
    if (typeof message.metadata === "string") {
      try {
        metadata = JSON.parse(message.metadata);
      } catch {
        metadata = undefined;
      }
    } else {
      metadata = message.metadata;
    }
  }

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-slate-800/50 px-3 py-1 text-xs text-slate-400">
          {renderMarkdownText(message.text)}
        </span>
      </div>
    );
  }

  if (isBot) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] space-y-2">
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue/20">
                <Bot className="h-3 w-3 text-accent-blue" />
              </div>
              <span className="text-xs font-medium text-accent-blue">Escrow Bot</span>
              <span className="text-xs text-slate-500">
                {formatTimeAgo(message.createdAt)}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-all text-sm text-slate-200">{renderMarkdownText(message.text)}</p>
          </div>

          {/* Action Buttons */}
          {metadata?.buttons && metadata.buttons.length > 0 && (
            <BotActionButtons
              buttons={metadata.buttons}
              action={metadata.action}
              onAction={onAction}
              actionLoading={actionLoading}
              amountInput={amountInput}
              setAmountInput={setAmountInput}
              addressInput={addressInput}
              setAddressInput={setAddressInput}
              currentParticipant={currentParticipant}
              room={room}
            />
          )}
        </div>
      </div>
    );
  }

  // User message
  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2 ${
          isCurrentUser
            ? "bg-gradient-to-br from-accent-blue to-accent-green text-slate-950"
            : "border border-slate-700/50 bg-slate-800/50 text-slate-100"
        }`}
      >
        <div className="mb-0.5 flex items-center gap-2 text-xs">
          <span className={`font-medium ${isCurrentUser ? "text-slate-800" : "text-slate-300"}`}>
            {isCurrentUser ? "You" : message.sender?.name || "User"}
          </span>
          <span className={isCurrentUser ? "text-slate-700" : "text-slate-500"}>
            {formatTimeAgo(message.createdAt)}
          </span>
        </div>
        <p className="text-sm">{message.text}</p>
      </div>
    </div>
  );
}

interface BotActionButtonsProps {
  buttons: { id: string; label: string; action: string; variant: string }[];
  action?: string;
  onAction: (action: string, data?: unknown) => void;
  actionLoading: string | null;
  amountInput: string;
  setAmountInput: (value: string) => void;
  addressInput: string;
  setAddressInput: (value: string) => void;
  currentParticipant?: Participant;
  room: Room;
}

function BotActionButtons({
  buttons,
  action,
  onAction,
  actionLoading,
  amountInput,
  setAmountInput,
  addressInput,
  setAddressInput,
  currentParticipant,
  room,
}: BotActionButtonsProps) {
  // Check if we need an input field
  const needsAmountInput = action === "propose_amount";
  const needsPayoutAddressInput = action === "request_payout_address";
  const needsRefundAddressInput = action === "request_refund_address";

  // Only show payout address input to receiver
  const canSubmitPayoutAddress = needsPayoutAddressInput && currentParticipant?.role === ROLES.RECEIVER;
  // Only show refund address input to sender
  const canSubmitRefundAddress = needsRefundAddressInput && currentParticipant?.role === ROLES.SENDER;

  return (
    <div className="space-y-2 rounded-lg bg-slate-800/30 p-3">
      {needsAmountInput && (
        <div className="mb-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Enter amount in USDT"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="bg-slate-900/50"
          />
        </div>
      )}

      {canSubmitPayoutAddress && (
        <div className="mb-2">
          <Input
            type="text"
            placeholder="Enter your wallet address (0x...)"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="bg-slate-900/50 font-mono text-sm"
          />
        </div>
      )}

      {canSubmitRefundAddress && (
        <div className="mb-2">
          <Input
            type="text"
            placeholder="Enter your wallet address (0x...)"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="bg-slate-900/50 font-mono text-sm"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => {
          const isLoading = actionLoading === button.id;
          const isDisabled = isLoading;

          // Hide payout address buttons if not receiver
          if (
            (button.id === "submit_payout_address" ||
             button.id === "confirm_address" ||
             button.id === "change_address") &&
            currentParticipant?.role !== ROLES.RECEIVER
          ) {
            return null;
          }
          // Hide refund address buttons if not sender
          if (
            (button.id === "submit_refund_address" ||
             button.id === "confirm_refund" ||
             button.id === "change_refund") &&
            currentParticipant?.role !== ROLES.SENDER
          ) {
            return null;
          }
          // Hide release button if not sender (only sender can initiate release)
          if (button.id === "release" && currentParticipant?.role !== ROLES.SENDER) {
            return null;
          }
          // Hide release confirmation buttons if not receiver (receiver confirms sender's request)
          if (
            (button.id === "confirm_release" || button.id === "cancel_release") &&
            currentParticipant?.role !== ROLES.RECEIVER
          ) {
            return null;
          }

          return (
            <Button
              key={button.id}
              variant={button.variant === "primary" ? "default" : "outline"}
              size="sm"
              onClick={() => onAction(button.id)}
              disabled={isDisabled}
              className={
                button.variant === "danger"
                  ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                  : ""
              }
            >
              {isLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              {button.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

interface ProgressStepProps {
  step: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function ProgressStep({ step, label, isActive, isComplete }: ProgressStepProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          isComplete
            ? "bg-emerald-500/20 text-emerald-400"
            : isActive
              ? "bg-sky-500/20 text-sky-400"
              : "bg-slate-800 text-slate-500"
        }`}
      >
        {isComplete ? <Check className="h-3 w-3" /> : step}
      </div>
      <span
        className={`text-xs ${
          isComplete
            ? "text-emerald-400"
            : isActive
              ? "text-sky-400"
              : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
