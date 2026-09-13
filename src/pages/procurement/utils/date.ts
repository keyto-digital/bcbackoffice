// ============================================================================
// PROCUREMENT DATE
// ============================================================================

export function inputDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function currentMonthStart(): string {
  const now = new Date();

  return inputDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

export function today(): string {
  return inputDate(new Date());
}

// ============================================================================
// DISPLAY DATE
// ============================================================================

export function formatDateIndonesia(
  date: string | Date | null | undefined,
): string {
  if (!date) return "";

  // Jika sudah berupa YYYY-MM-DD, jangan gunakan new Date()
  // agar tidak terkena masalah timezone.
  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, year, month, day] = match;
      return `${day}-${month}-${year}`;
    }
  }

  const parsedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${day}-${month}-${year}`;
}
