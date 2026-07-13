import { useState } from "react";
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useMoments } from "../hooks/useData";
import { Card, PrimaryButton } from "../components/ui";
import { MomentUploadModal } from "../components/MomentUploadModal";

const SOURCE_BADGE: Record<string, string> = { game: "⚽ GAME", hunt: "🧭 HUNT", community: "🎉 COMMUNITY" };

export function Moments() {
  const { user } = useAuth();
  const { data: moments } = useMoments();
  const [uploadOpen, setUploadOpen] = useState(false);

  async function toggleLike(momentId: string, liked: boolean) {
    if (!user) return;
    await updateDoc(doc(db, COLLECTIONS.moments, momentId), {
      likeUids: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
    });
  }

  async function remove(momentId: string) {
    await deleteDoc(doc(db, COLLECTIONS.moments, momentId));
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32 }}>MOMENTS</div>
        {user && <PrimaryButton onClick={() => setUploadOpen(true)}>+ SHARE A MOMENT</PrimaryButton>}
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 14, marginBottom: 20 }}>
        From the games, The Hunt, and the community — all in one feed.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {moments.map((m) => {
          const liked = user ? m.likeUids.includes(user.uid) : false;
          const isOwn = user?.uid === m.postedBy;
          return (
            <Card key={m.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ position: "relative", height: 150, background: "#211A33" }}>
                {m.mediaType === "video" ? (
                  <video src={m.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                ) : (
                  <img src={m.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={m.caption} />
                )}
                <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "3px 7px", borderRadius: 99 }}>
                  {SOURCE_BADGE[m.source] ?? m.source}
                </div>
                {isOwn && (
                  <div style={{ position: "absolute", top: 8, right: 8, background: theme.color.gold, color: theme.color.navy, fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 99 }}>
                    YOURS
                  </div>
                )}
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.caption}</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{m.postedByName}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <button
                    onClick={() => toggleLike(m.id, liked)}
                    style={{ background: "none", border: "none", fontSize: 13, fontWeight: 700, color: liked ? theme.color.pink : theme.color.textMuted }}
                  >
                    {liked ? "♥" : "♡"} {m.likeUids.length}
                  </button>
                  {isOwn && (
                    <button onClick={() => remove(m.id)} style={{ background: "none", border: "none", fontSize: 12, color: theme.color.danger, fontWeight: 600 }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {moments.length === 0 && <div style={{ color: theme.color.textMuted, gridColumn: "1/-1", textAlign: "center", padding: 40 }}>No moments yet — be the first to share one.</div>}
      </div>

      {uploadOpen && <MomentUploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
