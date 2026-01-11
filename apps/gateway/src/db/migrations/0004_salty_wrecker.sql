CREATE TABLE `dcg_pending_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`short_code` text NOT NULL,
	`command` text NOT NULL,
	`command_hash` text NOT NULL,
	`pack` text NOT NULL,
	`rule_id` text NOT NULL,
	`reason` text NOT NULL,
	`severity` text NOT NULL,
	`agent_id` text,
	`block_event_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`denied_by` text,
	`denied_at` integer,
	`deny_reason` text,
	`executed_at` integer,
	`execution_result` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dcg_pending_exceptions_short_code_unique` ON `dcg_pending_exceptions` (`short_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `dcg_pending_short_code_idx` ON `dcg_pending_exceptions` (`short_code`);--> statement-breakpoint
CREATE INDEX `dcg_pending_status_idx` ON `dcg_pending_exceptions` (`status`);--> statement-breakpoint
CREATE INDEX `dcg_pending_agent_idx` ON `dcg_pending_exceptions` (`agent_id`);--> statement-breakpoint
CREATE INDEX `dcg_pending_expires_idx` ON `dcg_pending_exceptions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `dcg_pending_command_hash_idx` ON `dcg_pending_exceptions` (`command_hash`);