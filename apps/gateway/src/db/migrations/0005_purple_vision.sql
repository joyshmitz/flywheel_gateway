CREATE TABLE `dcg_config` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled_packs` text NOT NULL,
	`disabled_packs` text NOT NULL,
	`critical_mode` text DEFAULT 'deny' NOT NULL,
	`high_mode` text DEFAULT 'deny' NOT NULL,
	`medium_mode` text DEFAULT 'warn' NOT NULL,
	`low_mode` text DEFAULT 'log' NOT NULL,
	`updated_by` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dcg_config_history` (
	`id` text PRIMARY KEY NOT NULL,
	`config_snapshot` text NOT NULL,
	`previous_snapshot` text,
	`changed_by` text,
	`changed_at` integer NOT NULL,
	`change_reason` text,
	`change_type` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `dcg_config_history_changed_at_idx` ON `dcg_config_history` (`changed_at`);--> statement-breakpoint
CREATE INDEX `dcg_config_history_changed_by_idx` ON `dcg_config_history` (`changed_by`);