import "./style.css";
import {
  createCodeBlock,
  highlightCodeElements,
  renderResponse,
} from "./formatting.js";
import exampleCode from "../examples/first-session.ts?raw";
import { createWorkflowGuide } from "./workflow.js";
import {
  BETA,
  FIRST_PROMPT,
  FOLLOWUP_PROMPT,
  NAMESPACES,
  QUESTIONS,
  SDK_VERSION,
  type LabEvent,
  type LabState,
  type Mode,
} from "../shared/lesson.js";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<a class="skip" href="#main">Skip to lesson</a>
<header class="top"><a class="brand" href="/" aria-label="First Session Lab home"><span class="brand-mark">&lt;/&gt;</span><span>Claude Managed Agents <small>Practical course · Lesson 01</small></span></a><div class="header-actions"><span class="badge">TypeScript SDK ${SDK_VERSION}</span><a class="source" href="https://github.com/luiscoco/claude-managed-agents-lesson-01" target="_blank" rel="noreferrer">Source ↗</a><div class="size" role="group" aria-label="Text size"><button id="comfortable" aria-pressed="true">Comfortable</button><button id="larger" aria-pressed="false">Larger</button></div></div></header>
<main id="main" class="container"><section class="hero"><div><p class="eyebrow">LESSON 01 / OVERVIEW & SETUP</p><h1>Your first session.<br><em>Made visible.</em></h1><p class="intro">Build a study coach. See how a reusable agent, a cloud environment, and a persistent session work together.</p><div class="chips"><span>① Create</span><span>② Send</span><span>③ Observe</span><span>④ Continue</span></div></div><figure class="mascot"><img src="/course-astronaut.png" width="220" height="287" alt="Course astronaut mascot"><figcaption>One small session.<br>A complete managed flow.</figcaption></figure></section>
<details class="focus"><summary>Lesson focus & author <span>What you will learn</span></summary><div><p><strong>By the end:</strong> create your first session, explain which IDs are reusable, read an event stream, and continue a conversation without starting over.</p><p>Practical application by <strong>Luis Coco Enríquez</strong>. Inspired by the visual and teaching structure of the Claude Agent SDK course; this application uses Claude Managed Agents through the official Anthropic TypeScript SDK.</p></div></details>
<nav class="tabs" role="tablist" aria-label="Lesson activities"><button role="tab" id="tab-lab" aria-controls="panel-lab" aria-selected="true">01 · First session</button><button role="tab" id="tab-map" aria-controls="panel-map" aria-selected="false" tabindex="-1">02 · API map</button><button role="tab" id="tab-how" aria-controls="panel-how" aria-selected="false" tabindex="-1">03 · How it works</button><button role="tab" id="tab-quiz" aria-controls="panel-quiz" aria-selected="false" tabindex="-1">04 · Check understanding</button></nav>
<section role="tabpanel" id="panel-lab" aria-labelledby="tab-lab"><div class="section-heading"><div><p class="eyebrow">THE PRACTICAL EXAMPLE</p><h2>A 30-minute study plan</h2><p>First run the walkthrough. Then continue the conversation and compare a second session.</p></div><span class="lesson-number">01</span></div>
<div class="flow" aria-label="Managed Agents lifecycle">${[
  ["agent", "Agent", "Reusable instructions"],
  ["environment", "Environment", "Reusable configuration"],
  ["session", "Session", "One conversation"],
  ["events", "Events", "Input → response"],
]
  .map(
    ([id, name, desc], i) =>
      `<div id="stage-${id}" class="flow-card"><span>${i + 1}</span><strong>${name}</strong><small>${desc}</small></div>`,
  )
  .join("")}</div>
