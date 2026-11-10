/**
 * Paradise Pick 3 — pure game logic.
 *
 * A Pick 3 ticket is three digits, each 0-9. Every rule below is expressed in
 * terms of that triple so the UI never re-implements game math.
 */

export type Triple = [number, number, number];

export type PlayType = "straight" | "box" | "frontPair" | "backPair";

export type TripleKind = "distinct" | "pair" | "triple";

export type DrawRecord = {
  id: string;
  digits: Triple;
  date: string;
  label?: string;
};

export type TicketResult = {
  drawId?: string;
  drawDigits: Triple;
  status: "win" | "loss";
  prize: number;
  matchedPositions: number;
  checkedAt: string;
};

export type Ticket = {
  id: string;
  digits: Triple;
  play: PlayType;
  stake: number;
  note?: string;
  createdAt: string;
  result?: TicketResult;
};

export type Evaluation = {
  status: "win" | "loss";
  prize: number;
  matchedPositions: number;
  matchedAnyOrder: number;
  kind: TripleKind;
  reason: string;
};

export type TicketSummary = {
  tickets: number;
  stake: number;
  prize: number;
  net: number;
  wins: number;
};

export const PLAY_TYPES: { value: PlayType; label: string; hint: string }[] = [
  { value: "straight", label: "Straight", hint: "Exact digits, exact order" },
  { value: "box", label: "Box", hint: "Same digits, any order" },
  { value: "frontPair", label: "Front pair", hint: "First two digits in place" },
  { value: "backPair", label: "Back pair", hint: "Last two digits in place" },
];

export const PLAY_LABELS: Record<PlayType, string> = {
  straight: "Straight",
  box: "Box",
  frontPair: "Front pair",
  backPair: "Back pair",
};

/** Typical published prizes per $1 staked. Jurisdictions differ — always check yours. */
export const BASE_PRIZES = {
  straight: 500,
  boxDistinct: 80,
  boxPair: 160,
  boxTriple: 500,
  frontPair: 50,
  backPair: 50,
} as const;

export const MIN_STAKE = 0.5;
export const MAX_STAKE = 20;

export function isValidDigit(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 9;
}

export function isValidTriple(value: unknown): value is Triple {
  return Array.isArray(value) && value.length === 3 && value.every(isValidDigit);
}

export function formatTriple(digits: Triple): string {
  return digits.join("");
}

/** Accepts "123", "1 2 3", "1-2-3" — returns null when it is not three digits. */
export function parseTriple(input: string): Triple | null {
  const cleaned = input.replace(/[^0-9]/g, "");
  if (cleaned.length !== 3) return null;
  return [Number(cleaned[0]), Number(cleaned[1]), Number(cleaned[2])];
}

export function tripleKind(digits: Triple): TripleKind {
  const unique = new Set(digits).size;
  if (unique === 1) return "triple";
  if (unique === 2) return "pair";
  return "distinct";
}

/** How many distinct orderings a box ticket covers. */
export function boxCombinationCount(digits: Triple): number {
  const kind = tripleKind(digits);
  if (kind === "triple") return 1;
  if (kind === "pair") return 3;
  return 6;
}

