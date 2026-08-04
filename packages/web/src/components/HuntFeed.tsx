import { useState } from "react";
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { COLLECTIONS } from "@umoja/shared";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { useHuntMoments } from "../hooks/useData";
import { Card } from "./ui";
import { Lightbox } from "./Lightbox";

/**
 * A dedicated, browsable feed of everyone's approved Hunt submissions —
 * same card/grid look as the general Moments wall, just scoped to source
 * "hunt" so it lives right where people are already looking for Hunt
 * activity instead of buried among game/community posts.
 */
export function HuntFeed() {
  const { user } = useAuth();
  const { data: moments } = useHuntMoments();
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);

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
    <div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 14 }}>
        Everyone's approved mission and challenge submissions, in one feed.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
        {moments.map((m) => {
          const liked = user ? m.likeUids.includes(user.uid) : false;
          const isOwn = user?.uid === m.postedBy;
          return (
            <Card key={m.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ position: "relative", height: 150, background: "#211A33" }}>
                {m.mediaType === "video" ? (
                  <>
                    <video src={m.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                    <button
                      onClick={() => setLightbox({ src: m.mediaUrl, mediaType: "video" })}
                      style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,.55)", border: "none", color: "#fff", borderRadius: 6, width: 26, height: 26, fontSize: 13, cursor: "zoom-in" }}
                      title="Expand"
                    >
                      ⛶
                    </button>
                  </>
                ) : (
                  <img
                    src={m.mediaUrl}
                    style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }}
                    alt={m.caption}
                    onClick={() => setLightbox({ src: m.mediaUrl, mediaType: "photo" })}
                  />
                )}
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
        {moments.length === 0 && (
          <div style={{ color: theme.color.textMuted, gridColumn: "1/-1", textAlign: "center", padding: 40 }}>
            No approved submissions yet — check back once missions start getting reviewed.
          </div>
        )}
      </div>

      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
    </div>
  );
}
