import { useState } from "react";
import type { VolunteerApplication } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { reviewVolunteerApplication } from "../../../lib/callables";
import { useCategories, useTeam } from "../../../hooks/useData";
import { Modal, PrimaryButton } from "../../../components/ui";

export function VolunteerApplicationModal({ application, onClose }: { application: VolunteerApplication; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: categories } = useCategories();
  const { data: team } = useTeam(application.teamId);
  const categoryLabel = categories.find((c) => c.id === application.categoryId)?.label;

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      await reviewVolunteerApplication({ applicationId: application.id, decision });
      onClose();
    } catch (e) {
      // Previously uncaught — a backend failure looked exactly like the
      // button "just sitting" there, with no way for the admin to know
      // anything had gone wrong (or to retry with useful information).
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{application.name}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>Applied {new Date(application.createdAt).toLocaleDateString()}</div>

      {application.selfieUrl && (
        <div style={{ height: 140, borderRadius: 8, background: `url(${application.selfieUrl}) center/cover`, marginBottom: 14 }} />
      )}

      <div style={{ background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 12, fontSize: 13, marginBottom: 16 }}>
        <Row label="Email" value={application.email} />
        <Row label="Phone" value={application.phone} />
        {application.emergencyContact && <Row label="Emergency contact" value={application.emergencyContact} />}
        <Row label="Available" value={application.availability.join(", ")} />
        {categoryLabel && <Row label="Category" value={categoryLabel} />}
        {team && <Row label="Team" value={team.name} />}
      </div>

      {error && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: "8px 10px", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {application.status === "pending" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <PrimaryButton disabled={busy} onClick={() => decide("approve")} style={{ flex: 1 }}>APPROVE</PrimaryButton>
          <button disabled={busy} onClick={() => decide("reject")} style={{ flex: 1, background: "none", border: `1px solid ${theme.color.danger}`, color: theme.color.danger, borderRadius: theme.radius.sm, fontWeight: 700 }}>REJECT</button>
        </div>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 700, color: application.status === "approved" ? theme.color.success : theme.color.danger }}>
          {application.status === "approved" ? "✓ Approved" : "✕ Rejected"}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", flexWrap: "wrap", gap: 8 }}>
      <span style={{ color: theme.color.textMuted }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
