import { describe, expect, it } from "vitest";

import {
  buildExport,
  computeStats,
  evaluateTicket,
  generatePicks,
  parseExport,
  parseTriple,
  permutations,
  summarize,
  tripleKind,
  type DrawRecord,
  type PickFilters,
  type Triple,
} from "../lib/pick3";

const draw: Triple = [1, 2, 3];

describe("triple parsing", () => {
  it("reads three digits from common formats", () => {
    expect(parseTriple("123")).toEqual([1, 2, 3]);
    expect(parseTriple(" 1 2 3 ")).toEqual([1, 2, 3]);
    expect(parseTriple("1-2-3")).toEqual([1, 2, 3]);
  });

  it("rejects anything that is not exactly three digits", () => {
    expect(parseTriple("12")).toBeNull();
    expect(parseTriple("1234")).toBeNull();
    expect(parseTriple("")).toBeNull();
  });

  it("classifies shape", () => {
    expect(tripleKind([1, 2, 3])).toBe("distinct");
    expect(tripleKind([1, 2, 1])).toBe("pair");
    expect(tripleKind([9, 9, 9])).toBe("triple");
  });
});

describe("evaluateTicket", () => {
  it("pays a straight only on an exact match, at the per-$1 rate", () => {
    const win = evaluateTicket({ digits: [1, 2, 3], play: "straight", stake: 1 }, draw);
    expect(win.status).toBe("win");
    expect(win.prize).toBe(500);
    expect(win.matchedPositions).toBe(3);

    const ordered = evaluateTicket({ digits: [3, 2, 1], play: "straight", stake: 1 }, draw);
    expect(ordered.status).toBe("loss");
    expect(ordered.prize).toBe(0);
    expect(ordered.matchedPositions).toBe(1);
  });

  it("scales the prize with stake and rounds to cents", () => {
    expect(evaluateTicket({ digits: [1, 2, 3], play: "straight", stake: 0.5 }, draw).prize).toBe(250);
    expect(evaluateTicket({ digits: [1, 2, 3], play: "straight", stake: 2 }, draw).prize).toBe(1000);
    expect(evaluateTicket({ digits: [1, 2, 3], play: "straight", stake: 1.25 }, draw).prize).toBe(625);
  });

  it("pays a box on any order and uses the right box rate", () => {
    const sixWay = evaluateTicket({ digits: [3, 2, 1], play: "box", stake: 1 }, draw);
    expect(sixWay.status).toBe("win");
    expect(sixWay.prize).toBe(80);
    expect(sixWay.matchedPositions).toBe(1);

    const threeWay = evaluateTicket({ digits: [1, 1, 2], play: "box", stake: 1 }, [2, 1, 1]);
    expect(threeWay.status).toBe("win");
    expect(threeWay.prize).toBe(160);

    const triple = evaluateTicket({ digits: [5, 5, 5], play: "box", stake: 1 }, [5, 5, 5]);
    expect(triple.status).toBe("win");
    expect(triple.prize).toBe(500);
  });

  it("pays front and back pairs independently of the third digit", () => {
    const front = evaluateTicket({ digits: [1, 2, 9], play: "frontPair", stake: 1 }, draw);
    expect(front.status).toBe("win");
    expect(front.prize).toBe(50);

    const back = evaluateTicket({ digits: [9, 2, 3], play: "backPair", stake: 1 }, draw);
    expect(back.status).toBe("win");
    expect(back.prize).toBe(50);

    const off = evaluateTicket({ digits: [9, 2, 8], play: "backPair", stake: 1 }, draw);
    expect(off.status).toBe("loss");
  });

  it("does not count a digit twice when it appears once in the draw", () => {
    const result = evaluateTicket({ digits: [1, 1, 1], play: "straight", stake: 1 }, draw);
    expect(result.matchedPositions).toBe(1);
    expect(result.matchedAnyOrder).toBe(1);
  });
});

describe("summarize", () => {
  it("totals stake, prize and net across tickets", () => {
    const summary = summarize(
      [
        { digits: [1, 2, 3], play: "straight", stake: 1 },
        { digits: [3, 2, 1], play: "box", stake: 2 },
        { digits: [9, 9, 9], play: "straight", stake: 1 },
      ],
      draw,
    );
    expect(summary.tickets).toBe(3);
    expect(summary.stake).toBe(4);
    expect(summary.prize).toBe(660);
    expect(summary.net).toBe(656);
    expect(summary.wins).toBe(2);
  });
});

describe("permutations", () => {
  it("covers 6, 3 and 1 orderings", () => {
    expect(permutations([4, 1, 7])).toHaveLength(6);
    expect(permutations([1, 2, 1])).toHaveLength(3);
    expect(permutations([8, 8, 8])).toHaveLength(1);
    expect(new Set(permutations([4, 1, 7]).map((entry) => entry.join(""))).size).toBe(6);
  });
});

