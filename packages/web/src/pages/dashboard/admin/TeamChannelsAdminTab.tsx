import { useMemo, useState } from "react";
import { theme } from "../../../lib/theme";
import { useCategories, useTeams } from "../../../hooks/useData";
import { Card } from "../../../components/ui";
import { TeamChannelPanel } from "../../../components/TeamChannelPanel";

export function TeamChannelsAdminTab() {
  const { data: teams } = useTeams();
  const { data: categories } = useCategories();
  const categoryLabel = useMemo(() => new Map(categories.map((c) => [c.id, c.label])), [categories]);
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
  const [teamId, setTeamId] = useState<string | null>(null);

  return (
    <div>
      <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 18, marginBottom: 10 }}>TEAM CHANNELS</div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Team</div>
        <select
          value={teamId ?? ""}
          onChange={(e) => setTeamId(e.target.value || null)}
          style={{ width: "100%", padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
        >
          <option value="" disabled>Pick a team…</option>
          {sortedTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {categoryLabel.get(t.categoryId) ?? t.categoryId}
            </option>
          ))}
        </select>
      </Card>

      {teamId && (
        <Card>
          <TeamChannelPanel teamId={teamId} />
        </Card>
      )}
    </div>
  );
}
