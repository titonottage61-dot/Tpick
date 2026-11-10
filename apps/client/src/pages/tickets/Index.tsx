import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { IconCheck, IconDownload, IconScan, IconTicket, IconTrash, IconUpload } from "@/components/pick3/icons";
import { AppShell } from "@/components/pick3/shell";
import { usePick3 } from "@/components/pick3/store";
import {
  DigitBoard,
  EmptyState,
  PageHeader,
  Panel,
  PanelTitle,
  Segmented,
  StatTile,
  Tag,
} from "@/components/pick3/ui";
import {
  PLAY_LABELS,
  evaluateTicket,
  formatMoney,
  formatTriple,
  parseExport,
  sortDraws,
} from "@/lib/pick3";
import { cn } from "@/lib/utils";

type Filter = "all" | "wins" | "unchecked" | "losses";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "wins", label: "Winners" },
  { value: "unchecked", label: "Not checked" },
  { value: "losses", label: "No payout" },
];

const TicketsPage = () => {
  const { tickets, draws, deleteTicket, clearTickets, applyResults, exportBundle, importBundle, hydrated } = usePick3();
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const fileRef = useRef<HTMLInputElement>(null);

  const latest = useMemo(() => sortDraws(draws)[0], [draws]);

  const ordered = useMemo(
    () => [...tickets].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [tickets],
  );

  const visible = ordered.filter((ticket) => {
    if (filter === "all") return true;
    if (filter === "wins") return ticket.result?.status === "win";
    if (filter === "losses") return ticket.result?.status === "loss";
    return !ticket.result;
  });

  const checked = tickets.filter((ticket) => ticket.result);
  const wins = checked.filter((ticket) => ticket.result?.status === "win");
  const staked = tickets.reduce((total, ticket) => total + ticket.stake, 0);
  const won = tickets.reduce((total, ticket) => total + (ticket.result?.prize ?? 0), 0);

  const download = () => {
    const bundle = exportBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `paradise-pick3-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${bundle.tickets.length} tickets and ${bundle.draws.length} draws.`);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseExport(text);
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }
    const outcome = importBundle({ draws: parsed.draws, tickets: parsed.tickets }, importMode);
    setMessage(
      `Imported ${parsed.tickets.length} tickets and ${parsed.draws.length} draws${
        parsed.skipped ? ` · ${parsed.skipped} invalid entries skipped` : ""
      }. Backup now holds ${outcome.tickets} tickets.`,
    );
    setImportOpen(false);
  };

  const checkLatest = () => {
    if (!latest) return;
    const updates = tickets.map((ticket) => {
      const evaluation = evaluateTicket(ticket, latest.digits);
      return {
        ticketId: ticket.id,
        result: {
          drawId: latest.id,
          drawDigits: latest.digits,
          status: evaluation.status,
          prize: evaluation.prize,
          matchedPositions: evaluation.matchedPositions,
          checkedAt: new Date().toISOString(),
        },
      };
    });
    applyResults(updates);
    const winners = updates.filter((entry) => entry.result.status === "win").length;
    setMessage(
      `Checked ${updates.length} tickets against ${formatTriple(latest.digits)} · ${winners} winner${winners === 1 ? "" : "s"}.`,
    );
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="My tickets"
        title="Your slip, remembered"
        description="Every ticket you save keeps the draw it was checked against. Everything stays in this browser — export a JSON backup to move it anywhere."
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={download} disabled={tickets.length === 0 && draws.length === 0}>
              <IconDownload className="h-4 w-4" />
              Export
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setImportOpen((open) => !open)}>
              <IconUpload className="h-4 w-4" />
              Import
            </button>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tickets" value={tickets.length} hint="Saved on this device" />
        <StatTile label="Checked" value={checked.length} hint={`${wins.length} winner${wins.length === 1 ? "" : "s"}`} tone="teal" />
        <StatTile label="Staked" value={formatMoney(staked)} hint="Across saved tickets" tone="violet" />
        <StatTile label="Prize recorded" value={formatMoney(won)} hint="From stored results" />
      </div>

      {importOpen ? (
        <Panel className="mt-4">
          <PanelTitle
            title="Import a backup"
            hint="Choose a Paradise Pick 3 JSON export. Invalid entries are skipped, never half-imported."
          />
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={importMode}
              onChange={setImportMode}
              options={[
                { value: "merge", label: "Merge with current" },
                { value: "replace", label: "Replace everything" },
              ]}
              label="Import mode"
            />
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void handleFile(file);
                event.currentTarget.value = "";
              }}
            />
            <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              Choose file
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
          </div>
          <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-foreground">
            “Replace everything” clears the current log and ticket list before importing. Export a backup first if you
            are unsure.
          </p>
        </Panel>
      ) : null}

      {message ? (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-teal/30 bg-teal/[0.06] px-4 py-3">
          <p className="text-xs leading-relaxed text-foreground/90">{message}</p>
          <button type="button" className="text-[0.7rem] text-muted-foreground hover:text-foreground" onClick={() => setMessage(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented value={filter} onChange={setFilter} options={FILTERS} label="Filter tickets" />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-ghost" onClick={checkLatest} disabled={!latest || tickets.length === 0}>
            <IconCheck className="h-4 w-4" />
            Check all vs latest {latest ? formatTriple(latest.digits) : ""}
          </button>
          {tickets.length > 0 ? (
            <button
              type="button"
              className={cn("btn btn-quiet", confirmClear && "text-loss")}
              onClick={() => {
                if (confirmClear) {
                  clearTickets();
                  setConfirmClear(false);
                  setMessage("All saved tickets were removed.");
                } else {
                  setConfirmClear(true);
                  window.setTimeout(() => setConfirmClear(false), 3200);
                }
              }}
            >
              {confirmClear ? "Confirm clear" : "Clear all"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        {!hydrated ? (
          <ul className="grid gap-3 md:grid-cols-2" aria-hidden>
            {[0, 1].map((index) => (
              <li key={index} className="panel animate-pulse p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-[8.5rem] rounded-lg border border-line bg-white/[0.03]" />
                  <div className="h-3 w-20 rounded bg-white/[0.05]" />
                </div>
                <div className="mt-4 h-3 w-28 rounded bg-white/[0.04]" />
              </li>
            ))}
          </ul>
        ) : tickets.length === 0 ? (
          <Panel>
            <EmptyState
              title="No tickets saved yet"
              body="Check a ticket and save it, or generate a set of numbers and keep the ones you like. Saved tickets remember their result."
              icon={<IconTicket className="h-6 w-6" />}
              action={
                <>
                  <Link to="/check" className="btn btn-primary">
                    Check a ticket
                  </Link>
                  <Link to="/picks" className="btn btn-ghost">
                    Build numbers
                  </Link>
                </>
              }
            />
          </Panel>
        ) : visible.length === 0 ? (
          <Panel>
            <EmptyState
              title="Nothing in this filter"
              body="No saved tickets match that state right now."
              icon={<IconScan className="h-6 w-6" />}
              action={
                <button type="button" className="btn btn-ghost" onClick={() => setFilter("all")}>
                  Show all tickets
                </button>
              }
            />
          </Panel>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visible.map((ticket) => {
              const result = ticket.result;
              const win = result?.status === "win";
              return (
                <li
                  key={ticket.id}
                  className={cn(
                    "panel panel-lift p-4",
                    win && "border-lime/35 bg-lime/[0.04]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <DigitBoard digits={ticket.digits} size="md" />
                      <div>
                        <p className="text-xs text-foreground">{PLAY_LABELS[ticket.play]}</p>
                        <p className="text-[0.68rem] text-muted-foreground">{formatMoney(ticket.stake)} stake</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ticket ${formatTriple(ticket.digits)}`}
                      className={cn("btn btn-quiet h-8 w-8 p-0", confirmId === ticket.id && "text-loss")}
                      onClick={() => {
                        if (confirmId === ticket.id) {
                          deleteTicket(ticket.id);
                          setConfirmId(null);
                        } else {
                          setConfirmId(ticket.id);
                          window.setTimeout(() => setConfirmId(null), 3200);
                        }
                      }}
                    >
                      {confirmId === ticket.id ? <span className="text-[0.6rem]">sure?</span> : <IconTrash className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {result ? (
                      <>
                        <Tag tone={win ? "lime" : "neutral"}>
                          {win ? `Win ${formatMoney(result.prize)}` : "No payout"}
                        </Tag>
                        <span className="text-[0.68rem] text-muted-foreground">
                          vs {formatTriple(result.drawDigits)} · {result.matchedPositions}/3 in place
                        </span>
                      </>
                    ) : (
                      <Tag tone="amber">not checked</Tag>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-2.5">
                    <span className="text-[0.62rem] text-muted-foreground">
                      Saved {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    {ticket.note ? <span className="truncate text-[0.62rem] text-muted-foreground">{ticket.note}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3">
        <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
          Stored in this browser only. Clearing site data removes it — keep an exported backup if it matters.
        </p>
        <button type="button" className="btn btn-quiet" onClick={download} disabled={tickets.length === 0 && draws.length === 0}>
          <IconDownload className="h-4 w-4" />
          Export backup
        </button>
      </div>
    </AppShell>
  );
};

export default TicketsPage;
