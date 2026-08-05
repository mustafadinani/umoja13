import { useState } from "react";
import type { RosterEntry } from "@umoja/shared";
import { theme } from "../lib/theme";
import { useMoments } from "../hooks/useData";
import { CheckInStatusPill, Drawer, PrimaryButton, VerifiedBadge } from "./ui";
import { Lightbox } from "./Lightbox";
import { MomentUploadModal } from "./MomentUploadModal";

export function PlayerCardModal({
  player,
  teamId,
  teamName,
  onClose,
}: {
  player: RosterEntry;
  teamId: string;
  teamName: string;
  onClose: () => void;
}) {
  const { data: moments } = useMoments();
  const playerMoments = moments.filter((m) => m.playerTagUids?.includes(player.userId)).sort((a, b) => b.createdAt - a.createdAt);
  const [lightbox, setLightbox] = useState<{ src: string; mediaType: "photo" | "video" } | null>(null);
  const [addMomentOpen, setAddMomentOpen] = useState(false);

  return (
    <Drawer onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", width: 140, height: 140, marginBottom: 14 }}>
          {player.selfieUrl ? (
            <img src={player.selfieUrl} alt={player.displayName} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: theme.color.purple, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 40 }}>{player.displayName.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          {player.checkInStatus === "approved" && <VerifiedBadge size={36} />}
        </div>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22, textAlign: "center" }}>
          {player.displayName}{player.isCaptain ? " (C)" : ""}
        </div>
        <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginTop: 4, marginBottom: 14 }}>
          {teamName} · #{player.jerseyNumber ?? "—"}
        </div>

        <div style={{ marginBottom: 14 }}>
          <CheckInStatusPill status={player.checkInStatus} />
        </div>

        {(player.goals > 0 || player.assists > 0) && (
          <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{player.goals}</div>
              <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>Goals</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{player.assists}</div>
              <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>Assists</div>
            </div>
          </div>
        )}

        {player.badges && player.badges.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 20 }}>
            {player.badges.map((b) => (
              <div key={b} style={{ background: "#F7F0FF", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, color: theme.color.purple }}>
                🏅 {b}
              </div>
            ))}
          </div>
        )}

        <div style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 15 }}>MOMENTS</div>
            {playerMoments.length > 0 && (
              <div onClick={() => setAddMomentOpen(true)} style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: theme.color.purple }}>
                + Add
              </div>
            )}
          </div>

          {playerMoments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "18px 10px", background: "#F7F6F3", borderRadius: theme.radius.sm }}>
              <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 10 }}>No moments tagged yet.</div>
              <PrimaryButton onClick={() => setAddMomentOpen(true)} style={{ fontSize: 13 }}>+ ADD A MOMENT</PrimaryButton>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {playerMoments.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setLightbox({ src: m.mediaUrl, mediaType: m.mediaType })}
                  style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `1px solid ${theme.color.border}` }}
                >
                  {m.mediaType === "video" ? (
                    <video src={m.mediaUrl} style={{ width: "100%", height: 90, objectFit: "cover" }} />
                  ) : (
                    <img src={m.mediaUrl} style={{ width: "100%", height: 90, objectFit: "cover" }} alt={m.caption} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {lightbox && <Lightbox src={lightbox.src} mediaType={lightbox.mediaType} onClose={() => setLightbox(null)} />}
      {addMomentOpen && (
        <MomentUploadModal
          onClose={() => setAddMomentOpen(false)}
          initialTeamTagIds={[teamId]}
          initialPlayerTagUids={[player.userId]}
        />
      )}
    </Drawer>
  );
}
