ALTER TABLE "events" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_user_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_user_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;