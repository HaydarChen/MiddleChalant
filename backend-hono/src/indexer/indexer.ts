import { createPublicClient, http, parseEventLogs } from "viem";
import { sepolia, bscTestnet } from "viem/chains";
import { escrowRepository, lastBlockRepository } from "@/repositories";
import { roomRepository } from "@/repositories";
import type { EscrowStatus } from "@/types";

// ============ Configuration ============

const chains = [
  { chain: sepolia, rpc: process.env.RPC_URL_SEPOLIA },
  { chain: bscTestnet, rpc: process.env.RPC_URL_BSC_TESTNET },
];

// ============ Event ABI ============

const EscrowAbi = [
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Released",
    inputs: [
      { name: "toSeller", type: "address", indexed: true },
      { name: "sellerAmount", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [
      { name: "toBuyer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Cancelled",
    inputs: [{ name: "by", type: "address", indexed: true }],
  },
] as const;

// ============ Status Mapping ============

const STATUS_BY_EVENT: Record<string, EscrowStatus> = {
  Deposited: "FUNDED",
  Released: "RELEASED",
  Refunded: "REFUNDED",
  Cancelled: "CANCELED",
};

// ============ Indexer ============

export async function runIndexerOnce(): Promise<void> {
  for (const { chain, rpc } of chains) {
    if (!rpc) continue;

    try {
      const client = createPublicClient({ chain, transport: http(rpc) });

      // Get last indexed block
      const last = await lastBlockRepository.findByChainId(chain.id);
      const currentBlock = await client.getBlockNumber();
      const fromBlock = last
        ? BigInt(last.blockNumber) + 1n
        : currentBlock - 5000n;

      // Skip if no new blocks
      if (fromBlock > currentBlock) continue;

      // Fetch logs
      const logs = await client.getLogs({
        fromBlock,
        toBlock: currentBlock,
      });

      // Process each log
      for (const log of logs) {
        try {
          const parsed = parseEventLogs({ abi: EscrowAbi, logs: [log] });
          if (parsed.length === 0) continue;

          const evt = parsed[0];
          const status = STATUS_BY_EVENT[evt.eventName];
          if (!status) continue;

          const escrowAddr = log.address.toLowerCase();

          // Update or create escrow record
          await escrowRepository.upsert({
            id: `${chain.id}-${escrowAddr}`,
            chainId: chain.id,
            escrowAddress: escrowAddr,
            buyer: "",
            seller: "",
            token: "",
            amount: "0",
            feeBps: 0,
            status,
            lastTxHash: log.transactionHash ?? undefined,
            lastBlockNumber: log.blockNumber?.toString(),
          });

          // Update linked room status
          const room = await roomRepository.findByEscrowAddress(escrowAddr);
          if (room) {
            await roomRepository.updateStatus(room.id, status);
          }
        } catch {
          // Skip logs that don't match our ABI
          continue;
        }
      }

      // Update last indexed block
      await lastBlockRepository.upsert(chain.id, currentBlock.toString());
    } catch (error) {
      console.error(`[Indexer] Error indexing chain ${chain.id}:`, error);
    }
  }
}
