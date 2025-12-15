import { http, createConfig } from "wagmi";
import type { Config } from "wagmi";
import { injected } from "wagmi/connectors";
import { supportedChains, getDefaultChain } from "@/lib/chains";

const defaultChain = getDefaultChain();

export const wagmiConfig: Config = createConfig({
  chains: supportedChains,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: supportedChains.reduce<Config["transports"]>((acc, chain) => {
    acc[chain.id] = http();
    return acc;
  }, {} as Config["transports"]),
  ssr: true,
  storage: undefined,
  multiInjectedProviderDiscovery: true,
});

export { defaultChain };

