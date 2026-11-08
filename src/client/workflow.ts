import { createCodeBlock } from "./formatting.js";

const steps = [
  {
    title: "Choose the mode and task",
    owner: "Student / browser",
    description:
      "The student chooses the guided demo or live Managed Agents, then provides the study-plan request. The browser sends teaching actions to the local server; it never receives the API key.",
    code: 'await fetch("/api/setup", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ mode: "live" }),\n});',
  },
  {
    title: "Validate and select the provider",
    owner: "Node server",
    description:
      "The host validates mode, input, session ownership, and concurrent-turn state. Demo actions use the scripted provider; live actions use the official SDK with the server’s Anthropic key.",
    code: 'const provider = mode === "demo"\n  ? demoProvider\n  : liveManagedAgentsProvider;\n// The server validates every action before invoking its provider.',
  },
  {
    title: "Create or reuse the agent and environment",
    owner: "Node server → Managed Agents",
    description:
      "If IDs are already available, reuse them. Otherwise create the study-coach agent and a cloud environment configuration. The live app saves each successfully created ID under .data/resources.json.",
    code: 'const agent = await client.beta.agents.create({\n  name: "Study coach", model, system: AGENT_SYSTEM, tools: [],\n});\nconst environment = await client.beta.environments.create({\n  name: "Classroom",\n});',
  },
  {
    title: "Create a new session",
    owner: "Node server → Managed Agents",
    description:
      "Connect the reusable agent and environment. The cloud creates a distinct session with its own conversation and execution context. Creating it without initial_events does not start the study-coach turn.",
    code: "const session = await client.beta.sessions.create({\n  agent: agentId,\n  environment_id: environmentId,\n});",
  },
  {
    title: "Open the event stream first",
    owner: "Node server → Managed Agents",
    description:
      "The stream delivers future events. Open it before sending input so a fast response is not missed. The Node host bridges managed events to the browser over its own SSE connection.",
    code: "const stream = await client.beta.sessions.events.stream(\n  session.id, {}, { signal },\n);",
  },
  {
    title: "Send the user message",
    owner: "Node server → Managed Agents",
    description:
      "A user.message event starts the agent’s work. The managed runtime uses the agent definition and this session’s history to process the task.",
    code: 'await client.beta.sessions.events.send(session.id, {\n  events: [{ type: "user.message",\n    content: [{ type: "text", text: prompt }],\n  }],\n}, { signal });',
  },
  {
    title: "Observe events and show the response",
    owner: "Managed Agents → Node → browser",
    description:
      "The host observes running status, agent output, and other events. The browser explains the event payloads and renders the assistant’s text with formatting and syntax-highlighted code. An agent.message is output, not proof of turn success.",
    code: "for await (const event of stream) {\n  // Forward event data to the browser timeline.\n  // Retain complete agent.message text in this session’s transcript.\n}",
  },
  {
    title: "Check the stop reason",
    owner: "Node server",
    description:
      "Only an idle event with end_turn is reported as successful completion. Required action, refusal, budget/retry limits, termination, or a dropped connection need attention. Closing a stream does not delete the session.",
    code: 'if (event.type === "session.status_idle") {\n  if (event.stop_reason.type !== "end_turn") {\n    throw new Error(event.stop_reason.type);\n  }\n  // Turn complete; session can accept another message.\n}',
  },
  {
    title: "Continue the same conversation",
    owner: "Student → same managed session",
    description:
      "The Continue button sends the supplied follow-up to the same session ID. Its existing study plan remains in the managed conversation history. Repeat steps 5–8 for the next turn.",
    code: '// Reuse session.id; open its stream before sending again.\nawait client.beta.sessions.events.send(session.id, {\n  events: [{ type: "user.message", content: [{\n    type: "text", text: "Add an exercise to step 2.",\n  }] }],\n});',
  },
  {
    title: "Start a separate task, or stop",
    owner: "Student / Node server",
    description:
      "For an unrelated task, create another session using the same agent/environment IDs. Stop turn requests user.interrupt and ends local observation. Disconnects and the observation timeout also request interruption; inspect the cloud session if its state is uncertain.",
    code: '// A separate task: same resources, new conversation.\nconst next = await client.beta.sessions.create({\n  agent: agentId, environment_id: environmentId,\n});\n// To interrupt an active turn:\nawait client.beta.sessions.events.send(session.id, {\n  events: [{ type: "user.interrupt" }],\n});',
  },
] as const;

