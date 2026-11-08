import Anthropic from "@anthropic-ai/sdk";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  AGENT_SYSTEM,
  DEFAULT_MODEL,
  FIRST_PROMPT,
  FOLLOWUP_PROMPT,
  type LabEvent,
  type LabState,
  type Mode,
  type Resources,
  type SessionView,
} from "../shared/lesson.js";

export interface Provider {
  agent(): Promise<string>;
  environment(): Promise<string>;
  session(resources: Resources): Promise<string>;
  turn(
    id: string,
    prompt: string,
    signal: AbortSignal,
  ): AsyncIterable<Record<string, unknown>>;
  interrupt(id: string): Promise<void>;
}
export class LiveProvider implements Provider {
  constructor(
    private client: Anthropic,
    private model = DEFAULT_MODEL,
  ) {}
  async agent() {
    return (
      await this.client.beta.agents.create({
        name: "Lesson 1 study coach",
        model: this.model,
        system: AGENT_SYSTEM,
        tools: [],
      })
    ).id;
  }
  async environment() {
    return (
      await this.client.beta.environments.create({
        name: "Lesson 1 learning environment",
      })
    ).id;
  }
  async session(r: Resources) {
    return (
      await this.client.beta.sessions.create({
        agent: r.agentId!,
        environment_id: r.environmentId!,
      })
    ).id;
  }
  async *turn(id: string, prompt: string, signal: AbortSignal) {
    // The stream only delivers future events. Open it BEFORE sending the message
    // so a quick response cannot be missed between the send and stream requests.
    const seen = new Set<string>();
    const stream = await this.client.beta.sessions.events.stream(
      id,
      {},
      { signal },
    );
    try {
      await this.client.beta.sessions.events.send(
        id,
        {
          events: [
            { type: "user.message", content: [{ type: "text", text: prompt }] },
          ],
        },
        { signal },
      );
      for await (const e of stream) {
        if ("id" in e && typeof e.id === "string") {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
        }
        yield e as unknown as Record<string, unknown>;
        if (
          e.type === "session.status_idle" ||
          e.type === "session.status_terminated" ||
          e.type === "session.error"
        )
          return;
      }
    } finally {
      stream.controller.abort();
    }
  }
  async interrupt(id: string) {
    await this.client.beta.sessions.events.send(
      id,
      { events: [{ type: "user.interrupt" }] },
      { timeout: 10_000, maxRetries: 0 },
    );
  }
}
const ANSWER =
  "1. Agent: define the study coach’s reusable instructions.\n2. Environment: choose the reusable cloud sandbox configuration.\n3. Session: start a conversation, send a user.message, and observe events until the turn ends.";
