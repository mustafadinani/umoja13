import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { theme } from "../lib/theme";
import { listOpenPods, joinPod } from "../lib/callables";
import { MyPodsPanel } from "../components/MyPodsPanel";
import { BecomeVolunteerModal } from "../components/BecomeVolunteerModal";
import { Card, PrimaryButton } from "../components/ui";

// Same set ensureInGeneralPod/listOpenPods treat as pod-eligible on the backend.
const POD_ELIGIBLE_ROLES = ["admin", "commissioner", "referee", "volunteer"];

/**
 * A dedicated page for pod chat + tasks — not stacked inside the role
 * dashboard, since pod membership isn't tied to any one role/dashboard flow.
 * Visible to everyone signed in: a non-volunteer sees a prompt to sign up;
 * anyone pod-eligible sees their own pods plus open ones they can self-join.
 */
export function Pods() {
  const { profile } = useAuth();
  const [volunteerOpen, setVolunteerOpen] = useState(false);

  if (!profile) {
    return <div className="page-shell" style={{ maxWidth: 1000, color: theme.color.textMuted }}>Loading…</div>;
  }

  const eligible = profile.roles.some((r) => POD_ELIGIBLE_ROLES.includes(r));

  if (!eligible) {
    return (
      <div className="page-shell" style={{ maxWidth: 640 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 32, marginBottom: 16 }}>PODS</div>
        <Card style={{ padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🙋</div>
          <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Pods are for our volunteer crews</div>
          <div style={{ color: theme.color.textMuted, fontSize: 14, marginBottom: 20, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            A pod is a small team coordinating one zone of the tournament together — chat, shifts, tasks. Sign up to volunteer and you'll be able to join one yourself.
          </div>
          <PrimaryButton onClick={() => setVolunteerOpen(true)}>🙋 BECOME A VOLUNTEER</PrimaryButton>
        </Card>
        {volunteerOpen && <BecomeVolunteerModal onClose={() => setVolunteerOpen(false)} initialName={profile.displayName} />}
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ maxWidth: 1000 }}>
      <MyPodsPanel />
      <div style={{ marginTop: 32 }}>
        <OpenPodsSection />
      </div>
    </div>
  );
}

function OpenPodsSection() {
  const [pods, setPods] = useState<{ id: string; name: string; memberCount: number }[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listOpenPods({})
      .then((res) => setPods(res.data.pods))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load open pods."));
  }, []);

  async function join(podId: string) {
    setBusyId(podId);
    setError(null);
    try {
      await joinPod({ podId });
      setPods((prev) => prev?.filter((p) => p.id !== podId) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join this pod.");
    } finally {
      setBusyId(null);
    }
  }

  if (!pods || pods.length === 0) return null;

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 4 }}>OPEN PODS</div>
      <div style={{ color: theme.color.textMuted, fontSize: 13, marginBottom: 12 }}>Join a pod you're not on yet — no approval needed.</div>
      {error && (
        <div style={{ background: theme.color.dangerBg, color: theme.color.danger, borderRadius: theme.radius.sm, padding: 10, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pods.map((p) => (
          <Card key={p.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2 }}>{p.memberCount} member{p.memberCount === 1 ? "" : "s"}</div>
            </div>
            <PrimaryButton disabled={busyId === p.id} onClick={() => join(p.id)} style={{ padding: "8px 16px", fontSize: 12.5 }}>
              {busyId === p.id ? "Joining…" : "JOIN"}
            </PrimaryButton>
          </Card>
        ))}
      </div>
    </div>
  );
}
