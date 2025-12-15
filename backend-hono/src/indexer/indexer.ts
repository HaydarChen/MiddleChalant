import { viem } from "viem";
import { createPublicClient, http } from "viem";
import { sepolia, bscTestnet } from "viem/chains";
import { db } from "@/lib/db";
import { escrows, lastBlocks, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";

const chains = [
  { chain: sepolia, rpc: process.env.RPC_URL_SEPOLIA },
  { chain: bscTestnet, rpc: process.env.RPC_URL_BSC_TESTNET },
];

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

const STATUS_BY_EVENT: Record<string, string> = {
  Deposited: "FUNDED",
  Released: "RELEASED",
  Refunded: "REFUNDED",
  Cancelled: "CANCELED",
};

export async function runIndexerOnce() {
  for (const { chain, rpc } of chains) {
    if (!rpc) continue;
    const client = createPublicClient({ chain, transport: http(rpc) });
    const last = await db.query.lastBlocks.findFirst({ where: (f, { eq: eq2 }) => eq2(f.chainId, chain.id) });
    const fromBlock = last ? BigInt(last.blockNumber) + 1n : (await client.getBlockNumber()) - 5000n;
    const toBlock = await client.getBlockNumber();

    const logs = await client.getLogs({
      fromBlock,
      toBlock,
      topics: [],
      // You could also filter by known escrow addresses; kept broad for placeholder.
    });

    for (const log of logs) {
      const parsed = viem.parseEventLogs({ abi: EscrowAbi, logs: [log] });
      if (parsed.length === 0) continue;
      const evt = parsed[0];
      const status = STATUS_BY_EVENT[evt.eventName];
      if (!status) continue;
      const escrowAddr = log.address;
      await db
        .insert(escrows)
        .values({
          id: `${chain.id}-${escrowAddr}`,
          chainId: chain.id,
          escrowAddress: escrowAddr,
          buyer: "",
          seller: "",
          token: "",
          amount: "0",
          feeBps: 0,
          status,
          lastTxHash: log.transactionHash,
          lastBlockNumber: log.blockNumber?.toString() ?? "0",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: escrows.id,
          set: {
            status,
            lastTxHash: log.transactionHash,
            lastBlockNumber: log.blockNumber?.toString() ?? "0",
            updatedAt: new Date(),
          },
        });

      // If room is linked to this escrow, update room status
      await db
        .update(rooms)
        .set({ status })
        .where(eq(rooms.escrowAddress, escrowAddr));
    }

    await db
      .insert(lastBlocks)
      .values({ chainId: chain.id, blockNumber: toBlock.toString() })
      .onConflictDoUpdate({ target: lastBlocks.chainId, set: { blockNumber: toBlock.toString() } });
  }
}

