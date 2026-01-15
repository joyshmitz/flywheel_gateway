CREATE TABLE `dashboard_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`dashboard_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dashboard_favorites_user_idx` ON `dashboard_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `dashboard_favorites_dashboard_idx` ON `dashboard_favorites` (`dashboard_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_favorites_unique_idx` ON `dashboard_favorites` (`user_id`,`dashboard_id`);--> statement-breakpoint
CREATE TABLE `dashboard_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`dashboard_id` text NOT NULL,
	`user_id` text NOT NULL,
	`permission` text NOT NULL,
	`granted_at` integer NOT NULL,
	`granted_by` text,
	FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dashboard_permissions_dashboard_idx` ON `dashboard_permissions` (`dashboard_id`);--> statement-breakpoint
CREATE INDEX `dashboard_permissions_user_idx` ON `dashboard_permissions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_permissions_unique_idx` ON `dashboard_permissions` (`dashboard_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `dashboards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`workspace_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`layout` blob NOT NULL,
	`widgets` blob NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`team_id` text,
	`public_slug` text,
	`require_auth` integer DEFAULT true NOT NULL,
	`embed_enabled` integer DEFAULT false NOT NULL,
	`embed_token` text,
	`refresh_interval` integer DEFAULT 60 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `dashboards_workspace_idx` ON `dashboards` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `dashboards_owner_idx` ON `dashboards` (`owner_id`);--> statement-breakpoint
CREATE INDEX `dashboards_visibility_idx` ON `dashboards` (`visibility`);--> statement-breakpoint
CREATE INDEX `dashboards_team_idx` ON `dashboards` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `dashboards_public_slug_idx` ON `dashboards` (`public_slug`);--> statement-breakpoint
CREATE INDEX `dashboards_created_at_idx` ON `dashboards` (`created_at`);--> statement-breakpoint
ALTER TABLE `dcg_blocks` ADD `pack` text;--> statement-breakpoint
ALTER TABLE `dcg_blocks` ADD `severity` text;--> statement-breakpoint
ALTER TABLE `dcg_blocks` ADD `rule_id` text;--> statement-breakpoint
ALTER TABLE `dcg_blocks` ADD `context_classification` text;