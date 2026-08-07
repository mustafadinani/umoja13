import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { CATEGORIES, CHECKIN_NOTE_REASONS, COLLECTIONS, checkInStatusLabel, type CheckInNote, type CheckInNoteReason, type CheckIn, type UserProfile } from "@umoja/shared";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../auth/AuthProvider";
import { theme } from "../../../lib/theme";
import { adminReviewCheckIn } from "../../../lib/callables";
import { Modal, PrimaryButton } from "../../../components/ui";
import { Lightbox } from "../../../components/Lightbox";

export function PlayerDocumentsModal({ checkIn, user, fallbackName, fallbackPhotoUrl, onClose }: { checkIn: CheckIn; user?: UserProfile; fallbackName?: string; fallbackPhotoUrl?: string; onClose: () => void }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [noteReason, setNoteReason] = useState<CheckInNoteReason>(CHECKIN_NOTE_REASONS[0]);
  const [noteReasonOther, setNoteReasonOther] = useState("");
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const category = CATEGORIES.find((c) => c.id === checkIn.categoryId);
  // Match on playerKey too, not just team+category — a shared family
  // account can have two siblings' memberships colliding on the exact same
  // team+category, and only playerKey actually tells them apart.
  const playerKey = checkIn.playerKey ?? checkIn.userId;
  const membership =
    user?.playerOf?.find(
      (m) => m.teamId === checkIn.teamId && m.categoryId === checkIn.categoryId && (m.profileId?.trim() || user.uid) === playerKey
    ) ?? user?.playerOf?.find((m) => m.teamId === checkIn.teamId && m.categoryId === checkIn.categoryId);
  const notes = [...(checkIn.internalNotes ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  async function decide(decision: "approve" | "reject" | "nullify" | "restore") {
    setBusy(true);
    try {
      await adminReviewCheckIn({ checkInId: checkIn.id, decision });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!profile || !noteText.trim()) return;
    if (noteReason === "Other" && !noteReasonOther.trim()) return;
    setSavingNote(true);
    try {
      const note: CheckInNote = {
        id: crypto.randomUUID(),
        authorUid: profile.uid,
        authorName: profile.displayName,
        reason: noteReason,
        ...(noteReason === "Other" ? { reasonOther: noteReasonOther.trim() } : {}),
        text: noteText.trim(),
        createdAt: Date.now(),
      };
      await updateDoc(doc(db, COLLECTIONS.checkIns, checkIn.id), { internalNotes: arrayUnion(note) });
      setNoteText("");
      setNoteReasonOther("");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <Modal onClose={onClose} width={680}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20 }}>{membership?.playerName ?? user?.displayName ?? fallbackName ?? "Player"}</div>
        <StatusPill status={checkIn.status} />
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>
        {category?.label} · attempt {checkIn.attempt}
        {membership?.playerName && user?.displayName && membership.playerName !== user.displayName ? ` · account: ${user.displayName}` : ""}
      </div>

      <div style={{ color: theme.color.textMuted, fontSize: 11.5, marginBottom: 8 }}>Click any photo to zoom in.</div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Photo label="Registration photo" url={membership?.registrationPhotoUrl ?? fallbackPhotoUrl} onExpand={setLightboxUrl} height={160} />
        <Photo label="Check-in selfie" url={checkIn.selfieUrl} onExpand={setLightboxUrl} height={160} />
      </div>
      <Photo label="Government ID" url={checkIn.govIdUrl} onExpand={setLightboxUrl} height={220} wide />

      {checkIn.consent && (
        <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 16 }}>
          Consent: {checkIn.consent.acceptedBy === "guardian" ? `parent/guardian (${checkIn.consent.guardianName})` : "self"} ·{" "}
          {new Date(checkIn.consent.acceptedAt).toLocaleString()}
        </div>
      )}

      {checkIn.reviewedBy && (
        <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 16 }}>
          Decided by {checkIn.reviewedBy} at {checkIn.reviewedAt ? new Date(checkIn.reviewedAt).toLocaleString() : ""}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${theme.color.border}`, paddingTop: 14, marginBottom: 16 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14, marginBottom: 2 }}>INTERNAL NOTES</div>
        <div style={{ color: theme.color.textMuted, fontSize: 11.5, marginBottom: 10 }}>Staff only — never shown to the player.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {notes.map((n) => (
            <div key={n.id} style={{ background: "#F7F6F3", borderRadius: theme.radius.sm, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.color.navy }}>
                  {n.reason === "Other" ? n.reasonOther || "Other" : n.reason}
                </span>
                <span style={{ fontSize: 11, color: theme.color.textMuted, whiteSpace: "nowrap" }}>
                  {n.authorName} · {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: theme.color.text }}>{n.text}</div>
            </div>
          ))}
          {notes.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 12.5 }}>No notes yet.</div>}
        </div>

        <select
          value={noteReason}
          onChange={(e) => setNoteReason(e.target.value as CheckInNoteReason)}
          style={{ width: "100%", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5, marginBottom: 8 }}
        >
          {CHECKIN_NOTE_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {noteReason === "Other" && (
          <input
            value={noteReasonOther}
            onChange={(e) => setNoteReasonOther(e.target.value)}
            placeholder="Describe the reason…"
            style={{ width: "100%", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5, marginBottom: 8 }}
          />
        )}
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note about this check-in…"
          rows={2}
          style={{ width: "100%", padding: "8px 10px", borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 12.5, marginBottom: 8, resize: "none" }}
        />
        <button
          disabled={savingNote || !noteText.trim() || (noteReason === "Other" && !noteReasonOther.trim())}
          onClick={addNote}
          style={{
            width: "100%",
            background: theme.color.navy,
            color: "#fff",
            border: "none",
            borderRadius: theme.radius.sm,
            padding: "9px",
            fontWeight: 700,
            fontSize: 12.5,
            cursor: "pointer",
            opacity: savingNote || !noteText.trim() ? 0.6 : 1,
          }}
        >
          {savingNote ? "Adding…" : "ADD NOTE"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {(checkIn.status === "pending_review" || checkIn.status === "admin_review" || checkIn.status === "rejected") && (
          <>
            <PrimaryButton disabled={busy} onClick={() => decide("approve")} style={{ flex: 1 }}>APPROVE</PrimaryButton>
            <button disabled={busy} onClick={() => decide("reject")} style={{ flex: 1, background: "none", border: `1px solid ${theme.color.danger}`, color: theme.color.danger, borderRadius: theme.radius.sm, fontWeight: 700 }}>DECLINE</button>
          </>
        )}
        {checkIn.status === "approved" && (
          <button disabled={busy} onClick={() => decide("nullify")} style={{ flex: 1, background: "none", border: `1px solid ${theme.color.danger}`, color: theme.color.danger, borderRadius: theme.radius.sm, padding: "12px", fontWeight: 700 }}>NULLIFY CHECK-IN</button>
        )}
      </div>
      {lightboxUrl && <Lightbox src={lightboxUrl} mediaType="photo" onClose={() => setLightboxUrl(null)} />}
    </Modal>
  );
}

function Photo({
  label, url, onExpand, height = 90, wide = false,
}: { label: string; url?: string; onExpand: (url: string) => void; height?: number; wide?: boolean }) {
  return (
    <div style={{ flex: wide ? undefined : 1, width: wide ? "100%" : undefined, textAlign: "center", marginBottom: wide ? 16 : 0 }}>
      <div
        onClick={() => url && onExpand(url)}
        style={{
          height, borderRadius: 8, background: "#F1EFF5",
          backgroundImage: url ? `url(${url})` : undefined,
          backgroundPosition: "center", backgroundSize: "contain", backgroundRepeat: "no-repeat",
          cursor: url ? "zoom-in" : undefined,
        }}
      />
      <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: CheckIn["status"] }) {
  const { bg, fg } =
    status === "approved"
      ? { bg: theme.color.successBg, fg: theme.color.success }
      : status === "admin_review" || status === "pending_review"
      ? { bg: theme.color.warningBg, fg: theme.color.warning }
      : { bg: theme.color.dangerBg, fg: theme.color.danger };
  return (
    <span style={{ background: bg, color: fg, fontWeight: 700, fontSize: 12, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {checkInStatusLabel(status)}
    </span>
  );
}
