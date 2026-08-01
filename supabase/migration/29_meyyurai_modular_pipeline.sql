-- Migration: Add internal_case_summary to ai_sessions
-- This enables the multi-stage Investigative Legal Agent pipeline to save its extracted facts
-- and use them dynamically to drive the retrieval engine in subsequent turns.

ALTER TABLE ai_sessions
ADD COLUMN IF NOT EXISTS internal_case_summary JSONB DEFAULT NULL;
