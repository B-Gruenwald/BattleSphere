import { createAdminClient } from '@/lib/supabase/admin';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.battlesphere.cc';

export default async function sitemap() {
  const admin = createAdminClient();
  const now   = new Date().toISOString();

  // ── 1. Static pages ──────────────────────────────────────────────────────
  const staticUrls = [
    { url: APP_URL,               lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${APP_URL}/campaigns`, lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${APP_URL}/armies`,    lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
  ];

  // ── 2. Public campaign pages ─────────────────────────────────────────────
  const { data: campaigns } = await admin
    .from('campaigns')
    .select('slug, updated_at');

  const campaignUrls = (campaigns || []).map(c => ({
    url:             `${APP_URL}/campaign/${c.slug}`,
    lastModified:    c.updated_at || now,
    changeFrequency: 'daily',
    priority:        0.8,
  }));

  // ── 3. Public army portfolio pages ───────────────────────────────────────
  const { data: armies } = await admin
    .from('armies')
    .select('id, updated_at')
    .eq('is_public', true);

  const armyUrls = (armies || []).map(a => ({
    url:             `${APP_URL}/armies/${a.id}`,
    lastModified:    a.updated_at || now,
    changeFrequency: 'weekly',
    priority:        0.6,
  }));

  // ── 4. Unit portrait pages (from public armies only) ─────────────────────
  const armyIds = (armies || []).map(a => a.id);
  let unitUrls = [];
  if (armyIds.length > 0) {
    const { data: units } = await admin
      .from('army_units')
      .select('id, updated_at')
      .in('army_id', armyIds);

    unitUrls = (units || []).map(u => ({
      url:             `${APP_URL}/units/${u.id}`,
      lastModified:    u.updated_at || now,
      changeFrequency: 'weekly',
      priority:        0.5,
    }));
  }

  // ── 5. Battle record pages ───────────────────────────────────────────────
  const { data: battles } = await admin
    .from('battles')
    .select('id, updated_at, campaigns(slug)');

  const battleUrls = (battles || [])
    .filter(b => b.campaigns?.slug)
    .map(b => ({
      url:             `${APP_URL}/c/${b.campaigns.slug}/battle/${b.id}`,
      lastModified:    b.updated_at || now,
      changeFrequency: 'monthly',
      priority:        0.4,
    }));

  return [
    ...staticUrls,
    ...campaignUrls,
    ...armyUrls,
    ...unitUrls,
    ...battleUrls,
  ];
}
