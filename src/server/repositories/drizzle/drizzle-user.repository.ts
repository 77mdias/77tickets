import { eq } from "drizzle-orm";

import type { Db } from "../../infrastructure/db/client";
import { user } from "../../infrastructure/db/schema";
import type { UserRecord, UserRepository } from "../user.repository.contracts";

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<UserRecord | null> {
    const [row] = await this.db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return row ? toUserRecord(row) : null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await this.db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    return row ? toUserRecord(row) : null;
  }

  async save(userRecord: UserRecord): Promise<void> {
    await this.db
      .insert(user)
      .values({
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        createdAt: userRecord.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: user.id,
        set: {
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
          updatedAt: new Date(),
        },
      });
  }
}

function toUserRecord(row: typeof user.$inferSelect): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt,
  };
}
