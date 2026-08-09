import { useState } from "react";
import { doc, setDoc, getDoc, deleteField, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  COLLECTIONS,
  CHECKIN_CONSENT_POLICY_VERSION,
  CHECKIN_CONSENT_COPY,
  PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS,
  PROFESSIONS,
  TOURNAMENT_START_AT,
  categoryLabelFor,
  playerKeyFor,
  type PlayerMembership,
} from "@umoja/shared";
import { db, storage } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { useVolunteerApplications } from "../../../hooks/useData";
import { setJerseyNumber } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";
import { BecomeVolunteerModal } from "../../../components/BecomeVolunteerModal";

type Step = "confirm" | "fieldPref" | "consent" | "details" | "selfie" | "govid" | "submitting" | "result";

export function CheckInModal({
  membership,
  checkInId,
  existingJerseyNumber,
  onClose,
}: {
  membership: PlayerMembership;
  checkInId: string;
  /** Already-set jersey number, if the player or their captain set one before this check-in. */
  existingJerseyNumber?: number;
  onClose: () => void;
}) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>("confirm");
  const [jerseyNumberDraft, setJerseyNumberDraft] = useState("");
  const [profession, setProfession] = useState("");
  const [professionQuery, setProfessionQuery] = useState("");
  const [acceptedBy, setAcceptedBy] = useState<"self" | "guardian" | null>(null);
  const [guardianName, setGuardianName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [privateFieldPreference, setPrivateFieldPreference] = useState<boolean | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [govId, setGovId] = useState<File | null>(null);
  const [result, setResult] = useState<{ status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volunteerSignupOpen, setVolunteerSignupOpen] = useState(false);
  const asksFieldPreference = PRIVATE_FIELD_ELIGIBLE_CATEGORY_IDS.includes(membership.categoryId);
  const jerseyNumbersLocked = Date.now() >= TOURNAMENT_START_AT;
  const canContinueFromDetails =
    existingJerseyNumber != null || jerseyNumbersLocked || jerseyNumberDraft.trim() === "" || /^\d{1,3}$/.test(jerseyNumberDraft.trim());
  const canContinueFromConsent = agreed && acceptedBy !== null && (acceptedBy === "self" || guardianName.trim().length > 0);
  const { data: volunteerApplications } = useVolunteerApplications(user ? [where("filedByUid", "==", user.uid)] : []);
  const playerName = (membership.playerName ?? profile?.displayName ?? "").trim();
  // Checked per player name, not the account's overall volunteer role — a
  // parent should still be able to sign up a different kid separately even
  // after one kid's application is already approved.
  const hasVolunteerApplication = volunteerApplications.some(
    (a) => a.name.trim() === playerName && a.status !== "rejected"
  );

  // Unique per child (falls back to the account uid only if this membership
  // predates profileId) — never the bare uid, which every sibling shares.
  const playerKey = user ? playerKeyFor(user.uid, membership.profileId) : "";

  async function submit() {
    if (!user || !profile || !selfie || !govId) return;
    setStep("submitting");
    setError(null);
    try {
      const existing = await getDoc(doc(db, COLLECTIONS.checkIns, checkInId));
      const attempt = existing.exists() ? (existing.data().attempt ?? 0) + 1 : 1;

      const selfieRef = ref(storage, `checkins/${user.uid}/${checkInId}/selfie-${Date.now()}.jpg`);
      await uploadBytes(selfieRef, selfie);
      const selfieUrl = await getDownloadURL(selfieRef);

      const govIdRef = ref(storage, `checkins/${user.uid}/${checkInId}/govid-${Date.now()}.jpg`);
      await uploadBytes(govIdRef, govId);
      const govIdUrl = await getDownloadURL(govIdRef);

      await setDoc(
        doc(db, COLLECTIONS.checkIns, checkInId),
        {
          id: checkInId,
          userId: user.uid,
          playerKey,
          teamId: membership.teamId,
          categoryId: membership.categoryId,
          status: "admin_review",
          selfieUrl,
          govIdUrl,
          submittedAt: Date.now(),
          attempt,
          consent: {
            acceptedBy: acceptedBy as "self" | "guardian",
            guardianName: acceptedBy === "guardian" ? guardianName.trim() : null,
            acceptedAt: Date.now(),
            policyVersion: CHECKIN_CONSENT_POLICY_VERSION,
          },
          ...(asksFieldPreference && privateFieldPreference !== null ? { privateFieldPreference } : {}),
          // Profession only ever applies to the adult checking in for
          // themselves — never recorded for a guardian's minor. Explicitly
          // cleared (not just omitted) on a guardian resubmission, or a
          // merge:true write would leave an earlier self-submission's
          // profession stuck on this check-in forever.
          lineOfWork: acceptedBy === "self" && profession ? profession : deleteField(),
        },
        { merge: true }
      );

      if (!jerseyNumbersLocked && existingJerseyNumber == null && jerseyNumberDraft.trim()) {
        await setJerseyNumber({
          teamId: membership.teamId,
          playerKey,
          categoryId: membership.categoryId,
          jerseyNumber: Number(jerseyNumberDraft.trim()),
        }).catch(() => {
          // Non-fatal — the check-in itself already succeeded; a jersey number can still be set later by the captain.
        });
      }

      setResult({ status: "admin_review" });
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong submitting your check-in.");
      setStep("result");
      setResult({ status: "error" });
    }
  }

  return (
    <Modal onClose={onClose}>
      {step === "confirm" && (
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Is this you?</div>
          <div style={{ background: "#F7F6F3", borderRadius: theme.radius.md, padding: 16, margin: "12px 0" }}>
            <Row label="Name" value={membership.playerName ?? profile?.displayName ?? ""} />
            <Row label="Category" value={categoryLabelFor(membership.categoryId)} />
            <Row label="Waiver" value="Signed at registration ✓" valueColor={theme.color.success} />
          </div>

          <PrimaryButton
            style={{ width: "100%" }}
            onClick={() => setStep(asksFieldPreference ? "fieldPref" : "consent")}
          >
            YES, THAT'S ME
          </PrimaryButton>
        </div>
      )}

      {step === "fieldPref" && (
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>One more question</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 16 }}>
            Would your team like your games scheduled on the private field?
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <RoleCard icon="🔒" label="Yes, private field" active={privateFieldPreference === true} onClick={() => setPrivateFieldPreference(true)} />
            <RoleCard icon="🌐" label="No preference" active={privateFieldPreference === false} onClick={() => setPrivateFieldPreference(false)} />
          </div>
          <PrimaryButton disabled={privateFieldPreference === null} style={{ width: "100%" }} onClick={() => setStep("consent")}>
            CONTINUE
          </PrimaryButton>
        </div>
      )}

      {step === "consent" && (
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 12 }}>Who's checking in?</div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <RoleCard icon="🧑" label="I'm 18+, checking in for myself" active={acceptedBy === "self"} onClick={() => setAcceptedBy("self")} />
            <RoleCard icon="👨‍👩‍👧" label="I'm a parent/guardian, for a minor" active={acceptedBy === "guardian"} onClick={() => setAcceptedBy("guardian")} />
          </div>

          {acceptedBy === "guardian" && (
            <input
              placeholder="Parent/guardian full name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, marginBottom: 16 }}
            />
          )}

          <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 12 }}>{CHECKIN_CONSENT_COPY}</div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 18 }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
            I have read and agree to this identity-verification process.
          </label>

          <PrimaryButton disabled={!canContinueFromConsent} style={{ width: "100%" }} onClick={() => setStep("details")}>CONTINUE</PrimaryButton>
        </div>
      )}

      {step === "details" && (
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 12 }}>A couple more details</div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>
              Jersey number <span style={{ fontSize: 10.5, fontWeight: 600, color: theme.color.textMuted, textTransform: "uppercase" }}>optional</span>
            </div>
            {existingJerseyNumber != null ? (
              <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>#{existingJerseyNumber} — set by your captain/manager.</div>
            ) : jerseyNumbersLocked ? (
              <div style={{ color: theme.color.textMuted, fontSize: 13.5 }}>
                Jersey numbers are locked now that the tournament has started — ask your team's captain/manager.
              </div>
            ) : (
              <>
                <input
                  inputMode="numeric"
                  placeholder="e.g. 7 — leave blank if you don't know it yet (optional)"
                  value={jerseyNumberDraft}
                  onChange={(e) => setJerseyNumberDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                  style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                />
                <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 4 }}>
                  This locks in for the whole tournament once it starts — your captain/manager can also set/fix it before then.
                </div>
              </>
            )}
          </div>

          {acceptedBy === "self" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>
                Profession <span style={{ fontSize: 10.5, fontWeight: 600, color: theme.color.textMuted, textTransform: "uppercase" }}>optional</span>
              </div>
              {profession ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ background: "#F1EFF5", borderRadius: 999, padding: "8px 14px", fontSize: 13.5, fontWeight: 700 }}>{profession}</div>
                  <button
                    onClick={() => { setProfession(""); setProfessionQuery(""); }}
                    style={{ background: "none", border: "none", color: theme.color.purple, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    placeholder="Search professions… e.g. Nurse"
                    value={professionQuery}
                    onChange={(e) => setProfessionQuery(e.target.value)}
                    style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                  />
                  {professionQuery.trim() && (() => {
                    const matches = PROFESSIONS.filter((p) => p.toLowerCase().includes(professionQuery.trim().toLowerCase())).slice(0, 8);
                    return (
                      <div style={{ border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, marginTop: 6, overflow: "hidden" }}>
                        {matches.map((p) => (
                          <div
                            key={p}
                            onClick={() => { setProfession(p); setProfessionQuery(""); }}
                            style={{ padding: "9px 12px", fontSize: 13.5, cursor: "pointer", borderBottom: `1px solid ${theme.color.border}` }}
                          >
                            {p}
                          </div>
                        ))}
                        {matches.length === 0 && (
                          <div style={{ color: theme.color.textMuted, fontSize: 12.5, padding: 10 }}>No match — try a different search.</div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
              <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 8 }}>Shown on your Player Card if you share it — never required.</div>
            </div>
          )}

          <PrimaryButton disabled={!canContinueFromDetails} style={{ width: "100%" }} onClick={() => setStep("selfie")}>
            CONTINUE
          </PrimaryButton>
        </div>
      )}

      {step === "selfie" && (
        <CaptureStep
          title="Take a selfie"
          subtitle="Staff match it to your Tournament Pass at the gate."
          file={selfie}
          onPick={setSelfie}
          capture="user"
          onNext={() => setStep("govid")}
        />
      )}

      {step === "govid" && (
        <CaptureStep
          title="Government-issued ID"
          subtitle="For age verification only — only admins and the commissioner can see it."
          file={govId}
          onPick={setGovId}
          capture="environment"
          onNext={submit}
          nextLabel="SUBMIT FOR STAFF REVIEW"
        />
      )}

      {step === "submitting" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div className="um-spin" style={{ width: 40, height: 40, border: `4px solid ${theme.color.border}`, borderTopColor: theme.color.purple, borderRadius: "50%", margin: "0 auto 16px" }} />
          <div style={{ fontWeight: 700 }}>Sending to staff…</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
            Your photos and ID are on their way to a staff member for review.
          </div>
        </div>
      )}

      {step === "result" && result && (
        <ResultStep
          result={result}
          error={error}
          showVolunteerCta={result.status === "admin_review" && !hasVolunteerApplication}
          onVolunteer={() => setVolunteerSignupOpen(true)}
          onClose={onClose}
          onRetry={() => { setStep("selfie"); setSelfie(null); setGovId(null); }}
        />
      )}

      {volunteerSignupOpen && (
        <BecomeVolunteerModal onClose={() => setVolunteerSignupOpen(false)} initialName={membership.playerName ?? profile?.displayName} />
      )}
    </Modal>
  );
}

