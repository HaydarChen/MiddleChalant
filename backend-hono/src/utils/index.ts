import { nanoid } from "nanoid";

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix = "id"): string {
  return `${prefix}_${nanoid(10)}`;
}

/**
 * Convert a number/string/bigint to a string representation of bigint
 */
export function toBigIntStr(n: string | number | bigint): string {
  return BigInt(n).toString();
}

/**
 * Get a date that is X minutes from now
 */
export function nowPlusMinutes(mins: number): Date {
  return new Date(Date.now() + mins * 60_000);
}

/**
 * Get a date that is X hours from now
 */
export function nowPlusHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60_000);
}

/**
 * Get a date that is X days from now
 */
export function nowPlusDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60_000);
}

/**
 * Parse session token from cookie header
 */
export function parseSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/escrow\.session_token=([^;]+)/);
  return match?.[1] ?? null;
}

/**
 * Format wallet address for display (0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
