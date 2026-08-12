// Ad-hoc emulator-only seed script for the EmailJS E2E verification pass —
// bootstraps a test admin (no self-serve admin signup exists in the app;
// setUserRole is admin-only, so the very first admin has to come from
// somewhere outside the UI) plus one team for the check-in decision test.
// Run against a live emulator: FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
// env vars must already point at it.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ projectId: "demo-umoja13" });
const auth = getAuth();
const db = getFirestore("umoja13-app");

const ADMIN_EMAIL = "admin-test@umoja13.local";
const ADMIN_PASSWORD = "TestPass123!";

async function main() {
  let user;
  try {
    user = await auth.getUserByEmail(ADMIN_EMAIL);
  } catch {
    user = await auth.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, displayName: "Test Admin" });
  }

  await auth.setCustomUserClaims(user.uid, { roles: ["admin"] });

  const now = Date.now();
  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email: ADMIN_EMAIL,
      displayName: "Test Admin",
      roles: ["admin"],
      primaryRole: "admin",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  const teamRef = db.collection("teams").doc("test-united");
  await teamRef.set({
    id: "test-united",
    name: "Test United",
    categoryId: "mens-open",
    color: "#8B2FD1",
    roster: [],
    rosterUids: [],
    stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
  });

  console.log(JSON.stringify({ adminUid: user.uid, adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD, teamId: "test-united" }));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
