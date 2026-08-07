import { useState } from "react";
import { theme } from "../../../lib/theme";
import { lookupUserByEmail } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";

export interface NewUserCandidate {
  uid: string;
  displayName: string;
  email: string;
}

/**
 * Email-only, deliberately — NOT a name search over registered players.
 * setUserRole writes straight into users/{uid}, and useResolvedProfile
 * treats any users doc as authoritative over the richer Outreach-derived
 * profile (see mapOutreachProfileToUserProfile) once one exists. Creating a
 * sparse users doc for a registered player here would silently blow away
 * their real name/photo/team memberships the next time they open the app.
 * Email lookup is safe because it's for the population that has NO
 * Outreach data at all (a pure account with a real Firebase Auth email but
 * no playersRegistered/profiles row) — matches lookupUserByEmail's own
 * contract, used the same way for adding someone to a Pod.
 */
export function AddUserModal({ onPick, onClose }: { onPick: (candidate: NewUserCandidate) => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<{ uid: string; displayName: string; email: string } | null>(null);

  async function lookup() {
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await lookupUserByEmail({ email: email.trim() });
      setResult(res.data.user);
      setStatus("done");
    } catch {
      setResult(null);
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

      {status === "done" && (
        result ? (
          <div
            onClick={() => onPick(result)}
            style={{ padding: "9px 11px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, cursor: "pointer", fontSize: 13.5 }}
          >
            {result.displayName} <span style={{ color: theme.color.textMuted, fontSize: 12 }}>· {result.email}</span>
          </div>
        ) : (
          <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>
            No account found for that email — they'll need to sign in to the app at least once first.
          </div>
        )
      )}
    </Modal>
  );
}
