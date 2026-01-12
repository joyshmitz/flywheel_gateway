CREATE TABLE `budget_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`threshold` integer NOT NULL,
	`used_percent` real NOT NULL,
	`used_units` integer NOT NULL,
	`budget_units` integer NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`acknowledged` integer DEFAULT false NOT NULL,
	`acknowledged_by` text,
	`acknowledged_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `budget_alerts_budget_idx` ON `budget_alerts` (`budget_id`);--> statement-breakpoint
CREATE INDEX `budget_alerts_threshold_idx` ON `budget_alerts` (`threshold`);--> statement-breakpoint
CREATE INDEX `budget_alerts_created_at_idx` ON `budget_alerts` (`created_at`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`organization_id` text,
	`project_id` text,
	`period` text NOT NULL,
	`amount_units` integer NOT NULL,
	`alert_thresholds` text NOT NULL,
	`action_on_exceed` text DEFAULT 'alert' NOT NULL,
	`rollover` integer DEFAULT false NOT NULL,
	`effective_date` integer NOT NULL,
	`expires_at` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `budgets_organization_idx` ON `budgets` (`organization_id`);--> statement-breakpoint
CREATE INDEX `budgets_project_idx` ON `budgets` (`project_id`);--> statement-breakpoint
CREATE INDEX `budgets_enabled_idx` ON `budgets` (`enabled`);--> statement-breakpoint
CREATE INDEX `budgets_effective_date_idx` ON `budgets` (`effective_date`);--> statement-breakpoint
CREATE TABLE `cost_aggregates` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`organization_id` text,
	`project_id` text,
	`agent_id` text,
	`total_cost_units` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`cached_tokens` integer DEFAULT 0 NOT NULL,
	`request_count` integer NOT NULL,
	`success_count` integer NOT NULL,
	`failure_count` integer NOT NULL,
	`by_model` blob,
	`by_provider` blob,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cost_aggregates_period_idx` ON `cost_aggregates` (`period`);--> statement-breakpoint
CREATE INDEX `cost_aggregates_period_start_idx` ON `cost_aggregates` (`period_start`);--> statement-breakpoint
CREATE INDEX `cost_aggregates_organization_idx` ON `cost_aggregates` (`organization_id`);--> statement-breakpoint
CREATE INDEX `cost_aggregates_project_idx` ON `cost_aggregates` (`project_id`);--> statement-breakpoint
CREATE INDEX `cost_aggregates_agent_idx` ON `cost_aggregates` (`agent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cost_aggregates_unique_idx` ON `cost_aggregates` (`period`,`period_start`,`organization_id`,`project_id`,`agent_id`);--> statement-breakpoint
CREATE TABLE `cost_forecasts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`project_id` text,
	`forecast_date` integer NOT NULL,
	`horizon_days` integer NOT NULL,
	`methodology` text NOT NULL,
	`daily_forecasts` blob NOT NULL,
	`total_forecast_units` integer NOT NULL,
	`confidence_lower` integer NOT NULL,
	`confidence_upper` integer NOT NULL,
	`mape` real,
	`rmse` real,
	`historical_days_used` integer NOT NULL,
	`seasonality_detected` integer DEFAULT false NOT NULL,
	`trend_direction` text,
	`trend_strength` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cost_forecasts_organization_idx` ON `cost_forecasts` (`organization_id`);--> statement-breakpoint
CREATE INDEX `cost_forecasts_project_idx` ON `cost_forecasts` (`project_id`);--> statement-breakpoint
CREATE INDEX `cost_forecasts_forecast_date_idx` ON `cost_forecasts` (`forecast_date`);--> statement-breakpoint
CREATE INDEX `cost_forecasts_created_at_idx` ON `cost_forecasts` (`created_at`);--> statement-breakpoint
CREATE TABLE `cost_records` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`organization_id` text,
	`project_id` text,
	`agent_id` text,
	`task_id` text,
	`session_id` text,
	`model` text NOT NULL,
	`provider` text NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`cached_tokens` integer DEFAULT 0 NOT NULL,
	`prompt_cost_units` integer NOT NULL,
	`completion_cost_units` integer NOT NULL,
	`cached_cost_units` integer DEFAULT 0 NOT NULL,
	`total_cost_units` integer NOT NULL,
	`task_type` text,
	`complexity_tier` text,
	`success` integer NOT NULL,
	`request_duration_ms` integer,
	`correlation_id` text,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cost_records_timestamp_idx` ON `cost_records` (`timestamp`);--> statement-breakpoint
CREATE INDEX `cost_records_organization_idx` ON `cost_records` (`organization_id`);--> statement-breakpoint
CREATE INDEX `cost_records_project_idx` ON `cost_records` (`project_id`);--> statement-breakpoint
CREATE INDEX `cost_records_agent_idx` ON `cost_records` (`agent_id`);--> statement-breakpoint
CREATE INDEX `cost_records_model_idx` ON `cost_records` (`model`);--> statement-breakpoint
CREATE INDEX `cost_records_provider_idx` ON `cost_records` (`provider`);--> statement-breakpoint
CREATE INDEX `cost_records_correlation_idx` ON `cost_records` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `cost_records_org_timestamp_idx` ON `cost_records` (`organization_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `model_rate_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`provider` text NOT NULL,
	`prompt_cost_per_1k_tokens` integer NOT NULL,
	`completion_cost_per_1k_tokens` integer NOT NULL,
	`cached_prompt_cost_per_1k_tokens` integer,
	`effective_date` integer NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `model_rate_cards_model_idx` ON `model_rate_cards` (`model`);--> statement-breakpoint
CREATE INDEX `model_rate_cards_provider_idx` ON `model_rate_cards` (`provider`);--> statement-breakpoint
CREATE INDEX `model_rate_cards_effective_date_idx` ON `model_rate_cards` (`effective_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `model_rate_cards_model_effective_idx` ON `model_rate_cards` (`model`,`provider`,`effective_date`);--> statement-breakpoint
CREATE TABLE `optimization_recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`current_cost_units` integer NOT NULL,
	`optimized_cost_units` integer NOT NULL,
	`estimated_savings_units` integer NOT NULL,
	`savings_percent` real NOT NULL,
	`confidence` real NOT NULL,
	`implementation` text NOT NULL,
	`risk` text NOT NULL,
	`effort_hours` integer,
	`prerequisites` text,
	`organization_id` text,
	`project_id` text,
	`affected_agents` text,
	`affected_models` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`implemented_at` integer,
	`implemented_by` text,
	`rejected_reason` text,
	`actual_savings_units` integer,
	`validated_at` integer,
	`priority` integer DEFAULT 3 NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `optimization_recommendations_category_idx` ON `optimization_recommendations` (`category`);--> statement-breakpoint
CREATE INDEX `optimization_recommendations_status_idx` ON `optimization_recommendations` (`status`);--> statement-breakpoint
CREATE INDEX `optimization_recommendations_organization_idx` ON `optimization_recommendations` (`organization_id`);--> statement-breakpoint
CREATE INDEX `optimization_recommendations_project_idx` ON `optimization_recommendations` (`project_id`);--> statement-breakpoint
CREATE INDEX `optimization_recommendations_priority_idx` ON `optimization_recommendations` (`priority`);--> statement-breakpoint
CREATE INDEX `optimization_recommendations_created_at_idx` ON `optimization_recommendations` (`created_at`);