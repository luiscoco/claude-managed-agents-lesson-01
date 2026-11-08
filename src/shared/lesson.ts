export const SDK_VERSION = "1.6.0";
export const BETA = "managed-agents-2026-04-01";
export const DEFAULT_MODEL = "claude-opus-5-5";
export const FIRST_PROMPT =
  "I have 30 minutes to learn Claude Managed Agents. Give me a three-step study plan covering agents, environments, and sessions. Keep it short.";
export const FOLLOWUP_PROMPT =
  "Keep the same plan, but add one practical exercise to step 2.";
export const AGENT_SYSTEM =
  "You are a patient course study coach. Explain Claude Managed Agents concepts with short numbered steps. Preserve context across turns. Never claim to have run code or created resources. No tools are needed for this lesson.";
export type Mode = "demo" | "live";
export type Stage = "agent" | "environment" | "session" | "events";
export interface Resources {
  agentId?: string;
  environmentId?: string;
}
export interface Turn {
  role: "user" | "assistant";
  text: string;
}
export interface SessionView {
  id: string;
  turns: Turn[];
  status: "idle" | "running" | "error";
  createdAt: string;
}
export interface LabState {
  mode: Mode;
  resources: Resources;
  sessions: SessionView[];
}
export interface TraceEvent {
  type: string;
  text: string;
  explanation: string;
  payload: Record<string, unknown>;
}
export type LabEvent =
  | { kind: "event"; event: TraceEvent }
  | { kind: "done"; status: "success" | "cancelled" | "error"; text: string }
  | { kind: "error"; text: string };
export const NAMESPACES = [
  {
    path: "client.beta.agents",
    name: "Agents",
    role: "Reusable behavior",
    description:
      "Create an agent definition once. Reuse its ID for more than one session.",
    scope: "This lesson",
    snippet:
      'const agent = await client.beta.agents.create({\n  name: "Study coach",\n  model,\n  system: AGENT_SYSTEM,\n  tools: [],\n});',
  },
  {
    path: "client.beta.environments",
    name: "Environments",
    role: "Runtime configuration",
    description:
      "Define the cloud sandbox configuration once. Each session receives its own execution context.",
    scope: "This lesson",
    snippet:
      'const environment = await client.beta.environments.create({\n  name: "Lesson 01",\n  config: { type: "cloud" },\n});',
  },
  {
    path: "client.beta.sessions",
    name: "Sessions",
    role: "One ongoing task",
    description:
      "Connect an agent and an environment. Keep the session ID to continue the same conversation.",
    scope: "This lesson",
    snippet:
      "const session = await client.beta.sessions.create({\n  agent: agent.id,\n  environment_id: environment.id,\n});",
  },
  {
    path: "client.beta.sessions.events",
    name: "Session events",
    role: "Input and observation",
    description:
      "Open the stream, send a user message, and observe activity. Inspect the idle stop reason before continuing.",
    scope: "This lesson",
    snippet:
      'const stream = await client.beta.sessions.events.stream(session.id);\ntry {\n  await client.beta.sessions.events.send(session.id, {\n    events: [{ type: "user.message",\n      content: [{ type: "text", text: prompt }] }],\n  });\n  for await (const event of stream) {\n    if (event.type === "session.status_idle") break;\n  }\n} finally { stream.controller.abort(); }',
  },
  {
    path: "client.beta.sessions.threads",
    name: "Threads",
    role: "Conversation branches",
    description: "Organize distinct histories inside a parent session.",
    scope: "Lesson 06",
  },
  {
    path: "client.beta.sessions.resources",
    name: "Session resources",
    role: "External context",
    description:
      "Attach supported files, repositories, or memory to a session.",
    scope: "Lesson 07",
  },
  {
    path: "client.beta.vaults",
    name: "Vaults",
    role: "Credentials",
    description:
      "Keep authentication material separate from prompts and ordinary knowledge.",
    scope: "Lesson 08",
  },
  {
    path: "client.beta.memory_stores",
    name: "Memory stores",
    role: "Durable knowledge",
    description:
      "Retain appropriate non-sensitive context for future sessions.",
    scope: "Lesson 09",
  },
  {
    path: "client.beta.deployments",
    name: "Deployments",
    role: "Recurring runs",
    description:
      "Configure scheduled execution separately from an individual session.",
    scope: "Lesson 10",
  },
] as const;
export const QUESTIONS = [
  {
    question:
      "You start a second task with the same setup. What should you reuse?",
    answers: [
      "The first session for every unrelated task",
      "The agent and environment IDs",
      "The first answer as the API key",
    ],
    correct: 1,
    explanation:
      "Agents and environments are reusable configuration. Create another session for a separate conversation.",
  },
  {
    question:
      "A session was created without initial_events. What starts the work?",
    answers: [
      "Retrieving the session",
      "Listing agents",
      "Sending a user.message event",
    ],
    correct: 2,
    explanation:
      "In this two-step example, creation connects the resources. Sending input starts the agent turn.",
  },
  {
    question: "Where does the Anthropic API key belong?",
    answers: [
      "In the Node server environment",
      "In the browser localStorage",
      "Inside a prompt",
    ],
    correct: 0,
    explanation:
      "The server owns the SDK client and secret. The browser receives only teaching data.",
  },
  {
    question: "What does an idle session status mean after an answer?",
    answers: [
      "The session can never be used again",
      "This turn has stopped; the session can accept more input",
      "The environment has been deleted",
    ],
    correct: 1,
    explanation:
      "Turn completion and session retirement are different. Continue the same session to preserve conversation context.",
  },
  {
    question: "Does a memory store need to be created to complete Lesson 1?",
    answers: [
      "No; this lab needs only agent, environment, session, and events",
      "Yes; all namespaces are required",
      "Yes; API keys belong in memory",
    ],
    correct: 0,
    explanation:
      "Start with the smallest complete flow. Later lessons introduce supporting capabilities.",
  },
] as const;