export function basePrizeFor(play: PlayType, digits: Triple): number {
  if (play === "straight") return BASE_PRIZES.straight;
  if (play === "frontPair") return BASE_PRIZES.frontPair;
  if (play === "backPair") return BASE_PRIZES.backPair;
  const kind = tripleKind(digits);
  if (kind === "triple") return BASE_PRIZES.boxTriple;
  if (kind === "pair") return BASE_PRIZES.boxPair;
  return BASE_PRIZES.boxDistinct;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sortedDigits(digits: Triple): number[] {
  return [...digits].sort((a, b) => a - b);
}

function matchedInPlace(ticket: Triple, draw: Triple): number {
  let matched = 0;
  for (let index = 0; index < 3; index += 1) {
    if (ticket[index] === draw[index]) matched += 1;
  }
  return matched;
}

/** Multiset overlap: how many ticket digits appear anywhere in the draw. */
export function matchedAnyOrder(ticket: Triple, draw: Triple): number {
  const pool = sortedDigits(draw);
  let matched = 0;
  for (const digit of sortedDigits(ticket)) {
    const found = pool.indexOf(digit);
    if (found >= 0) {
      pool.splice(found, 1);
      matched += 1;
    }
  }
  return matched;
}

export function evaluateTicket(
  ticket: { digits: Triple; play: PlayType; stake: number },
  draw: Triple,
): Evaluation {
  const kind = tripleKind(ticket.digits);
  const matchedPositions = matchedInPlace(ticket.digits, draw);
  const overlap = matchedAnyOrder(ticket.digits, draw);
  const rate = basePrizeFor(ticket.play, ticket.digits);
  const prize = roundMoney(rate * ticket.stake);

  if (ticket.play === "straight") {
    const win = matchedPositions === 3;
    return {
      status: win ? "win" : "loss",
      prize: win ? prize : 0,
      matchedPositions,
      matchedAnyOrder: overlap,
      kind,
      reason: win
        ? "All three digits in place — straight hit."
        : matchedPositions > 0
          ? `${matchedPositions} digit${matchedPositions === 1 ? "" : "s"} in place, but straight needs all three.`
          : "No digit in the drawn position.",
    };
  }

  if (ticket.play === "box") {
    const win = sortedDigits(ticket.digits).join("") === sortedDigits(draw).join("");
    return {
      status: win ? "win" : "loss",
      prize: win ? prize : 0,
      matchedPositions,
      matchedAnyOrder: overlap,
      kind,
      reason: win
        ? kind === "triple"
          ? "Triple matched — box pays the straight rate."
          : "Same three digits in a different order — box hit."
        : overlap === 2
          ? "Two of the three digits appear in the draw."
          : "The box needs all three digits.",
    };
  }

  const front = ticket.play === "frontPair";
  const win = front
    ? ticket.digits[0] === draw[0] && ticket.digits[1] === draw[1]
    : ticket.digits[1] === draw[1] && ticket.digits[2] === draw[2];

  return {
    status: win ? "win" : "loss",
    prize: win ? prize : 0,
    matchedPositions,
    matchedAnyOrder: overlap,
    kind,
    reason: win
      ? `${front ? "Front" : "Back"} two digits matched in place.`
      : `${front ? "Front" : "Back"} pair needs both digits in place.`,
  };
}

export function summarize(
  tickets: { digits: Triple; play: PlayType; stake: number }[],
  draw: Triple,
): TicketSummary {
  let stake = 0;
  let prize = 0;
  let wins = 0;
  for (const ticket of tickets) {
    const evaluation = evaluateTicket(ticket, draw);
    stake += ticket.stake;
    prize += evaluation.prize;
    if (evaluation.status === "win") wins += 1;
  }
  stake = roundMoney(stake);
  prize = roundMoney(prize);
  return { tickets: tickets.length, stake, prize, net: roundMoney(prize - stake), wins };
}

export function permutations(digits: Triple): Triple[] {
  const [a, b, c] = digits;
  const candidates: Triple[] = [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
  const seen = new Set<string>();
  const result: Triple[] = [];
  for (const candidate of candidates) {
    const key = candidate.join("");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(candidate);
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Randomness                                                          */
/* ------------------------------------------------------------------ */

export type Rng = () => number;

export function defaultRng(): number {
  const globalCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.getRandomValues === "function") {
    const bucket = new Uint32Array(1);
    globalCrypto.getRandomValues(bucket);
    return bucket[0] / 4294967296;
  }
  return Math.random();
}

function randomDigit(rng: Rng): number {
  return Math.min(9, Math.max(0, Math.floor(rng() * 10)));
}

export type PickFilters = {
  count: number;
  include: number[];
  exclude: number[];
  sumMin: number;
  sumMax: number;
  allowDoubles: boolean;
  allowTriples: boolean;
};

export const DEFAULT_FILTERS: PickFilters = {
  count: 6,
  include: [],
  exclude: [],
  sumMin: 0,
  sumMax: 27,
  allowDoubles: true,
  allowTriples: false,
};

export function tripleSum(digits: Triple): number {
  return digits[0] + digits[1] + digits[2];
}

export function passesFilters(digits: Triple, filters: PickFilters): boolean {
  if (filters.include.length > 3) return false;
  if (filters.include.some((digit) => !digits.includes(digit))) return false;
  if (digits.some((digit) => filters.exclude.includes(digit))) return false;

  const sum = tripleSum(digits);
  if (sum < filters.sumMin || sum > filters.sumMax) return false;

  const kind = tripleKind(digits);
  if (kind === "triple" && !filters.allowTriples) return false;
  if (kind === "pair" && !filters.allowDoubles) return false;
  if (kind === "triple" && !filters.allowDoubles) return false;

  return true;
}

/** Rejection-samples unique digit sets that satisfy every active filter. */
export function generatePicks(
  filters: PickFilters,
  options: { rng?: Rng; avoid?: Triple[]; maxAttempts?: number } = {},
): Triple[] {
  const rng = options.rng ?? defaultRng;
  const maxAttempts = options.maxAttempts ?? 20000;
  const avoidKeys = new Set((options.avoid ?? []).map((triple) => sortedDigits(triple).join("")));
  const picked = new Map<string, Triple>();
  const target = Math.max(1, Math.min(20, Math.floor(filters.count)));

  for (let attempt = 0; attempt < maxAttempts && picked.size < target; attempt += 1) {
    const candidate: Triple = [randomDigit(rng), randomDigit(rng), randomDigit(rng)];
    if (!passesFilters(candidate, filters)) continue;
    const key = sortedDigits(candidate).join("");
    if (avoidKeys.has(key) || picked.has(key)) continue;
    picked.set(key, candidate);
  }

  return [...picked.values()];
}

/* ------------------------------------------------------------------ */
/* Draw statistics                                                     */
/* ------------------------------------------------------------------ */

export type DigitStat = {
  digit: number;
  count: number;
  share: number;
  /** Draws since the digit last appeared. 0 = in the latest draw. null = never. */
  gap: number | null;
  inLatest: boolean;
};

export type DrawStats = {
  total: number;
  digits: DigitStat[];
  hottest: number[];
  coldest: number[];
  mostOverdue: DigitStat[];
  repeatShare: number;
  doubleCount: number;
  tripleCount: number;
  oddDistribution: [number, number, number, number];
  sumBands: { label: string; range: string; count: number; share: number }[];
  averageSum: number;
  lastSums: { id: string; sum: number; date: string }[];
};

export function sortDraws(draws: DrawRecord[]): DrawRecord[] {
  return [...draws].sort((a, b) => {
    if (a.date === b.date) return a.id < b.id ? 1 : -1;
    return a.date < b.date ? 1 : -1;
  });
}

export const SUM_BANDS: { label: string; range: string; min: number; max: number }[] = [
  { label: "Low", range: "0–6", min: 0, max: 6 },
  { label: "Mid-low", range: "7–13", min: 7, max: 13 },
  { label: "Mid-high", range: "14–20", min: 14, max: 20 },
  { label: "High", range: "21–27", min: 21, max: 27 },
];

export function computeStats(input: DrawRecord[]): DrawStats {
  const draws = sortDraws(input);
  const counts = new Array<number>(10).fill(0);
  const firstSeen = new Array<number | null>(10).fill(null);
  const oddDistribution: [number, number, number, number] = [0, 0, 0, 0];
  const bandCounts = SUM_BANDS.map(() => 0);
  let doubleCount = 0;
  let tripleCount = 0;
  let sumTotal = 0;

  draws.forEach((draw, index) => {
    const digits = draw.digits;
    const kind = tripleKind(digits);
    if (kind === "pair") doubleCount += 1;
    if (kind === "triple") tripleCount += 1;

    const odd = digits.filter((digit) => digit % 2 === 1).length;
    oddDistribution[odd] += 1;

    const sum = tripleSum(digits);
    sumTotal += sum;
    const bandIndex = SUM_BANDS.findIndex((band) => sum >= band.min && sum <= band.max);
    if (bandIndex >= 0) bandCounts[bandIndex] += 1;

    for (const digit of digits) {
      counts[digit] += 1;
      if (firstSeen[digit] === null) firstSeen[digit] = index;
    }
  });

  const totalDraws = draws.length;
  const totalDigits = totalDraws * 3;
  const latest = draws[0]?.digits ?? null;

  const digits: DigitStat[] = counts.map((count, digit) => ({
    digit,
    count,
    share: totalDigits === 0 ? 0 : count / totalDigits,
    gap: firstSeen[digit],
    inLatest: latest ? latest.includes(digit) : false,
  }));

  const byCount = [...digits].sort((a, b) => b.count - a.count || a.digit - b.digit);
  const hottest = byCount.filter((entry) => entry.count > 0).slice(0, 3).map((entry) => entry.digit);
  const coldest = [...digits].sort((a, b) => a.count - b.count || a.digit - b.digit).slice(0, 3).map((entry) => entry.digit);
  const mostOverdue = [...digits]
    .filter((entry) => entry.gap !== null)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    .slice(0, 3);

  return {
    total: totalDraws,
    digits,
    hottest,
    coldest,
    mostOverdue,
    repeatShare: totalDraws === 0 ? 0 : (doubleCount + tripleCount) / totalDraws,
    doubleCount,
    tripleCount,
    oddDistribution,
    sumBands: SUM_BANDS.map((band, index) => ({
      label: band.label,
      range: band.range,
      count: bandCounts[index],
      share: totalDraws === 0 ? 0 : bandCounts[index] / totalDraws,
    })),
    averageSum: totalDraws === 0 ? 0 : sumTotal / totalDraws,
    lastSums: draws.slice(0, 12).reverse().map((draw) => ({ id: draw.id, sum: tripleSum(draw.digits), date: draw.date })),
  };
}

/* ------------------------------------------------------------------ */
/* Export / import                                                     */
/* ------------------------------------------------------------------ */

export const EXPORT_SIGNATURE = "paradise-pick3";

export type ExportBundle = {
  app: typeof EXPORT_SIGNATURE;
  version: 1;
  exportedAt: string;
  draws: DrawRecord[];
  tickets: Ticket[];
};

export function buildExport(draws: DrawRecord[], tickets: Ticket[]): ExportBundle {
  return {
    app: EXPORT_SIGNATURE,
    version: 1,
    exportedAt: new Date().toISOString(),
    draws,
    tickets,
  };
}

export type ParseResult =
  | { ok: true; draws: DrawRecord[]; tickets: Ticket[]; skipped: number }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeDraws(value: unknown): DrawRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !isValidTriple(entry.digits)) return [];
    const date = typeof entry.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
      ? entry.date
      : new Date().toISOString().slice(0, 10);
    return [{
      id: typeof entry.id === "string" && entry.id ? entry.id : `draw-${Math.random().toString(36).slice(2, 10)}`,
      digits: entry.digits,
      date,
      label: typeof entry.label === "string" ? entry.label.slice(0, 40) : undefined,
    }];
  });
}

