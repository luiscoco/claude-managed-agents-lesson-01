import { test, expect } from "@playwright/test";

test("UML diagrams explain system boundaries and all ten workflow steps", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "03 · How it works" }).click();
  await expect(
    page.getByRole("img", { name: "UML component architecture" }),
  ).toBeVisible();
  await page
    .getByText("Explore the full UML activity workflow", { exact: true })
    .click();
  await expect(
    page.getByRole("img", {
      name: "UML activity workflow with responsibility swimlanes",
    }),
  ).toBeVisible();
  await expect(page.locator(".workflow-step-buttons button")).toHaveCount(10);
  await page
    .getByRole("button", {
      name: "5 · Open the event stream first",
      exact: true,
    })
    .click();
  await expect(page.locator(".workflow-step-detail")).toContainText(
    "before sending input",
  );
  await expect(page.locator('.uml-action[data-workflow-step="4"]')).toHaveClass(
    /selected/,
  );
  await expect(
    page.locator(".workflow-step-detail code .hljs-keyword").first(),
  ).toHaveText("const");
  await page
    .getByRole("button", { name: "8 · Check the stop reason", exact: true })
    .click();
  await expect(page.locator(".workflow-step-detail")).toContainText("end_turn");
  await page
    .getByRole("button", {
      name: "9 · Continue the same conversation",
      exact: true,
    })
    .click();
  await expect(page.locator(".workflow-step-detail")).toContainText(
    "same session ID",
  );
  await page
    .getByRole("button", {
      name: "10 · Start a separate task, or stop",
      exact: true,
    })
    .click();
  await expect(page.locator(".workflow-step-detail")).toContainText(
    "user.interrupt",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
