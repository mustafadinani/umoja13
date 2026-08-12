/**
 * Verifies the EmailJS-backed notification flows actually send real email
 * through the real EmailJS API (no mocking) while every other side effect
 * (Auth, Firestore, Functions) stays inside the local emulator suite. Run
 * against `firebase emulators:start --project demo-umoja13 --only
 * auth,firestore,functions` + `npm run dev --workspace packages/web` with
 * packages/web/.env.local pointed at that emulator.
 *
 * The seed-admin.mjs script (packages/backend/functions/scripts/) must have
 * already run against the same emulator to create the admin account + team
 * this spec signs in as / seeds a check-in against. Each `test()` block gets
 * its own fresh browser context, so no explicit sign-out is needed between
 * the fan and admin sessions.
 *
 * Every email this spec triggers is real — it lands in an actual inbox
 * (using the shared EmailJS account's real send quota). Point it at an
 * inbox you control:
 *   E2E_RECIPIENT_EMAIL=you+test@gmail.com npx playwright test
 * Gmail "+" aliases work well here since every run uses a fresh one
 * automatically to keep threads distinguishable.
 */
import { test, expect } from "@playwright/test";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) initializeApp({ projectId: "demo-umoja13" });
const adminAuth = getAuth();
const adminDb = getFirestore("umoja13-app");

const ADMIN_EMAIL = "admin-test@umoja13.local";
const ADMIN_PASSWORD = "TestPass123!";

const recipientBase = process.env.E2E_RECIPIENT_EMAIL;
if (!recipientBase || !recipientBase.includes("@")) {
  throw new Error(
    "Set E2E_RECIPIENT_EMAIL to an inbox you control before running this spec — it sends real email " +
      'via the shared EmailJS account, e.g. E2E_RECIPIENT_EMAIL="you+test@gmail.com" npx playwright test'
  );
}
const [recipientUser, recipientDomain] = recipientBase.split("@");

const runId = Date.now().toString(36);
const FAN_NAME = `E2E Test ${runId}`;
const FAN_EMAIL = `${recipientUser}+umoja13e2e${runId}@${recipientDomain}`;
const FAN_PASSWORD = "TestPass123!";

const MODAL_SCRIM = '[data-testid="modal-scrim"]';

function fieldAfterLabel(page: import("@playwright/test").Page, label: string) {
  return page.locator(`xpath=//div[normalize-space(text())="${label}"]/following-sibling::input[1]`);
}

test.describe.configure({ mode: "serial" });

test("volunteer application → received email", async ({ page }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("Full name").fill(FAN_NAME);
  await page.getByPlaceholder("Email").fill(FAN_EMAIL);
  await page.getByPlaceholder("Password (min 6 characters)").fill(FAN_PASSWORD);
  await page.getByRole("button", { name: "CREATE ACCOUNT" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/");
  await page.getByRole("button", { name: "🙋 BECOME A VOLUNTEER" }).click();
  await expect(page.locator(MODAL_SCRIM)).toBeVisible();

  await fieldAfterLabel(page, "Full name").fill(FAN_NAME);
  await fieldAfterLabel(page, "Email").fill(FAN_EMAIL);
  await fieldAfterLabel(page, "Phone").fill("2025551234");
  await fieldAfterLabel(page, "Emergency contact (name & phone)").fill("Test Contact 2025551234");
  await page.getByText("Fri", { exact: true }).click();

  await page.getByRole("button", { name: "SUBMIT APPLICATION" }).click();
  await expect(page.getByText("Thanks for signing up!")).toBeVisible();
  await page.getByRole("button", { name: "DONE" }).click();
});

test("admin approves volunteer application → decision email", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "SIGN IN", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByText("Volunteers", { exact: true }).click();
  await page.getByText(FAN_NAME, { exact: true }).click();
  await expect(page.locator(MODAL_SCRIM)).toBeVisible();
  await page.getByRole("button", { name: "APPROVE" }).click();
  await expect(page.locator(MODAL_SCRIM)).toHaveCount(0);
});

test("admin approves a seeded check-in → decision email", async ({ page }) => {
  // Seed the check-in via Admin SDK (bypassing the real selfie/gov-ID/AI
  // flow, which isn't what's under test here) now that the fan account
  // exists and has a known uid.
  const fanUser = await adminAuth.getUserByEmail(FAN_EMAIL);
  const teamRef = adminDb.collection("teams").doc("test-united");
  const teamSnap = await teamRef.get();
  const roster: { userId: string }[] = teamSnap.data()?.roster ?? [];
  if (!roster.some((p) => p.userId === fanUser.uid)) {
    roster.push({
      userId: fanUser.uid,
      // @ts-expect-error partial roster entry, sufficient for this test
      displayName: FAN_NAME,
      isCaptain: false,
      goals: 0,
      assists: 0,
      checkInStatus: "admin_review",
    });
    await teamRef.set({ roster }, { merge: true });
  }
  const checkInRef = adminDb.collection("checkIns").doc();
  await checkInRef.set({
    id: checkInRef.id,
    userId: fanUser.uid,
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

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "SIGN IN", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByText("Player Check-ins", { exact: true }).click();
  await page.getByText(FAN_NAME, { exact: true }).click();
  await expect(page.locator(MODAL_SCRIM)).toBeVisible();
  await page.getByRole("button", { name: "APPROVE" }).click();
  await expect(page.locator(MODAL_SCRIM)).toHaveCount(0);
});

test("admin broadcast → announcement email fallback", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(ADMIN_EMAIL);
  await page.getByPlaceholder("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "SIGN IN", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByText("Notifications", { exact: true }).click();
  await page.getByText("Everyone", { exact: true }).click();
  await page.getByPlaceholder("Title").fill(`E2E broadcast ${runId}`);
  await page.getByPlaceholder("Message").fill("Verifying EmailJS delivery works end to end.");
  await page.getByRole("button", { name: "SEND" }).click();

  const resultLocator = page.getByText(/got an email\)/);
  await expect(resultLocator).toBeVisible({ timeout: 20_000 });
  const resultText = await resultLocator.textContent();
  console.log("Broadcast result:", resultText);
  expect(resultText).not.toMatch(/\(0 got a push, 0 got an email\)/);
});
