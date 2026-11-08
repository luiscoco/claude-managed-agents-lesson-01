import Anthropic from "@anthropic-ai/sdk";
import { AGENT_SYSTEM, DEFAULT_MODEL, FIRST_PROMPT } from "../shared/lesson.js";

try {
  process.loadEnvFile();
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
if (!process.env.ANTHROPIC_API_KEY)
  throw new Error(
    "Set ANTHROPIC_API_KEY in .env first. This example makes real, billable Managed Agents requests.",
  );
const client = new Anthropic({ maxRetries: 1 });
// Supply both IDs to reuse resources; otherwise this standalone example creates them.
const agentId =
  process.env.MANAGED_AGENT_ID ||
  (
    await client.beta.agents.create({
      name: "Lesson 1 study coach",
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      system: AGENT_SYSTEM,
      tools: [],
    })
  ).id;
const environmentId =
  process.env.MANAGED_ENVIRONMENT_ID ||
  (await client.beta.environments.create({ name: "Lesson 1 classroom" })).id;
const session = await client.beta.sessions.create({
  agent: agentId,
  environment_id: environmentId,
});
console.log({ agentId, environmentId, sessionId: session.id });
const signal = AbortSignal.timeout(120_000);
// Open first: this endpoint delivers future events, not old history.
const stream = await client.beta.sessions.events.stream(
  session.id,
  {},
  { signal },
);
let complete = false;
try {
  await client.beta.sessions.events.send(
    session.id,
    {
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: FIRST_PROMPT }],
        },
      ],
    },
    { signal },
  );
  for await (const event of stream) {
    console.log(event);
    if (event.type === "session.status_idle") {
      if (event.stop_reason.type !== "end_turn")
        throw new Error(`Turn stopped: ${event.stop_reason.type}`);
      complete = true;
      break;
    }
    if (
      event.type === "session.error" ||
      event.type === "session.status_terminated"
    )
      throw new Error(event.type);
  }
  if (!complete) throw new Error("Stream ended before turn completion.");
} catch (error) {
  await client.beta.sessions.events
    .send(
      session.id,
      { events: [{ type: "user.interrupt" }] },
      { timeout: 10_000, maxRetries: 0 },
    )
    .catch(() => {});
  throw error;
} finally {
  stream.controller.abort();
}
console.log(
  "Reuse the session ID for follow-ups; reuse agent and environment IDs for new sessions.",
);
