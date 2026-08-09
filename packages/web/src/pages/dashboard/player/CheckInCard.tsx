import { useState } from "react";
import { CATEGORIES, categoryLabelFor, checkInIdFor, checkInStatusLabel, isNonCompetitiveCategory, playerKeyFor, rosterCheckInIdFor, type PlayerMembership, type CheckIn, type RosterCheckIn, type TournamentPass } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { useDocument } from "../../../hooks/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { Card, PrimaryButton, Modal, VerifiedRibbon } from "../../../components/ui";
import { CheckInModal } from "./CheckInModal";

export function CheckInCard({ uid, membership }: { uid: string; membership: PlayerMembership }) {
  // Unique per child (falls back to the account uid only if this
  // membership predates profileId) — never the bare uid, which every
  // sibling on this account shares.
  const playerKey = playerKeyFor(uid, membership.profileId);
  const checkInId = checkInIdFor(playerKey, membership.teamId, membership.categoryId);
  const { data: checkIn } = useDocument<CheckIn>(COLLECTIONS.checkIns, checkInId);
  const { data: pass } = useDocument<TournamentPass>(COLLECTIONS.tournamentPasses, checkInId);
  const { data: rosterInfo } = useDocument<RosterCheckIn>(COLLECTIONS.rosterCheckIns, rosterCheckInIdFor(membership.teamId, playerKey, membership.categoryId));
  const [open, setOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const category = CATEGORIES.find((c) => c.id === membership.categoryId);
  const categoryLabel = categoryLabelFor(membership.categoryId);
  const status = checkIn?.status ?? "not_started";

  // Parent dashboard hides genuinely unmatched categories (neither a real
  // tournament division nor a known non-competitive one like Toddlers Camp)
  // when another valid membership exists.
  if (!category && !isNonCompetitiveCategory(membership.categoryId)) return null;

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 120 }}>
          <div style={{ fontWeight: 700 }}>{categoryLabel}</div>
          <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginTop: 2 }}>{checkInStatusLabel(status)}</div>
        </div>
        {status === "approved" && pass ? (
          <div onClick={() => setPassOpen(true)} style={{ cursor: "pointer", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, background: theme.color.navy, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>▦</div>
            <div style={{ fontSize: 10.5, color: theme.color.textMuted, marginTop: 2 }}>View pass</div>
          </div>
        ) : status === "pending_review" || status === "admin_review" ? (
          <div style={{ fontSize: 12.5, color: theme.color.warning, fontWeight: 700 }}>{checkInStatusLabel(status)}</div>
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
            <div style={{ fontSize: 12.5, color: theme.color.textMuted, marginBottom: 12 }}>{categoryLabel}</div>
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
              <div style={{ padding: "40px 0", color: theme.color.warning, fontWeight: 800, letterSpacing: 1 }}>PENDING REVIEW</div>
            )}
          </div>
        </Modal>
      )}
    </Card>
  );
}
