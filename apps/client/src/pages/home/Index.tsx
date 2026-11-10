import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "@/components/pick3/shell";
import { usePick3 } from "@/components/pick3/store";
import { IconArrow, IconChart, IconCheck, IconSpark, IconTicket } from "@/components/pick3/icons";
import {
  DigitBoard,
  EmptyState,
  PageHeader,
  Panel,
  PanelTitle,
  Segmented,
  StatTile,
  Tag,
  TripleInput,
} from "@/components/pick3/ui";
import {
  PLAY_LABELS,
  PLAY_TYPES,
  computeStats,
  evaluateTicket,
  formatMoney,
  formatTriple,
  parseTriple,
  sortDraws,
  tripleKind,
  tripleSum,
  type PlayType,
} from "@/lib/pick3";
import { cn } from "@/lib/utils";

function QuickCheck() {
  const { draws, addTickets } = usePick3();
  const latest = useMemo(() => sortDraws(draws)[0], [draws]);

  const [ticketText, setTicketText] = useState("");
  const [drawText, setDrawText] = useState("");
  const [play, setPlay] = useState<PlayType>("straight");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDrawText((current) => (current ? current : latest ? formatTriple(latest.digits) : ""));
  }, [latest?.id, latest]);

  useEffect(() => {
    setSaved(false);
  }, [ticketText, drawText, play]);

  const ticket = parseTriple(ticketText);
  const draw = parseTriple(drawText);
  const evaluation = ticket && draw ? evaluateTicket({ digits: ticket, play, stake: 1 }, draw) : null;

  return (
    <Panel className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-texture opacity-40" />
      <div className="relative">
        <PanelTitle
          title="Quick check"
          hint="Type the three digits on your ticket and the three that were drawn. The verdict updates as you type."
          right={<Tag tone="lime">live</Tag>}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="label-mono mb-2 block">Your ticket</span>
            <TripleInput value={ticketText} onChange={setTicketText} label="Your ticket digits" />
          </div>
          <div>
            <span className="label-mono mb-2 block">Draw result</span>
            <TripleInput value={drawText} onChange={setDrawText} label="Drawn digits" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Segmented
            value={play}
            onChange={setPlay}
            label="Play type"
            options={PLAY_TYPES.map((entry) => ({ value: entry.value, label: entry.label }))}
          />
          <span className="text-[0.7rem] text-muted-foreground">
            {PLAY_TYPES.find((entry) => entry.value === play)?.hint}
          </span>
        </div>

        <div className="mt-6">
          {evaluation && ticket && draw ? (
            <div
              className={cn(
                "animate-sweep rounded-2xl border p-4 sm:p-5",
                evaluation.status === "win"
                  ? "border-lime/40 bg-lime/[0.07]"
                  : "border-line bg-white/[0.02]",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-full border",
                      evaluation.status === "win"
                        ? "border-lime/50 bg-lime/15 text-lime"
                        : "border-line bg-white/[0.04] text-muted-foreground",
                    )}
                  >
                    <IconCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-lg text-foreground">
                      {evaluation.status === "win" ? "Winner" : "No payout"}
                    </p>
                    <p className="text-xs text-muted-foreground">{evaluation.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="label-mono">Prize at $1</p>
                  <p
                    className={cn(
                      "stat-value text-2xl",
                      evaluation.status === "win" ? "text-lime" : "text-muted-foreground",
                    )}
                  >
                    {evaluation.status === "win" ? formatMoney(evaluation.prize) : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/80 pt-4">
                <div className="flex items-center gap-3">
                  <DigitBoard digits={ticket} size="sm" matches={[0, 1, 2].map((i) => ticket[i] === draw[i])} />
                  <span className="text-xs text-muted-foreground">
                    {evaluation.matchedPositions}/3 in place · {evaluation.matchedAnyOrder}/3 anywhere
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={saved}
                    onClick={() => {
                      addTickets([{ digits: ticket, play, stake: 1 }]);
                      setSaved(true);
                    }}
                  >
                    {saved ? "Saved" : "Save ticket"}
                  </button>
                  <Link to="/check" className="btn btn-primary">
                    Full checker
                    <IconArrow className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-white/[0.015] px-4 py-5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {ticketText.length === 0
                  ? "Enter your ticket digits to begin. Every check runs on this device — nothing is uploaded."
                  : ticket && !draw
                    ? "Now add the three digits that were drawn."
                    : !ticket && draw
                      ? "Now add the three digits on your ticket."
                      : "Both entries need three digits."}
              </p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function LatestDrawCard() {
  const { draws, seedSamples, hydrated } = usePick3();
  const latest = useMemo(() => sortDraws(draws)[0], [draws]);

  if (!hydrated) {
    return (
      <Panel className="h-full">
        <p className="label-mono">Latest draw</p>
        <div className="mt-6 flex gap-2" aria-hidden>
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 w-20 animate-pulse rounded-xl border border-line bg-white/[0.03] sm:h-28 sm:w-24" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2" aria-hidden>
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg border border-line bg-white/[0.02]" />
          ))}
        </div>
      </Panel>
    );
  }

  if (!latest) {
    return (
      <Panel className="flex h-full flex-col justify-center">
        <p className="label-mono">Latest draw</p>
        <div className="mt-4">
          <EmptyState
            title="No draw logged yet"
            body="Log the last result to start checking tickets and reading digit heat. You can also load labelled sample draws to try the tools."
            icon={<IconChart className="h-6 w-6" />}
            action={
              <>
                <Link to="/draws" className="btn btn-primary">
                  Log a draw
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => seedSamples(sampleDraws())}
                >
                  Load sample draws
                </button>
              </>
            }
          />
        </div>
      </Panel>
    );
  }

  const kind = tripleKind(latest.digits);
  const odds = latest.digits.filter((digit) => digit % 2 === 1).length;

  return (
    <Panel className="relative h-full overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-lime/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-mono">Latest draw</p>
            <p className="mt-1 font-display text-sm text-foreground">{latest.date}</p>
          </div>
          <Tag tone={latest.label === "Sample draw" ? "neutral" : "violet"}>
            {latest.label ?? "Logged"}
          </Tag>
        </div>

        <DigitBoard digits={latest.digits} size="xl" animate className="mt-6" />

        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-line bg-white/[0.02] px-2 py-2 text-center">
            <p className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">Sum</p>
            <p className="stat-value mt-0.5 text-sm text-foreground">{tripleSum(latest.digits)}</p>
          </div>
          <div className="rounded-lg border border-line bg-white/[0.02] px-2 py-2 text-center">
            <p className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">Odd</p>
            <p className="stat-value mt-0.5 text-sm text-foreground">{odds} / 3</p>
          </div>
          <div className="rounded-lg border border-line bg-white/[0.02] px-2 py-2 text-center">
            <p className="text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">Shape</p>
            <p className="stat-value mt-0.5 text-sm capitalize text-foreground">
              {kind === "distinct" ? "all diff." : kind}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/check" className="btn btn-ghost flex-1">
            Check against this
          </Link>
          <Link to="/draws" className="btn btn-quiet">
            Draw log
          </Link>
        </div>
      </div>
    </Panel>
  );
}

function sampleDraws() {
  const base = Date.now();
  const day = 86_400_000;
  const sets: [number, number, number][] = [
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
  ];
  return sets.map((digits, index) => ({
    digits,
    date: new Date(base - index * day).toISOString().slice(0, 10),
    label: "Sample draw",
  }));
}

const Index = () => {
  const { draws, tickets, hydrated } = usePick3();

  const checked = tickets.filter((ticket) => ticket.result);
  const wins = tickets.filter((ticket) => ticket.result?.status === "win");
  const won = tickets.reduce((total, ticket) => total + (ticket.result?.prize ?? 0), 0);
  const stats = useMemo(() => computeStats(draws), [draws]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Pick 3 · 0–9 · straight or box"
        title={
          <>
            Three digits. Every position <span className="text-lime">checked.</span>
          </>
        }
        description="A private ticket studio for Pick 3 games. Check what your numbers actually hit, see typical prizes, log draws and build sets with filters you control."
        actions={
          <>
            <Link to="/check" className="btn btn-primary">
              Check a ticket
              <IconArrow className="h-4 w-4" />
            </Link>
            <Link to="/picks" className="btn btn-ghost">
              <IconSpark className="h-4 w-4" />
              Build numbers
            </Link>
          </>
        }
      />

      <section className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <QuickCheck />
        <LatestDrawCard />
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Draws logged" value={hydrated ? stats.total : "—"} hint="Drives digit heat and gaps" />
        <StatTile label="Tickets saved" value={hydrated ? tickets.length : "—"} hint="Checked or waiting" tone="violet" />
        <StatTile
          label="Tickets checked"
          value={hydrated ? checked.length : "—"}
          hint={checked.length ? `${wins.length} winner${wins.length === 1 ? "" : "s"}` : "No checks yet"}
          tone="teal"
        />
        <StatTile label="Prizes recorded" value={hydrated ? formatMoney(won) : "—"} hint="From your checked tickets" />
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <Panel lift>
          <PanelTitle title="What this app does" hint="Four jobs, done precisely." />
          <ul className="space-y-4">
            {[
              {
                icon: <IconCheck className="h-4 w-4" />,
                title: "Checks straight, box and pairs",
                body: "Every ticket is judged by the rules of its play type, with the exact positions that landed.",
              },
              {
                icon: <IconSpark className="h-4 w-4" />,
                title: "Builds filtered number sets",
                body: "Pick a sum range, include or exclude digits, drop doubles — then save the sets you like.",
              },
              {
                icon: <IconChart className="h-4 w-4" />,
                title: "Reads your draw log",
                body: "Digit heat, overdue digits, repeat rate and the sum bands your draws actually fall into.",
              },
              {
                icon: <IconTicket className="h-4 w-4" />,
                title: "Keeps tickets and results",
                body: "Saved tickets remember the draw they were checked against. Export the lot as JSON.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.03] text-lime">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="border-violet/20 bg-violet/[0.03]">
          <PanelTitle title="What it cannot do" hint="The honest version, in one panel." />
          <p className="text-sm leading-relaxed text-foreground/90">
            No app can tell you which digits will be drawn. A Pick 3 straight draw has 1,000 possible results and each
            one is equally likely every time — digit heat does not tilt the next draw.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              { label: "Straight", odds: "1 in 1,000", note: "exact order" },
              { label: "Box · 6-way", odds: "1 in 166.7", note: "3 different digits" },
              { label: "Box · 3-way", odds: "1 in 333.3", note: "one pair" },
            ].map((row) => (
              <div key={row.label} className="rounded-lg border border-line bg-black/20 px-3 py-2.5">
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">{row.label}</p>
                <p className="stat-value mt-1 text-sm text-violet">{row.odds}</p>
                <p className="text-[0.65rem] text-muted-foreground">{row.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            What the tools buy you is accuracy and coverage: no slip errors, every ticket checked to the right play
            type, and sets that spread across the board instead of clustering.
          </p>
        </Panel>
      </section>

      <p className="mt-10 text-center text-[0.7rem] leading-relaxed text-muted-foreground/70">
        Prizes shown are typical Pick 3 rates per $1 staked. Your jurisdiction sets its own prize chart.
        <br />
        Play for entertainment, and only with money you can lose.
      </p>
    </AppShell>
  );
};

export default Index;
