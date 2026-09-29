/**
 * The game's clock. `?now=2026-10-05T10:00:00Z` shifts it, which is how the daily climb,
 * banner rotation and tasks are tested without waiting. `?cycle=2` pins the rate-up banner.
 */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const shifted = Date.parse(params.get('now') ?? '');
const offset = Number.isNaN(shifted) ? 0 : shifted - Date.now();

export const now = (): number => Date.now() + offset;

const cycleParam = params.get('cycle');
export const cycleOverride: number | undefined = cycleParam !== null && /^\d+$/.test(cycleParam) ? Number(cycleParam) : undefined;

/** Unpredictable seed for things that should not repeat, like Kindling. */
export function randomSeed(): string {
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return `${a[0]!.toString(36)}-${a[1]!.toString(36)}-${a[2]!.toString(36)}`;
}
