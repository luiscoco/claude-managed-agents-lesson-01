import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Lab, LiveProvider, DemoProvider, safeError } from "./lab.js";
import { DEFAULT_MODEL, type Mode } from "../shared/lesson.js";

try {
  process.loadEnvFile();
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const liveReady = Boolean(process.env.ANTHROPIC_API_KEY);
const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
const lab = new Lab(
  {
    demo: new DemoProvider(),
    ...(liveReady
      ? {
          live: new LiveProvider(
            new Anthropic({ maxRetries: 1, timeout: 120_000 }),
            model,
          ),
        }
      : {}),
  },
  resolve(".data"),
);
await lab.load();
if (process.env.MANAGED_AGENT_ID)
  lab.states.live.resources.agentId = process.env.MANAGED_AGENT_ID;
if (process.env.MANAGED_ENVIRONMENT_ID)
  lab.states.live.resources.environmentId = process.env.MANAGED_ENVIRONMENT_ID;
const production = process.argv.includes("--production");
const vite = production
  ? undefined
  : await (
      await import("vite")
    ).createServer({ server: { middlewareMode: true }, appType: "spa" });
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 12_000) throw new Error("Request too large.");
  }
  const result = JSON.parse(text || "{}");
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw new Error("Expected a JSON object.");
  return result;
}
function mode(value: unknown): Mode {
  if (value !== "demo" && value !== "live")
    throw new Error("Choose demo or live mode.");
  return value;
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    try {
      // Loopback app: reject cross-origin mutations, including localhost aliases.
      if (
        req.method === "POST" &&
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      )
        return json(res, 403, {
          error: "Cross-origin requests are not allowed.",
        });
      if (req.method === "GET" && url.pathname === "/api/lesson")
        return json(res, 200, { liveReady, model });
      if (req.method === "GET" && url.pathname === "/api/state")
        return json(res, 200, lab.states[mode(url.searchParams.get("mode"))]);
      if (req.method !== "POST")
        return json(res, 404, { error: "Endpoint not found." });
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return json(res, 415, { error: "Use application/json." });
      const data = await body(req),
        m = mode(data.mode);
      if (url.pathname === "/api/setup")
        return json(res, 200, await lab.setup(m));
      if (url.pathname === "/api/sessions")
        return json(res, 201, await lab.create(m));
      const match = /^\/api\/sessions\/([^/]+)\/(turn|stop)$/.exec(
        url.pathname,
      );
      if (!match) return json(res, 404, { error: "Endpoint not found." });
      const id = decodeURIComponent(match[1]);
      lab.find(m, id);
      if (match[2] === "stop") {
        await lab.stop(m, id);
        return json(res, 200, { stopped: true });
      }
      if (
        typeof data.prompt !== "string" ||
        !data.prompt.trim() ||
        data.prompt.length > 2000
      )
        throw new Error("Enter a prompt between 1 and 2,000 characters.");
      if (lab.find(m, id).status === "running")
        return json(res, 409, { error: "A turn is already running." });
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      const disconnect = () => {
        void lab.stop(m, id).catch(() => {});
      };
      res.on("close", disconnect);
      await lab.run(m, id, data.prompt, (event) => {
        if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
      });
      res.off("close", disconnect);
      res.end();
    } catch (e) {
      if (res.headersSent)
        res.end(
          `data: ${JSON.stringify({ kind: "error", text: safeError(e) })}\n\n`,
        );
      else json(res, 400, { error: safeError(e) });
    }
    return;
  }
  if (vite) return vite.middlewares(req, res);
  const root = resolve("dist/client");
  let decoded: string;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    return json(res, 400, { error: "Invalid URL encoding." });
  }
  let file = resolve(root, `.${decoded}`);
  if (file !== root && !file.startsWith(root + sep))
    return json(res, 403, { error: "Invalid path." });
  if (!extname(file)) file = resolve(root, "index.html");
  try {
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type":
        (
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".png": "image/png",
          } as Record<string, string>
        )[extname(file)] ?? "application/octet-stream",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(Number(process.env.PORT ?? 4321), "127.0.0.1", () =>
  console.log(
    `First Session Lab: http://127.0.0.1:${process.env.PORT ?? 4321}`,
  ),
);
