import type { HuntCrew, HuntMission } from "@umoja/shared";
import { theme } from "../../lib/theme";
import { Modal } from "../../components/ui";

export function CrewDetailModal({ crew, missions, onClose }: { crew: HuntCrew; missions: HuntMission[]; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{crew.name}</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 16 }}>{crew.points} pts · {crew.missionsCompleted.length} missions done</div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>MEMBERS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {crew.members.filter((m) => m.status === "accepted").map((m) => (
          <div key={m.email} style={{ background: "#F1EFF5", borderRadius: 99, padding: "6px 12px", fontSize: 13 }}>{m.name}</div>
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>MISSIONS COMPLETED</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {crew.missionsCompleted.map((mid) => {
          const m = missions.find((mm) => mm.id === mid);
          return (
            <div key={mid} style={{ fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${theme.color.border}` }}>
              ✓ {m?.title ?? mid}
            </div>
          );
        })}
        {crew.missionsCompleted.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No missions completed yet.</div>}
      </div>
    </Modal>
  );
}
