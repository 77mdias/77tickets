import { describe, expect, test } from "vitest";

import { createAuth } from "../../../../src/server/infrastructure/auth/auth.config";
import { cleanDatabase, createTestDb } from "../../setup";

describe.skipIf(!process.env.TEST_DATABASE_URL)("auth integration", () => {
  const db = createTestDb();
  const testAuth = createAuth(db);

  test("sign-up creates a customer user in the database", async () => {
    await cleanDatabase(db);

    const result = await testAuth.api.signUpEmail({
      body: {
        email: "newcustomer@test.local",
        password: "password123",
        name: "New Customer",
        role: "customer",
      },
    });

    expect(result.user.email).toBe("newcustomer@test.local");
    expect(result.user.name).toBe("New Customer");
    expect((result.user as { role?: string }).role).toBe("customer");
  });

  test("sign-up creates an organizer user in the database", async () => {
    await cleanDatabase(db);

    const result = await testAuth.api.signUpEmail({
      body: {
        email: "neworganizer@test.local",
        password: "password123",
        name: "New Organizer",
        role: "organizer",
      },
    });

    expect(result.user.email).toBe("neworganizer@test.local");
    expect((result.user as { role?: string }).role).toBe("organizer");
  });

  test("sign-up blocks admin role at public registration", async () => {
    await cleanDatabase(db);

    await expect(
      testAuth.api.signUpEmail({
        body: {
          email: "badactor@test.local",
          password: "password123",
          name: "Bad Actor",
          role: "admin",
        },
      }),
    ).rejects.toMatchObject({
      status: "FORBIDDEN",
    });
  });

  test("sign-up blocks checker role at public registration", async () => {
    await cleanDatabase(db);

    await expect(
      testAuth.api.signUpEmail({
        body: {
          email: "badchecker@test.local",
          password: "password123",
          name: "Bad Checker",
          role: "checker",
        },
      }),
    ).rejects.toMatchObject({
      status: "FORBIDDEN",
    });
  });

  test("sign-in returns a session with correct user data", async () => {
    await cleanDatabase(db);

    await testAuth.api.signUpEmail({
      body: {
        email: "signin.test@test.local",
        password: "password123",
        name: "Sign In Test",
        role: "customer",
      },
    });

    const signIn = await testAuth.api.signInEmail({
      body: {
        email: "signin.test@test.local",
        password: "password123",
      },
    });

    expect(signIn.user.email).toBe("signin.test@test.local");
    expect(signIn.token).toBeTruthy();
  });

  test("session resolves role from signed-in user token", async () => {
    await cleanDatabase(db);

    const signUp = await testAuth.api.signUpEmail({
      body: {
        email: "session.role@test.local",
        password: "password123",
        name: "Session Role Test",
        role: "organizer",
      },
    });

    const token = signUp.token;
    expect(token).toBeTruthy();

    const session = await testAuth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    });

    expect(session?.user.email).toBe("session.role@test.local");
    expect((session?.user as { role?: string }).role).toBe("organizer");
  });
});
