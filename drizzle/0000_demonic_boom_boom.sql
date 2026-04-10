CREATE TABLE `share_files` (
	`id` text PRIMARY KEY NOT NULL,
	`share_id` text NOT NULL,
	`filename` text NOT NULL,
	`s3_key` text NOT NULL,
	`size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`share_id`) REFERENCES `shares`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`password_hash` text,
	`expires_at` integer NOT NULL,
	`max_downloads` integer,
	`download_count` integer DEFAULT 0 NOT NULL,
	`total_size` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`s3_prefix` text NOT NULL
);
