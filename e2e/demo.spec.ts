import { expect, test } from "@playwright/test";

test("login reaches the command center", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("email").fill("ana.organizer@vendimiatech.demo");
  await page.getByTestId("password").fill("vendimia-demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("command-center")).toBeVisible();
  await expect(page.getByTestId("health-score")).toBeVisible();
});

test("organizer demo covers command, task, incident, portals, ticketing, and AI", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByTestId("command-center")).toBeVisible();
  await expect(page.getByTestId("health-score")).toBeVisible();
  await expect(page.getByTestId("kpi-tickets")).toBeVisible();

  await page.getByRole("link", { name: "Planificación" }).click();
  await page.getByRole("button", { name: "+ Crear" }).click();
  await page.getByPlaceholder("Título").fill("Tarea e2e");
  await page.getByRole("button", { name: "Guardar" }).click();
  const row = page.locator("[data-testid='task-row']", { hasText: "Tarea e2e" });
  await expect(row).toBeVisible();
  await row.getByTestId("task-complete").click();
  await expect(page.locator("[data-testid='task-row']", { hasText: "Tarea e2e" })).toContainText("Hecha");

  await page.getByRole("link", { name: "Operaciones" }).click();
  const incident = page.locator("[data-testid='incident-row']", { hasText: "Falla de audio" });
  await incident.getByTestId("incident-resolve").click();
  await expect(page.locator("[data-testid='incident-row']", { hasText: "Falla de audio" })).toContainText("Resuelto");

  await page.getByTestId("view-as").selectOption({ label: "Sponsor" });
  await expect(page.getByTestId("sponsor-portal")).toBeVisible();
  await page.getByTestId("view-as").selectOption({ label: "Speaker" });
  await expect(page.getByTestId("speaker-portal")).toBeVisible();
  await page.getByTestId("view-as").selectOption({ label: "Vendor" });
  await expect(page.getByTestId("vendor-portal")).toBeVisible();
  await page.getByTestId("view-as").selectOption({ label: "Staff" });
  await expect(page.getByTestId("staff-portal")).toBeVisible();
  await page.getByTestId("view-as").selectOption({ label: "Asistente" });
  await expect(page.getByTestId("attendee-portal")).toBeVisible();

  await page.getByTestId("view-as").selectOption({ label: "Organizador" });
  await page.getByRole("link", { name: "Integraciones" }).click();
  await expect(page.getByTestId("ticketing-panel")).toBeVisible();
  await page.getByTestId("abra-probe").click();
  await expect(page.getByTestId("abra-message")).toContainText(/Abra|configur/i);

  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByTestId("analytics-panel")).toBeVisible();
  await page.getByRole("link", { name: "PlanE AI" }).click();
  await page.getByTestId("brain-q-tickets").click();
  await expect(page.getByTestId("brain-answer")).toContainText(/135|entrada/i);

  await page.getByTestId("view-as").selectOption({ label: "Asistente" });
  await expect(page.getByTestId("attendee-portal")).toBeVisible();
  await page.goto("/events/vendimia-tech-2027/finance");
  await expect(page.getByTestId("denied")).toBeVisible();
});

test("cross-tenant API denial from the demo session", async ({ page }) => {
  await page.goto("/demo");
  const response = await page.request.get("/api/events/evt_bodega");
  expect(response.status()).toBe(403);
});
