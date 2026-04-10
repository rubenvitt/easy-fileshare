CREATE TABLE `download_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`share_id` text NOT NULL,
	`file_id` text,
	`ip` text,
	`user_agent` text,
	`downloaded_at` integer NOT NULL,
	FOREIGN KEY (`share_id`) REFERENCES `shares`(`id`) ON UPDATE no action ON DELETE cascade
);
