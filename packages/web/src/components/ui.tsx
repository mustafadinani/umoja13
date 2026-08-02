import type { CSSProperties, ReactNode, MouseEventHandler } from "react";
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
