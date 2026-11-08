import { test, expect } from "@playwright/test";
test("student completes first turn, follow-up, fresh session, package map and quiz", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your first session. Made visible." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run guided walkthrough" }).click();
  await expect(page.getByRole("status")).toContainText("Turn complete", {
    timeout: 20_000,
  });
  await expect(
    page.locator("#conversation .assistant ol > li").first(),
  ).toContainText("Agent:");
  const agent = await page.locator("#agent-id").innerText(),
    environment = await page.locator("#environment-id").innerText(),
    first = await page.locator("#session-id").innerText();
  await page.getByRole("button", { name: "Continue this session" }).click();
  await expect(page.getByRole("status")).toContainText("Turn complete");
  await expect(page.locator("#conversation")).toContainText("Exercise:");
  await expect(page.locator("#session-id")).toHaveText(first);
  await expect(page.locator(".turn")).toHaveCount(4);
  await page.getByText("Or step through manually").click();
  await page.getByRole("button", { name: "2. Start a new session" }).click();
  await expect(page.locator("#session-id")).not.toHaveText(first);
  await expect(page.locator("#agent-id")).toHaveText(agent);
  await expect(page.locator("#environment-id")).toHaveText(environment);
  await expect(page.locator(".turn")).toHaveCount(0);
  await page.locator("#session-select").selectOption(first);
  await expect(page.locator(".turn")).toHaveCount(4);
  await page.getByRole("tab", { name: "02 · API map" }).click();
  await expect(page.locator(".namespace")).toHaveCount(9);
  await page.getByRole("tab", { name: "03 · How it works" }).click();
  await expect(
    page.getByRole("heading", { name: "A small host. A managed runtime." }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "04 · Check understanding" }).click();
  for (const [i, correct] of [1, 2, 0, 1, 0].entries())
    await page.locator(`input[name="q-${i}"]`).nth(correct).check();
  await expect(page.locator("#score")).toHaveText("5 / 5 correct");
  await page.getByRole("button", { name: "Larger", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-text", "larger");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("stop turn and request validation", async ({ page, request }) => {
  // Keep this UI turn open until Stop is clicked. A 1.2-second demo replay can
  // finish before a mobile browser scrolls to the button on a busy machine.
  // Real provider interruption is independently covered by the backend test.
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const encoder = new TextEncoder();
    window.fetch = async (input, init) => {
      const url = String(input);
      if (/\/api\/sessions\/[^/]+\/turn$/.test(url)) {
        return new Response(
          new ReadableStream<Uint8Array>({
            start(stream) {
              controller = stream;
              stream.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ kind: "event", event: { type: "user.message", text: "hello", explanation: "Input received", payload: { type: "user.message" } } })}\n\n`,
                ),
              );
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      }
      if (/\/api\/sessions\/[^/]+\/stop$/.test(url)) {
        controller?.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ kind: "done", status: "cancelled", text: "Observation stopped. An interrupt was requested." })}\n\n`,
          ),
        );
        controller?.close();
        return Response.json({ stopped: true });
      }
      return originalFetch(input, init);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Run guided walkthrough" }).click();
  await expect(page.locator("#timeline")).toContainText("user.message");
  await page.getByRole("button", { name: "Stop turn" }).click();
  await expect(page.getByRole("status")).toContainText("Observation stopped");
  const invalid = await request.post("/api/sessions/unknown/turn", {
    data: { mode: "demo", prompt: "hello" },
  });
  expect(invalid.status()).toBe(400);
  const cross = await request.post("/api/setup", {
    headers: { origin: "https://example.org" },
    data: { mode: "demo" },
  });
  expect(cross.status()).toBe(403);
});
