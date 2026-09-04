// ============================================================================
// PROCUREMENT FORMATTER
// ============================================================================

export function money(value: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export function quantity(value: number | null | undefined, digit = 4): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digit,
  }).format(Number(value ?? 0));
}

export function percent(value: number | null | undefined, digit = 2): string {
  return `${Number(value ?? 0).toFixed(digit)}%`;
}

export function number(value: number | null | undefined): string {
  const numericValue = Number(value ?? 0);

  if (numericValue === 0) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function formatNumberInput(
  value: number | string | null | undefined,
  maximumFractionDigits = 0
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits,
  }).format(numericValue);
}

export function parseNumberInput(
  value: string,
  options?: {
    allowDotDecimal?: boolean;
  }
): number {
  if (!value) {
    return 0;
  }

  const cleanedValue = value
    .trim()
    .replace(/[^\d,.-]/g, "");

  if (!cleanedValue) {
    return 0;
  }

  /*
   * Mode desimal:
   *
   * 1,5 → 1.5
   * 1.5 → 1.5
   */
  if (options?.allowDotDecimal) {
    const normalized = cleanedValue
      .replace(",", ".");

    const firstDecimalIndex = normalized.indexOf(".");

    if (firstDecimalIndex === -1) {
      return Number(normalized) || 0;
    }

    const integerPart = normalized.slice(0, firstDecimalIndex);

    const decimalPart = normalized
      .slice(firstDecimalIndex + 1)
      .replace(/\./g, "");

    return Number(
      `${integerPart}.${decimalPart}`
    ) || 0;
  }

  /*
   * Mode standar Indonesia.
   *
   * 1.500    → 1500
   * 1.500,50 → 1500.50
   */
  return Number(
    cleanedValue
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;
}