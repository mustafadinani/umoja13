// Companion to seed-admin.mjs — creates a pending CheckIn doc (and adds the
// player to test-united's roster) for a specific uid, bypassing the real
// selfie/gov-ID/AI-verification UI flow since this run is only exercising
// the email side of adminReviewCheckIn.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ projectId: "demo-umoja13" });
const db = getFirestore("umoja13-app");

const [, , uid, displayName] = process.argv;
if (!uid) {
  console.error("usage: node seed-checkin.mjs <uid> <displayName>");
  process.exit(1);
}

async function main() {
  const teamRef = db.collection("teams").doc("test-united");
  const teamSnap = await teamRef.get();
  const roster = teamSnap.data()?.roster ?? [];
  if (!roster.some((p) => p.userId === uid)) {
    roster.push({
      userId: uid,
      displayName,
      isCaptain: false,
      goals: 0,
      assists: 0,
      checkInStatus: "pending_review",
    });
    await teamRef.set({ roster }, { merge: true });
  }

  const checkInRef = db.collection("checkIns").doc();
  await checkInRef.set({
    id: checkInRef.id,
    userId: uid,
    teamId: "test-united",
    categoryId: "mens-open",
    status: "admin_review",
    selfieUrl: "",
    govIdUrl: "",
    submittedAt: Date.now(),
    attempt: 1,
    aiVerification: {
      faceMatch: true,
      faceMatchConfidence: 0.5,
      dobExtracted: null,
      ageEligible: true,
      reasoning: "Seeded for E2E test — escalated to admin review.",
      checkedAt: Date.now(),
    },
  });

  console.log(JSON.stringify({ checkInId: checkInRef.id }));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
