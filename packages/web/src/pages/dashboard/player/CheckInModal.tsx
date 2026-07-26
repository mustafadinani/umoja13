import { useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  COLLECTIONS,
  CATEGORIES,
  CHECKIN_CONSENT_POLICY_VERSION,
  CHECKIN_CONSENT_COPY,
  CHECKIN_AI_BYPASS_LABEL,
  CHECKIN_AI_BYPASS_CAVEAT,
  type PlayerMembership,
} from "@umoja/shared";
import { db, storage } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { verifyCheckIn } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

type Step = "confirm" | "consent" | "selfie" | "govid" | "verifying" | "result";

export function CheckInModal({ membership, checkInId, onClose }: { membership: PlayerMembership; checkInId: string; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>("confirm");
  const [acceptedBy, setAcceptedBy] = useState<"self" | "guardian">("self");
  const [guardianName, setGuardianName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [aiBypass, setAiBypass] = useState(false);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [govId, setGovId] = useState<File | null>(null);
  const [result, setResult] = useState<{ status: string; reason?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const category = CATEGORIES.find((c) => c.id === membership.categoryId);
  const canContinueFromConsent = agreed && (acceptedBy === "self" || guardianName.trim().length > 0);

  async function submit() {
    if (!user || !profile || !selfie || !govId) return;
    setStep("verifying");
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
          teamId: membership.teamId,
          categoryId: membership.categoryId,
          status: aiBypass ? "admin_review" : "pending_review",
          selfieUrl,
          govIdUrl,
          submittedAt: Date.now(),
          attempt,
          consent: {
            acceptedBy,
            guardianName: acceptedBy === "guardian" ? guardianName.trim() : null,
            acceptedAt: Date.now(),
            policyVersion: CHECKIN_CONSENT_POLICY_VERSION,
          },
          aiBypassRequested: aiBypass,
        },
        { merge: true }
      );

      if (aiBypass) {
        setResult({ status: "admin_review" });
      } else {
        const res = await verifyCheckIn({ checkInId });
        setResult(res.data);
      }
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong verifying your check-in.");
      setStep("result");
      setResult({ status: "error" });
    }
  }

  function proceedToCapture(bypassAi: boolean) {
    setAiBypass(bypassAi);
    setStep("selfie");
  }

  return (
    <Modal onClose={onClose}>
      {step === "confirm" && (
        <div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Is this you?</div>
          <div style={{ background: "#F7F6F3", borderRadius: theme.radius.md, padding: 16, margin: "12px 0" }}>
            <Row label="Name" value={profile?.displayName ?? ""} />
            <Row label="Category" value={category?.label ?? membership.categoryId} />
            <Row label="Jersey" value={membership.jerseyNumber ? `#${membership.jerseyNumber}` : "—"} />
            <Row label="Waiver" value="Signed at registration ✓" valueColor={theme.color.success} />
          </div>
          <PrimaryButton style={{ width: "100%" }} onClick={() => setStep("consent")}>YES, THAT'S ME</PrimaryButton>
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

          <PrimaryButton disabled={!canContinueFromConsent} style={{ width: "100%" }} onClick={() => proceedToCapture(false)}>CONTINUE</PrimaryButton>

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button
              disabled={!canContinueFromConsent}
              onClick={() => proceedToCapture(true)}
              style={{
                background: "none",
                border: "none",
                color: canContinueFromConsent ? theme.color.textMuted : theme.color.border,
                fontSize: 12.5,
                textDecoration: "underline",
                cursor: canContinueFromConsent ? "pointer" : "default",
              }}
            >
              {CHECKIN_AI_BYPASS_LABEL}
            </button>
            <div style={{ color: theme.color.textMuted, fontSize: 11, marginTop: 4 }}>{CHECKIN_AI_BYPASS_CAVEAT}</div>
          </div>
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
          nextLabel={aiBypass ? "SUBMIT FOR STAFF REVIEW" : "SUBMIT FOR AI CHECK"}
        />
      )}

      {step === "verifying" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div className="um-spin" style={{ width: 40, height: 40, border: `4px solid ${theme.color.border}`, borderTopColor: theme.color.purple, borderRadius: "50%", margin: "0 auto 16px" }} />
          <div style={{ fontWeight: 700 }}>{aiBypass ? "Sending to staff…" : "Checking your details…"}</div>
          <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
            {aiBypass
              ? "Your photos and ID are on their way to an admin for a manual review."
              : "Matching your selfie to your registration photo and reading the date of birth on your ID."}
          </div>
        </div>
      )}

      {step === "result" && result && (
        <ResultStep
          result={result}
          error={error}
          skippedAi={aiBypass}
          onClose={onClose}
          onRetry={() => { setStep("selfie"); setSelfie(null); setGovId(null); }}
        />
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
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13.5 }}>
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
  result, error, skippedAi, onClose, onRetry,
}: {
  result: { status: string; reason?: string }; error: string | null; skippedAi: boolean; onClose: () => void; onRetry: () => void;
}) {
  if (result.status === "approved") {
    return (
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: 40 }}>✓</div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>You're cleared to play!</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
          Photo matched · Age verified — your Tournament Pass QR is ready on your dashboard.
        </div>
        <div style={{ background: theme.color.warningBg, color: theme.color.warning, borderRadius: theme.radius.sm, padding: 12, fontSize: 12.5, marginTop: 14, textAlign: "left" }}>
          Heads up: admins may randomly re-check verifications. If yours doesn't hold up, your check-in can be nullified — we'd notify you right away.
        </div>
        <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
      </div>
    );
  }
  if (result.status === "admin_review") {
    return (
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div style={{ fontSize: 40 }}>⏳</div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>Sent to an admin</div>
        <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>
          {skippedAi
            ? "You opted out of AI verification — a real person will review your photos and ID, usually within the hour."
            : "The automatic check didn't go through — a real person will review your photos and ID, usually within the hour."}
        </div>
        <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onClose}>DONE</PrimaryButton>
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div style={{ fontSize: 40 }}>✕</div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginTop: 8 }}>We couldn't verify you</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 6 }}>{result.reason ?? error ?? "No worries — this is usually the lighting. Try again."}</div>
      <PrimaryButton style={{ marginTop: 16, width: "100%" }} onClick={onRetry}>RETAKE & RESUBMIT</PrimaryButton>
    </div>
  );
}
