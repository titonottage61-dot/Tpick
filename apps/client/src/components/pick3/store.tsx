import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  buildExport,
  makeId,
  type DrawRecord,
  type ExportBundle,
  type PlayType,
  type Ticket,
  type TicketResult,
  type Triple,
} from "@/lib/pick3";

const DRAWS_KEY = "pp3.draws.v1";
const TICKETS_KEY = "pp3.tickets.v1";

type NewTicket = {
  digits: Triple;
  play: PlayType;
  stake: number;
  note?: string;
  result?: TicketResult;
};

type NewDraw = {
  digits: Triple;
  date: string;
  label?: string;
};

type ImportOutcome = {
  draws: number;
  tickets: number;
  skipped: number;
};

type Pick3ContextValue = {
  hydrated: boolean;
  draws: DrawRecord[];
  tickets: Ticket[];
  addDraw: (input: NewDraw) => DrawRecord;
  deleteDraw: (id: string) => void;
  clearDraws: () => void;
  addTickets: (inputs: NewTicket[]) => number;
  deleteTicket: (id: string) => void;
  clearTickets: () => void;
  applyResults: (results: { ticketId: string; result: TicketResult }[]) => void;
  importBundle: (bundle: { draws: DrawRecord[]; tickets: Ticket[] }, mode: "merge" | "replace") => ImportOutcome;
  exportBundle: () => ExportBundle;
  seedSamples: (samples: { digits: Triple; date: string; label?: string }[]) => number;
};

const Pick3Context = createContext<Pick3ContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the session still works in memory */
  }
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function Pick3Provider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [draws, setDraws] = useState<DrawRecord[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    setDraws(readJson<DrawRecord[]>(DRAWS_KEY, []));
    setTickets(readJson<Ticket[]>(TICKETS_KEY, []));
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === DRAWS_KEY) setDraws(readJson<DrawRecord[]>(DRAWS_KEY, []));
      if (event.key === TICKETS_KEY) setTickets(readJson<Ticket[]>(TICKETS_KEY, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeJson(DRAWS_KEY, draws);
  }, [draws, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    writeJson(TICKETS_KEY, tickets);
  }, [tickets, hydrated]);

  const addDraw = useCallback((input: NewDraw) => {
    const record: DrawRecord = {
      id: makeId("draw"),
      digits: input.digits,
      date: input.date,
      label: input.label?.trim() || undefined,
    };
    setDraws((current) => dedupeById([record, ...current]));
    return record;
  }, []);

  const deleteDraw = useCallback((id: string) => {
    setDraws((current) => current.filter((draw) => draw.id !== id));
  }, []);

  const clearDraws = useCallback(() => setDraws([]), []);

  const addTickets = useCallback((inputs: NewTicket[]) => {
    if (inputs.length === 0) return 0;
    const created: Ticket[] = inputs.map((input) => ({
      id: makeId("ticket"),
      digits: input.digits,
      play: input.play,
      stake: input.stake,
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
      result: input.result,
    }));
    setTickets((current) => dedupeById([...created, ...current]));
    return created.length;
  }, []);

  const deleteTicket = useCallback((id: string) => {
    setTickets((current) => current.filter((ticket) => ticket.id !== id));
  }, []);

  const clearTickets = useCallback(() => setTickets([]), []);

  const applyResults = useCallback((results: { ticketId: string; result: TicketResult }[]) => {
    if (results.length === 0) return;
    const map = new Map(results.map((entry) => [entry.ticketId, entry.result]));
    setTickets((current) =>
      current.map((ticket) => {
        const result = map.get(ticket.id);
        return result ? { ...ticket, result } : ticket;
      }),
    );
  }, []);

  const importBundle = useCallback<Pick3ContextValue["importBundle"]>((bundle, mode) => {
    let nextDraws = bundle.draws;
    let nextTickets = bundle.tickets;
    let skipped = 0;

    if (mode === "merge") {
      const drawIds = new Set(bundle.draws.map((draw) => draw.id));
      const ticketIds = new Set(bundle.tickets.map((ticket) => ticket.id));
      const keptDraws = draws.filter((draw) => !drawIds.has(draw.id));
      const keptTickets = tickets.filter((ticket) => !ticketIds.has(ticket.id));
      skipped = draws.length - keptDraws.length + (tickets.length - keptTickets.length);
      nextDraws = dedupeById([...bundle.draws, ...keptDraws]);
      nextTickets = dedupeById([...bundle.tickets, ...keptTickets]);
    }

    setDraws(nextDraws);
    setTickets(nextTickets);
    return { draws: nextDraws.length, tickets: nextTickets.length, skipped };
  }, [draws, tickets]);

  const exportBundle = useCallback(() => buildExport(draws, tickets), [draws, tickets]);

  const seedSamples = useCallback((samples: { digits: Triple; date: string; label?: string }[]) => {
    const records: DrawRecord[] = samples.map((sample) => ({
      id: makeId("sample"),
      digits: sample.digits,
      date: sample.date,
      label: sample.label ?? "Sample draw",
    }));
    setDraws((current) => dedupeById([...records, ...current]));
    return records.length;
  }, []);

  const value = useMemo<Pick3ContextValue>(
    () => ({
      hydrated,
      draws,
      tickets,
      addDraw,
      deleteDraw,
      clearDraws,
      addTickets,
      deleteTicket,
      clearTickets,
      applyResults,
      importBundle,
      exportBundle,
      seedSamples,
    }),
    [
      hydrated,
      draws,
      tickets,
      addDraw,
      deleteDraw,
      clearDraws,
      addTickets,
      deleteTicket,
      clearTickets,
      applyResults,
      importBundle,
      exportBundle,
      seedSamples,
    ],
  );

  return <Pick3Context.Provider value={value}>{children}</Pick3Context.Provider>;
}

export function usePick3(): Pick3ContextValue {
  const context = useContext(Pick3Context);
  if (!context) throw new Error("usePick3 must be used inside Pick3Provider");
  return context;
}
