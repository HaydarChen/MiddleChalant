import escrowAbiJson from './escrow.abi.json';
import { ESCROW_ADDRESS_BY_CHAIN } from './addresses';

export const escrowAbi = escrowAbiJson as const;

export { ESCROW_ADDRESS_BY_CHAIN };

export function getEscrowAddress(chainId?: number | null): `0x${string}` | undefined {
  if (!chainId) return undefined;
  return ESCROW_ADDRESS_BY_CHAIN[chainId];
}

