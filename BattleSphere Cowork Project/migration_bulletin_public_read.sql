-- ═══════════════════════════════════════════════════════════
--  BattleSphere — Allow public visitors to read bulletin dispatches
--
--  Run this in the Supabase SQL editor.
--
--  Effect: anyone (including unauthenticated visitors) can read
--  bulletin_dispatches rows. This powers the Bulletin Panel on the
--  public campaign page (/campaign/[slug]). Organisers still have
--  exclusive INSERT / UPDATE / DELETE access via the existing policy.
-- ═══════════════════════════════════════════════════════════

create policy "Public can view bulletins"
  on bulletin_dispatches for select
  using (true);
