/**
 * Outreach `(default)/families/{familyId}` docs — household managers + member refs.
 * Photo for each member: `(default)/profiles/{members[x].id}.profilePicture`.
 */
export interface FamilyMemberRef {
  id?: string;
  profileId?: string;
  uid?: string;
  displayName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  [key: string]: unknown;
}

export interface FamilyDoc {
  id: string;
  managers?: string[];
  members?: Array<string | FamilyMemberRef>;
}

export interface FamilyMemberProfile {
  /** families.members[x].id — used to match registration profileId */
  id: string;
  matchIds: string[];
  displayName: string;
  /** From profiles/{memberId}.profilePicture */
  photoUrl?: string;
  email?: string;
}

export function normalizeEmail(email: string | undefined | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function managerEmailsMatch(managers: string[] | undefined, email: string | undefined | null): boolean {
  const needle = normalizeEmail(email);
  if (!needle || !managers?.length) return false;
  return managers.some((m) => normalizeEmail(m) === needle);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Normalize families.members entries for id/name matching. */
export function parseFamilyMemberRefs(members: FamilyDoc["members"]): Array<{
  id: string;
  matchIds: string[];
  displayName: string;
  email?: string;
}> {
  if (!members?.length) return [];
  const out: Array<{ id: string; matchIds: string[]; displayName: string; email?: string }> = [];

  for (const m of members) {
    if (typeof m === "string") {
      const id = m.trim();
      if (!id) continue;
      out.push({ id, matchIds: [id], displayName: id });
      continue;
    }
    if (!m || typeof m !== "object") continue;

    const id = str(m.id) || str(m.profileId) || str(m.uid);
    if (!id) continue;

    const matchIds = [...new Set([str(m.id), str(m.profileId), str(m.uid)].filter(Boolean))];
    const displayName =
      str(m.displayName) ||
      str(m.name) ||
      [str(m.firstName), str(m.lastName)].filter(Boolean).join(" ") ||
      id;

    out.push({
      id,
      matchIds,
      displayName,
      email: str(m.email) || undefined,
    });
  }

  return out;
}

export function familyMemberProfileIds(members: FamilyDoc["members"]): string[] {
  return [...new Set(parseFamilyMemberRefs(members).flatMap((m) => m.matchIds))];
}

/** Pick the family member that best matches the selected dashboard player (photo is household-level). */
export function pickFamilyMemberPhoto(
  members: FamilyMemberProfile[],
  selectedPlayerName: string | undefined,
  accountUid: string | undefined,
  preferredProfileIds: string[] = []
): FamilyMemberProfile | undefined {
  if (members.length === 0) return undefined;

  if (preferredProfileIds.length > 0) {
    const preferred = new Set(preferredProfileIds);
    const hit =
      members.find((m) => m.matchIds.some((id) => preferred.has(id)) && !!m.photoUrl) ??
      members.find((m) => m.matchIds.some((id) => preferred.has(id)));
    if (hit) return hit;
  }

  const needle = (selectedPlayerName ?? "").trim().toLowerCase();
  if (needle) {
    const exact = members.find((m) => m.displayName.trim().toLowerCase() === needle);
    if (exact) return exact;
    const first = needle.split(/\s+/)[0];
    const byFirst = members.find((m) => m.displayName.trim().toLowerCase().split(/\s+/)[0] === first);
    if (byFirst) return byFirst;
  }
  if (accountUid) {
    const self = members.find((m) => m.matchIds.includes(accountUid) || m.id === accountUid);
    if (self) return self;
  }
  return members.find((m) => !!m.photoUrl) ?? members[0];
}
