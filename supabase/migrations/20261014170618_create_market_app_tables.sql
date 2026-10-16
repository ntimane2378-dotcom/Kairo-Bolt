/*
# Create market analysis app tables (single-tenant, no auth)

1. New Tables
- `price_alerts`: Stores user price alerts for crypto and stocks
  - id (uuid, primary key)
  - asset_id (text, identifier like "bitcoin" or "AAPL")
  - asset_type (text, "crypto" or "stock")
  - symbol (text, display symbol like BTC or AAPL)
  - name (text, display name)
  - target_price (numeric, the price threshold)
  - direction (text, "above" or "below")
  - active (boolean, whether alert is still monitoring)
  - triggered (boolean, whether the alert was fired)
  - current_price (numeric, last known price when alert was set)
  - created_at (timestamptz)

- `watchlist`: Stores user's saved assets for quick access
  - id (uuid, primary key)
  - asset_id (text, identifier)
  - asset_type (text, "crypto" or "stock")
  - symbol (text, display symbol)
  - name (text, display name)
  - image (text, URL to asset image/logo)
  - created_at (timestamptz)

- `chat_history`: Stores AI assistant conversation history
  - id (uuid, primary key)
  - role (text, "user" or "assistant")
  - content (text, message content)
  - created_at (timestamptz)

2. Security
- Enable RLS on all tables.
- Allow anon + authenticated CRUD because this is a single-tenant app with no sign-in.
*/

CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  asset_type text NOT NULL DEFAULT 'crypto',
  symbol text NOT NULL,
  name text NOT NULL,
  target_price numeric NOT NULL,
  direction text NOT NULL DEFAULT 'above',
  active boolean NOT NULL DEFAULT true,
  triggered boolean NOT NULL DEFAULT false,
  current_price numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_price_alerts" ON price_alerts;
CREATE POLICY "anon_select_price_alerts" ON price_alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_price_alerts" ON price_alerts;
CREATE POLICY "anon_insert_price_alerts" ON price_alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_price_alerts" ON price_alerts;
CREATE POLICY "anon_update_price_alerts" ON price_alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_price_alerts" ON price_alerts;
CREATE POLICY "anon_delete_price_alerts" ON price_alerts FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL,
  asset_type text NOT NULL DEFAULT 'crypto',
  symbol text NOT NULL,
  name text NOT NULL,
  image text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_watchlist" ON watchlist;
CREATE POLICY "anon_select_watchlist" ON watchlist FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_watchlist" ON watchlist;
CREATE POLICY "anon_insert_watchlist" ON watchlist FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_watchlist" ON watchlist;
CREATE POLICY "anon_update_watchlist" ON watchlist FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_watchlist" ON watchlist;
CREATE POLICY "anon_delete_watchlist" ON watchlist FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat_history" ON chat_history;
CREATE POLICY "anon_select_chat_history" ON chat_history FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat_history" ON chat_history;
CREATE POLICY "anon_insert_chat_history" ON chat_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chat_history" ON chat_history;
CREATE POLICY "anon_update_chat_history" ON chat_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat_history" ON chat_history;
CREATE POLICY "anon_delete_chat_history" ON chat_history FOR DELETE
  TO anon, authenticated USING (true);