const architecture = `<svg viewBox="0 0 1040 330" role="img" aria-labelledby="architecture-title architecture-desc"><title id="architecture-title">UML component architecture</title><desc id="architecture-desc">The student uses the browser. The browser sends local HTTP requests to the Node server and receives event updates. The Node server keeps the API key and calls Claude Managed Agents with the official SDK over HTTPS. Agents and environment configurations are reusable; sessions own conversation history. The guided demo stays in the local server.</desc><defs><marker id="arch-arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0 0 L10 4 L0 8 Z"/></marker></defs>
<g class="uml-box"><rect x="25" y="80" width="260" height="170" rx="8"/><text x="155" y="110" class="uml-stereotype">«component»</text><text x="155" y="140" class="uml-title">Browser lesson UI</text><text x="155" y="172">Controls · timeline · quiz</text><text x="155" y="202">Formatted response + code</text><text x="155" y="232">Student interacts here</text></g>
<g class="uml-box"><rect x="385" y="80" width="270" height="170" rx="8"/><text x="520" y="110" class="uml-stereotype">«component»</text><text x="520" y="140" class="uml-title">Node application host</text><text x="520" y="172">Validation + session coordinator</text><text x="520" y="202">API key + official SDK</text><text x="520" y="232">Demo provider / live provider</text></g>
<g class="uml-box cloud"><rect x="755" y="65" width="260" height="200" rx="8"/><text x="885" y="95" class="uml-stereotype">«external service»</text><text x="885" y="125" class="uml-title">Claude Managed Agents</text><text x="885" y="162">Agent + environment definitions</text><text x="885" y="192">Session history + cloud runtime</text><text x="885" y="222">Input events + output stream</text><text x="885" y="250">Live mode only</text></g>
<path class="uml-edge" d="M285 145 H385"/><text class="uml-edge-label" x="335" y="130">HTTP actions</text><path class="uml-edge" d="M385 205 H285"/><text class="uml-edge-label" x="335" y="230">SSE events</text><path class="uml-edge" d="M655 145 H755"/><text class="uml-edge-label" x="705" y="130">HTTPS API</text><path class="uml-edge" d="M755 205 H655"/><text class="uml-edge-label" x="705" y="230">Event stream</text><text class="uml-caption" x="520" y="310">Browser transport and the managed event stream are separate connections.</text></svg>`;

function action(
  x: number,
  y: number,
  width: number,
  step: number,
  lines: string[],
) {
  return `<g class="uml-action" data-workflow-step="${step}"><rect x="${x}" y="${y}" width="${width}" height="64" rx="14"/>${lines.map((line, i) => `<text x="${x + width / 2}" y="${y + 25 + i * 22}">${line}</text>`).join("")}</g>`;
}
const workflow = `<svg viewBox="0 0 1040 1460" role="img" aria-labelledby="workflow-title workflow-desc"><title id="workflow-title">UML activity workflow with responsibility swimlanes</title><desc id="workflow-desc">Choose a mode and task, validate the request, create or reuse resources, create a session, open the stream, send input, process events, and check the stop reason. Continue the same conversation or create a separate session. Stop, errors, and timeout lead to an attention outcome rather than success.</desc><defs><marker id="flow-arrow" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0 L9 4 L0 8 Z"/></marker></defs>
<rect class="uml-lane" x="15" y="15" width="1010" height="1425" rx="10"/><path class="uml-lane-line" d="M345 15 V1440 M690 15 V1440 M15 65 H1025"/><text class="uml-title" x="180" y="47">Student / browser</text><text class="uml-title" x="517" y="47">Node host</text><text class="uml-title" x="857" y="47">Managed Agents cloud</text>
<circle class="uml-start" cx="180" cy="92" r="10"/>
${action(50, 120, 260, 0, ["1 · Choose mode", "and study-plan prompt"])}
${action(387, 215, 260, 1, ["2 · Validate request", "Select demo or live provider"])}
<path class="uml-decision" d="M517 305 L587 340 L517 375 L447 340 Z"/><text class="uml-small" x="517" y="345">Saved IDs?</text>
${action(725, 405, 265, 2, ["3 · Create agent + environment", "Save IDs after each creation"])}
<path class="uml-decision" d="M517 510 L529 522 L517 534 L505 522 Z"/>
${action(725, 565, 265, 3, ["4 · Create session", "Use agentId + environmentId"])}
${action(387, 665, 260, 4, ["5 · Open event stream FIRST", "Observe future session events"])}
${action(387, 765, 260, 5, ["6 · Send user.message", "Start the managed turn"])}
${action(725, 765, 265, 6, ["7 · Run agent in session", "Emit activity + outcome events"])}
${action(387, 865, 260, 6, ["7 · Observe until turn stops", "Forward events to browser"])}
${action(50, 865, 260, 6, ["7 · Show timeline + response", "Format text + color code"])}
<path class="uml-decision" data-workflow-step="7" d="M517 965 L617 1010 L517 1055 L417 1010 Z"/><text class="uml-small" x="517" y="1004">8 · Idle with</text><text class="uml-small" x="517" y="1025">end_turn?</text>
${action(50, 1100, 260, 8, ["9 · Turn complete", "Continue this session?"])}
${action(725, 1100, 265, 9, ["Attention / interrupted", "Inspect session before retrying"])}
<path class="uml-decision" d="M180 1210 L260 1250 L180 1290 L100 1250 Z"/><text class="uml-small" x="180" y="1245">Next</text><text class="uml-small" x="180" y="1265">action?</text>
${action(387, 1325, 260, 9, ["10 · New session", "Reuse agent + environment"])}
<circle class="uml-final-outer" cx="180" cy="1390" r="15"/><circle class="uml-start" cx="180" cy="1390" r="9"/>
<g class="uml-flow-edges"><path d="M180 102 V120"/><path d="M180 184 V195 H517 V215"/><path d="M517 279 V305"/><path d="M517 375 V390 H857 V405"/><path d="M447 340 H365 V522 H505"/><path d="M857 469 V522 H529"/><path d="M517 534 V545 H857 V565"/><path d="M857 629 V645 H517 V665"/><path d="M517 729 V765"/><path d="M647 797 H725"/><path d="M857 829 V845 H517 V865"/><path d="M387 897 H310"/><path d="M180 929 V950 H517 V965"/><path d="M417 1010 H180 V1100"/><path d="M617 1010 H857 V1100"/><path d="M180 1164 V1210"/><path d="M100 1250 H30 V697 H387"/><path d="M260 1250 H517 V1325"/><path d="M647 1357 H1008 V597 H990"/><path d="M180 1290 V1375"/></g>
<text class="uml-edge-label" x="570" y="383">No</text><text class="uml-edge-label" x="399" y="325">Yes · reuse</text><text class="uml-edge-label" x="295" y="996">Yes</text><text class="uml-edge-label" x="752" y="996">Other stop / failure</text><text class="uml-edge-label" x="160" y="1195">Follow-up → steps 5–8</text><text class="uml-edge-label" x="370" y="1230">Separate task</text><text class="uml-edge-label" x="222" y="1342">Finish</text>
<text class="uml-caption" x="857" y="1220">Stop / disconnect / timeout:</text><text class="uml-caption" x="857" y="1245">request user.interrupt</text><text class="uml-caption" x="857" y="1270">and end local observation.</text><text class="uml-caption" x="857" y="1400">Demo mirrors this flow locally;</text><text class="uml-caption" x="857" y="1425">no cloud resources or AI calls.</text></svg>`;

