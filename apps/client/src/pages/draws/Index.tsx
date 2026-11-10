import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { IconChart, IconCheck, IconPlus, IconTrash } from "@/components/pick3/icons";
import { AppShell } from "@/components/pick3/shell";
import { usePick3 } from "@/components/pick3/store";
import {
  DigitBoard,
  EmptyState,
  FieldLabel,
  PageHeader,
  Panel,
  PanelTitle,
  StatTile,
  Tag,
  TripleInput,
} from "@/components/pick3/ui";
import { computeStats, formatTriple, parseTriple, sortDraws, todayIso, tripleSum } from "@/lib/pick3";
import { cn } from "@/lib/utils";

const SAMPLE_SETS: [number, number, number][] = [
  [4, 1, 7],
  [9, 9, 2],
  [3, 6, 0],
  [8, 2, 5],
  [1, 1, 1],
  [6, 4, 4],
  [0, 7, 9],
  [5, 2, 8],
  [7, 3, 3],
  [2, 0, 6],
  [9, 4, 0],
  [3, 3, 8],
];

function SumSpark({ points }: { points: { id: string; sum: number; date: string }[] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        Log two or more draws to trace the sum trend.
      </p>
    );
  }
  const width = 260;
  const height = 68;
  const max = 27;
  const step = width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - (point.sum / max) * (height - 10) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[68px] w-full" role="img" aria-label="Sum trend of recent draws">
      <defs>
        <linearGradient id="sumFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9f227" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#b9f227" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${coords.join(" ")} ${width},${height}`} fill="url(#sumFade)" />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="#b9f227"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((coord, index) => {
        const [x, y] = coord.split(",");
        return <circle key={points[index].id} cx={x} cy={y} r="2.2" fill="#0b0f0a" stroke="#b9f227" strokeWidth="1.4" />;
      })}
    </svg>
  );
}