<div class="workspace"><aside class="panel controls"><h3>Run the study coach</h3><label for="mode">Choose an execution mode</label><select id="mode"><option value="demo">Guided demo · no API key</option><option value="live" disabled>Live · checking configuration…</option></select><p id="mode-note" class="note">A fixed, simulated replay of two supplied prompts. No AI request or cloud resource is created.</p><button id="walkthrough" class="primary">▶ Run guided walkthrough</button><details class="manual"><summary>Or step through manually</summary><div class="button-stack"><button id="setup">1. Create / reuse resources</button><button id="new-session">2. Start a new session</button><button id="send">3. Send message</button></div></details><label for="prompt">Your first message</label><textarea id="prompt" rows="6" maxlength="2000" readonly></textarea><div class="actions"><button id="followup">Continue this session</button><button id="stop" class="danger" disabled>Stop turn</button></div><p class="note">Follow-up: “${FOLLOWUP_PROMPT}”</p><p id="status" class="status" role="status">Ready for the walkthrough.</p></aside>
<div class="observations"><section class="panel resources"><div class="panel-heading"><h3>Watch the IDs</h3><span class="badge">Reuse vs. new</span></div><dl><dt>Agent · reuse</dt><dd id="agent-id">Not created yet</dd><dt>Environment · reuse</dt><dd id="environment-id">Not created yet</dd><dt>Session · one conversation</dt><dd id="session-id">Not created yet</dd></dl><label for="session-select">Inspect a session</label><select id="session-select"><option value="">No sessions yet</option></select><p class="note">New session → new ID and conversation. The agent and environment IDs stay the same.</p></section><section class="panel timeline-panel"><div class="panel-heading"><h3>Session event timeline</h3><span id="event-count" class="badge">0 events</span></div><p id="timeline-empty" class="empty">Run the walkthrough to reveal the message and lifecycle events.</p><ol id="timeline" class="timeline" aria-label="Session event timeline"></ol></section></div></div>
<section class="panel answer"><div class="panel-heading"><h3>The conversation</h3><span class="badge">Same session, retained context</span></div><div id="conversation"><p class="empty">Your study plan will appear here.</p></div></section><div class="teaching-callout"><strong>Try this next</strong><p>Continue this session to add an exercise to step 2. Then start a new session from the manual controls. Compare the three IDs and explain which context belongs to the session.</p></div></section>
<section role="tabpanel" id="panel-map" aria-labelledby="tab-map" hidden><div class="section-heading"><div><p class="eyebrow">THE PACKAGE MAP</p><h2>Four pieces make the first flow.</h2><p>The remaining namespaces extend the same managed runtime in later lessons.</p></div></div><div class="namespace-grid" id="namespace-grid"></div><div class="teaching-callout"><strong>Beta API, explicit contract</strong><p>This app pins @anthropic-ai/sdk ${SDK_VERSION}. Its managed endpoint methods send <code>${BETA}</code> automatically. Keep the SDK version and beta API contract aligned when upgrading.</p></div></section>
<section role="tabpanel" id="panel-how" aria-labelledby="tab-how" hidden><div class="section-heading"><div><p class="eyebrow">FOLLOW THE REQUEST</p><h2>A small host. A managed runtime.</h2><p>The browser teaches the flow. Claude Managed Agents executes the agent in the cloud.</p></div></div><div class="architecture"><div><strong>Browser</strong><small>Controls + event timeline</small></div><span aria-hidden="true">→</span><div><strong>Node server</strong><small>API key + official SDK</small></div><span aria-hidden="true">→</span><div><strong>Managed Agents</strong><small>Agent + sandbox + session</small></div></div><div class="two-columns"><article class="panel"><h3>1. Set up locally</h3><pre><code>npm ci\ncopy .env.example .env\n# Set ANTHROPIC_API_KEY in .env\nnpm run dev</code></pre><p>Open <code>http://127.0.0.1:4321</code>. The demo works without a key. Live mode requires a key with Managed Agents access and creates billable cloud resources.</p><p>Optional <code>MANAGED_AGENT_ID</code> and <code>MANAGED_ENVIRONMENT_ID</code> reuse existing resources. Created IDs are saved under <code>.data/</code>; secrets are never saved there.</p></article><article class="panel"><h3>2. Understand the boundaries</h3><ul><li><strong>Agent:</strong> reusable model and instructions.</li><li><strong>Environment:</strong> reusable sandbox configuration; each session gets its own runtime context.</li><li><strong>Session:</strong> server-side conversation history and activity.</li><li><strong>Events:</strong> input and progress, plus a structured stop reason.</li></ul><p>The API key stays in Node. No local Claude agent process or Claude Agent SDK is used.</p></article></div><article class="panel code-example"><h3>3. Trace the smallest complete request</h3><p>This runnable example is in <code>src/examples/first-session.ts</code>. The web app additionally validates input, opens the stream before sending input, and supports interruption.</p><pre><code id="quickstart-code"></code></pre></article><div class="two-columns"><article class="panel"><h3>4. Read the outcome</h3><p><code>session.status_running</code> means work is happening. <code>agent.message</code> is output. Wait for <code>session.status_idle</code> and inspect <code>stop_reason.type</code>.</p><p><code>end_turn</code> means the turn completed. Budget, refusal, retries, or required action need attention. Idle alone does not mean success.</p></article><article class="panel"><h3>5. Continue or start fresh</h3><p>Send the follow-up to the <strong>same session ID</strong> to retain the plan. Create a <strong>new session</strong> for another task while reusing the agent and environment.</p><p>The app retains its session selector until the Node server restarts. Managed sessions live in the cloud; restarting this UI does not delete them.</p></article></div><p class="source-links">Official references: <a href="https://platform.claude.com/docs/en/managed-agents/quickstart" target="_blank" rel="noreferrer">Quickstart ↗</a> · <a href="https://platform.claude.com/docs/en/managed-agents/sessions" target="_blank" rel="noreferrer">Sessions & events ↗</a></p></section>
<section role="tabpanel" id="panel-quiz" aria-labelledby="tab-quiz" hidden><div class="section-heading"><div><p class="eyebrow">RETRIEVE, THEN APPLY</p><h2>Can you explain the flow?</h2><p>Answer five questions, then complete the practical challenge.</p></div><span id="score" class="badge">0 / 5 answered</span></div><div id="quiz"></div><div class="teaching-callout"><h3>Your practical challenge</h3><ol><li>Run the coach and note all three resource IDs.</li><li>Add an exercise using the same session. Explain why the plan remains available.</li><li>Create a second session. Identify the IDs that changed and those that stayed the same.</li><li>Find the final idle event and explain its stop reason.</li></ol><p><strong>Expected observation:</strong> one reusable agent, one reusable environment, two session IDs, and separate conversations.</p></div></section>
<footer><span>Claude Managed Agents · Lesson 01</span><span>Luis Coco Enríquez · Learn by inspecting.</span></footer></main>`;
$<HTMLTextAreaElement>("prompt").value = FIRST_PROMPT;
$("quickstart-code").textContent = exampleCode;
$("quickstart-code").dataset.language = "typescript";
document.querySelector<HTMLElement>("#panel-how pre code")!.dataset.language =
  "powershell";
for (const ns of NAMESPACES) {
  const card = document.createElement("article");
  card.className = `panel namespace ${ns.scope === "This lesson" ? "current" : ""}`;
  const scope = document.createElement("span");
  scope.className = "badge";
  scope.textContent = ns.scope;
  const h = document.createElement("h3");
  h.textContent = ns.name;
  const path = document.createElement("code");
  path.textContent = ns.path;
  const p = document.createElement("p");
  p.textContent = ns.description;
  card.append(scope, h, path, p);
  const d = document.createElement("details");
  const s = document.createElement("summary");
  s.textContent = "Inspect the API call";
  const pre = createCodeBlock(ns.snippet, "typescript");
  d.append(s, pre);
  card.append(d);
  $("namespace-grid").append(card);
}
document
  .querySelector("#panel-how .architecture")!
  .replaceWith(createWorkflowGuide());
highlightCodeElements(document);
const answered = new Map<number, boolean>();
QUESTIONS.forEach((q, i) => {
  const field = document.createElement("fieldset");
  field.className = "panel question";
  const legend = document.createElement("legend");
  legend.textContent = `${i + 1}. ${q.question}`;
  field.append(legend);
  const feedback = document.createElement("p");
  feedback.className = "feedback";
  feedback.setAttribute("aria-live", "polite");
  q.answers.forEach((a, index) => {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `q-${i}`;
    radio.value = String(index);
    label.append(radio, document.createTextNode(a));
    radio.addEventListener("change", () => {
      const correct = index === q.correct;
      answered.set(i, correct);
      feedback.textContent = `${correct ? "Correct." : "Try again."} ${q.explanation}`;
      feedback.classList.toggle("correct", correct);
      $("score").textContent =
        `${[...answered.values()].filter(Boolean).length} / 5 correct`;
    });
    field.append(label);
  });
  field.append(feedback);
  $("quiz").append(field);
});
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
function activate(tab: HTMLButtonElement) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.setAttribute("aria-selected", String(active));
    t.tabIndex = active ? 0 : -1;
    $(t.getAttribute("aria-controls")!).hidden = !active;
  });
}
tabs.forEach((tab, i) => {
  tab.onclick = () => activate(tab);
  tab.onkeydown = (e) => {
    let next: number | undefined;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (i + tabs.length - 1) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next !== undefined) {
      e.preventDefault();
      activate(tabs[next]);
      tabs[next].focus();
    }
  };
});
function setSize(size: string) {
  document.documentElement.dataset.text = size;
  for (const id of ["comfortable", "larger"])
    $(id).setAttribute("aria-pressed", String(id === size));
  try {
    localStorage.setItem("lesson-text-size", size);
  } catch {}
}
try {
  setSize(
    localStorage.getItem("lesson-text-size") === "larger"
      ? "larger"
      : "comfortable",
  );
} catch {}
$("comfortable").onclick = () => setSize("comfortable");
$("larger").onclick = () => setSize("larger");
let mode: Mode = "demo",
  state: LabState = { mode: "demo", resources: {}, sessions: [] },
  selected = "",
  busy = false,
  observingTurn = false;
const traces = new Map<string, LabEvent[]>();
async function api(path: string, body?: unknown) {
  const response = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}
function status(text: string) {
  $("status").textContent = text;
}
function render() {
  $("agent-id").textContent = state.resources.agentId ?? "Not created yet";
  $("environment-id").textContent =
    state.resources.environmentId ?? "Not created yet";
  $("session-id").textContent = selected || "Not created yet";
  const select = $<HTMLSelectElement>("session-select");
  select.replaceChildren();
  if (!state.sessions.length) select.add(new Option("No sessions yet", ""));
  state.sessions.forEach((s, i) =>
    select.add(new Option(`Session ${i + 1} · ${s.id}`, s.id)),
  );
  select.value = selected;
  const session = state.sessions.find((s) => s.id === selected);
  $("conversation").replaceChildren();
  if (!session?.turns.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Your study plan will appear here.";
    $("conversation").append(p);
  } else
    for (const turn of session.turns) {
      const a = document.createElement("article");
      a.className = `turn ${turn.role}`;
      const h = document.createElement("strong");
      h.textContent = turn.role === "user" ? "You" : "Study coach";
      const content =
        turn.role === "assistant"
          ? renderResponse(turn.text)
          : document.createElement("p");
      if (turn.role === "user") content.textContent = turn.text;
      a.append(h, content);
      $("conversation").append(a);
    }
  $("timeline").replaceChildren();
  const events = traces.get(selected) ?? [];
  events.forEach(drawEvent);
  $("timeline-empty").hidden = events.length > 0;
  $("event-count").textContent =
    `${events.filter((e) => e.kind === "event").length} events`;
  for (const id of [
    "walkthrough",
    "setup",
    "new-session",
    "send",
    "followup",
    "mode",
    "session-select",
  ])
    $<HTMLButtonElement>(id).disabled = busy;
  $<HTMLButtonElement>("send").disabled = busy || !selected;
  $<HTMLButtonElement>("followup").disabled =
    busy || !session?.turns.some((t) => t.role === "assistant");
  $<HTMLButtonElement>("new-session").disabled =
    busy || !state.resources.agentId || !state.resources.environmentId;
  $<HTMLButtonElement>("stop").disabled = !observingTurn || !selected;
  for (const [id, ready] of [
    ["agent", Boolean(state.resources.agentId)],
    ["environment", Boolean(state.resources.environmentId)],
    ["session", Boolean(selected)],
    ["events", Boolean(events.length)],
  ] as const)
    $(`stage-${id}`).classList.toggle("ready", ready);
}
function drawEvent(message: LabEvent) {
  if (message.kind !== "event") return;
  const li = document.createElement("li"),
    title = document.createElement("strong"),
    p = document.createElement("p"),
    d = document.createElement("details"),
    summary = document.createElement("summary"),
    pre = createCodeBlock(
      JSON.stringify(message.event.payload, null, 2),
      "json",
    );
  title.textContent = message.event.type;
  p.textContent = message.event.explanation;
  summary.textContent = "Inspect event payload";
  d.append(summary, pre);
  li.append(title, p, d);
  $("timeline").append(li);
}
async function refresh() {
  state = await api(`/api/state?mode=${mode}`);
  if (!state.sessions.some((s) => s.id === selected))
    selected = state.sessions.at(-1)?.id ?? "";
  render();
}
async function action(work: () => Promise<void>) {
  if (busy) return;
  busy = true;
  render();
  try {
    await work();
  } catch (e) {
    status(e instanceof Error ? e.message : "Operation failed.");
  } finally {
    busy = false;
    await refresh().catch(() => {
      status("Cannot reach the server. Restart it and refresh this page.");
      render();
    });
  }
}
async function setup() {
  status("Creating or reusing the agent and environment…");
  await api("/api/setup", { mode });
  await refresh();
  status("Reusable resources ready. Start a session next.");
}
async function create() {
  status("Starting a new conversation…");
  const s = await api("/api/sessions", { mode });
  selected = s.id;
  await refresh();
  status("New session ready. Send a message to start the turn.");
}
async function turn(prompt: string) {
  if (!selected) throw new Error("Start a session first.");
  status("Observing the managed session…");
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(selected)}/turn`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, prompt }),
    },
  );
  if (!response.ok) throw new Error((await response.json()).error);
  if (!response.body) throw new Error("Streaming is unavailable.");
  observingTurn = true;
  $<HTMLButtonElement>("stop").disabled = false;
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    doneEvent = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let split: number;
      while ((split = buffer.indexOf("\n\n")) >= 0) {
        const packet = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        if (!packet.startsWith("data: ")) continue;
        const e = JSON.parse(packet.slice(6)) as LabEvent;
        const list = traces.get(selected) ?? [];
        list.push(e);
        traces.set(selected, list);
        if (e.kind === "event") {
          drawEvent(e);
          $("timeline-empty").hidden = true;
          $("event-count").textContent =
            `${list.filter((x) => x.kind === "event").length} events`;
          $("stage-events").classList.add("ready");
        } else {
          doneEvent = true;
          observingTurn = false;
          $<HTMLButtonElement>("stop").disabled = true;
          status(e.text);
        }
      }
    }
    if (!doneEvent)
      throw new Error(
        "Connection ended before a turn outcome. Inspect the session before retrying.",
      );
  } finally {
    observingTurn = false;
    $<HTMLButtonElement>("stop").disabled = true;
    reader.releaseLock();
  }
}
$("setup").onclick = () => void action(setup);
$("new-session").onclick = () => void action(create);
$("send").onclick = () =>
  void action(() => turn($<HTMLTextAreaElement>("prompt").value));
