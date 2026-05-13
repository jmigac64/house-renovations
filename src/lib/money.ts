import { Decimal } from "@prisma/client/runtime/library";

export function decimalToNumber(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return value.toNumber();
}

export function toFixedMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function percent(value: number): number {
  return Math.round(value * 100) / 100;
}
