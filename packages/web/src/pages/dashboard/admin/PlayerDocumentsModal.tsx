import { useState } from "react";
import { CATEGORIES, type CheckIn, type UserProfile } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { adminReviewCheckIn } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

export function PlayerDocumentsModal({ checkIn, user, onClose }: { checkIn: CheckIn; user?: UserProfile; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const category = CATEGORIES.find((c) => c.id === checkIn.categoryId);
  const membership = user?.playerOf?.find((m) => m.teamId === checkIn.teamId && m.categoryId === checkIn.categoryId);

  async function decide(decision: "approve" | "reject" | "nullify" | "restore") {
    setBusy(true);
    try {
      await adminReviewCheckIn({ checkInId: checkIn.id, decision });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} width={480}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{user?.displayName ?? "Player"}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>{category?.label} · attempt {checkIn.attempt}</div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Photo label="Registration photo" url={membership?.registrationPhotoUrl} />
        <Photo label="Check-in selfie" url={checkIn.selfieUrl} />
        <Photo label="Government ID" url={checkIn.govIdUrl} />
      </div>

      {checkIn.aiVerification && (
        <div style={{ background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 12, fontSize: 13, marginBottom: 16 }}>
          <Row label="Face match" value={checkIn.aiVerification.faceMatch ? "✓ matched" : "✕ no match"} good={checkIn.aiVerification.faceMatch} />
          <Row label="Confidence" value={`${Math.round(checkIn.aiVerification.faceMatchConfidence * 100)}%`} />
          <Row label="DOB read" value={checkIn.aiVerification.dobExtracted ?? "unreadable"} />
          <Row label="Age eligible" value={checkIn.aiVerification.ageEligible ? "✓ eligible" : "✕ not eligible"} good={checkIn.aiVerification.ageEligible} />
          <div style={{ marginTop: 8, color: theme.color.textMuted, fontSize: 12.5 }}>{checkIn.aiVerification.reasoning}</div>
        </div>
      )}

      {checkIn.reviewedBy && (
        <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 16 }}>
          Decided by {checkIn.reviewedBy} at {checkIn.reviewedAt ? new Date(checkIn.reviewedAt).toLocaleString() : ""}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {(checkIn.status === "pending_review" || checkIn.status === "admin_review" || checkIn.status === "rejected") && (
          <>
            <PrimaryButton disabled={busy} onClick={() => decide("approve")} style={{ flex: 1 }}>APPROVE</PrimaryButton>
            <button disabled={busy} onClick={() => decide("reject")} style={{ flex: 1, background: "none", border: `1px solid ${theme.color.danger}`, color: theme.color.danger, borderRadius: theme.radius.sm, fontWeight: 700 }}>REJECT</button>
          </>
        )}
        {checkIn.status === "approved" && (
          <button disabled={busy} onClick={() => decide("nullify")} style={{ flex: 1, background: "none", border: `1px solid ${theme.color.danger}`, color: theme.color.danger, borderRadius: theme.radius.sm, padding: "12px", fontWeight: 700 }}>NULLIFY CHECK-IN</button>
        )}
      </div>
    </Modal>
  );
}

function Photo({ label, url }: { label: string; url?: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ height: 90, borderRadius: 8, background: url ? `url(${url}) center/cover` : "#F1EFF5" }} />
      <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ color: theme.color.textMuted }}>{label}</span>
      <span style={{ fontWeight: 700, color: good === undefined ? theme.color.text : good ? theme.color.success : theme.color.danger }}>{value}</span>
    </div>
  );
}