function sanitizeTickets(value: unknown): Ticket[] {
  if (!Array.isArray(value)) return [];
  const plays: PlayType[] = ["straight", "box", "frontPair", "backPair"];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !isValidTriple(entry.digits)) return [];
    const play = plays.includes(entry.play as PlayType) ? (entry.play as PlayType) : "straight";
    const stake = typeof entry.stake === "number" && Number.isFinite(entry.stake)
      ? Math.min(MAX_STAKE, Math.max(MIN_STAKE, entry.stake))
      : 1;
    return [{
      id: typeof entry.id === "string" && entry.id ? entry.id : `ticket-${Math.random().toString(36).slice(2, 10)}`,
      digits: entry.digits,
      play,
      stake,
      note: typeof entry.note === "string" ? entry.note.slice(0, 80) : undefined,
      createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
    }];
  });
}

export function parseExport(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!isRecord(parsed)) return { ok: false, error: "That file does not look like a Paradise Pick 3 backup." };
  if (parsed.app !== EXPORT_SIGNATURE) {
    return { ok: false, error: "This backup was not created by Paradise Pick 3." };
  }
  if (!Array.isArray(parsed.draws) && !Array.isArray(parsed.tickets)) {
    return { ok: false, error: "The backup has no draws or tickets." };
  }

  const rawDraws = Array.isArray(parsed.draws) ? parsed.draws : [];
  const rawTickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];
  const draws = sanitizeDraws(rawDraws);
  const tickets = sanitizeTickets(rawTickets);
  const skipped = rawDraws.length + rawTickets.length - draws.length - tickets.length;

  return { ok: true, draws, tickets, skipped };
}

export function makeId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatMoney(value: number): string {
  const sign = value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  const formatted = absolute.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${formatted}`;
}
