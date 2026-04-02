ALTER TABLE "events" ADD COLUMN "category" varchar(100);--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_title_gin_idx" ON "events" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_location_gin_idx" ON "events" USING gin ("location" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_category_idx" ON "events" USING btree ("category");
