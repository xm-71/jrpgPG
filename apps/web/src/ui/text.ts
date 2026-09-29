export function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const ROMAN_NUMERALS = ['I', 'II', 'III'] as const;
