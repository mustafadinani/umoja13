import { useMemo, useState } from "react";
import { CATEGORIES, type CheckInStatus } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useAllCheckIns, useAllUsers } from "../../../hooks/useData";
import { Card, Pill } from "../../../components/ui";
import { PlayerDocumentsModal } from "./PlayerDocumentsModal";

const STATUS_FILTERS: { id: CheckInStatus | "needs_review" | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_review", label: "Needs review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export function CheckInsTab() {
  const { data: checkIns } = useAllCheckIns();
  const { data: users } = useAllUsers();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openCheckInId, setOpenCheckInId] = useState<string | null>(null);

  const userById = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const openCheckIn = checkIns.find((c) => c.id === openCheckInId) ?? null;

  const filtered = checkIns.filter((c) => {
    if (categoryId && c.categoryId !== categoryId) return false;
    if (statusFilter === "needs_review" && c.status !== "pending_review" && c.status !== "admin_review") return false;
    if (statusFilter === "approved" && c.status !== "approved") return false;
    if (statusFilter === "rejected" && c.status !== "rejected") return false;
    if (search) {
      const name = userById.get(c.userId)?.displayName ?? "";
      if (!name.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <input
        placeholder="Search by player name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <Pill active={!categoryId} onClick={() => setCategoryId(null)}>All categories</Pill>
        {CATEGORIES.map((c) => <Pill key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.label}</Pill>)}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((s) => <Pill key={s.id} active={statusFilter === s.id} onClick={() => setStatusFilter(s.id)}>{s.label}</Pill>)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((c) => (
          <Card key={c.id} onClick={() => setOpenCheckInId(c.id)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{userById.get(c.userId)?.displayName ?? c.userId}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{CATEGORIES.find((cat) => cat.id === c.categoryId)?.label}</div>
            </div>
            <StatusChip status={c.status} />
          </Card>
        ))}
        {filtered.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 14 }}>No check-ins match.</div>}
      </div>

      {openCheckIn && <PlayerDocumentsModal checkIn={openCheckIn} user={userById.get(openCheckIn.userId)} onClose={() => setOpenCheckInId(null)} />}
    </div>
  );
}

function StatusChip({ status }: { status: CheckInStatus }) {
  const map: Record<CheckInStatus, { bg: string; fg: string; label: string }> = {
    not_started: { bg: "#F1EFF5", fg: theme.color.textMuted, label: "Not started" },
    pending_review: { bg: theme.color.warningBg, fg: theme.color.warning, label: "AI verifying" },
    admin_review: { bg: theme.color.warningBg, fg: theme.color.warning, label: "Needs review" },
    approved: { bg: theme.color.successBg, fg: theme.color.success, label: "Approved" },
    rejected: { bg: theme.color.dangerBg, fg: theme.color.danger, label: "Rejected" },
  };
  const s = map[status];
  return <Pill bg={s.bg} fg={s.fg}>{s.label}</Pill>;
}
