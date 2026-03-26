/**
 * Test fixtures barrel.
 *
 * In Phase 2, export factory functions for each domain entity. Pattern:
 *
 * @example
 * ```ts
 * import { createEventFixture } from "../../fixtures";
 *
 * const event = await createEventFixture(db, { name: "Test Event" });
 * ```
 *
 * Each factory accepts a `db` instance from `createTestDb()` and an optional
 * partial override object. It inserts a row and returns the inserted record.
 * Cleanup is handled by `cleanDatabase(db)` in `afterEach` — factories do not
 * need to track what they create.
 */

// No exports in Phase 1. Domain tables will be added in Phase 2.
