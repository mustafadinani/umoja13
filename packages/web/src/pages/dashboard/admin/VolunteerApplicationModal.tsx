import { useState } from "react";
import type { VolunteerApplication } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { reviewVolunteerApplication } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

export function VolunteerApplicationModal({ application, onClose }: { application: VolunteerApplication; onClose: () => void }) {
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    try {
      await reviewVolunteerApplication({ applicationId: application.id, decision });
      onClose();
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
        <Row label="Emergency contact" value={application.emergencyContact} />
        <Row label="Available" value={application.availability.join(", ")} />
      </div>

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
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ color: theme.color.textMuted }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}
