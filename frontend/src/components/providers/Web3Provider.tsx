'use client';

import type { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { wagmiConfig, defaultChain } from '@/lib/wagmi';
import { supportedChains } from '@/lib/chains';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NetworkBanner />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function NetworkBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isSupported = supportedChains.some((chain) => chain.id === chainId);

  if (!isConnected || isSupported) {
    return null;
  }

  const handleSwitch = () => {
    switchChain({ chainId: defaultChain.id });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-4">
      <div
        className={cn(
          'pointer-events-auto glass-surface max-w-md flex-1 border border-amber-400/40 bg-black/80 px-4 py-3 text-xs text-amber-50 shadow-glass',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="font-medium">Wrong network</p>
            <p className="text-[11px] text-amber-100/80">
              Please switch to Sepolia or BSC Testnet to use escrow actions.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full border-amber-400/70 text-amber-50 hover:border-amber-300"
            onClick={handleSwitch}
            disabled={isSwitching}
          >
            {isSwitching ? 'Switching…' : `Switch to ${defaultChain.name}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

