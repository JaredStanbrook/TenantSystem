CREATE TABLE `properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`landlord_id` text NOT NULL,
	`address` text NOT NULL,
	FOREIGN KEY (`landlord_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenantProperties` (
	`tenant_id` text NOT NULL,
	`property_id` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