function RoleCard({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        cursor: "pointer",
        textAlign: "center",
        borderRadius: theme.radius.md,
        border: `2px solid ${active ? theme.color.purple : theme.color.border}`,
        background: active ? "#F1EFF5" : "#fff",
        padding: "18px 10px",
      }}
    >
      <div style={{ fontSize: 30, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13.5, flexWrap: "wrap", gap: 8 }}>
      <span style={{ color: theme.color.textMuted }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}

function CaptureStep({
  title, subtitle, file, onPick, capture, onNext, nextLabel = "LOOKS GOOD — CONTINUE",
}: {
  title: string; subtitle: string; file: File | null; onPick: (f: File | null) => void;
  capture: "user" | "environment"; onNext: () => void; nextLabel?: string;
}) {
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>{title}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 14 }}>{subtitle}</div>
      <label style={{ display: "block", border: `2px dashed ${theme.color.border}`, borderRadius: theme.radius.md, padding: 20, textAlign: "center", cursor: "pointer", marginBottom: 16 }}>
        <input type="file" accept="image/*" capture={capture} style={{ display: "none" }} onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        {preview ? <img src={preview} alt="capture" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }} /> : <div style={{ color: theme.color.textMuted }}>📷 Tap to capture</div>}
      </label>
      <PrimaryButton disabled={!file} onClick={onNext} style={{ width: "100%" }}>{nextLabel}</PrimaryButton>
    </div>
  );
}

function ResultStep({
  result, error, showVolunteerCta, onVolunteer, onClose, onRetry,
}: {
  result: { status: string }; error: string | null;
  showVolunteerCta: boolean; onVolunteer: () => void; onClose: () => void; onRetry: () => void;
}) {
  if (result.status === "admin_review") {
    return (
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: 40 }}>⏳</div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Pending review</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
          A staff member will review your photos and ID, usually within the hour.
        </div>
        <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
        {showVolunteerCta && (
          <div onClick={onVolunteer} style={{ marginTop: 14, color: theme.color.purple, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Want to help out too? Sign up to volunteer
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div style={{ fontSize: 40 }}>✕</div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>We couldn't submit your check-in</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>{error ?? "Something went wrong — please try again."}</div>
      <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onRetry}>TRY AGAIN</PrimaryButton>
    </div>
  );
}
