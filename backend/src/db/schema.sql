-- db/schema.sql
--
-- Run this once against your Postgres database to set up the cache tables.
-- e.g. psql $DATABASE_URL -f db/schema.sql

CREATE TABLE IF NOT EXISTS player_gameweek_history (
  player_id     INTEGER NOT NULL,
  gameweek      INTEGER NOT NULL,
  minutes       INTEGER NOT NULL DEFAULT 0,
  points        INTEGER NOT NULL DEFAULT 0,
  xg            NUMERIC(5,2) NOT NULL DEFAULT 0,
  xa            NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_finished   BOOLEAN NOT NULL DEFAULT false, -- true once the gameweek is locked (permanent)
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, gameweek)
);

-- Speeds up "give me this player's last N gameweeks" lookups.
CREATE INDEX IF NOT EXISTS idx_player_history_player_gw
  ON player_gameweek_history (player_id, gameweek DESC);

-- Fixture difficulty is cheap (one API call covers every player), but we
-- cache it too for consistency and to avoid refetching on every request
-- within the same gameweek.
CREATE TABLE IF NOT EXISTS team_fixture_difficulty (
  team_id       INTEGER NOT NULL,
  gameweek      INTEGER NOT NULL,
  fdr           SMALLINT NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, gameweek)
);