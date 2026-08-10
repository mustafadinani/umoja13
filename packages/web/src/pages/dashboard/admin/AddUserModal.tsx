import { useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { DATA_SOURCES } from "@umoja/shared";
import { theme } from "../../../lib/theme";
import { defaultDb } from "../../../lib/firebase";
import { lookupUserByEmail } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

export interface NewUserCandidate {
  uid: string;
  displayName: string;
  email: string;
}

type LookupResult =
  | { kind: "not_found" }
  | { kind: "found"; candidate: NewUserCandidate; hasOutreachProfile: boolean };

/**
 * Email-only, deliberately — NOT a name search over registered players.
 * setUserRole writes straight into users/{uid}, and useResolvedProfile
 * treats any users doc as authoritative over the richer Outreach-derived
 * profile (see mapOutreachProfileToUserProfile) once one exists. That used
 * to mean granting a role here for someone who already has a registration
 * profile at (default)/profiles/{uid} was refused outright, to avoid
 * silently blowing away their real name/photo/family/team-membership data.
 * setUserRole now seeds the new users doc from that same Outreach data
 * (see buildBaseProfileFromOutreach on the backend) instead of a bare
 * {roles} stub, so granting a role here is safe either way — this just
 * flags which case we're in so the confirmation copy is accurate.
 */
export function AddUserModal({ onPick, onClose }: { onPick: (candidate: NewUserCandidate) => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<LookupResult | null>(null);
  // Bumped on every lookup() call so a slow, stale request can't overwrite a
  // faster, newer one's result after the fact — onKeyDown fires unconditionally
  // on Enter, so two lookups for two different emails could otherwise race.
  const requestIdRef = useRef(0);

  async function lookup() {
    if (!email.trim() || status === "loading") return;
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    try {
      const res = await lookupUserByEmail({ email: email.trim() });
      if (requestId !== requestIdRef.current) return; // a newer lookup superseded this one
      const found = res.data.user;
      if (!found) {
        setResult({ kind: "not_found" });
        return;
      }
      const outreachSnap = await getDoc(doc(defaultDb, DATA_SOURCES.registration.profilesCollection, found.uid));
      if (requestId !== requestIdRef.current) return;
      if (outreachSnap.exists()) {
        const raw = outreachSnap.data() as { firstName?: string; lastName?: string };
        const name = [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim() || found.displayName;
        setResult({ kind: "found", candidate: { uid: found.uid, displayName: name, email: found.email }, hasOutreachProfile: true });
      } else {
        setResult({ kind: "found", candidate: found, hasOutreachProfile: false });
      }
    } catch {
      if (requestId === requestIdRef.current) setResult({ kind: "not_found" });
    } finally {
      if (requestId === requestIdRef.current) setStatus("done");
    }
  }

  return (
    <Modal onClose={onClose} width={420}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Add a user</div>
      <div style={{ color: theme.color.textMuted, fontSize: 12.5, marginBottom: 16 }}>
        Look someone up by email — works even if they've never opened the app yet, as long as they have a real account.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus("idle"); setResult(null); }}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="name@email.com"
          autoFocus
          style={{ flex: 1, padding: "10px 12px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        />
        <PrimaryButton disabled={!email.trim() || status === "loading"} onClick={lookup} style={{ padding: "0 16px" }}>
          {status === "loading" ? "…" : "Look up"}
        </PrimaryButton>
      </div>

      {status === "done" && result?.kind === "found" && (
        <>
          <div
            onClick={() => onPick(result.candidate)}
            style={{ padding: "9px 11px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, cursor: "pointer", fontSize: 13.5 }}
          >
            {result.candidate.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {result.candidate.email}</span>
          </div>
          {result.hasOutreachProfile && (
            <div style={{ color: theme.color.textMuted, fontSize: 12, marginTop: 8 }}>
              Already has a registration profile — granting a role keeps their existing name, photo, family, and team memberships intact.
            </div>
          )}
        </>
      )}

      {status === "done" && result?.kind === "not_found" && (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>
          No account found for that email — they'll need to sign in to the app at least once first.
        </div>
      )}
    </Modal>
  );
}
