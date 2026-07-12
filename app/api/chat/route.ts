import Anthropic from "@anthropic-ai/sdk";
import { buildAssistantContext } from "@/lib/assistant-context";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Keep replies snappy and cheap; cap conversation length as a light guardrail.
const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 1200;
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MSG = 2000;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI chat isn't configured yet. Add ANTHROPIC_API_KEY in the environment." },
      { status: 503 },
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MSG) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "No question provided." }, { status: 400 });
  }

  let context: unknown;
  try {
    context = await buildAssistantContext();
  } catch {
    return Response.json({ error: "Couldn't load your dashboard data right now." }, { status: 500 });
  }

  const system = [
    "You are Lia's Assistant, a helpful analyst embedded in Lia's aerospace-staffing recruiting CRM (Lia's CRM).",
    "Answer questions about her dashboard, job openings, hot openings, submittals, candidates/pipeline, activity KPIs, and commissions, and offer useful suggestions.",
    "You are given a live JSON snapshot of the CRM below. Base every factual answer ONLY on that snapshot. If the snapshot doesn't contain the answer, say so plainly rather than guessing.",
    "Be concise and direct. Use short bullet lists or small tables for multi-item answers. Lead with the answer, then supporting detail. Do not use em dashes.",
    "When counts or money matter, cite the exact numbers from the snapshot. Today's date is in the snapshot as `today`.",
    "You cannot modify data, send emails, or take actions. If asked to, explain that you're read-only and point to where in the app they can do it.",
    "",
    "LIVE CRM SNAPSHOT (JSON):",
    JSON.stringify(context),
  ].join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Cache the (large) data snapshot so repeated questions in a short window
      // read it at ~0.1x cost instead of re-billing the full context each time.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return Response.json({ reply: reply || "I couldn't produce an answer for that." });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status ?? 500 : 500;
    const message =
      status === 401 ? "The AI key was rejected. Check ANTHROPIC_API_KEY."
      : status === 429 ? "Rate limited by the AI service. Try again in a moment."
      : "The AI service had an error. Try again.";
    return Response.json({ error: message }, { status });
  }
}
