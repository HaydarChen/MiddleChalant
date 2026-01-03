import { roomService } from "./room.service";
import { messageService } from "./message.service";
import { blockchainService } from "./blockchain.service";
import { transactionService } from "./transaction.service";
import { participantRepository } from "@/repositories";
import { db } from "@/lib/db";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Room, Participant, BotMessageMetadata } from "@/types";
import {
  ROOM_STEPS,
  ROOM_STATUSES,
  ROLES,
  FEE_PAYERS,
  FEE_PERCENTAGE,
  type RoomStep,
  type Role,
  type FeePayer,
} from "@/types";
import { getChainConfig, formatUsdtAmount, USDT_DECIMALS } from "@/config/chains";

// ============ Bot Message Templates ============

const BOT_MESSAGES = {
  // Room created - waiting for peer
  WAITING_FOR_PEER: (room: Room) => ({
    text: `Welcome! Room "${room.name}" has been created.\n\nShare this code with the other party to join:\n\n**${room.roomCode}**\n\nWaiting for the other user to join...`,
    metadata: {
      action: "waiting_for_peer",
      data: { roomCode: room.roomCode },
    } as BotMessageMetadata,
  }),

  // Second user joined - start role selection
  PEER_JOINED: (joinerName: string) => ({
    text: `**${joinerName}** has joined the room!\n\nNow both parties need to select their roles.`,
    metadata: { action: "peer_joined" } as BotMessageMetadata,
  }),

  ROLE_SELECTION: () => ({
    text: `**Role Assignment**\n\nSelect your role in this transaction:\n\n• **Sender** - The one who will send USDT to escrow\n• **Receiver** - The one who will receive USDT from escrow\n\nBoth users must select different roles to proceed.`,
    metadata: {
      action: "role_selection",
      buttons: [
        { id: "select_sender", label: "I am Sender", action: "select_role", variant: "primary" as const },
        { id: "select_receiver", label: "I am Receiver", action: "select_role", variant: "primary" as const },
      ],
    } as BotMessageMetadata,
  }),

  ROLE_SELECTED: (userName: string, role: string) => ({
    text: `**${userName}** selected: **${role === ROLES.SENDER ? "Sender" : "Receiver"}**`,
    metadata: { action: "role_selected", data: { role } } as BotMessageMetadata,
  }),

  ROLE_CONFLICT: () => ({
    text: `Both users selected the same role. Please coordinate and select different roles.\n\nUse the **Reset** button to start over.`,
    metadata: {
      action: "role_conflict",
      buttons: [
        { id: "reset_roles", label: "Reset Roles", action: "reset_roles", variant: "danger" as const },
      ],
    } as BotMessageMetadata,
  }),

  // Role confirmation - ask both users to confirm
  ROLES_PENDING_CONFIRMATION: (senderName: string, receiverName: string) => ({
    text: `**Role Summary**\n\n• **Sender**: ${senderName}\n• **Receiver**: ${receiverName}\n\nBoth parties must confirm these roles are correct.`,
    metadata: {
      action: "roles_pending_confirmation",
      buttons: [
        { id: "confirm_roles", label: "Confirm Roles", action: "confirm_roles", variant: "primary" as const },
        { id: "reset_roles", label: "Change Roles", action: "reset_roles", variant: "secondary" as const },
      ],
    } as BotMessageMetadata,
  }),

  ROLE_CONFIRMED_BY: (userName: string) => ({
    text: `**${userName}** confirmed the roles.`,
    metadata: { action: "role_confirmed_by" } as BotMessageMetadata,
  }),

  ROLES_CONFIRMED: (senderName: string, receiverName: string) => ({
    text: `Roles confirmed!\n\n• **Sender**: ${senderName}\n• **Receiver**: ${receiverName}\n\nProceeding to deal amount...`,
    metadata: { action: "roles_confirmed" } as BotMessageMetadata,
  }),

  // Amount agreement phase
  AMOUNT_AGREEMENT: (senderName: string) => ({
    text: `**Deal Amount**\n\n${senderName}, please enter the deal amount in USDT.`,
    metadata: {
      action: "propose_amount",
      buttons: [
        { id: "submit_amount", label: "Submit Amount", action: "propose_amount", variant: "primary" as const },
      ],
    } as BotMessageMetadata,
  }),

  AMOUNT_PROPOSED: (amount: string, userName: string) => ({
    text: `**${userName}** proposed amount: **$${amount} USDT**\n\nBoth parties must confirm this amount.`,
    metadata: {
      action: "amount_proposed",
      data: { amount },
      buttons: [
        { id: "confirm_amount", label: "Confirm", action: "confirm_amount", variant: "primary" as const },
        { id: "reject_amount", label: "Reject", action: "reject_amount", variant: "danger" as const },
      ],
    } as BotMessageMetadata,
  }),

  AMOUNT_CONFIRMED_BY: (userName: string) => ({
    text: `**${userName}** confirmed the amount.`,
    metadata: { action: "amount_confirmed_by" } as BotMessageMetadata,
  }),

  AMOUNT_REJECTED: (userName: string) => ({
    text: `**${userName}** rejected the amount. Please propose a new amount.`,
    metadata: { action: "amount_rejected" } as BotMessageMetadata,
  }),

  // Fee selection phase
  FEE_SELECTION: (amount: string, fee: string) => ({
    text: `**Fee Configuration**\n\nDeal Amount: **$${amount} USDT**\nService Fee (${FEE_PERCENTAGE}%): **$${fee} USDT**\n\nWho will pay the fee?`,
    metadata: {
      action: "fee_selection",
      data: { amount, fee },
      buttons: [
        { id: "fee_sender", label: "Sender pays", action: "select_fee_payer", variant: "primary" as const },
        { id: "fee_receiver", label: "Receiver pays", action: "select_fee_payer", variant: "primary" as const },
        { id: "fee_split", label: "Split 50/50", action: "select_fee_payer", variant: "primary" as const },
      ],
    } as BotMessageMetadata,
  }),

  FEE_PAYER_SELECTED: (userName: string, feePayer: string) => ({
    text: `**${userName}** selected: **${formatFeePayer(feePayer)}**`,
    metadata: { action: "fee_payer_selected", data: { feePayer } } as BotMessageMetadata,
  }),

  // Fee confirmation - ask both users to confirm
  FEE_PENDING_CONFIRMATION: (feePayer: string, amount: string, fee: string, depositAmount: string, receiverGets: string) => ({
    text: `**Fee Summary**\n\n` +
      `• Fee Option: **${formatFeePayer(feePayer)}**\n` +
      `• Deal Amount: **$${amount} USDT**\n` +
      `• Fee (${FEE_PERCENTAGE}%): **$${fee} USDT**\n\n` +
      `Sender will deposit: **$${depositAmount} USDT**\n` +
      `Receiver will get: **$${receiverGets} USDT**\n\n` +
      `Both parties must confirm this fee arrangement.`,
    metadata: {
      action: "fee_pending_confirmation",
      buttons: [
        { id: "confirm_fee", label: "Confirm Fee", action: "confirm_fee", variant: "primary" as const },
        { id: "change_fee", label: "Change Fee", action: "change_fee", variant: "secondary" as const },
      ],
    } as BotMessageMetadata,
  }),

  FEE_CONFIRMED_BY: (userName: string) => ({
    text: `**${userName}** confirmed the fee arrangement.`,
    metadata: { action: "fee_confirmed_by" } as BotMessageMetadata,
  }),

  // Deal summary before deposit
  DEAL_SUMMARY: (
    senderName: string,
    receiverName: string,
    dealAmount: string,
    fee: string,
    feePayer: string,
    depositAmount: string,
    receiverGets: string,
    chainName: string,
    escrowAddress: string
  ) => ({
    text: `**Deal Summary**\n\n` +
      `• Sender: **${senderName}**\n` +
      `• Receiver: **${receiverName}**\n` +
      `• Deal Amount: **$${dealAmount} USDT**\n` +
      `• Fee (${FEE_PERCENTAGE}%): **$${fee} USDT** (${formatFeePayer(feePayer)})\n` +
      `• Network: **${chainName}**\n\n` +
      `**Total to Deposit: $${depositAmount} USDT**\n` +
      `Receiver will get: **$${receiverGets} USDT**\n\n` +
      `**Escrow Address:**\n${escrowAddress}`,
    metadata: {
      action: "deal_summary",
      data: { dealAmount, fee, feePayer, depositAmount, receiverGets, escrowAddress },
    } as BotMessageMetadata,
  }),

  // Awaiting deposit
  AWAITING_DEPOSIT: (escrowAddress: string, depositAmount: string, chainName: string) => ({
    text: `**Send Payment**\n\n` +
      `Please send exactly **$${depositAmount} USDT** to:\n\n` +
      `${escrowAddress}\n\n` +
      `Network: **${chainName}**\n\n` +
      `The bot will automatically detect your payment once confirmed on the blockchain.`,
    metadata: {
      action: "awaiting_deposit",
      data: { escrowAddress, depositAmount },
    } as BotMessageMetadata,
  }),

  // Deposit received
  DEPOSIT_RECEIVED: (amount: string, txHash: string) => ({
    text: `**Payment Received!**\n\n` +
      `Amount: **$${amount} USDT**\n` +
      `Transaction:\n${txHash}\n\n` +
      `The funds are now secured in escrow. Once the receiver delivers the goods/service, ` +
      `the sender can release the payment.`,
    metadata: {
      action: "deposit_received",
      data: { amount, txHash },
      buttons: [
        { id: "release", label: "Release Payment", action: "release", variant: "primary" as const },
        { id: "cancel", label: "Cancel Deal", action: "cancel", variant: "danger" as const },
      ],
    } as BotMessageMetadata,
  }),

  // Release flow
  RELEASE_REQUESTED: (senderName: string) => ({
    text: `**${senderName}** wants to release the payment.\n\nPlease confirm to proceed.`,
    metadata: {
      action: "release_requested",
      buttons: [
        { id: "confirm_release", label: "Confirm Release", action: "confirm_release", variant: "primary" as const },
        { id: "cancel_release", label: "Cancel", action: "cancel_release", variant: "secondary" as const },
      ],
    } as BotMessageMetadata,
  }),

  REQUEST_PAYOUT_ADDRESS: (receiverName: string) => ({
    text: `**${receiverName}**, please provide your wallet address to receive the payment.`,
    metadata: {
      action: "request_payout_address",
      buttons: [
        { id: "submit_payout_address", label: "Submit Address", action: "submit_payout_address", variant: "primary" as const },
      ],
    } as BotMessageMetadata,
  }),

  CONFIRM_PAYOUT_ADDRESS: (address: string) => ({
    text: `**Confirm Wallet Address**\n\nIs this correct?\n\n${address}\n\n⚠️ Once confirmed, the funds will be sent to this address and cannot be recovered if incorrect.`,
    metadata: {
      action: "confirm_payout_address",
      data: { address },
      buttons: [
        { id: "confirm_address", label: "Confirm Address", action: "confirm_payout", variant: "primary" as const },
        { id: "change_address", label: "Change Address", action: "change_payout", variant: "secondary" as const },
      ],
    } as BotMessageMetadata,
  }),

  PAYMENT_RELEASED: (receiverName: string, amount: string, txHash: string) => ({
    text: `**Payment Released!**\n\n` +
      `**$${amount} USDT** has been sent to **${receiverName}**.\n\n` +
      `Transaction:\n${txHash}`,
    metadata: { action: "payment_released", data: { amount, txHash } } as BotMessageMetadata,
  }),

  // Cancel flow
  CANCEL_REQUESTED: (senderName: string) => ({
    text: `**${senderName}** wants to cancel the deal and refund the payment.\n\n` +
      `The receiver must confirm cancellation.`,
    metadata: {
      action: "cancel_requested",
      buttons: [
        { id: "confirm_cancel", label: "Confirm Cancel", action: "confirm_cancel", variant: "danger" as const },
        { id: "reject_cancel", label: "Reject", action: "reject_cancel", variant: "secondary" as const },
      ],
    } as BotMessageMetadata,
  }),

  REQUEST_REFUND_ADDRESS: (senderName: string) => ({
    text: `**${senderName}**, please provide your wallet address for the refund.`,
    metadata: {
      action: "request_refund_address",
      buttons: [
        { id: "submit_refund_address", label: "Submit Address", action: "submit_refund_address", variant: "primary" as const },
      ],
    } as BotMessageMetadata,
  }),

  PAYMENT_REFUNDED: (senderName: string, amount: string, txHash: string) => ({
    text: `**Payment Refunded**\n\n` +
      `**$${amount} USDT** has been refunded to **${senderName}**.\n\n` +
      `Transaction:\n${txHash}`,
    metadata: { action: "payment_refunded", data: { amount, txHash } } as BotMessageMetadata,
  }),

  // Deal completion
  DEAL_COMPLETED: () => ({
    text: `**Deal Complete!**\n\n` +
      `Thank you for using our escrow service. This room will be archived.\n\n` +
      `The transaction has been recorded in the public history.`,
    metadata: { action: "deal_completed" } as BotMessageMetadata,
  }),

  DEAL_CANCELLED: () => ({
    text: `**Deal Cancelled**\n\n` +
      `The deal has been cancelled and funds have been refunded. This room will be archived.`,
    metadata: { action: "deal_cancelled" } as BotMessageMetadata,
  }),

  // Close room (before deposit)
  CLOSE_ROOM_REQUESTED: (userName: string) => ({
    text: `**${userName}** wants to close this room.\n\nBoth parties must confirm to close the room.`,
    metadata: {
      action: "close_room_requested",
      buttons: [
        { id: "confirm_close_room", label: "Confirm Close", action: "confirm_close_room", variant: "danger" as const },
        { id: "reject_close_room", label: "Cancel", action: "reject_close_room", variant: "secondary" as const },
      ],
    } as BotMessageMetadata,
  }),

  CLOSE_ROOM_CONFIRMED_BY: (userName: string) => ({
    text: `**${userName}** confirmed closing the room.`,
    metadata: { action: "close_room_confirmed_by" } as BotMessageMetadata,
  }),

  ROOM_CLOSED: () => ({
    text: `**Room Closed**\n\n` +
      `This room has been closed by mutual agreement. No funds were deposited.`,
    metadata: { action: "room_closed" } as BotMessageMetadata,
  }),

  // Timeout messages
  ROOM_EXPIRED_PRE_FUNDING: () => ({
    text: `**Room Expired**\n\n` +
      `This room has been inactive for too long and has expired.\n\n` +
      `No funds were deposited, so no action is needed.`,
    metadata: { action: "room_expired" } as BotMessageMetadata,
  }),

  ROOM_EXPIRED_AWAITING_DEPOSIT: () => ({
    text: `**Room Expired - Deposit Timeout**\n\n` +
      `The deposit was not received within the time limit.\n\n` +
      `This room has been closed. Please create a new room to try again.`,
    metadata: { action: "room_expired_deposit" } as BotMessageMetadata,
  }),

  TIMEOUT_WARNING: (minutesRemaining: number) => ({
    text: `⚠️ **Timeout Warning**\n\n` +
      `This room will expire in **${minutesRemaining} minutes** if no action is taken.`,
    metadata: { action: "timeout_warning", data: { minutesRemaining } } as BotMessageMetadata,
  }),
};

