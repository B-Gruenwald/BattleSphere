import { createAdminClient } from '@/lib/supabase/admin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.battlesphere.cc';

export default async function sitemap() {
  const admin = createAdminClient();
  const now   = new Date().toISOString();

  // ── 1. Static pages ──────────────────────────────────────────────────────
  const staticUrls = [
    { url: APP_URL,                lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${APP_URL}/campaigns`, lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${APP_URL}/armies`,    lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
  ];

  // ── 2. Public campaign pages ─────────────────────────────────────────────
  let campaignUrls = [];
  try {
    const { data: campaigns } = await admin.from('campaigns').select('*');
    campaignUrls = (campaigns || []).map(c => ({
      url:             `${APP_URL}/campaign/${c.slug}`,
      lastModified:    c.updated_at || now,
      changeFrequency: 'daily',
      priority:        0.8,
    }));
  } catch (_) {}

  // ── 3. Public army portfolio pages ───────────────────────────────────────
  let armyUrls = [];
  let armyIds  = [];
  try {
    const { data: armies } = await admin.from('armies').select('*').eq('is_public', true);
    armyIds   = (armies || []).map(a => a.id);
    armyUrls  = (armies || []).map(a => ({
      url:             `${APP_URL}/armies/${a.id}`,
      lastModified:    a.updated_at || now,
      changeFrequency: 'weekly',
      priority:        0.6,
    }));
  } catch (_) {}

  // ── 4. Unit portrait pages (from public armies only) ─────────────────────
  let unitUrls = [];
  if (armyIds.length > 0) {
    try {
      const { data: units } = await admin.from('army_units').select('*').in('army_id', armyIds);
      unitUrls = (units || []).map(u => ({
        url:             `${APP_URL}/units/${u.id}`,
        lastModified:    u.updated_at || now,
        changeFrequency: 'weekly',
        priority:        0.5,
      }));
    } catch (_) {}
  }

  // ── 5. Battle record pages ───────────────────────────────────────────────
  // Two separate queries to avoid join issues
  let battleUrls = [];
  try {
    const { data: campaigns } = await admin.from('campaigns').select('*');
    const slugMap = Object.fromEntries((campaigns || []).map(c => [c.id, c.slug]));

    const { data: battles } = await admin.from('battles').select('*');
    battleUrls = (battles || [])
      .filter(b => slugMap[b.campaign_id])
      .map(b => ({
        url:             `${APP_URL}/c/${slugMap[b.campaign_id]}/battle/${b.id}`,
        lastModified:    b.updated_at || now,
        changeFrequency: 'monthly',
        priority:        0.4,
      }));
  } catch (_) {}

  return [
    ...staticUrls,
    ...campaignUrls,
    ...armyUrls,
    ...unitUrls,
    ...battleUrls,
  ];
}
