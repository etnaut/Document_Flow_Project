-- Migration: add pre_assigned_role column to User_Tbl
-- Run this against your PostgreSQL database connected to the application.

BEGIN;

ALTER TABLE IF EXISTS User_Tbl
ADD COLUMN IF NOT EXISTS pre_assigned_role TEXT;

COMMIT;

-- You can run this with psql or your preferred DB tool, for example:
-- psql "postgres://user:pass@host:port/dbname" -f 001-add-pre_assigned_role.sql
