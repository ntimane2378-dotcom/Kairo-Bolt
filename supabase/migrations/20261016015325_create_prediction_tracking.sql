/*
# Create prediction tracking records

1. New Tables
- `prediction_records`: Stores each generated Kairo prediction so future market prices can score it.
- `id` (uuid, primary key)
- `asset_id` (text, crypto ID or stock symbol)
- `asset_type` (text, crypto or stock)
- `symbol` (text, display ticker)
- `name` (text, display asset name)
- `recommendation` (text, generated recommendation)
- `predicted_direction` (text, bullish, neutral, or bearish)
- `price_at_prediction` (numeric, observed price when prediction was created)
- `horizon_days` (integer, evaluation horizon)
- `created_at` (timestamptz)
- `evaluated_at` (timestamptz, when outcome was checked)
- `evaluated_price` (numeric, observed price at evaluation)
- `outcome_correct` (boolean, whether the directional call was correct)

2. Security
- Enable RLS on `prediction_records`.
- Allow anon and authenticated CRUD because the app currently has no sign-in screen and uses a shared workspace.

3. Notes
- Records are append-only from the app’s perspective; evaluation updates only outcome fields.
- A seven-day horizon is used for the track record shown in the app.
*/

CREATE TABLE IF NOT EXISTS prediction_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  asset_type text NOT NULL DEFAULT 'crypto',
  symbol text NOT NULL,
  name text NOT NULL,
  recommendation text NOT NULL,
  predicted_direction text NOT NULL,
  price_at_prediction numeric NOT NULL,
  horizon_days integer NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  evaluated_at timestamptz,
  evaluated_price numeric,
  outcome_correct boolean
);

CREATE INDEX IF NOT EXISTS prediction_records_asset_created_idx
  ON prediction_records (asset_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prediction_records_evaluated_idx
  ON prediction_records (evaluated_at, outcome_correct);

ALTER TABLE prediction_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_prediction_records" ON prediction_records;
CREATE POLICY "anon_select_prediction_records" ON prediction_records FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_prediction_records" ON prediction_records;
CREATE POLICY "anon_insert_prediction_records" ON prediction_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_prediction_records" ON prediction_records;
CREATE POLICY "anon_update_prediction_records" ON prediction_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_prediction_records" ON prediction_records;
CREATE POLICY "anon_delete_prediction_records" ON prediction_records FOR DELETE
  TO anon, authenticated USING (true);
