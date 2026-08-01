/**
 * Dev/emulator seed script. Run with `npm run seed --workspace packages/backend/functions`
 * against the Firebase emulator suite (start emulators first: `npm run emulators` at repo root).
 * Uses the Admin SDK, which needs FIRESTORE_EMULATOR_HOST set when targeting the emulator.
 *
 * Data layout reminder:
 * - Seed/test users → Auth + umoja13-app / users
 * - Teams & players for the app UI → (default) / uGames/2026/*Registered (not seeded here)
 * - Everything else (categories, games fixtures, etc.) → umoja13-app
 */
import { auth, db } from "../util/admin.js";
import {
  COLLECTIONS,
  UAT_DEMO_ACCOUNTS,
  UAT_DEMO_PASSWORD,
  type UserProfile,
} from "@umoja/shared";
import { CATEGORIES, SEED_SPONSORS, HUNT_MISSIONS, seedTeams } from "./data.js";

async function seedDemoUsers() {
  const now = Date.now();
  for (const account of UAT_DEMO_ACCOUNTS) {
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(account.email);
      uid = existing.uid;
      await auth.updateUser(uid, { password: UAT_DEMO_PASSWORD, displayName: account.displayName });
    } catch {
      const created = await auth.createUser({
        email: account.email,
        password: UAT_DEMO_PASSWORD,
        displayName: account.displayName,
      });
      uid = created.uid;
    }

    const profile: UserProfile = {
      uid,
      email: account.email,
      displayName: account.displayName,
      roles: [...account.roles],
      primaryRole: account.primaryRole,
      followedTeamIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.collection(COLLECTIONS.users).doc(uid).set(profile, { merge: true });
    console.log(`  demo user ${account.email} → ${uid}`);
  }
}

async function main() {
  console.log("Seeding UAT demo Auth + umoja13-app / users…");
  await seedDemoUsers();

  const batch = db.batch();

  for (const cat of CATEGORIES) {
    batch.set(db.collection(COLLECTIONS.categories).doc(cat.id), cat);
  }

  for (const sponsor of SEED_SPONSORS) {
    batch.set(db.collection(COLLECTIONS.sponsors).doc(sponsor.id), {
      ...sponsor,
      logoUrl: "",
      story: `${sponsor.name} is proud to support the Umoja Games community.`,
      sponsoredTeamIds: [],
    });
  }

  for (const mission of HUNT_MISSIONS) {
    batch.set(db.collection(COLLECTIONS.huntMissions).doc(mission.id), mission);
  }

  await batch.commit();

  // Local game fixtures still need team docs in umoja13-app so schedule rows
  // have ids to point at. Live registration teams/players come from (default).
  const teamBatch = db.batch();
  const teamIdByName = new Map<string, string>();
  for (const team of seedTeams()) {
    const ref = db.collection(COLLECTIONS.teams).doc();
    teamIdByName.set(team.name, ref.id);
    teamBatch.set(ref, { ...team, id: ref.id });
  }
  await teamBatch.commit();

  const dmv = teamIdByName.get("DMV United");
  const lagos = teamIdByName.get("Lagos Legends");
  const umoja = teamIdByName.get("Umoja FC");
  const harambee = teamIdByName.get("Harambee SC");
  const gameBatch = db.batch();
  const now = Date.now();
  if (dmv && lagos && umoja && harambee) {
    const games = [
      {
        categoryId: CATEGORIES[0]?.id ?? "mens-open", day: "fri", kickoffTime: "10:40", field: "Field 1",
        homeTeamId: dmv, awayTeamId: lagos, status: "scheduled", round: "group",
        gateCheck: { homeClearedUids: [], awayClearedUids: [] }, events: [],
      },
      {
        categoryId: CATEGORIES[0]?.id ?? "mens-open", day: "fri", kickoffTime: "11:30", field: "Field 2",
        homeTeamId: umoja, awayTeamId: harambee, status: "live", round: "group",
        gateCheck: { homeClearedUids: [], awayClearedUids: [] },
        events: [
          { id: "e1", type: "goal", teamId: umoja, playerId: "seed", playerNumber: 9, minute: 12, createdAt: now, createdBy: "seed" },
          { id: "e2", type: "goal", teamId: harambee, playerId: "seed", playerNumber: 7, minute: 30, createdAt: now, createdBy: "seed" },
          { id: "e3", type: "goal", teamId: umoja, playerId: "seed", playerNumber: 9, minute: 38, createdAt: now, createdBy: "seed" },
        ],
      },
      {
        categoryId: CATEGORIES[0]?.id ?? "mens-open", day: "sat", kickoffTime: "09:00", field: "Field 1",
        homeTeamId: lagos, awayTeamId: harambee, status: "final", round: "group",
        gateCheck: { homeClearedUids: [], awayClearedUids: [] },
        events: [
          { id: "e4", type: "goal", teamId: lagos, playerId: "seed", playerNumber: 4, minute: 20, createdAt: now, createdBy: "seed" },
        ],
      },
    ] as const;
    for (const g of games) {
      const ref = db.collection(COLLECTIONS.games).doc();
      gameBatch.set(ref, { ...g, id: ref.id, createdAt: now, updatedAt: now });
    }
    await gameBatch.commit();
  }

  console.log(`Seeded ${UAT_DEMO_ACCOUNTS.length} demo users, ${CATEGORIES.length} categories, ${SEED_SPONSORS.length} sponsors, ${HUNT_MISSIONS.length} hunt missions, fixture teams, and sample games.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