$("followup").onclick = () => void action(() => turn(FOLLOWUP_PROMPT));
$("walkthrough").onclick = () =>
  void action(async () => {
    await setup();
    await create();
    await turn($<HTMLTextAreaElement>("prompt").value);
  });
$("stop").onclick = () => {
  if (!observingTurn) return;
  $<HTMLButtonElement>("stop").disabled = true;
  status("Requesting an interrupt…");
  void api(`/api/sessions/${encodeURIComponent(selected)}/stop`, {
    mode,
  }).catch((e) => status(e.message));
};
$<HTMLSelectElement>("session-select").onchange = (e) => {
  selected = (e.target as HTMLSelectElement).value;
  render();
  status("Inspecting this session.");
};
$<HTMLSelectElement>("mode").onchange = () => {
  mode = $<HTMLSelectElement>("mode").value as Mode;
  selected = "";
  $<HTMLTextAreaElement>("prompt").readOnly = mode === "demo";
  $("mode-note").textContent =
    mode === "demo"
      ? "A fixed, simulated replay of two supplied prompts. No AI request or cloud resource is created."
      : "Real Claude Managed Agents requests. Creates billable cloud resources using the server’s API key. Responses vary; no tools are enabled.";
  status(
    mode === "demo"
      ? "Guided demo ready."
      : "Live mode ready. Run explicitly to create resources.",
  );
  void refresh().catch((e) => status(e.message));
};
void (async () => {
  try {
    const info = await api("/api/lesson");
    const live = $<HTMLSelectElement>("mode").options[1];
    live.disabled = !info.liveReady;
    live.textContent = info.liveReady
      ? `Live · ${info.model}`
      : "Live · set ANTHROPIC_API_KEY on server";
    await refresh();
  } catch (e) {
    status(e instanceof Error ? e.message : "Cannot reach server.");
  }
})();
