import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { IconCheck, IconPlus, IconScan, IconTicket, IconTrash } from "@/components/pick3/icons";
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
import {
  MAX_STAKE,
  MIN_STAKE,
  PLAY_LABELS,
  PLAY_TYPES,
  evaluateTicket,
  formatMoney,
  formatTriple,
  parseTriple,
  sortDraws,
  todayIso,
  type PlayType,
  type Triple,
} from "@/lib/pick3";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  digits: string;
  play: PlayType;
  stake: string;
};

function newRow(digits = "", play: PlayType = "straight", stake = "1"): Row {
  return { key: Math.random().toString(36).slice(2), digits, play, stake };
}

function clampStake(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.min(MAX_STAKE, Math.max(MIN_STAKE, Math.round(parsed * 100) / 100));
}

function parseTicketLines(text: string): { rows: Row[]; rejected: number } {
  const rows: Row[] = [];
  let rejected = 0;
  for (const raw of text.split(/\n|;/)) {
    const line = raw.trim();
    if (!line) continue;
    const tokens = line.split(/[\s,]+/).filter(Boolean);
    const digitToken = tokens.find((token) => /^\d{1,3}$/.test(token) && parseTriple(token) !== null);
    const digits = digitToken ? parseTriple(digitToken) : null;
    if (!digits) {
      rejected += 1;
      continue;
    }
    const lower = line.toLowerCase();
    const play: PlayType = lower.includes("front")
      ? "frontPair"
      : lower.includes("back")
        ? "backPair"
        : lower.includes("box")
          ? "box"
          : "straight";
    const stakeToken = tokens.find((token) => /^\$?\d+(\.\d{1,2})?$/.test(token) && token !== digitToken);
    const parsedStake = stakeToken ? Number(stakeToken.replace("$", "")) : NaN;
    const stake =
      Number.isFinite(parsedStake) && parsedStake >= MIN_STAKE && parsedStake <= MAX_STAKE
        ? String(parsedStake)
        : "1";
    rows.push(newRow(digits.join(""), play, stake));
  }
  return { rows, rejected };
}

