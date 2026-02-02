CREATE TABLE `auth_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`event` text NOT NULL,
	`method` text,
	`ip_address` text,
	`user_agent` text,
	`metadata` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`credential_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`device_name` text,
	`transports` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`last_used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credentials_credential_id_unique` ON `credentials` (`credential_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`email` text,
	`display_name` text,
	`password_hash` text,
	`pin` text,
	`totp_secret` text,
	`totp_enabled` integer DEFAULT false,
	`is_active` integer DEFAULT true NOT NULL,
	`email_verified` integer DEFAULT false,
	`phone_number` text,
	`phone_verified` integer DEFAULT false,
	`failed_login_attempts` integer DEFAULT 0,
	`locked_until` text,
	`last_login_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`expires_at` text NOT NULL,
	`verified` integer DEFAULT false,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invoice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`total_amount` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`due_date` integer NOT NULL,
	`issued_date` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`idempotency_key` text,
	`archived_status` text,
	FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_idempotency_key_unique` ON `invoice` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `invoice_payment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`amount_owed` integer NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_at` integer,
	`tenant_marked_paid_at` integer,
	`payment_reference` text,
	`extension_status` text DEFAULT 'none' NOT NULL,
	`extension_requested_date` integer,
	`extension_reason` text,
	`due_date_extension_days` integer DEFAULT 0 NOT NULL,
	`admin_note` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `property` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`landlord_id` text NOT NULL,
	`nickname` text,
	`address_line_1` text NOT NULL,
	`address_line_2` text,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`postcode` text NOT NULL,
	`country` text DEFAULT 'Australia' NOT NULL,
	`property_type` text DEFAULT 'house' NOT NULL,
	`bedrooms` integer DEFAULT 1 NOT NULL,
	`bathrooms` integer DEFAULT 1 NOT NULL,
	`parking_spaces` integer DEFAULT 0 NOT NULL,
	`rent_amount` integer NOT NULL,
	`rent_frequency` text DEFAULT 'weekly' NOT NULL,
	`status` text DEFAULT 'vacant' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`next_billing_date` integer,
	`deleted_at` integer,
	FOREIGN KEY (`landlord_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`permission` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`permission` text NOT NULL,
	`granted` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`granted_by` text,
	`expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`assigned_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`assigned_by` text,
	`expires_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `room` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'vacant_ready' NOT NULL,
	`base_rent_amount` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `expense_split` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shared_expense_id` integer NOT NULL,
	`debtor_id` text NOT NULL,
	`amount_owed` integer NOT NULL,
	`is_settled` integer DEFAULT false NOT NULL,
	`settled_at` integer,
	FOREIGN KEY (`shared_expense_id`) REFERENCES `shared_expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`debtor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shared_expense` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`purchaser_id` text NOT NULL,
	`description` text NOT NULL,
	`total_amount` integer NOT NULL,
	`purchased_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchaser_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenancy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`property_id` integer NOT NULL,
	`room_id` integer,
	`status` text DEFAULT 'pending_agreement' NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`bond_amount` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	`billed_through_date` integer NOT NULL,
	`archived_status` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE no action
);
