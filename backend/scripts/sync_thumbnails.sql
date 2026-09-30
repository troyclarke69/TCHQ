-- One-off update: set the `thumbnail` field for the 14 projects shown on
-- the page, once the corresponding files are copied into the frontend's
-- public folder for deployment.
--
-- Paths below assume the files sit at the public ROOT (Vite serves
-- frontend/public/<file> as /<file> -- NOT /public/<file>). If you instead
-- copied them into a subfolder, e.g. frontend/public/thumbnails/, prepend
-- that folder to every path below (e.g. '/thumbnails/freight-audit-combo.svg').
--
-- CherryTree, VTranslator and TCHQ Portfolio are deliberately left out --
-- CherryTree isn't included on this page, and VTranslator / TCHQ Portfolio
-- aren't projects on this page at all.
--
-- Run this against Neon (psql, or Neon's SQL editor in the dashboard), not
-- your local Docker Compose db, unless that's actually what you intend.

BEGIN;

UPDATE projects SET thumbnail = '/freight-audit-combo.svg'
  WHERE lower(trim(title)) = lower(trim('Freight Audit'));

UPDATE projects SET thumbnail = '/paybuddy-combo.svg'
  WHERE lower(trim(title)) = lower(trim('PayBuddy'));

UPDATE projects SET thumbnail = '/rbac-combo.svg'
  WHERE lower(trim(title)) = lower(trim('RBAC Identity Service'));

UPDATE projects SET thumbnail = '/claimlens-combo.svg'
  WHERE lower(trim(title)) = lower(trim('ClaimLens'));

UPDATE projects SET thumbnail = '/job-market-analyzer-combo.svg'
  WHERE lower(trim(title)) = lower(trim('Job Market Analyzer'));

UPDATE projects SET thumbnail = '/vibe-agent-combo.svg'
  WHERE lower(trim(title)) = lower(trim('vibe-agent'));

UPDATE projects SET thumbnail = '/smedj-combo.svg'
  WHERE lower(trim(title)) = lower(trim('smedj'));

UPDATE projects SET thumbnail = '/rmap-combo.svg'
  WHERE lower(trim(title)) = lower(trim('RMAP'));

UPDATE projects SET thumbnail = '/marketing-attribution-engine-combo.svg'
  WHERE lower(trim(title)) = lower(trim('Marketing Attribution Engine'));

UPDATE projects SET thumbnail = '/triune-combo.svg'
  WHERE lower(trim(title)) = lower(trim('Triune'));

UPDATE projects SET thumbnail = '/projectry-combo.svg'
  WHERE lower(trim(title)) = lower(trim('Projectry'));

UPDATE projects SET thumbnail = '/blackjackmatch-combo.svg'
  WHERE lower(trim(title)) = lower(trim('BlackJackMatch'));

UPDATE projects SET thumbnail = '/seeyou2-combo.svg'
  WHERE lower(trim(title)) = lower(trim('SeeYou2'));

UPDATE projects SET thumbnail = '/tcrm-combo.svg'
  WHERE lower(trim(title)) = lower(trim('TCRM'));

-- Sanity check before you commit -- make sure all 14 rows actually matched
-- and the paths look right. If any row here has NULL/unexpected values,
-- ROLLBACK instead and check the title spelling in Neon vs. this script.
SELECT title, thumbnail FROM projects ORDER BY title;

COMMIT;
-- If something looked wrong in the SELECT above, run ROLLBACK; instead of
-- COMMIT; before closing this session.