const CheckPage = () => {
  const { draws, tickets, addTickets, applyResults } = usePick3();
  const latest = useMemo(() => sortDraws(draws)[0], [draws]);

  const [drawText, setDrawText] = useState("");
  const [drawDate, setDrawDate] = useState(todayIso());
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const draw = parseTriple(drawText);
  const validRows = rows.filter((row) => parseTriple(row.digits));

  const results = draw
    ? validRows.map((row) => {
        const digits = parseTriple(row.digits) as Triple;
        const stake = clampStake(row.stake);
        const evaluation = evaluateTicket({ digits, play: row.play, stake }, draw);
        return { row, digits, stake, evaluation };
      })
    : [];

  const totalStake = results.reduce((sum, entry) => sum + entry.stake, 0);
  const totalPrize = results.reduce((sum, entry) => sum + entry.evaluation.prize, 0);
  const winCount = results.filter((entry) => entry.evaluation.status === "win").length;

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setFeedback(null);
  };

  const saveAll = () => {
    if (!draw || results.length === 0) return;
    const matchingDraw = draws.find((entry) => formatTriple(entry.digits) === formatTriple(draw));
    const saved = addTickets(
      results.map((entry) => ({
        digits: entry.digits,
        play: entry.row.play,
        stake: entry.stake,
        result: {
          drawId: matchingDraw?.id,
          drawDigits: draw,
          status: entry.evaluation.status,
          prize: entry.evaluation.prize,
          matchedPositions: entry.evaluation.matchedPositions,
          checkedAt: new Date().toISOString(),
        },
      })),
    );
    setFeedback(`${saved} ticket${saved === 1 ? "" : "s"} saved with this result.`);
  };

  const checkSaved = () => {
    if (!draw) return;
    const updates = tickets.map((ticket) => {
      const evaluation = evaluateTicket(ticket, draw);
      return {
        ticketId: ticket.id,
        result: {
          drawId: latest?.id,
          drawDigits: draw,
          status: evaluation.status,
          prize: evaluation.prize,
          matchedPositions: evaluation.matchedPositions,
          checkedAt: new Date().toISOString(),
        },
      };
    });
    applyResults(updates);
    setFeedback(`${updates.length} saved ticket${updates.length === 1 ? "" : "s"} re-checked and updated.`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Ticket checker"
        title="Check every ticket against one draw"
        description="Enter the drawn digits, then add each ticket with the play type you bought. Verdicts, matched positions and typical prizes update as you type."
        actions={
          <Link to="/tickets" className="btn btn-ghost">
            <IconTicket className="h-4 w-4" />
            My tickets
          </Link>
        }
      />

      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelTitle
              title="1 · The draw"
              hint="Three digits, 0–9, in the order drawn."
              right={
                latest ? (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => {
                      setDrawText(formatTriple(latest.digits));
                      setDrawDate(latest.date);
                    }}
                  >
                    Use latest · {formatTriple(latest.digits)}
                  </button>
                ) : (
                  <Tag tone="neutral">No draw logged</Tag>
                )
              }
            />
            <div className="flex flex-wrap items-end gap-5">
              <div>
                <FieldLabel>Drawn digits</FieldLabel>
                <TripleInput value={drawText} onChange={setDrawText} label="Drawn digits" />
              </div>
              <div className="min-w-[9rem]">
                <FieldLabel>Draw date</FieldLabel>
                <input
                  type="date"
                  className="field"
                  value={drawDate}
                  onChange={(event) => setDrawDate(event.currentTarget.value)}
                />
              </div>
              <div className="pb-1">
                <Tag tone={draw ? "lime" : "neutral"}>{draw ? `Draw ${formatTriple(draw)}` : "Waiting for 3 digits"}</Tag>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelTitle
              title="2 · Your tickets"
              hint="One row per ticket. Stake changes the prize at the typical per-$1 rate."
              right={
                <button type="button" className="btn btn-ghost" onClick={() => setRows((current) => [...current, newRow()])}>
                  <IconPlus className="h-4 w-4" />
                  Add ticket
                </button>
              }
            />

            <div className="space-y-2.5">
              {rows.map((row, index) => {
                const digits = parseTriple(row.digits);
                const stake = clampStake(row.stake);
                const evaluation = draw && digits ? evaluateTicket({ digits, play: row.play, stake }, draw) : null;
                return (
                  <div
                    key={row.key}
                    className="grid gap-2 rounded-xl border border-line bg-white/[0.02] p-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 font-display text-[0.65rem] text-muted-foreground">{index + 1}</span>
                      <TripleInput
                        value={row.digits}
                        onChange={(next) => updateRow(row.key, { digits: next })}
                        size="sm"
                        label={`Ticket ${index + 1}`}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="seg">
                        {PLAY_TYPES.map((play) => (
                          <button
                            key={play.value}
                            type="button"
                            data-on={row.play === play.value}
                            onClick={() => updateRow(row.key, { play: play.value })}
                            title={play.hint}
                          >
                            {play.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min={MIN_STAKE}
                        max={MAX_STAKE}
                        value={row.stake}
                        onChange={(event) => updateRow(row.key, { stake: event.currentTarget.value })}
                        className="field h-10 w-16 px-2 text-center font-display text-sm"
                        aria-label={`Stake for ticket ${index + 1}`}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      {evaluation ? (
                        <Tag tone={evaluation.status === "win" ? "lime" : "neutral"}>
                          {evaluation.status === "win" ? formatMoney(evaluation.prize) : "no hit"}
                        </Tag>
                      ) : (
                        <Tag tone="neutral">—</Tag>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ticket ${index + 1}`}
                        className="btn btn-quiet h-8 w-8 p-0"
                        onClick={() =>
                          setRows((current) =>
                            current.length === 1 ? [newRow()] : current.filter((entry) => entry.key !== row.key),
                          )
                        }
                        disabled={rows.length === 1 && !row.digits}
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button type="button" className="btn btn-ghost" onClick={() => setPasteOpen((open) => !open)}>
                Paste a list
              </button>
              {tickets.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setRows(
                      tickets.slice(0, 20).map((ticket) => newRow(formatTriple(ticket.digits), ticket.play, String(ticket.stake))),
                    )
                  }
                >
                  Load my saved tickets ({tickets.length})
                </button>
              ) : null}
              <span className="ml-auto text-[0.7rem] text-muted-foreground">
                {validRows.length} of {rows.length} row{rows.length === 1 ? "" : "s"} ready
              </span>
            </div>

            {pasteOpen ? (
              <div className="mt-3 rounded-xl border border-line bg-black/20 p-3">
                <FieldLabel hint="One ticket per line. Optional play type and stake, e.g. 4 1 7 box 2">
                  Paste tickets
                </FieldLabel>
                <textarea
                  value={pasteText}
                  onChange={(event) => setPasteText(event.currentTarget.value)}
                  rows={3}
                  placeholder={"417\n992 box\n360 back 2.00"}
                  className="field resize-y py-2 font-display text-sm"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!pasteText.trim()}
                    onClick={() => {
                      const parsed = parseTicketLines(pasteText);
                      if (parsed.rows.length > 0) {
                        const cleaned = rows.filter((row) => row.digits);
                        setRows([...cleaned, ...parsed.rows]);
                        setFeedback(
                          `Added ${parsed.rows.length} ticket${parsed.rows.length === 1 ? "" : "s"}${
                            parsed.rejected ? ` · skipped ${parsed.rejected} line${parsed.rejected === 1 ? "" : "s"}` : ""
                          }.`,
                        );
                        setPasteText("");
                        setPasteOpen(false);
                      } else {
                        setFeedback("No three-digit tickets found in that list.");
                      }
                    }}
                  >
                    Add {parseTicketLines(pasteText).rows.length || 0} tickets
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => setPasteOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <PanelTitle
              title="3 · Results"
              hint="Straight needs all three positions. Box needs the same three digits in any order."
              right={draw ? <Tag tone="violet">{results.length} checked</Tag> : null}
            />

            {!draw ? (
              <EmptyState
                title="Waiting for the draw"
                body="Enter three drawn digits above and every ready ticket is judged instantly."
                icon={<IconScan className="h-6 w-6" />}
              />
            ) : results.length === 0 ? (
              <EmptyState
                title="No tickets to check"
                body="Add at least one ticket with three digits, or pull in tickets you already saved."
                icon={<IconTicket className="h-6 w-6" />}
                action={
                  <button type="button" className="btn btn-ghost" onClick={() => setRows([newRow()])}>
                    Add a ticket
                  </button>
                }
              />
            ) : (
              <div className="divide-y divide-line/80">
                {results.map(({ row, digits, stake, evaluation }) => (
                  <div key={row.key} className="flex flex-wrap items-center gap-3 py-3">
                    <DigitBoard
                      digits={digits}
                      size="sm"
                      matches={[0, 1, 2].map((index) => digits[index] === draw[index])}
                    />
                    <div className="min-w-[7rem]">
                      <p className="text-xs text-foreground">{PLAY_LABELS[row.play]}</p>
                      <p className="text-[0.68rem] text-muted-foreground">{formatMoney(stake)} stake</p>
                    </div>
                    <p className="min-w-[10rem] flex-1 text-[0.72rem] leading-snug text-muted-foreground">
                      {evaluation.reason}
                    </p>
                    <Tag tone={evaluation.status === "win" ? "lime" : "neutral"}>
                      {evaluation.status === "win" ? `Win ${formatMoney(evaluation.prize)}` : "No payout"}
                    </Tag>
                  </div>
                ))}
              </div>
            )}

            {results.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <button type="button" className="btn btn-primary" onClick={saveAll}>
                  <IconCheck className="h-4 w-4" />
                  Save {results.length} ticket{results.length === 1 ? "" : "s"} with result
                </button>
                {feedback ? <span className="text-xs text-teal">{feedback}</span> : null}
              </div>
            ) : feedback ? (
              <p className="mt-3 text-xs text-muted-foreground">{feedback}</p>
            ) : null}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel className="xl:sticky xl:top-6">
            <PanelTitle title="This draw, in numbers" hint="Based on the tickets above." />
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile label="Staked" value={formatMoney(totalStake)} hint={`${results.length} tickets`} />
              <StatTile
                label="Returned"
                value={formatMoney(totalPrize)}
                hint={`${winCount} winner${winCount === 1 ? "" : "s"}`}
                tone="teal"
              />
            </div>
            <div
              className={cn(
                "mt-2.5 rounded-xl border px-4 py-3",
                totalPrize - totalStake >= 0 ? "border-lime/30 bg-lime/[0.06]" : "border-line bg-white/[0.02]",
              )}
            >
              <p className="label-mono">Net</p>
              <p
                className={cn(
                  "stat-value mt-1 text-2xl",
                  totalPrize - totalStake >= 0 ? "text-lime" : "text-foreground",
                )}
              >
                {results.length === 0 ? "—" : formatMoney(totalPrize - totalStake)}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <button type="button" className="btn btn-ghost w-full" disabled={!draw || tickets.length === 0} onClick={checkSaved}>
                Re-check my {tickets.length} saved ticket{tickets.length === 1 ? "" : "s"}
              </button>
              <Link to="/draws" className="btn btn-quiet w-full">
                Log this draw
              </Link>
            </div>

            {draw ? (
              <div className="mt-5 rounded-xl border border-line bg-black/20 p-3">
                <p className="label-mono mb-2">The draw</p>
                <div className="flex items-center gap-3">
                  <DigitBoard digits={draw} size="md" tone="violet" />
                  <div className="text-[0.7rem] leading-relaxed text-muted-foreground">
                    {drawDate}
                    <br />
                    Sum {draw[0] + draw[1] + draw[2]}
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <PanelTitle title="Prize chart" hint="Typical Pick 3 rates per $1 in stake." />
            <dl className="space-y-2 text-xs">
              {[
                ["Straight", "$500"],
                ["Box · all different", "$80"],
                ["Box · with a pair", "$160"],
                ["Box · triple", "$500"],
                ["Front or back pair", "$50"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-line/70 pb-2 last:border-0 last:pb-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-display text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[0.68rem] leading-relaxed text-muted-foreground">
              Prizes scale with stake. Your jurisdiction publishes the authoritative chart.
            </p>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
};

export default CheckPage;