export function createWorkflowGuide() {
  const section = document.createElement("section");
  section.className = "panel workflow-guide";
  section.setAttribute("aria-labelledby", "uml-heading");
  section.innerHTML = `<p class="eyebrow">UML / ARCHITECTURE & WORKFLOW</p><h3 id="uml-heading">Follow every step across the application.</h3><p>Read the component diagram to see the system boundaries. Expand the activity diagram to follow the lifecycle, then select a step to inspect its explanation and code.</p><div class="uml-scroll" tabindex="0" role="region" aria-label="Scrollable UML component architecture">${architecture}</div><details class="uml-activity"><summary>Explore the full UML activity workflow</summary><p class="note">Rounded boxes are actions, diamonds are decisions, and circles mark start/finish. Swimlanes identify who performs each action. On narrow screens, scroll the diagram horizontally.</p><div class="uml-scroll" tabindex="0" role="region" aria-label="Scrollable UML activity workflow">${workflow}</div></details><div class="workflow-step-buttons" role="group" aria-label="Inspect a workflow step"></div><article class="workflow-step-detail" aria-live="polite" aria-atomic="true"></article>`;
  const buttons = section.querySelector<HTMLElement>(".workflow-step-buttons")!;
  const detail = section.querySelector<HTMLElement>(".workflow-step-detail")!;
  const select = (index: number) => {
    const step = steps[index];
    buttons
      .querySelectorAll("button")
      .forEach((button, i) =>
        button.setAttribute("aria-pressed", String(i === index)),
      );
    section
      .querySelectorAll<SVGElement>("[data-workflow-step]")
      .forEach((node) =>
        node.classList.toggle(
          "selected",
          node.dataset.workflowStep === String(index),
        ),
      );
    const h = document.createElement("h4");
    h.textContent = `${index + 1}. ${step.title}`;
    const owner = document.createElement("span");
    owner.className = "badge";
    owner.textContent = step.owner;
    const p = document.createElement("p");
    p.textContent = step.description;
    detail.replaceChildren(
      h,
      owner,
      p,
      createCodeBlock(step.code, "typescript"),
    );
  };
  steps.forEach((step, index) => {
    const button = document.createElement("button");
    button.textContent = `${index + 1} · ${step.title}`;
    button.setAttribute("aria-pressed", "false");
    button.onclick = () => select(index);
    buttons.append(button);
  });
  select(0);
  return section;
}
