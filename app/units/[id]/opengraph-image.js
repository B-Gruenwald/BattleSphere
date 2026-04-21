import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

// Rendered at /units/[id]/opengraph-image and auto-injected as og:image.
// Discord / Slack / WhatsApp / iMessage all show this in link previews.

export const runtime = 'nodejs';
export const alt     = 'BattleSphere Unit Portrait';
export const size    = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand palette (hardcoded — CSS variables aren't supported in Satori).
const BG_VOID    = '#0a0a0f';
const BG_DEEP    = '#0f0f1a';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#a09880';
const TEXT_MUT   = '#5a5445';
const BORDER_DIM = 'rgba(255, 255, 255, 0.10)';

// Cloudinary transformation — serve a 630x630 square directly.
function squareify(url, size = 630) {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${size},h_${size},q_auto,f_auto/`);
}

export default async function OgImage({ params }) {
  const { id } = await params;
  const admin  = createAdminClient();

  // Fetch unit, army, first photo in parallel where possible.
  const { data: unitRows } = await admin
    .from('army_units')
    .select('*')
    .eq('id', id)
    .limit(1);
  const unit = unitRows?.[0] ?? null;

  let army = null;
  let photoUrl = null;

  if (unit) {
    const { data: armyRows } = await admin
      .from('armies')
      .select('*')
      .eq('id', unit.army_id)
      .limit(1);
    army = armyRows?.[0] ?? null;

    const { data: photos } = await admin
      .from('army_unit_photos')
      .select('*')
      .eq('unit_id', unit.id)
      .order('is_portrait', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    photoUrl = photos?.[0]?.url ?? null;
  }

  const unitName    = unit?.name || 'Unit';
  const armyName    = army?.name || '';
  const factionName = army?.faction_name || '';
  const squareUrl   = squareify(photoUrl, 630);

  // Load Cinzel font for Satori (woff format — woff2 is not supported)
  const cinzel400 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-400.woff'));
  const cinzel700 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-700.woff'));
  const cinzel900 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-900.woff'));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: BG_VOID,
          backgroundImage: `radial-gradient(ellipse at top right, ${GOLD}22 0%, transparent 55%), linear-gradient(180deg, ${BG_VOID} 0%, ${BG_DEEP} 100%)`,
          color: TEXT_PRI,
          fontFamily: 'Cinzel',
        }}
      >
        {/* LEFT: photo (or placeholder) */}
        <div
          style={{
            width: 630,
            height: 630,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: `1px solid ${BORDER_DIM}`,
            backgroundColor: BG_DEEP,
          }}
        >
          {squareUrl ? (
            <img
              src={squareUrl}
              width={630}
              height={630}
              style={{ width: 630, height: 630, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: TEXT_MUT,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: GOLD,
                  transform: 'rotate(45deg)',
                  opacity: 0.35,
                  marginBottom: 22,
                }}
              />
              <div style={{ fontSize: 22, letterSpacing: 6, textTransform: 'uppercase' }}>
                Portrait Pending
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: text panel */}
        <div
          style={{
            width: 570,
            height: 630,
            padding: '60px 52px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top: brand stamp */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 14,
                height: 14,
                backgroundColor: GOLD,
                transform: 'rotate(45deg)',
                marginRight: 14,
              }}
            />
            <div
              style={{
                fontSize: 18,
                letterSpacing: 8,
                textTransform: 'uppercase',
                color: GOLD,
                fontWeight: 700,
              }}
            >
              BattleSphere
            </div>
          </div>

          {/* Middle: title block */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: unitName.length > 22 ? 56 : 72,
                lineHeight: 1.05,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: TEXT_PRI,
                fontWeight: 900,
                marginBottom: 18,
              }}
            >
              {unitName}
            </div>
            {armyName && (
              <div
                style={{
                  fontSize: 22,
                  letterSpacing: 5,
                  textTransform: 'uppercase',
                  color: GOLD_BRT,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {armyName}
              </div>
            )}
            {factionName && (
              <div
                style={{
                  fontSize: 18,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                  color: TEXT_SEC,
                }}
              >
                {factionName}
              </div>
            )}
          </div>

          {/* Bottom: URL vignette */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: `1px solid ${BORDER_DIM}`,
              paddingTop: 18,
            }}
          >
            <div style={{ fontSize: 15, letterSpacing: 3, color: TEXT_MUT, textTransform: 'uppercase' }}>
              Narrative Campaign Platform
            </div>
            <div style={{ fontSize: 16, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>
              battlesphere.cc
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Cinzel', data: cinzel400, weight: 400, style: 'normal' },
        { name: 'Cinzel', data: cinzel700, weight: 700, style: 'normal' },
        { name: 'Cinzel', data: cinzel900, weight: 900, style: 'normal' },
      ],
    }
  );
}
