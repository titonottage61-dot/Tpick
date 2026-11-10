import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { IconArrow, IconCopy, IconPlus, IconSpark, IconTicket } from "@/components/pick3/icons";
import { AppShell } from "@/components/pick3/shell";
import { usePick3 } from "@/components/pick3/store";
import {
  DigitBoard,
  EmptyState,
  FieldLabel,
  PageHeader,
  Panel,
  PanelTitle,
  Segmented,
  Tag,
  Toggle,
  TripleInput,
} from "@/components/pick3/ui";
import {
  DEFAULT_FILTERS,
  boxCombinationCount,
  formatTriple,
  generatePicks,
  parseTriple,
  permutations,
  tripleKind,
  tripleSum,
  type PickFilters,
  type PlayType,
  type Triple,
} from "@/lib/pick3";
import { cn } from "@/lib/utils";

const COUNTS = [3, 6, 10, 12];

const SUM_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Any", min: 0, max: 27 },
  { label: "Low", min: 0, max: 9 },
  { label: "Balanced", min: 10, max: 17 },
  { label: "High", min: 18, max: 27 },
];

const PicksPage = () => {
  const { draws, addTickets } = usePick3();

  const [filters, setFilters] = useState<PickFilters>(DEFAULT_FILTERS);
  const [avoidRecent, setAvoidRecent] = useState(false);
  const [picks, setPicks] = useState<Triple[]>([]);
  const [generatedAt, setGeneratedAt] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [savedAll, setSavedAll] = useState(false);
  const [coverSaved, setCoverSaved] = useState(false);
  const [saveAs, setSaveAs] = useState<PlayType>("box");
  const [coverText, setCoverText] = useState("");
  const copyTimer = useRef<number | null>(null);

  const avoid = useMemo(
    () => (avoidRecent ? draws.slice(0, 20).map((draw) => draw.digits) : []),
    [avoidRecent, draws],
  );

  const runGenerate = useCallback(
    (nextFilters: PickFilters, nextAvoid: boolean) => {
      const avoidList = nextAvoid ? draws.slice(0, 20).map((draw) => draw.digits) : [];
      setPicks(generatePicks(nextFilters, { avoid: avoidList }));
      setGeneratedAt(Date.now());
      setSavedAll(false);
    },
    [draws],
  );

  useEffect(() => {
    setPicks(generatePicks(DEFAULT_FILTERS));
    setGeneratedAt(Date.now());
  }, []);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const patchFilters = (patch: Partial<PickFilters>) => setFilters((current) => ({ ...current, ...patch }));

  const toggleInclude = (digit: number) => {
    setFilters((current) => {
      const included = current.include.includes(digit);
      const include = included
        ? current.include.filter((entry) => entry !== digit)
        : current.include.length >= 3
          ? current.include
          : [...current.include, digit];
      return { ...current, include, exclude: current.exclude.filter((entry) => entry !== digit) };
    });
  };

  const toggleExclude = (digit: number) => {
    setFilters((current) => {
      const excluded = current.exclude.includes(digit);
      const exclude = excluded
        ? current.exclude.filter((entry) => entry !== digit)
        : [...current.exclude, digit];
      return { ...current, exclude, include: current.include.filter((entry) => entry !== digit) };
    });
  };

  const coverDigits = parseTriple(coverText);
  const cover = coverDigits ? permutations(coverDigits) : [];

  const copy = async (digits: Triple) => {
    const text = formatTriple(digits);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  const sums = picks.map(tripleSum);
  const sumRange = sums.length ? `${Math.min(...sums)}–${Math.max(...sums)}` : "—";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Number builder"
        title="Build sets on your terms"
        description="Choose how many sets, which digits must appear, which to leave out, and the sum band you want. Every set is drawn at random from the rules you set — no digit is treated as due."
        actions={
          <Tag tone="violet">
            <IconSpark className="h-3.5 w-3.5" />
            {picks.length} sets
          </Tag>
        }
      />

      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelTitle title="Rules" hint="Filters are applied before a set is accepted." />

            <FieldLabel>How many sets</FieldLabel>
            <div className="seg mb-5">
              {COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  data-on={filters.count === count}
                  onClick={() => patchFilters({ count })}
                >
                  {count}
                </button>
              ))}
            </div>

            <FieldLabel hint="Pick 3 sums run from 0 (000) to 27 (999).">Sum band</FieldLabel>
            <div className="seg mb-3">
              {SUM_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  data-on={filters.sumMin === preset.min && filters.sumMax === preset.max}
                  onClick={() => patchFilters({ sumMin: preset.min, sumMax: preset.max })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mb-5 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={27}
                value={filters.sumMin}
                onChange={(event) => {
                  const value = Math.min(27, Math.max(0, Number(event.currentTarget.value) || 0));
                  patchFilters({ sumMin: Math.min(value, filters.sumMax) });
                }}
                className="field w-20 text-center font-display"
                aria-label="Minimum sum"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="number"
                min={0}
                max={27}
                value={filters.sumMax}
                onChange={(event) => {
                  const value = Math.min(27, Math.max(0, Number(event.currentTarget.value) || 0));
                  patchFilters({ sumMax: Math.max(value, filters.sumMin) });
                }}
                className="field w-20 text-center font-display"
                aria-label="Maximum sum"
              />
              <span className="ml-1 text-[0.7rem] text-muted-foreground">
                sum {filters.sumMin}–{filters.sumMax}
              </span>
            </div>

            <FieldLabel hint="Up to three. Each set will contain every digit you pick.">Must include</FieldLabel>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, digit) => digit).map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="chip"
                  data-on={filters.include.includes(digit)}
                  onClick={() => toggleInclude(digit)}
                  aria-pressed={filters.include.includes(digit)}
                >
                  {digit}
                </button>
              ))}
            </div>

            <FieldLabel hint="Digits that must never appear in a set.">Leave out</FieldLabel>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, digit) => digit).map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="chip"
                  data-tone="exclude"
                  data-on={filters.exclude.includes(digit)}
                  onClick={() => toggleExclude(digit)}
                  aria-pressed={filters.exclude.includes(digit)}
                >
                  {digit}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Toggle
                checked={filters.allowDoubles}
                onChange={(next) =>
                  patchFilters({ allowDoubles: next, allowTriples: next ? filters.allowTriples : false })
                }
                label="Allow repeated digits"
                hint="Sets like 4·4·7 and 1·1·1"
              />
              <Toggle
                checked={filters.allowTriples}
                onChange={(next) => patchFilters({ allowTriples: next })}
                label="Allow triples"
                hint="Sets like 9·9·9"
                disabled={!filters.allowDoubles}
              />
              <Toggle
                checked={avoidRecent}
                onChange={(next) => {
                  setAvoidRecent(next);
                  runGenerate(filters, next);
                }}
                label="Skip my recent draws"
                hint="Avoids the last 20 draw combinations you logged"
                disabled={draws.length === 0}
              />
            </div>

            <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => runGenerate(filters, avoidRecent)}>
              <IconSpark className="h-4 w-4" />
              Generate {filters.count} sets
            </button>
            <p className="mt-2 text-center text-[0.68rem] text-muted-foreground">
              Random, unbiased sampling · {avoid.length > 0 ? `${avoid.length} recent draws avoided` : "no draw exclusions"}
            </p>
          </Panel>

          <Panel>
            <PanelTitle
              title="Box cover"
              hint="A box ticket already covers every ordering. This shows exactly which straights it holds."
            />
            <TripleInput value={coverText} onChange={setCoverText} size="sm" label="Digits to cover" />
            {coverDigits && cover.length > 0 ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="violet">{cover.length} straight{cover.length === 1 ? "" : "s"}</Tag>
                  <span className="text-[0.7rem] text-muted-foreground">
                    {tripleKind(coverDigits) === "distinct"
                      ? "Six-way box"
                      : tripleKind(coverDigits) === "pair"
                        ? "Three-way box"
                        : "Triple — one ordering"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cover.map((entry) => (
                    <span
                      key={formatTriple(entry)}
                      className="rounded-md border border-line bg-black/25 px-2 py-1 font-display text-xs text-foreground"
                    >
                      {formatTriple(entry)}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost mt-3 w-full"
                  onClick={() => {
                    addTickets(cover.map((digits) => ({ digits, play: "straight" as PlayType, stake: 1 })));
                    setCoverSaved(true);
                  }}
                >
                  <IconPlus className="h-4 w-4" />
                  {coverSaved ? "Saved to My tickets" : `Save all ${cover.length} as straight tickets`}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-foreground">
                Enter three digits to see the {coverDigits ? boxCombinationCount(coverDigits) : 6} orderings a box
                ticket covers.
              </p>
            )}
          </Panel>
        </div>

        <Panel className="h-fit">
          <PanelTitle
            title="Your sets"
            hint={`Generated ${generatedAt ? "just now" : "—"} · sums ${sumRange}`}
            right={
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">save as</span>
                <Segmented
                  value={saveAs === "box" ? "box" : "straight"}
                  onChange={(next) => setSaveAs(next)}
                  options={[
                    { value: "box", label: "Box" },
                    { value: "straight", label: "Straight" },
                  ]}
                  label="Save play type"
                />
              </div>
            }
          />

          {picks.length === 0 ? (
            <EmptyState
              title="No sets match those rules"
              body="The filters are too tight for three digits — for example, three required digits that also appear in Leave out. Relax one and generate again."
              icon={<IconSpark className="h-6 w-6" />}
            />
          ) : (
            <>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {picks.map((digits, index) => {
                  const key = formatTriple(digits);
                  return (
                    <div
                      key={key}
                      className="animate-rise group rounded-xl border border-line bg-white/[0.02] p-3 transition-colors hover:border-lime/30"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <DigitBoard digits={digits} size="md" />
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-display text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                            sum {tripleSum(digits)}
                          </span>
                          <span className={cn("text-[0.6rem] uppercase tracking-[0.1em]", "text-violet/80")}>
                            {tripleKind(digits) === "distinct" ? "6-way" : tripleKind(digits) === "pair" ? "3-way" : "triple"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        <button type="button" className="btn btn-ghost h-8 flex-1 px-2 text-[0.7rem]" onClick={() => void copy(digits)}>
                          <IconCopy className="h-3.5 w-3.5" />
                          {copied === key ? "Copied" : "Copy"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost h-8 flex-1 px-2 text-[0.7rem]"
                          onClick={() => {
                            addTickets([{ digits, play: saveAs, stake: 1 }]);
                            setSavedAll(true);
                          }}
                        >
                          <IconTicket className="h-3.5 w-3.5" />
                          Save
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    addTickets(picks.map((digits) => ({ digits, play: saveAs, stake: 1 })));
                    setSavedAll(true);
                  }}
                >
                  <IconTicket className="h-4 w-4" />
                  Save all {picks.length}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => runGenerate(filters, avoidRecent)}>
                  Regenerate
                </button>
                {savedAll ? (
                  <span className="text-xs text-teal">
                    Saved as {saveAs === "box" ? "box" : "straight"} tickets.
                  </span>
                ) : null}
                <span className="ml-auto text-[0.68rem] text-muted-foreground">
                  {picks.length < filters.count
                    ? `Only ${picks.length} sets fit those rules`
                    : `${picks.length} of ${filters.count} sets`}
                </span>
              </div>
            </>
          )}

          <div className="mt-5 rounded-xl border border-violet/20 bg-violet/[0.05] p-3.5">
            <p className="text-xs leading-relaxed text-foreground/90">
              Filters shape <em>which</em> sets you hold — they don’t raise the chance of any single set. Each straight
              is 1 in 1,000 on every draw, and a balanced set simply spreads your coverage across the board.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {[
                ["Straight", "1 in 1,000"],
                ["Box 6-way", "1 in 166.7"],
                ["Box 3-way", "1 in 333.3"],
              ].map(([label, value]) => (
                <span key={label} className="rounded-full border border-line bg-black/25 px-2.5 py-1 text-[0.65rem] text-muted-foreground">
                  {label} · <span className="text-violet">{value}</span>
                </span>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3">
        <p className="text-xs text-muted-foreground">Want to check the sets you just saved?</p>
        <Link to="/check" className="btn btn-quiet">
          Open the checker
          <IconArrow className="h-4 w-4" />
        </Link>
      </div>
    </AppShell>
  );
};

export default PicksPage;
