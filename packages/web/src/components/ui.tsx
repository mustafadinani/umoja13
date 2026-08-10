import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type MouseEventHandler } from "react";
import { checkInStatusLabel, checkInStatusTone, type CheckInStatus } from "@umoja/shared";
import { theme } from "../lib/theme";

export function Card({
  children,
  style,
  onClick,
  "data-testid": testId,
}: { children: ReactNode; style?: CSSProperties; onClick?: MouseEventHandler; "data-testid"?: string }) {
  return (
    <div
      onClick={onClick}
      data-testid={testId}
      style={{
        background: "#fff",
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius.lg,
        padding: 18,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Initials circle for a person — the one avatar look used anywhere a name needs a face-shaped placeholder (pod rosters, member lists) without an actual photo on file. */
export function Avatar({ name, size = 28, color }: { name: string; size?: number; color?: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color ?? theme.color.purple,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

/** Overlapping avatar row (a "who's here" glance) — caps how many render before collapsing the rest into a "+N" tail. */
export function AvatarStack({ names, size = 22, colorFor, max = 4 }: { names: string[]; size?: number; colorFor?: (name: string) => string; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((n, i) => (
        <div key={n + i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, border: "2px solid #fff", borderRadius: "50%" }}>
          <Avatar name={n} size={size} color={colorFor?.(n)} />
        </div>
      ))}
      {extra > 0 && <span style={{ fontSize: 10.5, color: theme.color.textMuted, marginLeft: 5 }}>+{extra}</span>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 24, letterSpacing: 0.5 }}>{children}</div>
      {action}
    </div>
  );
}

export function Pill({
  children,
  active,
  onClick,
  bg,
  fg,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: MouseEventHandler;
  bg?: string;
  fg?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: theme.radius.pill,
        fontWeight: 600,
        fontSize: 13,
        cursor: onClick ? "pointer" : undefined,
        whiteSpace: "nowrap",
        background: bg ?? (active ? theme.color.navy : "#F1EFF5"),
        color: fg ?? (active ? "#fff" : theme.color.text),
      }}
    >
      {children}
    </div>
  );
}

/**
 * Single-select filter, collapsed behind a button until tapped — replaces a
 * wall of always-visible option pills with a short popover list. Shows the
 * active choice as the button's own label; clearing it happens via the chip
 * row the caller renders alongside (see Schedule.tsx for the pattern).
 */
export function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { id: T; label: string }[];
  onChange: (value: T | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const activeLabel = value ? options.find((o) => o.id === value)?.label : null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 14px",
          borderRadius: theme.radius.sm,
          border: `1px solid ${activeLabel ? theme.color.purple : theme.color.border}`,
          background: "#fff",
          fontSize: 13.5,
          fontWeight: 600,
          color: theme.color.text,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {activeLabel ?? label}
        <span style={{ fontSize: 10, color: theme.color.textMuted }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            background: "#fff",
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.radius.md,
            boxShadow: "0 10px 30px -10px rgba(17,12,32,.35)",
            padding: 6,
            minWidth: 190,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          <DropdownOption label={`All ${label.toLowerCase()}`} selected={!value} onClick={() => { onChange(null); setOpen(false); }} />
          {options.map((o) => (
            <DropdownOption key={o.id} label={o.label} selected={value === o.id} onClick={() => { onChange(o.id); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "9px 12px",
        borderRadius: theme.radius.sm,
        fontSize: 13.5,
        fontWeight: selected ? 700 : 500,
        color: selected ? theme.color.purple : theme.color.text,
        background: selected ? "#F1EFF5" : "transparent",
        cursor: "pointer",
      }}
    >
      {label}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  style,
  type = "button",
}: {
  children: ReactNode;
  onClick?: MouseEventHandler;
  disabled?: boolean;
  style?: CSSProperties;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#C9C3D8" : theme.color.navy,
        color: "#fff",
        border: "none",
        borderRadius: theme.radius.sm,
        padding: "12px 20px",
        fontFamily: theme.font.display,
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: 0.5,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Modal({ children, onClose, width = 440 }: { children: ReactNode; onClose: () => void; width?: number }) {
  return (
    <div
      onClick={onClose}
      data-testid="modal-scrim"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,12,32,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          // Explicit, not inherited: a Modal rendered from inside the nav
          // bar (e.g. NotificationsBell/MessagesBell) would otherwise
          // inherit the nav's white text color onto this white background —
          // any child div that doesn't set its own color goes invisible.
          color: theme.color.text,
          borderRadius: theme.radius.lg,
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "clamp(16px, 4vw, 24px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Drawer({
  children,
  footer,
  onClose,
  width = 460,
}: {
  children: ReactNode;
  /** Rendered outside the scrollable area, pinned to the bottom of the drawer — use for an always-reachable action like DONE on a long scrollable list. */
  footer?: ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <div
      onClick={onClose}
      data-testid="drawer-scrim"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,12,32,.45)",
        zIndex: 100,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#fff",
          color: theme.color.text, // same not-inherited fix as Modal — see comment there
          width,
          maxWidth: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "#F1EFF5",
            color: theme.color.text,
            fontSize: 15,
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          ✕
        </button>
        <div style={{ flex: 1, overflowY: "auto", padding: 28, paddingBottom: footer ? 12 : 28 }}>{children}</div>
        {footer && <div style={{ padding: "12px 28px 28px", borderTop: `1px solid ${theme.color.border}` }}>{footer}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    scheduled: { bg: "#F1EFF5", fg: theme.color.textMuted, label: "Upcoming" },
    live: { bg: theme.color.dangerBg, fg: theme.color.danger, label: "● LIVE" },
    final: { bg: theme.color.successBg, fg: theme.color.success, label: "Final" },
    forfeited: { bg: theme.color.dangerBg, fg: theme.color.danger, label: "Forfeited" },
  };
  const s = map[status] ?? { bg: "#F1EFF5", fg: theme.color.textMuted, label: status };
  return <Pill bg={s.bg} fg={s.fg}>{s.label}</Pill>;
}

const CHECKIN_TONE_COLORS: Record<"success" | "warning" | "muted" | "danger", { fg: string; bg: string }> = {
  success: { fg: theme.color.success, bg: theme.color.successBg },
  warning: { fg: theme.color.warning, bg: theme.color.warningBg },
  muted: { fg: theme.color.textMuted, bg: theme.color.bg },
  danger: { fg: theme.color.danger, bg: theme.color.dangerBg },
};

/**
 * Diagonal "VERIFIED" ribbon across the corner of a player's photo — the one
 * visual for "this identity is confirmed," reused on the Tournament Pass and
 * the player card so it means the same thing everywhere it shows up.
 */
export function VerifiedRibbon() {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: -42,
        width: 160,
        transform: "rotate(45deg)",
        background: theme.color.success,
        color: "#fff",
        textAlign: "center",
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: 1,
        padding: "5px 0",
        boxShadow: "0 2px 6px rgba(0,0,0,.3)",
      }}
    >
      VERIFIED
    </div>
  );
}

/** Small checkmark badge for compact avatars (roster rows) where a full ribbon won't fit — same green, same meaning, just scaled down. */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: -1,
        right: -1,
        width: size,
        height: size,
        borderRadius: "50%",
        background: theme.color.success,
        border: "2px solid #fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ color: "#fff", fontSize: size * 0.55, fontWeight: 900, lineHeight: 1 }}>✓</span>
    </div>
  );
}

/** The one check-in status pill — same label vocabulary and colors (green/amber/muted) wherever a status needs to read as a chip rather than plain text. */
export function CheckInStatusPill({ status }: { status: CheckInStatus | undefined }) {
  const { fg, bg } = CHECKIN_TONE_COLORS[checkInStatusTone(status)];
  return (
    <Pill bg={bg} fg={fg}>
      {checkInStatusLabel(status)}
    </Pill>
  );
}
