CREATE TABLE "disputes" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"explanation" text NOT NULL,
	"proof_url" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"chain_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"fee" numeric(78, 0) NOT NULL,
	"fee_payer" text NOT NULL,
	"deposit_tx_hash" text NOT NULL,
	"release_tx_hash" text NOT NULL,
	"status" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "access_token_expires_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "status" SET DEFAULT 'OPEN';--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "expires_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sender_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sender_type" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "metadata" text;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "role_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "amount_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "fee_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "release_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "cancel_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "close_room_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "payout_address" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "room_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "fee_payer" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "deposit_tx_hash" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "release_tx_hash" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "step" text DEFAULT 'WAITING_FOR_PEER' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "creator_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "disputes_room_id_idx" ON "disputes" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_chain_id_idx" ON "transactions" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "transactions_completed_at_idx" ON "transactions" USING btree ("completed_at");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_room_id_idx" ON "messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "participants_room_id_idx" ON "participants" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "participants_user_id_idx" ON "participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rooms_room_code_idx" ON "rooms" USING btree ("room_code");--> statement-breakpoint
CREATE INDEX "rooms_status_idx" ON "rooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "sender";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "rooms" DROP COLUMN "factory_address";--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_room_code_unique" UNIQUE("room_code");