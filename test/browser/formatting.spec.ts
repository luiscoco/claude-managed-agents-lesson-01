import { test, expect } from "@playwright/test";

test("code examples, setup commands and event payloads are syntax highlighted", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "02 · API map" }).click();
  await expect(page.locator(".namespace pre code.hljs")).toHaveCount(9);
  for (const card of await page.locator(".namespace").all()) {
    await card.getByText("Inspect the API call", { exact: true }).click();
    await expect(card.locator("pre code.hljs")).toBeVisible();
    await expect(card.locator("pre code.hljs")).not.toBeEmpty();
    await expect(card.locator('pre [class^="hljs-"]').first()).toBeVisible();
  }
  await expect(
    page
      .locator(".namespace")
      .filter({
        has: page.getByRole("heading", { name: "Memory stores", exact: true }),
      })
      .locator("pre code"),
  ).toContainText("client.beta.memoryStores.create");
  await expect(page.locator(".namespace pre .hljs-keyword").first()).toHaveText(
    "const",
  );
  await page.getByRole("tab", { name: "03 · How it works" }).click();
  await expect(
    page.locator("#quickstart-code.hljs .hljs-keyword").first(),
  ).toHaveText("import");
  await expect(
    page.locator('#panel-how pre[data-language="powershell"] .hljs-comment'),
  ).toContainText("ANTHROPIC_API_KEY");
  const colors = await page.locator("#quickstart-code").evaluate((code) => ({
    keyword: getComputedStyle(code.querySelector(".hljs-keyword")!).color,
    string: getComputedStyle(code.querySelector(".hljs-string")!).color,
  }));
  expect(colors.keyword).not.toBe(colors.string);
  await page.getByRole("tab", { name: "01 · First session" }).click();
  await page.getByRole("button", { name: "Run guided walkthrough" }).click();
  await expect(page.getByRole("status")).toContainText("Turn complete");
  await expect(page.locator('#timeline pre[data-language="json"]')).toHaveCount(
    4,
  );
  await expect(page.locator("#timeline .hljs-attr").first()).toHaveText(
    '"type"',
  );
});

test("responses render rich text and colored code without executing model HTML", async ({
  page,
}, testInfo) => {
  const response = [
    "## Your study plan",
    "",
    "Use **reusable agents** and *separate sessions*.",
    "",
    "1. Create an agent.",
    "2. Send a message.",
    "",
    "Use `client.beta.sessions` for conversations.",
    "",
    "```typescript",
    'const label = "Study coach";',
    "console.log(label);",
    "```",
    "",
    "```python",
    'print("Hello student")',
    "```",
    "",
    "```unknown-language",
    '<script>alert("literal code")</script>',
    "```",
    "",
    "| Resource | Reuse? |",
    "| --- | --- |",
    "| Agent | Yes |",
    "",
    "[Official docs](https://platform.claude.com/docs/en/managed-agents/quickstart)",
    "",
    "[Unsafe link](javascript:alert%281%29)",
    "",
    '<img src="x" onerror="window.formattingAttack=true">',
    "",
    "<script>window.formattingAttack=true</script>",
    "",
  ].join("\n");
  await page.route("**/api/state?mode=demo", (route) =>
    route.fulfill({
      json: {
        mode: "demo",
        resources: { agentId: "demo_agent", environmentId: "demo_env" },
        sessions: [
          {
            id: "demo_formatting",
            status: "idle",
            createdAt: new Date().toISOString(),
            turns: [
              {
                role: "user",
                text: '<img src="x" onerror="window.formattingAttack=true">',
              },
              { role: "assistant", text: response },
            ],
          },
        ],
      },
    }),
  );
  await page.goto("/");
  const content = page.locator(".formatted-response");
  await expect(
    content.getByRole("heading", { name: "Your study plan" }),
  ).toBeVisible();
  await expect(content.locator("p strong")).toHaveText("reusable agents");
  await expect(content.locator("p em")).toHaveText("separate sessions");
  await expect(content.locator("ol > li")).toHaveCount(2);
  await expect(content.locator("pre .hljs-keyword").first()).toHaveText(
    "const",
  );
  await expect(
    content.locator('pre[data-language="python"] .hljs-string'),
  ).toHaveText('"Hello student"');
  await expect(
    content.locator('pre[data-language="unknown-language"] code'),
  ).toContainText('<script>alert("literal code")</script>');
  await expect(content.locator("table th")).toHaveCount(2);
  await expect(content.locator("img, script, iframe, [onerror]")).toHaveCount(
    0,
  );
  await expect(content.getByText("Unsafe link")).not.toHaveAttribute("href");
  await expect(
    content.getByRole("link", { name: "Official docs" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator(".turn.user p")).toContainText('<img src="x"');
  expect(await page.evaluate(() => "formattingAttack" in window)).toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".turn.assistant")
    .screenshot({ path: testInfo.outputPath("formatted-response.png") });
});
