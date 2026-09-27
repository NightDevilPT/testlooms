import { RecordedStep } from "@/lib/scenarios-service/types";

export interface DraftScenarioSession {
  projectId: string;
  baseUrl: string;
  currentUrl: string;
  viewport: { width: number; height: number };
  steps: RecordedStep[];
  updatedAt: number;
}
