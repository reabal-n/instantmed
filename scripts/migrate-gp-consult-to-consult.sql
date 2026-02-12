-- Migration: Rename service slug from 'gp-consult' to 'consult'
-- This updates the canonical service slug across all tables.
-- The application code keeps 'gp-consult' as a backward-compatible alias
-- in config registries, so existing references still resolve correctly.

-- 1. Update the services table (canonical slug)
UPDATE services
SET slug = 'consult'
WHERE slug = 'gp-consult';

-- 2. Update intake_drafts that reference the old slug
UPDATE intake_drafts
SET service_slug = 'consult'
WHERE service_slug = 'gp-consult';

-- 3. Update safety_audit_log that references the old slug
UPDATE safety_audit_log
SET service_slug = 'consult'
WHERE service_slug = 'gp-consult';
