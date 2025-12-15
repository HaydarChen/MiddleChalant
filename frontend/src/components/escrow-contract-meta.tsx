'use client';

import { useChainId } from 'wagmi';
import { getEscrowAddress } from '@/contracts';
import { shortAddress } from '@/lib/shortAddress';

export function EscrowContractMeta() {
  const chainId = useChainId();
  const address = getEscrowAddress(chainId);

  const label = address ? shortAddress(address) : 'Not configured';

  return (
    <div className="mt-2 text-[11px] text-slate-400">
      <span className="font-medium text-slate-300">Contract:</span>{' '}
      <span className="font-mono text-[11px] text-slate-300">
        {label}
      </span>
    </div>
  );
}