describe("generatePicks", () => {
  const filters: PickFilters = {
    count: 6,
    include: [4],
    exclude: [9, 8],
    sumMin: 8,
    sumMax: 20,
    allowDoubles: false,
    allowTriples: false,
  };

  it("honours every active filter across repeated runs", () => {
    for (let run = 0; run < 40; run += 1) {
      const picks = generatePicks(filters);
      expect(picks.length).toBeGreaterThan(0);
      expect(picks.length).toBeLessThanOrEqual(6);
      for (const pick of picks) {
        expect(pick).toContain(4);
        expect(pick).not.toContain(9);
        expect(pick).not.toContain(8);
        const sum = pick[0] + pick[1] + pick[2];
        expect(sum).toBeGreaterThanOrEqual(8);
        expect(sum).toBeLessThanOrEqual(20);
        expect(tripleKind(pick)).toBe("distinct");
      }
      const keys = picks.map((pick) => [...pick].sort().join(""));
      expect(new Set(keys).size).toBe(picks.length);
    }
  });

  it("respects the requested count and exclusion list", () => {
    const picks = generatePicks(
      { ...filters, include: [], exclude: [], count: 5 },
      { avoid: [[1, 2, 3], [4, 5, 6]] },
    );
    expect(picks).toHaveLength(5);
    const keys = picks.map((pick) => [...pick].sort().join(""));
    expect(keys).not.toContain("123");
    expect(keys).not.toContain("456");
  });

  it("returns fewer picks rather than breaking an impossible filter set", () => {
    const picks = generatePicks(
      { ...filters, count: 4, include: [0, 1, 2], exclude: [2], allowDoubles: true },
      { maxAttempts: 500 },
    );
    expect(picks).toHaveLength(0);
  });
});

describe("computeStats", () => {
  const draws: DrawRecord[] = [
    { id: "c", digits: [1, 2, 3], date: "2026-01-03" },
    { id: "b", digits: [1, 1, 2], date: "2026-01-02" },
    { id: "a", digits: [1, 1, 1], date: "2026-01-01" },
  ];

  it("counts digit frequency, gaps and repeats", () => {
    const stats = computeStats(draws);
    expect(stats.total).toBe(3);
    expect(stats.digits[1].count).toBe(6);
    expect(stats.digits[2].count).toBe(2);
    expect(stats.digits[3].count).toBe(1);
    expect(stats.digits[1].gap).toBe(0);
    expect(stats.digits[4].gap).toBeNull();
    expect(stats.doubleCount).toBe(1);
    expect(stats.tripleCount).toBe(1);
    expect(stats.repeatShare).toBeCloseTo(2 / 3);
    expect(stats.oddDistribution).toEqual([0, 0, 2, 1]);
    expect(stats.averageSum).toBeCloseTo((6 + 4 + 3) / 3);
  });

  it("orders the sum trace oldest to newest", () => {
    const stats = computeStats(draws);
    expect(stats.lastSums.map((entry) => entry.sum)).toEqual([3, 4, 6]);
  });

  it("is safe on an empty log", () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.averageSum).toBe(0);
    expect(stats.repeatShare).toBe(0);
  });
});

describe("export and import", () => {
  it("round-trips a backup", () => {
    const bundle = buildExport(
      [{ id: "d1", digits: [4, 1, 7], date: "2026-02-01" }],
      [{ id: "t1", digits: [4, 1, 7], play: "box", stake: 2, createdAt: "2026-02-01T10:00:00.000Z" }],
    );
    const parsed = parseExport(JSON.stringify(bundle));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.draws).toHaveLength(1);
      expect(parsed.tickets).toHaveLength(1);
      expect(parsed.tickets[0].play).toBe("box");
      expect(parsed.skipped).toBe(0);
    }
  });

  it("rejects malformed and foreign files", () => {
    expect(parseExport("not json").ok).toBe(false);
    expect(parseExport(JSON.stringify({ app: "other" })).ok).toBe(false);
  });

  it("skips invalid records instead of failing the whole import", () => {
    const parsed = parseExport(
      JSON.stringify({
        app: "paradise-pick3",
        version: 1,
        draws: [{ id: "x", digits: [1, 2], date: "2026-01-01" }],
        tickets: [{ id: "y", digits: [1, 2, 3], play: "straight", stake: 99 }],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.draws).toHaveLength(0);
      expect(parsed.tickets).toHaveLength(1);
      expect(parsed.tickets[0].stake).toBe(20);
      expect(parsed.skipped).toBe(1);
    }
  });
});
