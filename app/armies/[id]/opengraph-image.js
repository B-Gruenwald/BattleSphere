import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

// Rendered at /armies/[id]/opengraph-image
// Layout: if army has a cover image → 480px photo left + 720px text right
//         otherwise → full-width centred text card

export const runtime     = 'nodejs';
export const alt         = 'BattleSphere Army Portfolio';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ── Brand palette (hardcoded — CSS vars not available in Satori) ─────────────
const BG_VOID    = '#0a0a0f';
const BG_DEEP    = '#0f0f1a';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#a09880';
const TEXT_MUT   = '#5a5445';
const BORDER_DIM = 'rgba(255,255,255,0.09)';

function trunc(str, max) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

function cropUrl(url, w, h) {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${w},h_${h},q_auto,f_auto/`);
}

export default async function OgImage({ params }) {
  const { id } = await params;
  const admin = createAdminClient();

  // ── Fonts ──────────────────────────────────────────────────────────────────
  const cinzel400 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-400.woff'));
  const cinzel700 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-700.woff'));
  const cinzel900 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-900.woff'));
  const fontOptions = {
    fonts: [
      { name: 'Cinzel', data: cinzel400, weight: 400, style: 'normal' },
      { name: 'Cinzel', data: cinzel700, weight: 700, style: 'normal' },
      { name: 'Cinzel', data: cinzel900, weight: 900, style: 'normal' },
    ],
  };

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: armyRows } = await admin
    .from('armies').select('*').eq('id', id).limit(1);
  const army = armyRows?.[0] ?? null;

  // Generic fallback if army not found
  if (!army) {
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: BG_VOID, fontFamily: 'Cinzel' }}>
          <div style={{ fontSize: 32, letterSpacing: 8, textTransform: 'uppercase', color: GOLD }}>BattleSphere</div>
        </div>
      ),
      { ...size, ...fontOptions }
    );
  }

  // Player name
  const { data: profileRows } = await admin
    .from('profiles').select('username').eq('id', army.player_id).limit(1);
  const playerName = profileRows?.[0]?.username ?? null;

  // Unit count
  const { count: unitCount } = await admin
    .from('army_units')
    .select('*', { count: 'exact', head: true })
    .eq('army_id', id);

  const armyName    = trunc(army.name || 'Unnamed Army', 60);
  const factionName = army.faction_name ? trunc(army.faction_name, 40) : null;
  const factionCol  = army.faction_colour || GOLD;
  const coverUrl    = army.cover_image_url || null;
  const description = army.description ? trunc(army.description, 120) : null;

  // ── PHOTO LAYOUT ───────────────────────────────────────────────────────────
  if (coverUrl) {
    const PHOTO_W = 480;
    const TEXT_W  = 720;
    const croppedCover = cropUrl(coverUrl, PHOTO_W, 630);

    const nameSize = armyName.length > 30 ? 36 : armyName.length > 20 ? 44 : 52;

    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: 'flex', flexDirection: 'row', backgroundColor: BG_VOID, fontFamily: 'Cinzel', color: TEXT_PRI }}>

          {/* ── LEFT: cover photo ── */}
          <div style={{ width: PHOTO_W, height: 630, display: 'flex', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
            <img
              src={croppedCover}
              width={PHOTO_W}
              height={630}
              style={{ width: PHOTO_W, height: 630, objectFit: 'cover' }}
            />
            {/* Right-edge fade into text panel */}
            <div style={{
              position: 'absolute', top: 0, right: 0, width: 100, height: 630,
              display: 'flex',
              backgroundImage: `linear-gradient(90deg, transparent 0%, ${BG_VOID} 100%)`,
            }} />
          </div>

          {/* ── RIGHT: text panel ── */}
          <div style={{ width: TEXT_W, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px 52px 28px 36px' }}>

            {/* Top: brand + "Army Portfolio" badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 10 }} />
                <div style={{ fontSize: 14, letterSpacing: 7, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
              </div>
              <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: TEXT_MUT }}>Army Portfolio</div>
            </div>

            {/* Middle: army name + faction + player */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', gap: 0 }}>
              {/* Army name */}
              <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_PRI, lineHeight: 1.05, marginBottom: 18 }}>
                {armyName}
              </div>

              {/* Faction colour bar + name */}
              {factionName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 3, backgroundColor: factionCol, opacity: 0.85, flexShrink: 0 }} />
                  <div style={{ fontSize: 15, letterSpacing: 4, textTransform: 'uppercase', color: TEXT_SEC }}>{factionName}</div>
                </div>
              )}

              {/* Player name */}
              {playerName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: description ? 16 : 0 }}>
                  <div style={{ fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: TEXT_MUT }}>Commanded by</div>
                  <div style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_SEC, fontWeight: 700 }}>{playerName}</div>
                </div>
              )}

              {/* Description excerpt */}
              {description && (
                <div style={{ fontSize: 16, color: TEXT_SEC, fontStyle: 'italic', lineHeight: 1.6, marginTop: 4 }}>
                  "{description}"
                </div>
              )}
            </div>

            {/* Bottom: unit count + URL */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${BORDER_DIM}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, backgroundColor: factionCol, transform: 'rotate(45deg)', opacity: 0.8 }} />
                <div style={{ fontSize: 12, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>
                  {unitCount ?? 0} {(unitCount ?? 0) === 1 ? 'Unit' : 'Units'}
                </div>
              </div>
              <div style={{ fontSize: 13, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
            </div>
          </div>
        </div>
      ),
      { ...size, ...fontOptions }
    );
  }

  // ── TEXT-ONLY LAYOUT (no cover image) ─────────────────────────────────────
  const nameSize = armyName.length > 35 ? 44 : armyName.length > 20 ? 56 : 68;

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630, display: 'flex', flexDirection: 'column',
        backgroundColor: BG_VOID,
        backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 100%, ${factionCol}22 0%, transparent 60%)`,
        fontFamily: 'Cinzel', color: TEXT_PRI,
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 52px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 12 }} />
            <div style={{ fontSize: 16, letterSpacing: 8, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
          </div>
          <div style={{ fontSize: 12, letterSpacing: 5, textTransform: 'uppercase', color: TEXT_MUT }}>Army Portfolio</div>
        </div>

        {/* Main: army name + faction + player */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
          <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'center', lineHeight: 1.05, marginBottom: 24 }}>
            {armyName}
          </div>
          {factionName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 40, height: 3, backgroundColor: factionCol, opacity: 0.85, flexShrink: 0 }} />
              <div style={{ fontSize: 18, letterSpacing: 5, textTransform: 'uppercase', color: TEXT_SEC }}>{factionName}</div>
              <div style={{ width: 40, height: 3, backgroundColor: factionCol, opacity: 0.85, flexShrink: 0 }} />
            </div>
          )}
          {playerName && (
            <div style={{ fontSize: 14, letterSpacing: 5, textTransform: 'uppercase', color: TEXT_MUT, marginTop: 4 }}>
              Commanded by {playerName}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 52px 28px', borderTop: `1px solid ${BORDER_DIM}`, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, backgroundColor: factionCol, transform: 'rotate(45deg)', opacity: 0.8 }} />
            <div style={{ fontSize: 13, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>
              {unitCount ?? 0} {(unitCount ?? 0) === 1 ? 'Unit' : 'Units'}
            </div>
          </div>
          <div style={{ fontSize: 14, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
        </div>
      </div>
    ),
    { ...size, ...fontOptions }
  );
}
