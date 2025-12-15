import { nanoid } from "nanoid";

export function id(prefix = "id") {
  return `${prefix}_${nanoid(10)}`;
}

export function toBigIntStr(n: string | number | bigint) {
  return BigInt(n).toString();
}

export function nowPlusMinutes(mins: number) {
  return new Date(Date.now() + mins * 60_000);
}

