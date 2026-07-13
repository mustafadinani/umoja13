import { COLLECTIONS } from "@umoja/shared";
import { db } from "./admin.js";

/**
 * Atomically increments a named sequence and returns the new value.
 * Backs case numbers ("UG-114") and tournament pass ids — never generated
 * client-side, always via this transaction so numbers never collide.
 */
export async function nextSequence(name: string): Promise<number> {
  const ref = db.collection(COLLECTIONS.counters).doc(name);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data()?.value as number) ?? 0 : 0;
    const next = current + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}

export async function nextCaseNumber(prefix: "UG" | "UQ" = "UG"): Promise<string> {
  const n = await nextSequence(`case_${prefix}`);
  return `${prefix}-${100 + n}`;
}

export async function nextPassId(): Promise<string> {
  const n = await nextSequence("tournament_pass");
  return `PASS-${1000 + n}`;
}
