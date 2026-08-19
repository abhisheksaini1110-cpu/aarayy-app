/*
# Add project_type column to documents

## Overview
Adds a `project_type` column to the `documents` table to track whether
a quote or invoice is for a Residential or Commercial renovation project.

## 1. Modified Tables
- `documents` — new column `project_type` (text, nullable, values 'Residential'
  or 'Commercial'). Defaults to null so existing rows are unaffected.

## 2. Security
- No RLS policy changes. Existing policies cover the new column automatically
  since they use USING (true) / WITH CHECK (true) for authenticated users.

## 3. Notes
- The column is nullable to avoid breaking existing records.
- No index needed for this column at current scale.
*/

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS project_type text;