export class DemoProvider implements Provider {
  count = 0;
  async agent() {
    return "demo_agent_study_coach";
  }
  async environment() {
    return "demo_environment_classroom";
  }
  async session() {
    return `demo_session_${++this.count}`;
  }
  async *turn(_id: string, prompt: string, signal: AbortSignal) {
    const text =
      prompt === FOLLOWUP_PROMPT
        ? ANSWER.replace(
            "choose the reusable cloud sandbox configuration.",
            "choose the reusable cloud sandbox configuration. Exercise: create a second session with the same agent and environment IDs, then compare session IDs.",
          )
        : ANSWER;
    for (const event of [
      { type: "user.message", content: [{ type: "text", text: prompt }] },
      { type: "session.status_running" },
      { type: "agent.message", content: [{ type: "text", text }] },
      {
        type: "session.status_idle",
        stop_reason: { type: "end_turn" },
        stop_details: null,
      },
    ]) {
      await new Promise<void>((resolve, reject) => {
        const done = () => {
          signal.removeEventListener("abort", abort);
          resolve();
        };
        const timer = setTimeout(done, 300);
        const abort = () => {
          clearTimeout(timer);
          reject(new Error("Interrupted"));
        };
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort, { once: true });
      });
      yield event;
    }
  }
  async interrupt() {}
}
export function eventText(e: Record<string, unknown>): string {
  return Array.isArray(e.content)
    ? e.content
        .filter((b) => b?.type === "text")
        .map((b) => String(b.text))
        .join("\n")
    : "";
}
export const explanations: Record<string, string> = {
  "user.message": "Input is now part of this session’s history.",
  "session.status_running":
    "The managed runtime is processing the task in the cloud.",
  "agent.message":
    "The agent produced a complete response. Wait for the turn status before declaring success.",
  "session.status_idle":
    "The session paused. An end_turn reason means it is ready for your next message.",
  "session.status_terminated":
    "This session has terminated; it cannot continue normally.",
  "agent.thinking": "A progress signal; it does not expose private reasoning.",
};
export class Lab {
  readonly states: Record<Mode, LabState> = {
    demo: { mode: "demo", resources: {}, sessions: [] },
    live: { mode: "live", resources: {}, sessions: [] },
  };
  private active = new Map<string, AbortController>();
  private setupJobs = new Map<Mode, Promise<Resources>>();
  constructor(
    private providers: Partial<Record<Mode, Provider>>,
    private dataDir?: string,
  ) {}
  private provider(mode: Mode) {
    const p = this.providers[mode];
    if (!p)
      throw new Error("Live mode requires ANTHROPIC_API_KEY on the server.");
    return p;
  }
  async load() {
    if (!this.dataDir) return;
    try {
      const r = JSON.parse(
        await readFile(`${this.dataDir}/resources.json`, "utf8"),
      );
      if (typeof r.agentId === "string")
        this.states.live.resources.agentId = r.agentId;
      if (typeof r.environmentId === "string")
        this.states.live.resources.environmentId = r.environmentId;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  async setup(mode: Mode): Promise<Resources> {
    const existing = this.setupJobs.get(mode);
    if (existing) return existing;
    const job = (async () => {
      const p = this.provider(mode),
        r = this.states[mode].resources;
      const save = async () => {
        if (mode === "live" && this.dataDir) {
          await mkdir(this.dataDir, { recursive: true });
          await writeFile(
            `${this.dataDir}/resources.json`,
            JSON.stringify(r, null, 2),
          );
        }
      };
      if (!r.agentId) {
        r.agentId = await p.agent();
        await save();
      }
      if (!r.environmentId) {
        r.environmentId = await p.environment();
        await save();
      }
      return r;
    })();
    this.setupJobs.set(mode, job);
    try {
      return await job;
    } finally {
      this.setupJobs.delete(mode);
    }
  }
  async create(mode: Mode) {
    const r = this.states[mode].resources;
    if (!r.agentId || !r.environmentId)
      throw new Error("Create the agent and environment first.");
    const session: SessionView = {
      id: await this.provider(mode).session(r),
      turns: [],
      status: "idle",
      createdAt: new Date().toISOString(),
    };
    this.states[mode].sessions.push(session);
    return session;
  }
  find(mode: Mode, id: string) {
    const s = this.states[mode].sessions.find((s) => s.id === id);
    if (!s) throw new Error("Session does not belong to this app and mode.");
    return s;
  }
  async stop(mode: Mode, id: string) {
    this.find(mode, id);
    const controller = this.active.get(id);
    if (!controller) return;
    try {
      await this.provider(mode).interrupt(id);
    } finally {
      controller.abort();
    }
  }
  async run(
    mode: Mode,
    id: string,
    prompt: string,
    emit: (event: LabEvent) => void,
  ) {
    const s = this.find(mode, id);
    if (s.status === "running")
      throw new Error("A turn is already running in this session.");
    if (
      mode === "demo" &&
      prompt !== FIRST_PROMPT &&
      prompt !== FOLLOWUP_PROMPT
    )
      throw new Error("Demo mode only replays the two supplied prompts.");
    const controller = new AbortController();
    this.active.set(id, controller);
    s.status = "running";
    const timeout = setTimeout(() => {
      void this.provider(mode)
        .interrupt(id)
        .catch(() => {});
      controller.abort(new Error("Turn timed out after 120 seconds."));
    }, 120_000);
    s.turns.push({ role: "user", text: prompt });
    let complete = false;
    try {
      for await (const payload of this.provider(mode).turn(
        id,
        prompt,
        controller.signal,
      )) {
        const type = String(payload.type),
          text = eventText(payload);
        emit({
          kind: "event",
          event: {
            type,
            text,
            explanation:
              explanations[type] ?? "An event from the managed session.",
            payload,
          },
        });
        if (type === "agent.message" && text)
          s.turns.push({ role: "assistant", text });
        if (type === "session.status_idle") {
          const reason = (payload.stop_reason as { type?: string } | undefined)
            ?.type;
          if (reason !== "end_turn")
            throw new Error(
              `Session paused with reason: ${reason ?? "unknown"}. Inspect its event payload.`,
            );
          complete = true;
          break;
        }
        if (type === "session.error" || type === "session.status_terminated")
          throw new Error(`Managed session reported ${type}.`);
      }
      if (!complete)
        throw new Error(
          "Event stream ended before an end_turn status. Check the session before retrying.",
        );
      s.status = "idle";
      emit({
        kind: "done",
        status: "success",
        text: "Turn complete. This session is ready for a follow-up.",
      });
    } catch (error) {
      s.status = "error";
      emit({
        kind: "done",
        status: controller.signal.aborted ? "cancelled" : "error",
        text: controller.signal.aborted
          ? "Observation stopped. An interrupt was requested; inspect the cloud session before retrying."
          : safeError(error),
      });
    } finally {
      clearTimeout(timeout);
      this.active.delete(id);
    }
  }
}
export function safeError(error: unknown) {
  if (error instanceof Anthropic.APIError)
    return `Anthropic API request failed (${error.status ?? "network error"}). Check server credentials, Managed Agents access, model availability, and limits.`;
  return error instanceof Error ? error.message : "The operation failed.";
}
