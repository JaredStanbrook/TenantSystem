PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `bill` RENAME TO `__old_bill`;--> statement-breakpoint
CREATE TABLE `bill` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sequence_number` integer NOT NULL,
	`property_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`room_id` integer,
	`bill_type` text NOT NULL,
	`description` text,
	`total_amount` integer NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`due_date` integer NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`issued_date` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`paid_at` integer,
	`tenant_marked_paid_at` integer,
	`payment_reference` text,
	`extension_status` text DEFAULT 'none' NOT NULL,
	`extension_requested_date` integer,
	`extension_reason` text,
	`due_date_extension_days` integer DEFAULT 0 NOT NULL,
	`admin_note` text,
	`archived_status` text,
	FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `bill` (
	`id`, `sequence_number`, `property_id`, `user_id`, `room_id`, `bill_type`, `description`,
	`total_amount`, `amount_paid`, `status`, `due_date`, `start_date`, `end_date`,
	`issued_date`, `created_at`, `paid_at`, `tenant_marked_paid_at`, `payment_reference`,
	`extension_status`, `extension_requested_date`, `extension_reason`, `due_date_extension_days`,
	`admin_note`, `archived_status`
)
SELECT
	`id`,
	ROW_NUMBER() OVER (PARTITION BY `user_id` ORDER BY `created_at` ASC, `id` ASC),
	`property_id`, `user_id`, `room_id`, `bill_type`, `description`,
	`total_amount`, `amount_paid`, `status`, `due_date`, `start_date`, `end_date`,
	`issued_date`, `created_at`, `paid_at`, `tenant_marked_paid_at`, `payment_reference`,
	`extension_status`, `extension_requested_date`, `extension_reason`, `due_date_extension_days`,
	`admin_note`, `archived_status`
FROM `__old_bill`;--> statement-breakpoint
DROP TABLE `__old_bill`;--> statement-breakpoint
CREATE UNIQUE INDEX `bill_user_sequence_unique` ON `bill` (`user_id`,`sequence_number`);--> statement-breakpoint
ALTER TABLE `bond` RENAME TO `__old_bond`;--> statement-breakpoint
CREATE TABLE `bond` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sequence_number` integer NOT NULL,
	`property_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`room_id` integer,
	`description` text,
	`total_amount` integer NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`due_date` integer NOT NULL,
	`issued_date` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`paid_at` integer,
	`tenant_marked_paid_at` integer,
	`payment_reference` text,
	`extension_status` text DEFAULT 'none' NOT NULL,
	`extension_requested_date` integer,
	`extension_reason` text,
	`due_date_extension_days` integer DEFAULT 0 NOT NULL,
	`admin_note` text,
	`idempotency_key` text,
	`archived_status` text,
	FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `bond` (
	`id`, `sequence_number`, `property_id`, `user_id`, `room_id`, `description`,
	`total_amount`, `amount_paid`, `status`, `due_date`, `issued_date`, `created_at`,
	`paid_at`, `tenant_marked_paid_at`, `payment_reference`, `extension_status`,
	`extension_requested_date`, `extension_reason`, `due_date_extension_days`, `admin_note`,
	`idempotency_key`, `archived_status`
)
SELECT
	`id`,
	ROW_NUMBER() OVER (PARTITION BY `user_id` ORDER BY `created_at` ASC, `id` ASC),
	`property_id`, `user_id`, `room_id`, `description`,
	`total_amount`, `amount_paid`, `status`, `due_date`, `issued_date`, `created_at`,
	`paid_at`, `tenant_marked_paid_at`, `payment_reference`, `extension_status`,
	`extension_requested_date`, `extension_reason`, `due_date_extension_days`, `admin_note`,
	`idempotency_key`, `archived_status`
FROM `__old_bond`;--> statement-breakpoint
DROP TABLE `__old_bond`;--> statement-breakpoint
CREATE UNIQUE INDEX `bond_idempotency_key_unique` ON `bond` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `bond_user_sequence_unique` ON `bond` (`user_id`,`sequence_number`);--> statement-breakpoint
ALTER TABLE `rent` RENAME TO `__old_rent`;--> statement-breakpoint
CREATE TABLE `rent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sequence_number` integer NOT NULL,
	`property_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`room_id` integer,
	`description` text,
	`total_amount` integer NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`due_date` integer NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`issued_date` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`paid_at` integer,
	`tenant_marked_paid_at` integer,
	`payment_reference` text,
	`extension_status` text DEFAULT 'none' NOT NULL,
	`extension_requested_date` integer,
	`extension_reason` text,
	`due_date_extension_days` integer DEFAULT 0 NOT NULL,
	`admin_note` text,
	`idempotency_key` text,
	`archived_status` text,
	FOREIGN KEY (`property_id`) REFERENCES `property`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `rent` (
	`id`, `sequence_number`, `property_id`, `user_id`, `room_id`, `description`,
	`total_amount`, `amount_paid`, `status`, `due_date`, `start_date`, `end_date`,
	`issued_date`, `created_at`, `paid_at`, `tenant_marked_paid_at`, `payment_reference`,
	`extension_status`, `extension_requested_date`, `extension_reason`, `due_date_extension_days`,
	`admin_note`, `idempotency_key`, `archived_status`
)
SELECT
	`id`,
	ROW_NUMBER() OVER (PARTITION BY `user_id` ORDER BY `created_at` ASC, `id` ASC),
	`property_id`, `user_id`, `room_id`, `description`,
	`total_amount`, `amount_paid`, `status`, `due_date`, `start_date`, `end_date`,
	`issued_date`, `created_at`, `paid_at`, `tenant_marked_paid_at`, `payment_reference`,
	`extension_status`, `extension_requested_date`, `extension_reason`, `due_date_extension_days`,
	`admin_note`, `idempotency_key`, `archived_status`
FROM `__old_rent`;--> statement-breakpoint
DROP TABLE `__old_rent`;--> statement-breakpoint
CREATE UNIQUE INDEX `rent_idempotency_key_unique` ON `rent` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `rent_user_sequence_unique` ON `rent` (`user_id`,`sequence_number`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
