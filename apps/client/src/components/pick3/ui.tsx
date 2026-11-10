import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Triple } from "@/lib/pick3";

const TILE_SIZES = {
  sm: "h-9 w-8 text-sm rounded-lg",
  md: "h-12 w-10 text-lg",
  lg: "h-16 w-14 text-2xl",
  xl: "h-24 w-20 text-4xl sm:h-28 sm:w-24 sm:text-5xl",
} as const;

const INPUT_SIZES = {
  sm: "h-11 w-10 text-lg",
  md: "h-14 w-12 text-2xl",
  lg: "h-16 w-14 text-3xl",
} as const;

type DigitBoardProps = {
  digits: Triple | null;
  size?: keyof typeof TILE_SIZES;
  tone?: "lime" | "violet" | "muted";
  matches?: boolean[];
  className?: string;
  animate?: boolean;
};

export function DigitBoard({ digits, size = "lg", tone = "lime", matches, className, animate }: DigitBoardProps) {
  const values = digits ?? [null, null, null];
  return (
    <div className={cn("flex gap-2", className)} aria-label={digits ? `Digits ${digits.join("")}` : "No digits"}>
      {values.map((digit, index) => {
        const missed = matches ? !matches[index] : false;
        const base = tone === "violet" ? "digit-tile-violet" : tone === "muted" ? "digit-tile-dead" : "";
        return (
          <div
            key={index}
            className={cn(
              "digit-tile",
              base,
              TILE_SIZES[size],
              missed && digits ? "digit-tile-dead" : "",
              animate ? "animate-pop" : "",
            )}
            style={animate ? { animationDelay: `${index * 60}ms` } : undefined}
          >
            {digit === null ? <span className="opacity-30">·</span> : digit}
          </div>
        );
      })}
    </div>
  );
}

type TripleInputProps = {
  value: string;
  onChange: (next: string) => void;
  size?: keyof typeof INPUT_SIZES;
  label?: string;
  describedBy?: string;
  autoFocusFirst?: boolean;
};

export function TripleInput({ value, onChange, size = "md", label, describedBy, autoFocusFirst }: TripleInputProps) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const digits = [value[0] ?? "", value[1] ?? "", value[2] ?? ""];

  const setDigit = (index: number, digit: string) => {
    const next = [...digits];
    next[index] = digit;
    onChange(next.join("").slice(0, 3));
  };

  return (
    <div className="flex items-center gap-2" role="group" aria-label={label ?? "Three digit entry"}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={refs[index]}
          value={digit}
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          aria-describedby={describedBy}
          autoFocus={autoFocusFirst && index === 0}
          onChange={(event) => {
            const cleaned = event.currentTarget.value.replace(/[^0-9]/g, "");
            if (!cleaned) {
              setDigit(index, "");
              return;
            }
            const char = cleaned.slice(-1);
            setDigit(index, char);
            if (index < 2) refs[index + 1].current?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index] && index > 0) {
              event.preventDefault();
              setDigit(index - 1, "");
              refs[index - 1].current?.focus();
              return;
            }
            if (event.key === "ArrowLeft" && index > 0) {
              event.preventDefault();
              refs[index - 1].current?.focus();
            }
            if (event.key === "ArrowRight" && index < 2) {
              event.preventDefault();
              refs[index + 1].current?.focus();
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 3);
            if (!pasted) return;
            event.preventDefault();
            onChange(pasted);
            refs[Math.min(pasted.length, 2)].current?.focus();
          }}
          className={cn(
            "digit-tile text-center outline-none transition-colors focus:border-lime/80 focus:bg-[#0d1310]",
            INPUT_SIZES[size],
            !digit && "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-line/70 pb-6">
      <div className="max-w-3xl">
        {eyebrow ? <p className="label-mono mb-3">{eyebrow}</p> : null}
        <h1 className="font-display text-[1.85rem] leading-[1.12] tracking-tight text-foreground sm:text-[2.45rem]">
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  children,
  className,
  as: Tag = "section",
  lift = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
  lift?: boolean;
}) {
  return <Tag className={cn("panel", lift && "panel-lift", "p-5 sm:p-6", className)}>{children}</Tag>;
}

export function PanelTitle({
  title,
  hint,
  right,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-base tracking-tight text-foreground">{title}</h2>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

const TONES = {
  lime: "border-lime/35 bg-lime/10 text-lime",
  violet: "border-violet/35 bg-violet/10 text-violet",
  teal: "border-teal/35 bg-teal/10 text-teal",
  amber: "border-amber/35 bg-amber/10 text-amber",
  loss: "border-loss/35 bg-loss/10 text-loss",
  neutral: "border-line bg-white/[0.03] text-muted-foreground",
} as const;

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[0.65rem] uppercase tracking-[0.12em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "lime",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-4 py-3">
      <p className="label-mono">{label}</p>
      <p className={cn("stat-value mt-1.5 text-2xl text-foreground", tone === "lime" && "text-lime")}>{value}</p>
      {hint ? <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-white/[0.015] p-6">
      {icon ? <div className="text-lime/70">{icon}</div> : null}
      <div>
        <p className="font-display text-sm text-foreground">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {action ? <div className="mt-1 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  label?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-on={option.value === value}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5 transition-colors",
        checked && "border-lime/35 bg-lime/[0.06]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span>
        <span className="block text-xs text-foreground">{label}</span>
        {hint ? <span className="mt-0.5 block text-[0.68rem] text-muted-foreground">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-lime/60 bg-lime/30" : "border-line bg-white/[0.04]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all",
            checked ? "left-[1.15rem] bg-lime" : "left-0.5 bg-muted-foreground",
          )}
        />
      </span>
    </label>
  );
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-2 block">
      <span className="label-mono">{children}</span>
      {hint ? <span className="mt-1 block text-[0.7rem] text-muted-foreground">{hint}</span> : null}
    </span>
  );
}
