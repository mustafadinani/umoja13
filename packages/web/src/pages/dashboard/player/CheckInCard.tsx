import { useState } from "react";
import { CATEGORIES, checkInStatusLabel, rosterCheckInIdFor, type PlayerMembership, type CheckIn, type RosterCheckIn, type TournamentPass } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useDocument } from "../../../hooks/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { Card, PrimaryButton, Modal, VerifiedRibbon } from "../../../components/ui";
import { CheckInModal } from "./CheckInModal";

export function checkInIdFor(uid: string, membership: PlayerMembership): string {
  return `${uid}_${membership.teamId}_${membership.categoryId}`;
}

export function CheckInCard({ uid, membership }: { uid: string; membership: PlayerMembership }) {
  const checkInId = checkInIdFor(uid, membership);
  const { data: checkIn } = useDocument<CheckIn>(COLLECTIONS.checkIns, checkInId);
  const { data: pass } = useDocument<TournamentPass>(COLLECTIONS.tournamentPasses, checkInId);
  const { data: rosterInfo } = useDocument<RosterCheckIn>(COLLECTIONS.rosterCheckIns, rosterCheckInIdFor(membership.teamId, uid, membership.categoryId));
  const [open, setOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const category = CATEGORIES.find((c) => c.id === membership.categoryId);
  const status = checkIn?.status ?? "not_started";

  // Parent dashboard hides unknown categories when another valid membership exists.
  if (!category) return null;

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 120 }}>
          <div style={{ fontWeight: 700 }}>{category.label}</div>
          <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{checkInStatusLabel(status)}</div>
        </div>
        {status === "approved" && pass ? (
          <div onClick={() => setPassOpen(true)} style={{ cursor: "pointer", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, background: theme.color.navy, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>▦</div>
            <div style={{ fontSize: 10.5, color: theme.color.textMuted, marginTop: 2 }}>View pass</div>
          </div>
        ) : status === "pending_review" || status === "admin_review" ? (
          <div style={{ fontSize: 12.5, color: theme.color.warning, fontWeight: 700 }}>Admin Review</div>
        ) : status === "rejected" ? null : (
          <PrimaryButton onClick={() => setOpen(true)}>Check in</PrimaryButton>
        )}
      </div>
      {status === "rejected" && (
        <PrimaryButton style={{ marginTop: 10, width: "100%" }} onClick={() => setOpen(true)}>RETRY CHECK-IN</PrimaryButton>
      )}

      {open && (
        <CheckInModal
          membership={membership}
          checkInId={checkInId}
          existingJerseyNumber={rosterInfo?.jerseyNumber}
          onClose={() => setOpen(false)}
        />
      )}
      {passOpen && pass && (
        <Modal onClose={() => setPassOpen(false)} width={320}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18 }}>TOURNAMENT PASS</div>
            <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 12 }}>{category.label}</div>
            {pass.status === "approved" ? (
              <>
                <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto", borderRadius: 16, overflow: "hidden", background: theme.color.navy }}>
                  {pass.selfieUrl ? (
                    <img src={pass.selfieUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 48 }}>👤</div>
                  )}
                  <VerifiedRibbon />
                </div>
                <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 10 }}>{pass.passId}</div>
              </>
            ) : (
              <div style={{ padding: "40px 0", color: theme.color.warning, fontWeight: 800, letterSpacing: 1 }}>PENDING</div>
            )}
          </div>
        </Modal>
      )}
    </Card>
  );
}
