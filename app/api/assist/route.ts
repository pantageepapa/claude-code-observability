/**
 * POST /api/assist
 *
 * Streams Claude's response for AI-assisted file editing.
 * Accepts: { encodedPath, fileContent, history, userMessage }
 * Returns: chunked/streamed text (SSE-style content-type: text/plain; charset=utf-8)
 *
 * Security: validateScannablePath is called before any Anthropic API call.
 * The API key is only accessed server-side via process.env.ANTHROPIC_API_KEY.
 */

import { NextRequest } from "next/server";
import { decodePath, validateScannablePath } from "@/lib/encode";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an expert code editor assistant. \
The user will share a file's content and ask for edits or explanations. \
When you propose changes to the file, wrap each proposed edit in <edit>...</edit> tags. \
Inside the tags, provide the complete replacement text for the section being edited — \
not a diff, but the new text itself. \
Outside the tags, you may explain your reasoning, describe what changed, or answer questions. \
Be concise and precise.`;

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  encodedPath: string;
  fileContent: string;
  history: HistoryEntry[];
  userMessage: string;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === "user" || v.role === "assistant") &&
    typeof v.content === "string"
  );
}

function isRequestBody(value: unknown): value is RequestBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.encodedPath === "string" &&
    typeof v.fileContent === "string" &&
    Array.isArray(v.history) &&
    v.history.every(isHistoryEntry) &&
    typeof v.userMessage === "string"
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  // --- API key check (server-side only) ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 400 },
    );
  }

  // --- Parse body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRequestBody(body)) {
    return Response.json(
      {
        error:
          "Missing or invalid fields: encodedPath, fileContent, history, userMessage are required",
      },
      { status: 400 },
    );
  }

  const { encodedPath, fileContent, history, userMessage } = body;

  // --- Decode and validate path (security check before any API call) ---
  let realPath: string;
  try {
    realPath = decodePath(encodedPath);
  } catch {
    return Response.json({ error: "Invalid path encoding" }, { status: 400 });
  }

  if (!validateScannablePath(realPath)) {
    return Response.json({ error: "Path not allowed" }, { status: 400 });
  }

  // --- Build messages for Anthropic API ---
  // Prompt caching strategy:
  //   - System prompt: cached with cache_control (stable across requests)
  //   - File content block: cached with cache_control (stable within a session)
  //   - History messages: passed as-is (vary per session; not cached)
  //   - userMessage: NOT cached (changes every turn)

  // The system is provided as an array of content blocks so we can apply
  // cache_control to it per the Anthropic prompt caching API.
  const systemBlocks = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];

  // File content as a cached user-turn prefix block.
  // We inject this as the very first user message so the file stays cached
  // across turns (only the userMessage changes each turn).
  const fileContextBlock = {
    type: "text",
    text: `<file path="${realPath}">\n${fileContent}\n</file>`,
    cache_control: { type: "ephemeral" },
  };

  // Build the full messages array:
  //   [file-context-turn, ...history, current-user-message]
  // The file context is the first user turn; history alternates user/assistant.
  // Then the current userMessage is appended as the final user turn.
  // We merge the file context block with the first user history entry if the
  // history is empty, or prepend a synthetic user turn otherwise.
  const messages: Array<{
    role: "user" | "assistant";
    content: string | Array<{ type: string; text: string; cache_control?: { type: string } }>;
  }> = [];

  // First turn: file context (cached)
  messages.push({
    role: "user",
    content: [fileContextBlock],
  });

  // If there's history, add a synthetic assistant ack then the rest of history.
  // But we need proper alternation. If history[0] is user, we need an assistant
  // message after our synthetic file-context turn first.
  // Simplest approach: inject a minimal assistant ack after the file turn,
  // then replay history as-is. If history is empty, skip the ack.
  if (history.length > 0) {
    messages.push({
      role: "assistant",
      content: "I have reviewed the file. How can I help you?",
    });
    for (const entry of history) {
      messages.push({ role: entry.role, content: entry.content });
    }
  }

  // Current user message (NOT cached — varies every turn)
  // If history is empty the last pushed message was the file-context user turn,
  // so we need an assistant ack before adding the user message.
  if (history.length === 0) {
    messages.push({
      role: "assistant",
      content: "I have reviewed the file. How can I help you?",
    });
  }
  messages.push({ role: "user", content: userMessage });

  // --- Call Anthropic Streaming API ---
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        stream: true,
        system: systemBlocks,
        messages,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reach Anthropic API";
    return Response.json({ error: message }, { status: 502 });
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => "");
    return Response.json(
      { error: `Anthropic API error ${anthropicRes.status}: ${errText}` },
      { status: 502 },
    );
  }

  if (!anthropicRes.body) {
    return Response.json({ error: "No response body from Anthropic" }, { status: 502 });
  }

  // --- Stream SSE events from Anthropic → client ---
  // Anthropic returns SSE; we extract text_delta events and stream raw text
  // to the client as a chunked text/plain response. This keeps the client
  // simple (no SSE parsing needed) while still providing real-time chunks.
  const upstream = anthropicRes.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          // Keep the last (possibly incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(data) as Record<string, unknown>;
            } catch {
              continue;
            }

            // Extract text from content_block_delta events
            if (
              event.type === "content_block_delta" &&
              typeof event.delta === "object" &&
              event.delta !== null
            ) {
              const delta = event.delta as Record<string, unknown>;
              if (delta.type === "text_delta" && typeof delta.text === "string") {
                controller.enqueue(encoder.encode(delta.text));
              }
            }
          }
        }

        // Flush any remaining buffer
        if (buffer.startsWith("data: ")) {
          const data = buffer.slice(6).trim();
          if (data && data !== "[DONE]") {
            try {
              const event = JSON.parse(data) as Record<string, unknown>;
              if (
                event.type === "content_block_delta" &&
                typeof event.delta === "object" &&
                event.delta !== null
              ) {
                const delta = event.delta as Record<string, unknown>;
                if (delta.type === "text_delta" && typeof delta.text === "string") {
                  controller.enqueue(encoder.encode(delta.text));
                }
              }
            } catch {
              // ignore malformed trailing data
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
      // Prevent the response from being cached by the browser
      "Cache-Control": "no-store",
    },
  });
}
