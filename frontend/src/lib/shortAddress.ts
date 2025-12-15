export function shortAddress(address?: string | null, visibleChars = 4): string {
  if (!address) return "";
  if (!address.startsWith("0x") || address.length <= 2 + visibleChars * 2) {
    return address;
  }

  const start = address.slice(0, 2 + visibleChars);
  const end = address.slice(-visibleChars);
  return `${start}...${end}`;
}

