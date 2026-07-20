export const DECIMAL_RUB_PATTERN = /^\d+\.\d{2}$/;

export function isValidDecimalRub(value: unknown): value is string {
  return typeof value === "string" && DECIMAL_RUB_PATTERN.test(value);
}

export function formatRubDecimal(value: unknown): string {
  return Number(value).toFixed(2);
}

export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed);
}