// ============ Helper Functions ============

function formatFeePayer(feePayer: string): string {
  switch (feePayer) {
    case FEE_PAYERS.SENDER:
      return "Sender pays fee";
    case FEE_PAYERS.RECEIVER:
      return "Receiver pays fee";
    case FEE_PAYERS.SPLIT:
      return "Split 50/50";
    default:
      return feePayer;
  }
}

function calculateFee(amount: string): string {
  const amountBigInt = BigInt(amount);
  const fee = amountBigInt / 100n; // 1%
  return fee.toString();
}

function calculateDepositAmount(dealAmount: string, fee: string, feePayer: FeePayer): string {
  const amount = BigInt(dealAmount);
  const feeAmount = BigInt(fee);

  switch (feePayer) {
    case FEE_PAYERS.SENDER:
      return (amount + feeAmount).toString();
    case FEE_PAYERS.RECEIVER:
      return amount.toString();
    case FEE_PAYERS.SPLIT:
      return (amount + feeAmount / 2n).toString();
    default:
      return amount.toString();
  }
}

function calculateReceiverAmount(dealAmount: string, fee: string, feePayer: FeePayer): string {
  const amount = BigInt(dealAmount);
  const feeAmount = BigInt(fee);

  switch (feePayer) {
    case FEE_PAYERS.SENDER:
      return amount.toString();
    case FEE_PAYERS.RECEIVER:
      return (amount - feeAmount).toString();
    case FEE_PAYERS.SPLIT:
      return (amount - feeAmount / 2n).toString();
    default:
      return amount.toString();
  }
}

