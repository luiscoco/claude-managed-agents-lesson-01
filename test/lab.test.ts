import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DemoProvider, Lab, type Provider } from "../src/server/lab.js";
import {
  FIRST_PROMPT,
  FOLLOWUP_PROMPT,
  type LabEvent,
} from "../src/shared/lesson.js";

test("two conversations reuse configuration, while follow-ups retain the same history", async () => {
  const lab = new Lab({ demo: new DemoProvider() });
  await assert.rejects(() => lab.create("demo"), /agent and environment first/);
  const [a, b] = await Promise.all([lab.setup("demo"), lab.setup("demo")]);
  assert.equal(a.agentId, b.agentId);
  const one = await lab.create("demo");
  const events: LabEvent[] = [];
  await lab.run("demo", one.id, FIRST_PROMPT, (e) => events.push(e));
  await lab.run("demo", one.id, FOLLOWUP_PROMPT, (e) => events.push(e));
  assert.equal(one.turns.length, 4);
  assert.match(one.turns[3].text, /Exercise:/);
  const two = await lab.create("demo");
  assert.notEqual(one.id, two.id);
  assert.equal(two.turns.length, 0);
  assert.equal(lab.states.demo.resources.agentId, a.agentId);
  assert.equal(events.at(-1)?.kind, "done");
  assert.throws(() => lab.find("live", one.id), /does not belong/);
  await assert.rejects(
    () => lab.run("demo", two.id, "Arbitrary demo input", () => {}),
    /only replays/,
  );
});
const provider = (events: Record<string, unknown>[]): Provider => ({
  async agent() {
    return "a";
  },
  async environment() {
    return "e";
  },
  async session() {
    return "s";
  },
  async interrupt() {},
  async *turn() {
    yield* events;
  },
});
for (const [name, events] of [
  [
    "premature disconnect",
    [
      {
        type: "agent.message",
        content: [{ type: "text", text: "partial answer" }],
      },
    ],
  ],
  [
    "budget reached",
    [{ type: "session.status_idle", stop_reason: { type: "budget_reached" } }],
  ],
  ["session failure", [{ type: "session.error" }]],
] as const)
  test(`${name} must not be presented as a successful turn`, async () => {
    const lab = new Lab({ live: provider([...events]) });
    await lab.setup("live");
    const s = await lab.create("live");
    const out: LabEvent[] = [];
    await lab.run("live", s.id, "hello", (e) => out.push(e));
    assert.equal(s.status, "error");
    assert.deepEqual(out.at(-1)?.kind, "done");
    assert.equal((out.at(-1) as { status: string }).status, "error");
  });
test("interrupt cancels a pending turn and prevents concurrent input", async () => {
  const p = provider([]);
  let interrupted = false;
  p.interrupt = async () => {
    interrupted = true;
  };
  p.turn = async function* (_id, _prompt, signal) {
    await new Promise<void>((_, reject) =>
      signal.addEventListener("abort", () => reject(new Error("stop")), {
        once: true,
      }),
    );
    yield { type: "unreachable" };
  };
  const lab = new Lab({ live: p });
  await lab.setup("live");
  const s = await lab.create("live");
  const out: LabEvent[] = [];
  const run = lab.run("live", s.id, "hello", (e) => out.push(e));
  await assert.rejects(
    () => lab.run("live", s.id, "again", () => {}),
    /already running/,
  );
  await lab.stop("live", s.id);
  await run;
  assert.equal(interrupted, true);
  assert.equal((out.at(-1) as { status: string }).status, "cancelled");
});
test("live resource IDs survive restart; partial setup does not duplicate the agent", async () => {
  const dir = await mkdtemp(join(tmpdir(), "managed-lesson-test-"));
  const p = provider([]);
  let count = 0,
    fail = true;
  p.agent = async () => {
    count++;
    return "saved-agent";
  };
  p.environment = async () => {
    if (fail) throw new Error("environment unavailable");
    return "saved-env";
  };
  try {
    const first = new Lab({ live: p }, dir);
    await assert.rejects(() => first.setup("live"));
    fail = false;
    const restarted = new Lab({ live: p }, dir);
    await restarted.load();
    await restarted.setup("live");
    assert.equal(count, 1);
    assert.equal(restarted.states.live.resources.environmentId, "saved-env");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
