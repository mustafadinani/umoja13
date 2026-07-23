import { useState } from "react";
import { addDoc, collection, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SPONSOR_TIER_LABELS, SPONSOR_TIER_ORDER, COLLECTIONS, type Sponsor, type SponsorTier } from "@umoja/shared";
import { db, storage } from "../../../lib/firebase";
import { theme } from "../../../lib/theme";
import { useSponsors } from "../../../hooks/useData";

export function SponsorsAdminTab() {
  const { data: sponsors } = useSponsors();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function addSponsor(tier: SponsorTier) {
    const inTier = sponsors.filter((s) => (s.tier ?? "supporter") === tier);
    const nextOrder = inTier.length > 0 ? Math.max(...inTier.map((s) => s.order ?? 0)) + 1 : 0;
    await addDoc(collection(db, COLLECTIONS.sponsors), {
      name: "New sponsor",
      logoUrl: "",
      tagline: "",
      story: "",
      sponsoredTeamIds: [],
      tier,
      order: nextOrder,
      websiteUrl: "",
      visible: true,
    });
  }

  async function updateField(s: Sponsor, field: "name" | "websiteUrl", value: string) {
    await updateDoc(doc(db, COLLECTIONS.sponsors, s.id), { [field]: value });
  }

  async function toggleVisible(s: Sponsor) {
    await updateDoc(doc(db, COLLECTIONS.sponsors, s.id), { visible: !(s.visible ?? true) });
  }

  async function removeSponsor(id: string) {
    await deleteDoc(doc(db, COLLECTIONS.sponsors, id));
  }

  async function uploadLogo(s: Sponsor, file: File) {
    setBusyId(s.id);
    try {
      const storageRef = ref(storage, `sponsorLogos/${s.id}-${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const logoUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, COLLECTIONS.sponsors, s.id), { logoUrl });
    } finally {
      setBusyId(null);
    }
  }

  async function move(tierSponsors: Sponsor[], index: number, dir: -1 | 1) {
    const other = tierSponsors[index + dir];
    const me = tierSponsors[index];
    if (!other) return;
    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.sponsors, me.id), { order: other.order ?? 0 });
    batch.update(doc(db, COLLECTIONS.sponsors, other.id), { order: me.order ?? 0 });
    await batch.commit();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 22 }}>SPONSORS</div>
      </div>
      <div style={{ color: theme.color.textMuted, fontSize: 13.5, marginBottom: 24 }}>
        Manage the supporter band shown across the site. Upload a logo onto a sponsor, or leave it blank to show the name as a wordmark.
      </div>

      {SPONSOR_TIER_ORDER.map((tier) => {
        const tierSponsors = sponsors.filter((s) => (s.tier ?? "supporter") === tier).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return (
          <div key={tier} style={{ background: "#fff", border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{SPONSOR_TIER_LABELS[tier]} <span style={{ color: theme.color.textMuted, fontWeight: 600 }}>{tierSponsors.length}</span></div>
              <button onClick={() => addSponsor(tier)} style={{ background: "none", border: `1px solid ${theme.color.border}`, borderRadius: 999, padding: "6px 14px", fontWeight: 700, fontSize: 12.5 }}>
                + Add
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tierSponsors.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ width: 80, height: 50, borderRadius: 8, border: `1px dashed ${theme.color.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, overflow: "hidden" }}>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && uploadLogo(s, e.target.files[0])} />
                    {busyId === s.id ? (
                      <span style={{ fontSize: 11, color: theme.color.textMuted }}>…</span>
                    ) : s.logoUrl ? (
                      <img src={s.logoUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontSize: 10, color: theme.color.textMuted, textAlign: "center" }}>logo</span>
                    )}
                  </label>
                  <input
                    defaultValue={s.name}
                    onBlur={(e) => updateField(s, "name", e.target.value)}
                    style={{ flex: 1, padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5, fontWeight: 700 }}
                  />
                  <input
                    defaultValue={s.websiteUrl ?? ""}
                    placeholder="https://…"
                    onBlur={(e) => updateField(s, "websiteUrl", e.target.value)}
                    style={{ flex: 1, padding: 10, borderRadius: theme.radius.sm, border: `1px solid ${theme.color.border}`, fontSize: 13.5 }}
                  />
                  <button disabled={i === 0} onClick={() => move(tierSponsors, i, -1)} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "#fff", opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                  <button disabled={i === tierSponsors.length - 1} onClick={() => move(tierSponsors, i, 1)} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${theme.color.border}`, background: "#fff", opacity: i === tierSponsors.length - 1 ? 0.4 : 1 }}>↓</button>
                  <button onClick={() => toggleVisible(s)} title={s.visible ?? true ? "Visible — click to hide" : "Hidden — click to show"} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${theme.color.border}`, background: (s.visible ?? true) ? "#fff" : theme.color.warningBg }}>
                    {(s.visible ?? true) ? "👁" : "🚫"}
                  </button>
                  <button onClick={() => removeSponsor(s.id)} style={{ width: 30, height: 30, borderRadius: 6, border: `1px solid ${theme.color.danger}`, background: "#fff", color: theme.color.danger }}>🗑</button>
                </div>
              ))}
              {tierSponsors.length === 0 && <div style={{ color: theme.color.textMuted, fontSize: 13 }}>No sponsors in this tier yet.</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
