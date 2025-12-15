import type { Chain } from "wagmi";
import { sepolia, bscTestnet } from "wagmi/chains";

export const supportedChains = [sepolia, bscTestnet] as const;

export function getDefaultChain(): Chain {
  const envId = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID;
  const envChainId = envId ? Number(envId) : undefined;

  const fromEnv = supportedChains.find((chain) => chain.id === envChainId);
  return fromEnv ?? sepolia;
}

export type SupportedChainId = (typeof supportedChains)[number]["id"];