const DrawsPage = () => {
  const { draws, addDraw, deleteDraw, clearDraws, seedSamples, hydrated } = usePick3();
  const [digitsText, setDigitsText] = useState("");
  const [date, setDate] = useState(todayIso());
  const [label, setLabel] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimer = useRef<number | null>(null);

  const ordered = useMemo(() => sortDraws(draws), [draws]);
  const stats = useMemo(() => computeStats(draws), [draws]);
  const maxFrequency = Math.max(1, ...stats.digits.map((entry) => entry.count));

  useEffect(
    () => () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  const arm = (id: string) => {
    setConfirmId(id);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), 3200);
  };

  const submit = () => {
    const digits = parseTriple(digitsText);
    if (!digits) {
      setFeedback("A draw needs exactly three digits.");
      return;
    }
    addDraw({ digits, date, label });
    setDigitsText("");
    setLabel("");
    setFeedback(`Draw ${formatTriple(digits)} added.`);
  };

  const loadSamples = () => {
    const count = seedSamples(
      SAMPLE_SETS.map((digits, index) => ({
        digits,
        date: new Date(Date.now() - index * 86_400_000).toISOString().slice(0, 10),
        label: "Sample draw",
      })),
    );
    setFeedback(`${count} labelled sample draws added so you can try the stats.`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Draw log"
        title="Every draw you log sharpens the picture"
        description="Record results as they are published. Digit heat, gaps and sum bands are calculated from this log — they describe the past, and the app never pretends otherwise."
        actions={
          <Link to="/check" className="btn btn-ghost">
            <IconCheck className="h-4 w-4" />
            Check tickets
          </Link>
        }
      />

      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelTitle title="Log a draw" hint="Digits in the order drawn, plus the date." />
            <div className="flex flex-wrap items-end gap-5">
              <div>
                <FieldLabel>Drawn digits</FieldLabel>
                <TripleInput
                  value={digitsText}
                  onChange={(next) => {
                    setDigitsText(next);
                    setFeedback(null);
                  }}
                  label="Drawn digits"
                />
              </div>
              <div>
                <FieldLabel>Date</FieldLabel>
                <input
                  type="date"
                  className="field"
                  value={date}
                  onChange={(event) => setDate(event.currentTarget.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <FieldLabel hint="Optional — e.g. midday, evening, or a game night.">Label</FieldLabel>
              <input
                className="field"
                value={label}
                maxLength={40}
                placeholder="Evening draw"
                onChange={(event) => setLabel(event.currentTarget.value)}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-primary" onClick={submit} disabled={digitsText.length !== 3}>
                <IconPlus className="h-4 w-4" />
                Add to log
              </button>
              <button type="button" className="btn btn-ghost" onClick={loadSamples}>
                Load sample draws
              </button>
              {feedback ? <span className="text-xs text-teal">{feedback}</span> : null}
            </div>
          </Panel>

          <Panel>
            <PanelTitle
              title="Recent draws"
              hint={hydrated ? `${ordered.length} logged` : "Loading…"}
              right={
                ordered.length > 0 ? (
                  <button
                    type="button"
                    className={cn("btn btn-quiet", confirmClear && "text-loss")}
                    onClick={() => {
                      if (confirmClear) {
                        clearDraws();
                        setConfirmClear(false);
                        setFeedback("Draw log cleared.");
                      } else {
                        setConfirmClear(true);
                        if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
                        confirmTimer.current = window.setTimeout(() => setConfirmClear(false), 3200);
                      }
                    }}
                  >
                    {confirmClear ? "Confirm clear" : "Clear log"}
                  </button>
                ) : null
              }
            />

            {ordered.length === 0 ? (
              <EmptyState
                title="Nothing logged yet"
                body="Add a published result above, or load sample draws to explore the heat map and sum bands."
                icon={<IconChart className="h-6 w-6" />}
              />
            ) : (
              <ul className="divide-y divide-line/80">
                {ordered.slice(0, 24).map((draw) => (
                  <li key={draw.id} className="flex flex-wrap items-center gap-3 py-3">
                    <DigitBoard digits={draw.digits} size="sm" />
                    <div className="min-w-[6.5rem]">
                      <p className="text-xs text-foreground">{draw.date}</p>
                      <p className="text-[0.66rem] text-muted-foreground">{draw.label ?? "No label"}</p>
                    </div>
                    <span className="font-display text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
                      sum {tripleSum(draw.digits)}
                    </span>
                    {draw.label === "Sample draw" ? <Tag tone="neutral">sample</Tag> : null}
                    <button
                      type="button"
                      className={cn(
                        "btn btn-quiet ml-auto h-8 px-2 text-[0.7rem]",
                        confirmId === draw.id && "text-loss",
                      )}
                      onClick={() => {
                        if (confirmId === draw.id) {
                          deleteDraw(draw.id);
                          setConfirmId(null);
                        } else {
                          arm(draw.id);
                        }
                      }}
                    >
                      {confirmId === draw.id ? (
                        "Confirm"
                      ) : (
                        <IconTrash className="h-3.5 w-3.5" aria-label={`Delete draw ${formatTriple(draw.digits)}`} />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {ordered.length > 24 ? (
              <p className="mt-3 text-[0.7rem] text-muted-foreground">
                Showing the 24 most recent. Statistics use all {ordered.length} draws.
              </p>
            ) : null}
          </Panel>
        </div>

        <div className="space-y-4">
          {stats.total === 0 ? (
            <Panel>
              <PanelTitle title="Statistics" hint="Digit heat, gaps and sum bands, built from your log." />
              <EmptyState
                title="No draws to measure yet"
                body="This column fills in once a result is logged: digit heat, draws since each digit last appeared, repeat rate and sum bands. A labelled sample log is available if you want to explore first."
                icon={<IconChart className="h-6 w-6" />}
                action={
                  <button type="button" className="btn btn-ghost" onClick={loadSamples}>
                    Load sample draws
                  </button>
                }
              />
            </Panel>
          ) : (
            <>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label="Draws" value={stats.total} hint="In the log" />
            <StatTile label="Average sum" value={stats.total ? stats.averageSum.toFixed(1) : "—"} hint="of 27" tone="violet" />
            <StatTile
              label="Repeated digits"
              value={stats.total ? `${Math.round(stats.repeatShare * 100)}%` : "—"}
              hint={`${stats.doubleCount + stats.tripleCount} draws`}
              tone="teal"
            />
            <StatTile
              label="Triples"
              value={stats.total ? String(stats.tripleCount) : "—"}
              hint="Three of a kind"
              tone="amber"
            />
          </div>

          <Panel>
            <PanelTitle
              title="Digit heat"
              hint="How often each digit appeared, and how many draws since its last appearance."
              right={<Tag tone="lime">0–9</Tag>}
            />
            <div className="flex items-end justify-between gap-1.5">
              {stats.digits.map((entry) => {
                const height = Math.max(6, (entry.count / maxFrequency) * 100);
                return (
                  <div key={entry.digit} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-display text-[0.6rem] text-muted-foreground">{entry.count}</span>
                    <div className="flex h-24 w-full items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-[3px] transition-all",
                          entry.inLatest
                            ? "bg-lime/80 shadow-[0_0_18px_-4px_rgba(185,242,39,0.8)]"
                            : entry.count === 0
                              ? "bg-white/[0.06]"
                              : "bg-violet/45",
                        )}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className={cn("font-display text-xs", entry.inLatest ? "text-lime" : "text-foreground")}>
                      {entry.digit}
                    </span>
                    <span className="text-[0.55rem] text-muted-foreground">
                      {entry.gap === null ? "—" : entry.gap === 0 ? "now" : `${entry.gap}d`}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[0.68rem] leading-relaxed text-muted-foreground">
              Lime marks digits in the latest draw · <span className="text-violet">violet</span> bars are past
              frequency · the bottom row counts draws since the digit last appeared.
            </p>
          </Panel>

          <Panel>
            <PanelTitle title="Shape of the draws" hint="Odd count, sum bands and the recent sum trace." />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label-mono mb-2">Odd digits per draw</p>
                <div className="space-y-1.5">
                  {stats.oddDistribution.map((count, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-8 font-display text-[0.65rem] text-muted-foreground">{index} odd</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-teal/70"
                          style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-5 text-right font-display text-[0.65rem] text-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="label-mono mb-2">Sum bands</p>
                <div className="space-y-1.5">
                  {stats.sumBands.map((band) => (
                    <div key={band.label} className="flex items-center gap-2">
                      <span className="w-12 font-display text-[0.62rem] text-muted-foreground">
                        {band.range}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full bg-violet/70" style={{ width: `${band.share * 100}%` }} />
                      </div>
                      <span className="w-5 text-right font-display text-[0.65rem] text-foreground">{band.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="label-mono">Sum trace</p>
                <p className="text-[0.62rem] text-muted-foreground">oldest → newest</p>
              </div>
              <SumSpark points={stats.lastSums} />
            </div>
          </Panel>

          {stats.total > 0 ? (
            <Panel className="border-violet/20 bg-violet/[0.03]">
              <PanelTitle title="Reading it right" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                “Overdue” is a description, not a promise. With {stats.total} draw{stats.total === 1 ? "" : "s"} the
                sample is small, and every digit stays equally likely on the next draw. Use these panels to spot
                clusters you find interesting — then decide with a clear head.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag tone="lime">Hottest · {stats.hottest.length ? stats.hottest.join(" · ") : "—"}</Tag>
                <Tag tone="violet">Coldest · {stats.coldest.join(" · ")}</Tag>
                <Tag tone="amber">
                  Overdue · {stats.mostOverdue.map((entry) => `${entry.digit} (${entry.gap}d)`).join(" · ") || "—"}
                </Tag>
              </div>
            </Panel>
          ) : null}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default DrawsPage;
