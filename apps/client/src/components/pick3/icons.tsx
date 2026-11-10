type IconProps = { className?: string };

function frame(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function IconBoard({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconScan({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M20 8V6a2 2 0 0 0-2-2h-2" />
      <path d="M4 16v2a2 2 0 0 0 2 2h2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 12h10" />
    </svg>
  );
}

export function IconSpark({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M12 3v3.2M12 17.8V21M4.9 4.9l2.3 2.3M16.8 16.8l2.3 2.3M3 12h3.2M17.8 12H21M4.9 19.1l2.3-2.3M16.8 7.2l2.3-2.3" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconChart({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M4 19h16" />
      <rect x="5.5" y="11" width="3" height="6" rx="1" />
      <rect x="10.5" y="6.5" width="3" height="10.5" rx="1" />
      <rect x="15.5" y="9" width="3" height="8" rx="1" />
    </svg>
  );
}

export function IconTicket({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M3 9.5V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5Z" />
      <path d="M14 5v14" strokeDasharray="2 2.4" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 12h10l1-12" />
    </svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function IconUpload({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function IconCopy({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export function IconArrow({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M5 12h13M13 6.5 19 12l-6 5.5" />
    </svg>
  );
}

export function IconInfo({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2M12 7.9v.1" />
    </svg>
  );
}

export function IconShuffle({ className }: IconProps) {
  return (
    <svg {...frame(className)}>
      <path d="M4 7h3.2c1.2 0 2.3.6 3 1.6l4.6 6.8c.7 1 1.8 1.6 3 1.6H20" />
      <path d="M4 17h3.2c1.2 0 2.3-.6 3-1.6l4.6-6.8c.7-1 1.8-1.6 3-1.6H20" />
      <path d="M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5" />
    </svg>
  );
}
