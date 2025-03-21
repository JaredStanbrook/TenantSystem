CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`property_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_DATE) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'rent' NOT NULL,
	`title` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_DATE) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`email_verified` integer DEFAULT 0,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text,
	`role` text DEFAULT 'tenant' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);