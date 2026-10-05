-- Migration: Initial schema
-- Created: 2026-10-04

-- Users table
CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `display_name` text NOT NULL,
  `full_name` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);

-- Tools table
CREATE TABLE `tools` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text NOT NULL,
  `input_schema` text NOT NULL,
  `kind` text DEFAULT 'builtin' NOT NULL,
  `enabled` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Agents table
CREATE TABLE `agents` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `model` text DEFAULT 'claude-opus-5' NOT NULL,
  `system_prompt` text DEFAULT '' NOT NULL,
  `tool_ids` text DEFAULT '[]' NOT NULL,
  `max_steps` integer DEFAULT 10 NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);

CREATE INDEX `agents_user_id_idx` ON `agents` (`user_id`);

-- Runs table
CREATE TABLE `runs` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_id` text NOT NULL,
  `user_id` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `input` text NOT NULL,
  `output` text,
  `error` text,
  `step_count` integer DEFAULT 0 NOT NULL,
  `started_at` text,
  `completed_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);

CREATE INDEX `runs_agent_id_idx` ON `runs` (`agent_id`);
CREATE INDEX `runs_user_id_idx` ON `runs` (`user_id`);
CREATE INDEX `runs_status_idx` ON `runs` (`status`);

-- Run steps table
CREATE TABLE `run_steps` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL,
  `step_index` integer NOT NULL,
  `kind` text NOT NULL,
  `content` text NOT NULL,
  `tool_id` text,
  `duration_ms` integer,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON DELETE cascade
);

CREATE INDEX `run_steps_run_id_idx` ON `run_steps` (`run_id`);
CREATE INDEX `run_steps_run_step_idx` ON `run_steps` (`run_id`, `step_index`);
