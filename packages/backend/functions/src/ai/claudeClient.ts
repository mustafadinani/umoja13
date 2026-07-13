import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";

export const anthropicApiKey: ReturnType<typeof defineSecret> = defineSecret("ANTHROPIC_API_KEY");

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: anthropicApiKey.value() });
  }
  return client;
}

export const CLAUDE_MODEL = "claude-sonnet-5";
