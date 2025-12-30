// Supported chains configuration with USDT addresses

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  usdtAddress: string;
  masterEscrowAddress: string;
  explorerUrl: string;
  rpcUrl: string;
}

// Mainnet chains
export const MAINNET_CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum Mainnet",
    shortName: "ETH",
    usdtAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    masterEscrowAddress: process.env.MASTER_ESCROW_ETH || "",
    explorerUrl: "https://etherscan.io",
    rpcUrl: process.env.ETH_RPC_URL || "https://eth.llamarpc.com",
  },
  56: {
    id: 56,
    name: "BNB Smart Chain",
    shortName: "BSC",
    usdtAddress: "0x55d398326f99059fF775485246999027B3197955",
    masterEscrowAddress: process.env.MASTER_ESCROW_BSC || "",
    explorerUrl: "https://bscscan.com",
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
  },
};

// Testnet chains (for development)
export const TESTNET_CHAINS: Record<number, ChainConfig> = {
  11155111: {
    id: 11155111,
    name: "Sepolia Testnet",
    shortName: "Sepolia",
    usdtAddress: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06", // Mock USDT on Sepolia
    masterEscrowAddress: process.env.MASTER_ESCROW_SEPOLIA || "",
    explorerUrl: "https://sepolia.etherscan.io",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
  },
  97: {
    id: 97,
    name: "BSC Testnet",
    shortName: "BSC Testnet",
    usdtAddress: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // Mock USDT on BSC Testnet
    masterEscrowAddress: process.env.MASTER_ESCROW_BSC_TESTNET || "",
    explorerUrl: "https://testnet.bscscan.com",
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
  },
};

// Combined chains (use testnet for dev, mainnet for prod)
const isDev = process.env.NODE_ENV !== "production";
export const SUPPORTED_CHAINS: Record<number, ChainConfig> = isDev
  ? TESTNET_CHAINS
  : MAINNET_CHAINS;

// Helper functions
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS[chainId];
}

export function isChainSupported(chainId: number): boolean {
  return chainId in SUPPORTED_CHAINS;
}

export function getUsdtAddress(chainId: number): string | undefined {
  return SUPPORTED_CHAINS[chainId]?.usdtAddress;
}

export function getSupportedChainIds(): number[] {
  return Object.keys(SUPPORTED_CHAINS).map(Number);
}

export function getMasterEscrowAddress(chainId: number): string | undefined {
  return SUPPORTED_CHAINS[chainId]?.masterEscrowAddress || undefined;
}

export function getRpcUrl(chainId: number): string | undefined {
  return SUPPORTED_CHAINS[chainId]?.rpcUrl;
}

// USDT has 6 decimals on both ETH and BSC
export const USDT_DECIMALS = 6;

// Helper to format amount from smallest unit to display
export function formatUsdtAmount(amount: string): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** USDT_DECIMALS);
  const whole = value / divisor;
  const fraction = value % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(USDT_DECIMALS, "0").replace(/0+$/, "");
  return `${whole}.${fractionStr}`;
}

// Helper to parse display amount to smallest unit
export function parseUsdtAmount(displayAmount: string): string {
  const [whole, fraction = ""] = displayAmount.split(".");
  const paddedFraction = fraction.padEnd(USDT_DECIMALS, "0").slice(0, USDT_DECIMALS);
  const value = BigInt(whole + paddedFraction);
  return value.toString();
}
