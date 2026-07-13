import { useState } from "react";
import { CATEGORIES, type PlayerMembership, type CheckIn, type TournamentPass } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useDocument } from "../../../hooks/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { Card, PrimaryButton, Modal } from "../../../components/ui";
import { CheckInModal } from "./CheckInModal";

export function checkInIdFor(uid: string, membership: PlayerMembership): string {
  return `${uid}_${membership.teamId}_${membership.categoryId}`;
}

export function CheckInCard({ uid, membership }: { uid: string; membership: PlayerMembership }) {
  const checkInId = checkInIdFor(uid, membership);
  const { data: checkIn } = useDocument<CheckIn>(COLLECTIONS.checkIns, checkInId);
  const { data: pass } = useDocument<TournamentPass>(COLLECTIONS.tournamentPasses, checkInId);
  const [open, setOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const category = CATEGORIES.find((c) => c.id === membership.categoryId);
  const status = checkIn?.status ?? "not_started";

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700 }}>{category?.label ?? membership.categoryId}</div>
          <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{statusLabel(status)}</div>
        </div>
        {status === "approved" && pass ? (
          <div onClick={() => setPassOpen(true)} style={{ cursor: "pointer", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, background: theme.color.navy, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>▦</div>
            <div style={{ fontSize: 10.5, color: theme.color.textMuted, marginTop: 2 }}>View pass</div>
          </div>
        ) : status === "pending_review" ? (
          <div style={{ fontSize: 12.5, color: theme.color.warning, fontWeight: 700 }}>Checking…</div>
        ) : status === "admin_review" ? (
          <div style={{ fontSize: 12.5, color: theme.color.warning, fontWeight: 700 }}>Pending review</div>
        ) : (
          <PrimaryButton onClick={() => setOpen(true)}>Check in</PrimaryButton>
        )}
      </div>
      {status === "rejected" && (
        <PrimaryButton style={{ marginTop: 10, width: "100%" }} onClick={() => setOpen(true)}>RETRY CHECK-IN</PrimaryButton>
      )}

      {open && <CheckInModal membership={membership} checkInId={checkInId} onClose={() => setOpen(false)} />}
      {passOpen && (
        <Modal onClose={() => setPassOpen(false)} width={320}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>TOURNAMENT PASS</div>
            <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 12 }}>{category?.label}</div>
            {pass?.status === "approved" ? (
              <>
                <div style={{ width: 180, height: 180, margin: "0 auto", background: `repeating-linear-gradient(45deg, #211A33, #211A33 6px, #fff 6px, #fff 12px)`, borderRadius: 8 }} />
                <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 8 }}>{pass.passId}</div>
              </>
            ) : (
              <div style={{ padding: "40px 0", color: theme.color.warning, fontWeight: 800, letterSpacing: 1 }}>PENDING REVIEW</div>
            )}
          </div>
        </Modal>
      )}
    </Card>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "approved": return "Cleared to play ✓";
    case "pending_review": return "AI verifying your check-in…";
    case "admin_review": return "Sent to an admin for review";
    case "rejected": return "Verification failed — please retry";
    default: return "Not checked in yet";
  }
}
