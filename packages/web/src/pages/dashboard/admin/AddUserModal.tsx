import { useState } from "react";
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
  | { kind: "already_registered"; displayName: string; email: string }
  | { kind: "addable"; candidate: NewUserCandidate };

/**
 * Email-only, deliberately — NOT a name search over registered players.
 * setUserRole writes straight into users/{uid}, and useResolvedProfile
 * treats any users doc as authoritative over the richer Outreach-derived
 * profile (see mapOutreachProfileToUserProfile) once one exists. Creating a
 * sparse users doc for someone who already has a registration profile at
 * (default)/profiles/{uid} would silently blow away their real
 * name/photo/family/team-membership data the next time they open the app —
 * so this checks for that BEFORE offering to pick the result, not just
 * before writing. (Found the hard way: an account that "hasn't opened the
 * app" by the umoja13-app users collection can still be a fully real,
 * actively-used registration profile — those live in a different database.)
 */
export function AddUserModal({ onPick, onClose }: { onPick: (candidate: NewUserCandidate) => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<LookupResult | null>(null);

  async function lookup() {
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await lookupUserByEmail({ email: email.trim() });
      const found = res.data.user;
      if (!found) {
        setResult({ kind: "not_found" });
        return;
      }
      const outreachSnap = await getDoc(doc(defaultDb, DATA_SOURCES.registration.profilesCollection, found.uid));
      if (outreachSnap.exists()) {
        const raw = outreachSnap.data() as { firstName?: string; lastName?: string };
        const name = [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim() || found.displayName;
        setResult({ kind: "already_registered", displayName: name, email: found.email });
      } else {
        setResult({ kind: "addable", candidate: found });
      }
    } catch {
      setResult({ kind: "not_found" });
    } finally {
      setStatus("done");
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

      {status === "done" && result?.kind === "addable" && (
        <div
          onClick={() => onPick(result.candidate)}
          style={{ padding: "9px 11px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, cursor: "pointer", fontSize: 13.5 }}
        >
          {result.candidate.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {result.candidate.email}</span>
        </div>
      )}

      {status === "done" && result?.kind === "already_registered" && (
        <div style={{ background: theme.color.warningBg, color: theme.color.warning, borderRadius: theme.radius.sm, padding: 10, fontSize: 12.5, fontWeight: 600 }}>
          {result.displayName} already has a registration profile ({result.email}) — assigning a role from here isn't supported yet, since it
          would replace their registration profile (name, photo, family, team memberships) with a blank one. Ask for this to be built properly if
          you need to grant them a staff role.
        </div>
      )}

      {status === "done" && result?.kind === "not_found" && (
        <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>
          No account found for that email — they'll need to sign in to the app at least once first.
        </div>
      )}
    </Modal>
  );
}
