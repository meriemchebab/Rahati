import { expect, test, type APIRequestContext } from "@playwright/test";

const apiUrl = "http://127.0.0.1:8010";
const password = "E2E-only-Password-2026!";

async function login(request: APIRequestContext, username: string): Promise<string> {
  const response = await request.post(`${apiUrl}/api/auth/login`, {
    data: { username, password },
  });
  expect(response.status(), "login should succeed").toBe(200);
  return (await response.json()).access as string;
}

test("frontend starter page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Create Next App");
  await expect(page.getByRole("heading", { name: /get started, edit the/i })).toBeVisible();
});

test("woman finds, books, and can no longer see the slot; duplicate booking is rejected", async ({ request }) => {
  const token = await login(request, "e2e_woman");
  const secondToken = await login(request, "e2e_existing_woman");
  const headers = { Authorization: `Bearer ${token}` };
  const secondHeaders = { Authorization: `Bearer ${secondToken}` };

  const directory = await request.get(`${apiUrl}/api/professionals?mode=online`, { headers });
  expect(directory.status()).toBe(200);
  const professionals = await directory.json();
  const professional = professionals.find(
    (item: { id: number; name?: string }) => item.name === "E2E Test Professional",
  );
  expect(professional, "seeded verified professional should appear in directory").toBeTruthy();
  if (!professional) throw new Error("Seeded professional is missing from the directory");

  const slotsResponse = await request.get(
    `${apiUrl}/api/professionals/${professional.id}/slots`,
    { headers },
  );
  expect(slotsResponse.status()).toBe(200);
  const slots = await slotsResponse.json();
  expect(slots).toHaveLength(1);
  const slotId = slots[0].id as number;

  const booking = await request.post(`${apiUrl}/api/sessions`, {
    headers,
    data: { slot: slotId },
  });
  expect(booking.status()).toBe(201);
  const session = await booking.json();
  expect(session.slot).toBe(slotId);
  expect(session.status).toBe("requested");

  const sessionsResponse = await request.get(`${apiUrl}/api/sessions`, { headers });
  expect(sessionsResponse.status()).toBe(200);
  expect((await sessionsResponse.json()).some((item: { id: number }) => item.id === session.id)).toBe(true);

  const afterBooking = await request.get(
    `${apiUrl}/api/professionals/${professional.id}/slots`,
    { headers },
  );
  expect(afterBooking.status()).toBe(200);
  expect(await afterBooking.json()).toHaveLength(0);

  const duplicateBooking = await request.post(`${apiUrl}/api/sessions`, {
    headers: secondHeaders,
    data: { slot: slotId },
  });
  expect(duplicateBooking.status()).toBe(409);

  const missingSlot = await request.post(`${apiUrl}/api/sessions`, {
    headers,
    data: { slot: 999999 },
  });
  expect(missingSlot.status()).toBe(404);
});

test("booking endpoints reject unauthenticated requests", async ({ request }) => {
  const response = await request.post(`${apiUrl}/api/sessions`, {
    data: { slot: 1 },
  });
  expect(response.status()).toBe(401);
});