async function getUserName(userId: string): Promise<string> {
  try {
    const result = await db.query.user.findFirst({
      where: eq(userTable.id, userId),
      columns: { name: true },
    });
    return result?.name || "User";
  } catch (error) {
    console.error("Failed to fetch user name:", error);
    return "User";
  }
}

// ============ Bot Service ============

export const botService = {
  /**
   * Send a bot message to a room
   */
  async sendBotMessage(
    roomId: string,
    text: string,
    metadata?: BotMessageMetadata
  ): Promise<void> {
    await messageService.sendBotMessage(roomId, text, metadata);
  },

  /**
   * Handle room creation - send welcome message
   */
  async onRoomCreated(room: Room): Promise<void> {
    const msg = BOT_MESSAGES.WAITING_FOR_PEER(room);
    await this.sendBotMessage(room.id, msg.text, msg.metadata);
  },

  /**
   * Handle user joining - send appropriate messages
   */
  async onUserJoined(room: Room, userId: string): Promise<void> {
    const participants = await roomService.getRoomParticipants(room.id);
    const userName = await getUserName(userId);

    // Send join notification
    const joinMsg = BOT_MESSAGES.PEER_JOINED(userName);
    await this.sendBotMessage(room.id, joinMsg.text, joinMsg.metadata);

    // If room now has 2 participants, start role selection
    if (participants.length === 2) {
      const roleMsg = BOT_MESSAGES.ROLE_SELECTION();
      await this.sendBotMessage(room.id, roleMsg.text, roleMsg.metadata);
    }
  },

  /**
   * Handle role selection
   */
  async onRoleSelected(
    room: Room,
    userId: string,
    role: Role
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.ROLE_SELECTION) {
      return { ok: false, error: "Not in role selection phase" };
    }

    // Update participant role (but don't confirm yet - that's a separate step)
    await participantRepository.update(participant.id, { role, roleConfirmed: false });

    const userName = await getUserName(userId);
    const msg = BOT_MESSAGES.ROLE_SELECTED(userName, role);
    await this.sendBotMessage(room.id, msg.text, msg.metadata);

    // Check if both users have selected roles
    const participants = await roomService.getRoomParticipants(room.id);
    const withRoles = participants.filter((p) => p.role !== null);

    if (withRoles.length === 2) {
      // Check for role conflict
      const roles = withRoles.map((p) => p.role);
      if (roles[0] === roles[1]) {
        // Conflict - both selected same role
        const conflictMsg = BOT_MESSAGES.ROLE_CONFLICT();
        await this.sendBotMessage(room.id, conflictMsg.text, conflictMsg.metadata);
        return { ok: true };
      }

      // Roles are valid - ask for confirmation from both users
      const sender = withRoles.find((p) => p.role === ROLES.SENDER)!;
      const receiver = withRoles.find((p) => p.role === ROLES.RECEIVER)!;

      const senderName = await getUserName(sender.userId);
      const receiverName = await getUserName(receiver.userId);

      const confirmMsg = BOT_MESSAGES.ROLES_PENDING_CONFIRMATION(senderName, receiverName);
      await this.sendBotMessage(room.id, confirmMsg.text, confirmMsg.metadata);
    }

    return { ok: true };
  },

  /**
   * Handle role confirmation (both users must confirm)
   */
  async onRolesConfirmed(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.ROLE_SELECTION) {
      return { ok: false, error: "Not in role selection phase" };
    }

    if (!participant.role) {
      return { ok: false, error: "You haven't selected a role yet" };
    }

    // Mark as confirmed
    await participantRepository.update(participant.id, { roleConfirmed: true });

    const userName = await getUserName(userId);
    const confirmMsg = BOT_MESSAGES.ROLE_CONFIRMED_BY(userName);
    await this.sendBotMessage(room.id, confirmMsg.text, confirmMsg.metadata);

    // Check if both confirmed
    const participants = await roomService.getRoomParticipants(room.id);
    const allConfirmed = participants.every((p) => p.roleConfirmed && p.role);

    if (allConfirmed) {
      const sender = participants.find((p) => p.role === ROLES.SENDER)!;
      const receiver = participants.find((p) => p.role === ROLES.RECEIVER)!;

      const senderName = await getUserName(sender.userId);
      const receiverName = await getUserName(receiver.userId);

      const rolesConfirmedMsg = BOT_MESSAGES.ROLES_CONFIRMED(senderName, receiverName);
      await this.sendBotMessage(room.id, rolesConfirmedMsg.text, rolesConfirmedMsg.metadata);

      // Advance to amount agreement
      await roomService.updateRoomStep(room.id, ROOM_STEPS.AMOUNT_AGREEMENT);

      const amountMsg = BOT_MESSAGES.AMOUNT_AGREEMENT(senderName);
      await this.sendBotMessage(room.id, amountMsg.text, amountMsg.metadata);
    }

    return { ok: true };
  },

  /**
   * Reset roles (for conflict resolution or changing roles)
   */
  async onResetRoles(room: Room, userId: string): Promise<{ ok: boolean; error?: string }> {
    if (room.step !== ROOM_STEPS.ROLE_SELECTION) {
      return { ok: false, error: "Not in role selection phase" };
    }

    // Reset all participants' roles
    const participants = await roomService.getRoomParticipants(room.id);
    for (const p of participants) {
      await participantRepository.update(p.id, { role: null, roleConfirmed: false });
    }

    // Send role selection message again
    const roleMsg = BOT_MESSAGES.ROLE_SELECTION();
    await this.sendBotMessage(room.id, roleMsg.text, roleMsg.metadata);

    return { ok: true };
  },

  /**
   * Handle amount proposal
   */
  async onAmountProposed(
    room: Room,
    userId: string,
    amount: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.AMOUNT_AGREEMENT) {
      return { ok: false, error: "Not in amount agreement phase" };
    }

    // Only sender can propose amount
    if (participant.role !== ROLES.SENDER) {
      return { ok: false, error: "Only the sender can propose the amount" };
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { ok: false, error: "Invalid amount" };
    }

    // Convert to smallest unit (USDT has 6 decimals)
    const amountInSmallestUnit = BigInt(Math.floor(amountNum * 10 ** USDT_DECIMALS)).toString();

    // Store amount in room
    await roomService.setRoomAmount(room.id, amountInSmallestUnit);

    // Reset amount confirmations
    const participants = await roomService.getRoomParticipants(room.id);
    for (const p of participants) {
      await participantRepository.update(p.id, { amountConfirmed: false });
    }

    const userName = await getUserName(userId);
    const msg = BOT_MESSAGES.AMOUNT_PROPOSED(amount, userName);
    await this.sendBotMessage(room.id, msg.text, msg.metadata);

    return { ok: true };
  },

  /**
   * Handle amount confirmation
   */
  async onAmountConfirmed(
    room: Room,
    userId: string,
    confirmed: boolean
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.AMOUNT_AGREEMENT) {
      return { ok: false, error: "Not in amount agreement phase" };
    }

    if (!room.amount) {
      return { ok: false, error: "No amount has been proposed yet" };
    }

    const userName = await getUserName(userId);

    if (!confirmed) {
      // Amount rejected - reset
      await roomService.setRoomAmount(room.id, null as any);
      const participants = await roomService.getRoomParticipants(room.id);
      for (const p of participants) {
        await participantRepository.update(p.id, { amountConfirmed: false });
      }

      const rejectMsg = BOT_MESSAGES.AMOUNT_REJECTED(userName);
      await this.sendBotMessage(room.id, rejectMsg.text, rejectMsg.metadata);

      // Ask for new amount
      const sender = participants.find((p) => p.role === ROLES.SENDER)!;
      const senderName = await getUserName(sender.userId);
      const amountMsg = BOT_MESSAGES.AMOUNT_AGREEMENT(senderName);
      await this.sendBotMessage(room.id, amountMsg.text, amountMsg.metadata);

      return { ok: true };
    }

    // Confirm amount
    await participantRepository.update(participant.id, { amountConfirmed: true });

    const confirmMsg = BOT_MESSAGES.AMOUNT_CONFIRMED_BY(userName);
    await this.sendBotMessage(room.id, confirmMsg.text, confirmMsg.metadata);

    // Check if both confirmed
    const participants = await roomService.getRoomParticipants(room.id);
    const allConfirmed = participants.every((p) => p.amountConfirmed);

    if (allConfirmed) {
      // Proceed to fee selection
      await roomService.updateRoomStep(room.id, ROOM_STEPS.FEE_SELECTION);

      const fee = calculateFee(room.amount);
      const feeDisplay = formatUsdtAmount(fee);
      const amountDisplay = formatUsdtAmount(room.amount);

      const feeMsg = BOT_MESSAGES.FEE_SELECTION(amountDisplay, feeDisplay);
      await this.sendBotMessage(room.id, feeMsg.text, feeMsg.metadata);
    }

    return { ok: true };
  },

  /**
   * Handle fee payer selection
   */
  async onFeePayerSelected(
    room: Room,
    userId: string,
    feePayer: FeePayer
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.FEE_SELECTION) {
      return { ok: false, error: "Not in fee selection phase" };
    }

    if (!room.amount) {
      return { ok: false, error: "Amount not set" };
    }

    // Store fee payer
    await roomService.setFeePayer(room.id, feePayer);

    // Reset fee confirmations (don't auto-confirm - require explicit confirmation)
    const participants = await roomService.getRoomParticipants(room.id);
    for (const p of participants) {
      await participantRepository.update(p.id, { feeConfirmed: false });
    }

    const userName = await getUserName(userId);
    const selectedMsg = BOT_MESSAGES.FEE_PAYER_SELECTED(userName, feePayer);
    await this.sendBotMessage(room.id, selectedMsg.text, selectedMsg.metadata);

    // Calculate amounts for confirmation message
    const fee = calculateFee(room.amount);
    const depositAmount = calculateDepositAmount(room.amount, fee, feePayer);
    const receiverGets = calculateReceiverAmount(room.amount, fee, feePayer);

    // Show confirmation message
    const confirmMsg = BOT_MESSAGES.FEE_PENDING_CONFIRMATION(
      feePayer,
      formatUsdtAmount(room.amount),
      formatUsdtAmount(fee),
      formatUsdtAmount(depositAmount),
      formatUsdtAmount(receiverGets)
    );
    await this.sendBotMessage(room.id, confirmMsg.text, confirmMsg.metadata);

    return { ok: true };
  },

  /**
   * Handle fee change request (go back to fee selection)
   */
  async onFeeChangeRequested(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (room.step !== ROOM_STEPS.FEE_SELECTION) {
      return { ok: false, error: "Not in fee selection phase" };
    }

    if (!room.amount) {
      return { ok: false, error: "Amount not set" };
    }

    // Reset fee payer and confirmations
    await roomService.setFeePayer(room.id, null as any);
    const participants = await roomService.getRoomParticipants(room.id);
    for (const p of participants) {
      await participantRepository.update(p.id, { feeConfirmed: false });
    }

    // Show fee selection again
    const fee = calculateFee(room.amount);
    const feeMsg = BOT_MESSAGES.FEE_SELECTION(formatUsdtAmount(room.amount), formatUsdtAmount(fee));
    await this.sendBotMessage(room.id, feeMsg.text, feeMsg.metadata);

    return { ok: true };
  },

  /**
   * Handle fee confirmation
   */
  async onFeeConfirmed(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.FEE_SELECTION) {
      return { ok: false, error: "Not in fee selection phase" };
    }

    if (!room.feePayer) {
      return { ok: false, error: "Fee payer not selected yet" };
    }

    await participantRepository.update(participant.id, { feeConfirmed: true });

    const userName = await getUserName(userId);
    const confirmMsg = BOT_MESSAGES.FEE_CONFIRMED_BY(userName);
    await this.sendBotMessage(room.id, confirmMsg.text, confirmMsg.metadata);

    await this.checkFeeConfirmations(room.id);

    return { ok: true };
  },

  /**
   * Check if both users confirmed fee and proceed
   */
  async checkFeeConfirmations(roomId: string): Promise<void> {
    const room = await roomService.getRoomById(roomId);
    if (!room || room.step !== ROOM_STEPS.FEE_SELECTION) return;

    const participants = await roomService.getRoomParticipants(roomId);
    const allConfirmed = participants.every((p) => p.feeConfirmed);

    if (allConfirmed && room.amount && room.feePayer) {
      // Get escrow contract address first (needed for deal summary)
      const escrowAddress = blockchainService.getEscrowAddress(room.chainId);
      await roomService.setEscrowAddress(roomId, escrowAddress);

      // Show deal summary
      const sender = participants.find((p) => p.role === ROLES.SENDER)!;
      const receiver = participants.find((p) => p.role === ROLES.RECEIVER)!;

      const senderName = await getUserName(sender.userId);
      const receiverName = await getUserName(receiver.userId);

      const fee = calculateFee(room.amount);
      const depositAmount = calculateDepositAmount(room.amount, fee, room.feePayer as FeePayer);
      const receiverGets = calculateReceiverAmount(room.amount, fee, room.feePayer as FeePayer);

      const chainConfig = getChainConfig(room.chainId);
      const chainName = chainConfig?.name || `Chain ${room.chainId}`;

      const summaryMsg = BOT_MESSAGES.DEAL_SUMMARY(
        senderName,
        receiverName,
        formatUsdtAmount(room.amount),
        formatUsdtAmount(fee),
        room.feePayer,
        formatUsdtAmount(depositAmount),
        formatUsdtAmount(receiverGets),
        chainName,
        escrowAddress
      );
      await this.sendBotMessage(roomId, summaryMsg.text, summaryMsg.metadata);

      // Proceed to awaiting deposit
      await roomService.updateRoomStep(roomId, ROOM_STEPS.AWAITING_DEPOSIT);

      // Create deal on smart contract (if not in mock mode)
      const createResult = await blockchainService.createDeal(
        roomId,
        room.chainId,
        depositAmount,
        room.feePayer!
      );
      if (!createResult.success) {
        console.error("Failed to create deal on blockchain:", createResult.error);
        // Continue anyway - we can retry or handle this manually
      }

      const depositMsg = BOT_MESSAGES.AWAITING_DEPOSIT(
        escrowAddress,
        formatUsdtAmount(depositAmount),
        chainName
      );
      await this.sendBotMessage(roomId, depositMsg.text, depositMsg.metadata);
    }
  },

  /**
   * Get the current bot state summary for a room
   */
  async getRoomState(roomId: string): Promise<{
    room: Room;
    participants: Participant[];
    sender?: Participant;
    receiver?: Participant;
  } | null> {
    const room = await roomService.getRoomById(roomId);
    if (!room) return null;

    const participants = await roomService.getRoomParticipants(roomId);
    const sender = participants.find((p) => p.role === ROLES.SENDER);
    const receiver = participants.find((p) => p.role === ROLES.RECEIVER);

    return { room, participants, sender, receiver };
  },

  /**
   * Handle deposit detection
   * Called when blockchain monitoring detects a deposit to the escrow address
   */
  async onDepositDetected(
    roomId: string,
    txHash: string,
    amount?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const room = await roomService.getRoomById(roomId);
    if (!room) {
      return { ok: false, error: "Room not found" };
    }

    if (room.step !== ROOM_STEPS.AWAITING_DEPOSIT) {
      return { ok: false, error: "Room is not awaiting deposit" };
    }

    if (!room.escrowAddress) {
      return { ok: false, error: "No escrow address set" };
    }

    // Store the deposit transaction hash
    await roomService.setDepositTxHash(roomId, txHash);

    // Transition to FUNDED state
    await roomService.updateRoomStep(roomId, ROOM_STEPS.FUNDED);

    // Get the deposit amount (use room amount if not provided)
    const depositAmount = amount || room.amount || "0";

    // Send deposit received message
    const msg = BOT_MESSAGES.DEPOSIT_RECEIVED(formatUsdtAmount(depositAmount), txHash);
    await this.sendBotMessage(roomId, msg.text, msg.metadata);

    await roomService.updateLastActivity(roomId);

    return { ok: true };
  },

  /**
   * Mock a deposit for testing purposes
   * This simulates receiving a deposit without actual blockchain interaction
   */
  async mockDeposit(
    roomId: string
  ): Promise<{ ok: boolean; txHash?: string; error?: string }> {
    const room = await roomService.getRoomById(roomId);
    if (!room) {
      return { ok: false, error: "Room not found" };
    }

    if (room.step !== ROOM_STEPS.AWAITING_DEPOSIT) {
      return { ok: false, error: "Room is not awaiting deposit" };
    }

    if (!room.escrowAddress || !room.amount || !room.feePayer) {
      return { ok: false, error: "Room not properly configured for deposit" };
    }

    // Calculate expected deposit amount
    const fee = calculateFee(room.amount);
    const depositAmount = calculateDepositAmount(room.amount, fee, room.feePayer as FeePayer);

    // Create mock deposit via blockchain service
    const { txHash } = await blockchainService.mockDeposit(
      roomId,
      room.chainId,
      depositAmount
    );

    // Process the deposit
    const result = await this.onDepositDetected(roomId, txHash, depositAmount);
    if (!result.ok) {
      return result;
    }

    return { ok: true, txHash };
  },

  /**
   * Check for pending deposits on a room
   * In production, this would query the blockchain
   */
  async checkForDeposit(
    roomId: string
  ): Promise<{ ok: boolean; found: boolean; txHash?: string; error?: string }> {
    const room = await roomService.getRoomById(roomId);
    if (!room) {
      return { ok: false, found: false, error: "Room not found" };
    }

    if (room.step !== ROOM_STEPS.AWAITING_DEPOSIT) {
      return { ok: false, found: false, error: "Room is not awaiting deposit" };
    }

    if (!room.escrowAddress || !room.amount || !room.feePayer) {
      return { ok: false, found: false, error: "Room not properly configured" };
    }

    // Calculate expected deposit amount
    const fee = calculateFee(room.amount);
    const expectedAmount = calculateDepositAmount(room.amount, fee, room.feePayer as FeePayer);

    // Check for deposit via blockchain service
    const depositInfo = await blockchainService.checkDeposit(
      roomId,
      expectedAmount,
      room.chainId
    );

    if (!depositInfo.found) {
      return { ok: true, found: false };
    }

    // Process the deposit
    const result = await this.onDepositDetected(
      roomId,
      depositInfo.txHash!,
      depositInfo.amount
    );

    if (!result.ok) {
      return { ok: false, found: true, error: result.error };
    }

    return { ok: true, found: true, txHash: depositInfo.txHash };
  },

  /**
   * Get deposit info for a room
   */
  async getDepositInfo(roomId: string): Promise<{
    escrowAddress: string | null;
    expectedAmount: string | null;
    depositTxHash: string | null;
    chainName: string;
    explorerUrl: string | null;
  } | null> {
    const room = await roomService.getRoomById(roomId);
    if (!room) return null;

    const chainConfig = getChainConfig(room.chainId);

    let expectedAmount: string | null = null;
    if (room.amount && room.feePayer) {
      const fee = calculateFee(room.amount);
      expectedAmount = calculateDepositAmount(room.amount, fee, room.feePayer as FeePayer);
    }

    return {
      escrowAddress: room.escrowAddress,
      expectedAmount: expectedAmount ? formatUsdtAmount(expectedAmount) : null,
      depositTxHash: room.depositTxHash,
      chainName: chainConfig?.name || `Chain ${room.chainId}`,
      explorerUrl: room.escrowAddress
        ? blockchainService.getExplorerAddressUrl(room.chainId, room.escrowAddress)
        : null,
    };
  },

  // ============ Release Flow ============

  /**
   * Initiate release (sender only)
   */
  async onReleaseInitiated(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.FUNDED) {
      return { ok: false, error: "Room is not in funded state" };
    }

    // Only sender can initiate release
    if (participant.role !== ROLES.SENDER) {
      return { ok: false, error: "Only the sender can initiate release" };
    }

    // Mark sender as confirmed for release
    await participantRepository.update(participant.id, { releaseConfirmed: true });

    // Transition to RELEASING state
    await roomService.updateRoomStep(room.id, ROOM_STEPS.RELEASING);

    const senderName = await getUserName(userId);
    const msg = BOT_MESSAGES.RELEASE_REQUESTED(senderName);
    await this.sendBotMessage(room.id, msg.text, msg.metadata);

    return { ok: true };
  },

  /**
   * Confirm release (receiver confirms sender's release request)
   */
  async onReleaseConfirmed(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.RELEASING) {
      return { ok: false, error: "Room is not in releasing state" };
    }

    // Only receiver can confirm release (sender already confirmed by initiating)
    if (participant.role !== ROLES.RECEIVER) {
      return { ok: false, error: "Only the receiver can confirm the release" };
    }

    // Mark receiver as confirmed
    await participantRepository.update(participant.id, { releaseConfirmed: true });

    const userName = await getUserName(userId);
    await this.sendBotMessage(room.id, `**${userName}** confirmed the release.`);

    // In mock mode, skip payout address and complete immediately
    if (blockchainService.isMockMode(room.chainId)) {
      return this.executeReleaseInMockMode(room, userId);
    }

    // Real mode - ask receiver for payout address
    const addressMsg = BOT_MESSAGES.REQUEST_PAYOUT_ADDRESS(userName);
    await this.sendBotMessage(room.id, addressMsg.text, addressMsg.metadata);

    return { ok: true };
  },

  /**
   * Execute release in mock mode (skip address confirmation)
   */
  async executeReleaseInMockMode(
    room: Room,
    receiverUserId: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (!room.amount || !room.feePayer) {
      return { ok: false, error: "Room not properly configured" };
    }

    // Calculate receiver amount
    const fee = calculateFee(room.amount);
    const receiverAmount = calculateReceiverAmount(room.amount, fee, room.feePayer as FeePayer);

    // Execute mock release (no real address needed)
    const result = await blockchainService.executeRelease(
      room.id,
      "0x0000000000000000000000000000000000000000", // Mock address
      receiverAmount,
      room.chainId
    );

    if (!result.success) {
      return { ok: false, error: result.error || "Failed to execute release" };
    }

    // Store release tx hash
    await roomService.setReleaseTxHash(room.id, result.txHash!);

    // Update room status
    await roomService.updateRoomStep(room.id, ROOM_STEPS.COMPLETED);
    await roomService.updateRoomStatus(room.id, ROOM_STATUSES.COMPLETED);

    // Send success messages
    const receiverName = await getUserName(receiverUserId);
    const releaseMsg = BOT_MESSAGES.PAYMENT_RELEASED(
      receiverName,
      formatUsdtAmount(receiverAmount),
      result.txHash!
    );
    await this.sendBotMessage(room.id, releaseMsg.text, releaseMsg.metadata);

    const completeMsg = BOT_MESSAGES.DEAL_COMPLETED();
    await this.sendBotMessage(room.id, completeMsg.text, completeMsg.metadata);

    // Record transaction for public history
    const participants = await roomService.getRoomParticipants(room.id);
    const sender = participants.find((p) => p.role === ROLES.SENDER)!;
    const receiver = participants.find((p) => p.role === ROLES.RECEIVER)!;

    await transactionService.recordTransaction({
      room,
      sender,
      receiver,
      depositTxHash: room.depositTxHash!,
      releaseTxHash: result.txHash!,
      status: "COMPLETED",
    });

    return { ok: true };
  },

  /**
   * Cancel release request (go back to FUNDED)
   * Only receiver can reject the sender's release request
   */
  async onReleaseCancelled(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.RELEASING) {
      return { ok: false, error: "Room is not in releasing state" };
    }

    // Only receiver can reject the release request
    if (participant.role !== ROLES.RECEIVER) {
      return { ok: false, error: "Only the receiver can reject the release request" };
    }

    // Reset release confirmations
    const participants = await roomService.getRoomParticipants(room.id);
    for (const p of participants) {
      await participantRepository.update(p.id, { releaseConfirmed: false });
    }

    // Go back to FUNDED state
    await roomService.updateRoomStep(room.id, ROOM_STEPS.FUNDED);

    const userName = await getUserName(userId);
    await this.sendBotMessage(
      room.id,
      `**${userName}** rejected the release request. The funds remain in escrow.`
    );

    // Re-show the release/cancel buttons
    const depositAmount = room.amount ? formatUsdtAmount(room.amount) : "0";
    const msg = BOT_MESSAGES.DEPOSIT_RECEIVED(depositAmount, room.depositTxHash || "");
    await this.sendBotMessage(room.id, "You can still release or cancel the deal:", msg.metadata);

    return { ok: true };
  },

  /**
   * Submit payout address (receiver only)
   */
  async onPayoutAddressSubmitted(
    room: Room,
    userId: string,
    address: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.RELEASING) {
      return { ok: false, error: "Room is not in releasing state" };
    }

    // Only receiver can submit payout address
    if (participant.role !== ROLES.RECEIVER) {
      return { ok: false, error: "Only the receiver can provide payout address" };
    }

    // Validate address format
    if (!blockchainService.isValidAddress(address)) {
      return { ok: false, error: "Invalid wallet address format" };
    }

    // Store the address temporarily
    await participantRepository.update(participant.id, { payoutAddress: address });

    // Ask for confirmation
    const confirmMsg = BOT_MESSAGES.CONFIRM_PAYOUT_ADDRESS(address);
    await this.sendBotMessage(room.id, confirmMsg.text, confirmMsg.metadata);

    return { ok: true };
  },

  /**
   * Confirm payout address and execute release
   */
  async onPayoutAddressConfirmed(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.RELEASING) {
      return { ok: false, error: "Room is not in releasing state" };
    }

    if (participant.role !== ROLES.RECEIVER) {
      return { ok: false, error: "Only the receiver can confirm payout address" };
    }

    if (!participant.payoutAddress) {
      return { ok: false, error: "No payout address set" };
    }

    if (!room.escrowAddress || !room.amount || !room.feePayer) {
      return { ok: false, error: "Room not properly configured" };
    }

    // Calculate receiver amount
    const fee = calculateFee(room.amount);
    const receiverAmount = calculateReceiverAmount(room.amount, fee, room.feePayer as FeePayer);

    // Execute the release
    const result = await blockchainService.executeRelease(
      room.id,
      participant.payoutAddress,
      receiverAmount,
      room.chainId
    );

    if (!result.success) {
      return { ok: false, error: result.error || "Failed to execute release" };
    }

    // Store release tx hash
    await roomService.setReleaseTxHash(room.id, result.txHash!);

    // Update room status
    await roomService.updateRoomStep(room.id, ROOM_STEPS.COMPLETED);
    await roomService.updateRoomStatus(room.id, ROOM_STATUSES.COMPLETED);

    // Send success messages
    const receiverName = await getUserName(userId);
    const releaseMsg = BOT_MESSAGES.PAYMENT_RELEASED(
      receiverName,
      formatUsdtAmount(receiverAmount),
      result.txHash!
    );
    await this.sendBotMessage(room.id, releaseMsg.text, releaseMsg.metadata);

    const completeMsg = BOT_MESSAGES.DEAL_COMPLETED();
    await this.sendBotMessage(room.id, completeMsg.text, completeMsg.metadata);

    // Record transaction for public history
    const participants = await roomService.getRoomParticipants(room.id);
    const sender = participants.find((p) => p.role === ROLES.SENDER)!;
    const receiver = participants.find((p) => p.role === ROLES.RECEIVER)!;

    await transactionService.recordTransaction({
      room,
      sender,
      receiver,
      depositTxHash: room.depositTxHash!,
      releaseTxHash: result.txHash!,
      status: "COMPLETED",
    });

    return { ok: true };
  },

  /**
   * Change payout address (go back to address input)
   */
  async onPayoutAddressRejected(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (participant.role !== ROLES.RECEIVER) {
      return { ok: false, error: "Only the receiver can change payout address" };
    }

    // Clear the address
    await participantRepository.update(participant.id, { payoutAddress: null });

    // Ask for address again
    const receiverName = await getUserName(userId);
    const addressMsg = BOT_MESSAGES.REQUEST_PAYOUT_ADDRESS(receiverName);
    await this.sendBotMessage(room.id, addressMsg.text, addressMsg.metadata);

    return { ok: true };
  },

  // ============ Cancel/Refund Flow ============

  /**
   * Initiate cancel (either party can initiate from FUNDED state)
   */
  async onCancelInitiated(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.FUNDED) {
      return { ok: false, error: "Room is not in funded state" };
    }

    // Mark initiator as confirmed for cancel
    await participantRepository.update(participant.id, { cancelConfirmed: true });

    // Transition to CANCELLING state
    await roomService.updateRoomStep(room.id, ROOM_STEPS.CANCELLING);

    const userName = await getUserName(userId);
    const msg = BOT_MESSAGES.CANCEL_REQUESTED(userName);
    await this.sendBotMessage(room.id, msg.text, msg.metadata);

    return { ok: true };
  },

  /**
   * Confirm cancel (other party confirms cancellation)
   */
  async onCancelConfirmed(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.CANCELLING) {
      return { ok: false, error: "Room is not in cancelling state" };
    }

    // Mark participant as confirmed
    await participantRepository.update(participant.id, { cancelConfirmed: true });

    const userName = await getUserName(userId);

    // Check if both confirmed
    const participants = await roomService.getRoomParticipants(room.id);
    const allConfirmed = participants.every((p) => p.cancelConfirmed);

    if (allConfirmed) {
      // In mock mode, skip refund address and complete immediately
      if (blockchainService.isMockMode(room.chainId)) {
        const sender = participants.find((p) => p.role === ROLES.SENDER)!;
        return this.executeRefundInMockMode(room, sender.userId);
      }

      // Real mode - ask sender for refund address
      const sender = participants.find((p) => p.role === ROLES.SENDER)!;
      const senderName = await getUserName(sender.userId);

      const addressMsg = BOT_MESSAGES.REQUEST_REFUND_ADDRESS(senderName);
      await this.sendBotMessage(room.id, addressMsg.text, addressMsg.metadata);
    } else {
      // Just send confirmation message
      await this.sendBotMessage(room.id, `**${userName}** confirmed the cancellation.`);
    }

    return { ok: true };
  },

  /**
   * Execute refund in mock mode (skip address confirmation)
   */
  async executeRefundInMockMode(
    room: Room,
    senderUserId: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (!room.amount || !room.feePayer) {
      return { ok: false, error: "Room not properly configured" };
    }

    // Calculate refund amount (deposit amount)
    const fee = calculateFee(room.amount);
    const depositAmount = calculateDepositAmount(room.amount, fee, room.feePayer as FeePayer);

    // Execute mock refund (no real address needed)
    const result = await blockchainService.executeRefund(
      room.id,
      "0x0000000000000000000000000000000000000000", // Mock address
      depositAmount,
      room.chainId
    );

    if (!result.success) {
      return { ok: false, error: result.error || "Failed to execute refund" };
    }

    // Store release tx hash (same field for refund)
    await roomService.setReleaseTxHash(room.id, result.txHash!);

    // Update room status
    await roomService.updateRoomStep(room.id, ROOM_STEPS.CANCELLED);
    await roomService.updateRoomStatus(room.id, ROOM_STATUSES.CANCELLED);

    // Send success messages
    const senderName = await getUserName(senderUserId);
    const refundMsg = BOT_MESSAGES.PAYMENT_REFUNDED(
      senderName,
      formatUsdtAmount(depositAmount),
      result.txHash!
    );
    await this.sendBotMessage(room.id, refundMsg.text, refundMsg.metadata);

    const cancelMsg = BOT_MESSAGES.DEAL_CANCELLED();
    await this.sendBotMessage(room.id, cancelMsg.text, cancelMsg.metadata);

    // Record transaction for public history
    const participants = await roomService.getRoomParticipants(room.id);
    const sender = participants.find((p) => p.role === ROLES.SENDER)!;
    const receiver = participants.find((p) => p.role === ROLES.RECEIVER)!;

    await transactionService.recordTransaction({
      room,
      sender,
      receiver,
      depositTxHash: room.depositTxHash!,
      releaseTxHash: result.txHash!,
      status: "REFUNDED",
    });

    return { ok: true };
  },

  /**
   * Reject cancel request (go back to FUNDED)
   */
  async onCancelRejected(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (room.step !== ROOM_STEPS.CANCELLING) {
      return { ok: false, error: "Room is not in cancelling state" };
    }

    // Reset cancel confirmations
    const participants = await roomService.getRoomParticipants(room.id);
    for (const p of participants) {
      await participantRepository.update(p.id, { cancelConfirmed: false });
    }

    // Go back to FUNDED state
    await roomService.updateRoomStep(room.id, ROOM_STEPS.FUNDED);

    const userName = await getUserName(userId);
    await this.sendBotMessage(
      room.id,
      `**${userName}** rejected the cancellation request. The funds remain in escrow.`
    );

    // Re-show the release/cancel buttons
    const depositAmount = room.amount ? formatUsdtAmount(room.amount) : "0";
    const msg = BOT_MESSAGES.DEPOSIT_RECEIVED(depositAmount, room.depositTxHash || "");
    await this.sendBotMessage(room.id, "You can still release or cancel the deal:", msg.metadata);

    return { ok: true };
  },

  /**
   * Submit refund address (sender only)
   */
  async onRefundAddressSubmitted(
    room: Room,
    userId: string,
    address: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.CANCELLING) {
      return { ok: false, error: "Room is not in cancelling state" };
    }

    // Only sender can submit refund address
    if (participant.role !== ROLES.SENDER) {
      return { ok: false, error: "Only the sender can provide refund address" };
    }

    // Validate address format
    if (!blockchainService.isValidAddress(address)) {
      return { ok: false, error: "Invalid wallet address format" };
    }

    // Store the address temporarily
    await participantRepository.update(participant.id, { payoutAddress: address });

    // Ask for confirmation (reusing the same message template)
    const confirmMsg = BOT_MESSAGES.CONFIRM_PAYOUT_ADDRESS(address);
    await this.sendBotMessage(room.id, confirmMsg.text, confirmMsg.metadata);

    return { ok: true };
  },

  /**
   * Confirm refund address and execute refund
   */
  async onRefundAddressConfirmed(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (room.step !== ROOM_STEPS.CANCELLING) {
      return { ok: false, error: "Room is not in cancelling state" };
    }

    if (participant.role !== ROLES.SENDER) {
      return { ok: false, error: "Only the sender can confirm refund address" };
    }

    if (!participant.payoutAddress) {
      return { ok: false, error: "No refund address set" };
    }

    if (!room.escrowAddress || !room.amount || !room.feePayer) {
      return { ok: false, error: "Room not properly configured" };
    }

    // Calculate refund amount (deposit amount - sender gets back what they deposited)
    const fee = calculateFee(room.amount);
    const depositAmount = calculateDepositAmount(room.amount, fee, room.feePayer as FeePayer);

    // Execute the refund
    const result = await blockchainService.executeRefund(
      room.id,
      participant.payoutAddress,
      depositAmount,
      room.chainId
    );

    if (!result.success) {
      return { ok: false, error: result.error || "Failed to execute refund" };
    }

    // Store release tx hash (same field for refund)
    await roomService.setReleaseTxHash(room.id, result.txHash!);

    // Update room status
    await roomService.updateRoomStep(room.id, ROOM_STEPS.CANCELLED);
    await roomService.updateRoomStatus(room.id, ROOM_STATUSES.CANCELLED);

    // Send success messages
    const senderName = await getUserName(userId);
    const refundMsg = BOT_MESSAGES.PAYMENT_REFUNDED(
      senderName,
      formatUsdtAmount(depositAmount),
      result.txHash!
    );
    await this.sendBotMessage(room.id, refundMsg.text, refundMsg.metadata);

    const cancelMsg = BOT_MESSAGES.DEAL_CANCELLED();
    await this.sendBotMessage(room.id, cancelMsg.text, cancelMsg.metadata);

    // Record transaction for public history
    const participants = await roomService.getRoomParticipants(room.id);
    const sender = participants.find((p) => p.role === ROLES.SENDER)!;
    const receiver = participants.find((p) => p.role === ROLES.RECEIVER)!;

    await transactionService.recordTransaction({
      room,
      sender,
      receiver,
      depositTxHash: room.depositTxHash!,
      releaseTxHash: result.txHash!,
      status: "REFUNDED",
    });

    return { ok: true };
  },

  /**
   * Change refund address (go back to address input)
   */
  async onRefundAddressRejected(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    if (participant.role !== ROLES.SENDER) {
      return { ok: false, error: "Only the sender can change refund address" };
    }

    // Clear the address
    await participantRepository.update(participant.id, { payoutAddress: null });

    // Ask for address again
    const senderName = await getUserName(userId);
    const addressMsg = BOT_MESSAGES.REQUEST_REFUND_ADDRESS(senderName);
    await this.sendBotMessage(room.id, addressMsg.text, addressMsg.metadata);

    return { ok: true };
  },

  // ============ Close Room Flow (before deposit) ============

  /**
   * Initiate close room (only allowed before deposit phase)
   */
  async onCloseRoomInitiated(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    // Only allow closing before deposit phase
    const allowedSteps: RoomStep[] = [
      ROOM_STEPS.WAITING_FOR_PEER,
      ROOM_STEPS.ROLE_SELECTION,
      ROOM_STEPS.AMOUNT_AGREEMENT,
      ROOM_STEPS.FEE_SELECTION,
      ROOM_STEPS.AWAITING_DEPOSIT,
    ];

    if (!allowedSteps.includes(room.step as RoomStep)) {
      return { ok: false, error: "Room cannot be closed after funds have been deposited. Use cancel instead." };
    }

    // Mark initiator as confirmed for close
    await participantRepository.update(participant.id, { closeRoomConfirmed: true });

    const userName = await getUserName(userId);
    const msg = BOT_MESSAGES.CLOSE_ROOM_REQUESTED(userName);
    await this.sendBotMessage(room.id, msg.text, msg.metadata);

    // Check if this is a single-user room (waiting for peer)
    const participants = await roomService.getRoomParticipants(room.id);
    if (participants.length === 1) {
      // Only one user, can close immediately
      await this.executeCloseRoom(room.id);
    }

    return { ok: true };
  },

  /**
   * Confirm close room request
   */
  async onCloseRoomConfirmed(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const participant = await roomService.getParticipantByUserId(room.id, userId);
    if (!participant) {
      return { ok: false, error: "You are not a participant in this room" };
    }

    // Mark participant as confirmed
    await participantRepository.update(participant.id, { closeRoomConfirmed: true });

    const userName = await getUserName(userId);
    const confirmMsg = BOT_MESSAGES.CLOSE_ROOM_CONFIRMED_BY(userName);
    await this.sendBotMessage(room.id, confirmMsg.text, confirmMsg.metadata);

    // Check if both confirmed
    const participants = await roomService.getRoomParticipants(room.id);
    const allConfirmed = participants.every((p) => p.closeRoomConfirmed);

    if (allConfirmed) {
      await this.executeCloseRoom(room.id);
    }

    return { ok: true };
  },

  /**
   * Reject close room request
   */
  async onCloseRoomRejected(
    room: Room,
    userId: string
  ): Promise<{ ok: boolean; error?: string }> {
    // Reset close confirmations
    const participants = await roomService.getRoomParticipants(room.id);
    for (const p of participants) {
      await participantRepository.update(p.id, { closeRoomConfirmed: false });
    }

    const userName = await getUserName(userId);
    await this.sendBotMessage(
      room.id,
      `**${userName}** cancelled the close request. The room remains open.`
    );

    return { ok: true };
  },

  /**
   * Execute the room close (after both confirm or single user)
   */
  async executeCloseRoom(roomId: string): Promise<void> {
    // Send room closed message
    const closeMsg = BOT_MESSAGES.ROOM_CLOSED();
    await this.sendBotMessage(roomId, closeMsg.text, closeMsg.metadata);

    // Update room status
    await roomService.updateRoomStep(roomId, ROOM_STEPS.CANCELLED);
    await roomService.updateRoomStatus(roomId, ROOM_STATUSES.CANCELLED);
  },
};
