import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { LiveProvider } from "../src/server/lab.js";
import { BETA, FIRST_PROMPT } from "../src/shared/lesson.js";

test("official SDK transport opens the stream before sending and uses the Managed Agents API", async () => {
  const calls: {
    url: string;
    method: string;
    body: Record<string, unknown>;
    beta: string | null;
  }[] = [];
  const events = [
    {
      id: "evt1",
      type: "user.message",
      content: [{ type: "text", text: FIRST_PROMPT }],
    },
    {
      id: "evt2",
      type: "agent.message",
      content: [{ type: "text", text: "Study plan" }],
    },
    {
      id: "evt3",
      type: "session.status_idle",
      stop_reason: { type: "end_turn" },
    },
  ];
  const client = new Anthropic({
    apiKey: "test-placeholder",
    maxRetries: 0,
    fetch: async (input, init) => {
      const req = new Request(input, init);
      const url = new URL(req.url);
      const body =
        req.method === "POST"
          ? ((await req.json()) as Record<string, unknown>)
          : {};
      calls.push({
        url: url.pathname,
        method: req.method,
        body,
        beta: req.headers.get("anthropic-beta"),
      });
      if (url.pathname.endsWith("/events/stream"))
        return new Response(
          events
            .map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)
            .join(""),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      const result = url.pathname.endsWith("/agents")
        ? { id: "agent-1" }
        : url.pathname.endsWith("/environments")
          ? { id: "env-1" }
          : url.pathname.endsWith("/sessions")
            ? { id: "session-1" }
            : { events: [] };
      return Response.json(result);
    },
  });
  const p = new LiveProvider(client);
  const agentId = await p.agent(),
    environmentId = await p.environment();
  const id = await p.session({ agentId, environmentId });
  const got = [];
  for await (const event of p.turn(
    id,
    FIRST_PROMPT,
    new AbortController().signal,
  ))
    got.push(event.type);
  assert.deepEqual(got, [
    "user.message",
    "agent.message",
    "session.status_idle",
  ]);
  const open = calls.findIndex((c) => c.url.endsWith("/events/stream")),
    send = calls.findIndex((c) => c.url.endsWith("/events"));
  assert.ok(open < send, "event stream must be open before input is sent");
  assert.ok(calls.every((c) => c.beta?.includes(BETA)));
  assert.ok(calls.every((c) => !c.url.includes("/messages")));
  assert.deepEqual(calls.find((c) => c.url.endsWith("/sessions"))!.body, {
    agent: "agent-1",
    environment_id: "env-1",
  });
  assert.deepEqual(calls[send].body, {
    events: [
      { type: "user.message", content: [{ type: "text", text: FIRST_PROMPT }] },
    ],
  });
  await p.interrupt(id);
  assert.deepEqual(calls.at(-1)!.body, {
    events: [{ type: "user.interrupt" }],
  });
});
