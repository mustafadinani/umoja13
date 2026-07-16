/**
 * Live-shared UAT test tracker (packages/web/src/pages/Uat.tsx). Scenario
 * progress is one doc per scenario id (shared checklist, anyone can toggle);
 * bugs and sign-offs are append-only lists, one doc per submission, each
 * owned by the tester who filed it.
 */
export interface UatScenarioProgress {
  id: string; // matches UatScenario.id, e.g. "FAN-01"
  done: boolean;
  doneByUid: string | null;
  doneByName: string | null;
  notes: string;
  updatedAt: number;
}

export type UatBugSeverity = "critical" | "major" | "minor";

export interface UatBugReport {
  id: string;
  title: string;
  scenarioId: string;
  platform: string;
  steps: string;
  expected: string;
  actual: string;
  severity: UatBugSeverity | null;
  screenshotNote: string;
  filedByUid: string;
  filedByName: string;
  createdAt: number;
}

export interface UatSignoff {
  id: string;
  testerName: string;
  platformsTested: string;
  scenariosCompleted: string;
  bugsFiled: string;
  verdict: string;
  uid: string;
  createdAt: number;
}
