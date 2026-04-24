import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export const runtime     = 'nodejs';
export const alt         = 'BattleSphere Army Portfolio';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG_VOID    = '#0a0a0f';
const BG_DEEP    = '#0f0f1a';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#a09880';
const TEXT_MUT   = '#5a5445';
const BORDER_DIM = 'rgba(255,255,255,0.10)';

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
  const admin  = createAdminClient();

  const cinzel400 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-400.woff'));
  const cinzel700 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-700.woff'));
  const cinzel900 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-900.woff'));
  const fonts = [
    { name: 'Cinzel', data: cinzel400, weight: 400, style: 'normal' },
    { name: 'Cinzel', data: cinzel700, weight: 700, style: 'normal' },
    { name: 'Cinzel', data: cinzel900, weight: 900, style: 'normal' },
  ];

  const { data: armyRows } = await admin.from('armies').select('*').eq('id', id).limit(1);
  const army = armyRows?.[0] ?? null;

  if (!army) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: BG_VOID, fontFamily: 'Cinzel' }}>
          <div style={{ fontSize: 32, letterSpacing: 8, textTransform: 'uppercase', color: GOLD }}>BattleSphere</div>
        </div>
      ),
      { ...size, fonts }
    );
  }

  const [profileResult, unitCountResult] = await Promise.all([
    admin.from('profiles').select('username').eq('id', army.player_id).limit(1),
    admin.from('army_units').select('*', { count: 'exact', head: true }).eq('army_id', id),
  ]);

  const playerName  = profileResult.data?.[0]?.username ?? null;
  const unitCount   = unitCountResult.count ?? 0;
  const armyName    = trunc(army.name || 'Unnamed Army', 50);
  const factionName = army.faction_name ? trunc(army.faction_name, 36) : null;
  const coverUrl    = army.cover_image_url ? cropUrl(army.cover_image_url, 630, 630) : null;
  const nameSize    = armyName.length > 28 ? 52 : armyName.length > 18 ? 64 : 76;

  // ── WITH cover image: square photo left + text right ─────────────────────
  if (coverUrl) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: BG_VOID, fontFamily: 'Cinzel', color: TEXT_PRI }}>

          {/* LEFT: cover photo */}
          <div style={{ width: 630, height: 630, display: 'flex', flexShrink: 0 }}>
            <img src={coverUrl} width={630} height={630} style={{ width: 630, height: 630, objectFit: 'cover' }} />
          </div>

          {/* RIGHT: text panel */}
          <div style={{ width: 570, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 48px 36px 44px' }}>

            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 12, height: 12, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 12 }} />
              <div style={{ fontSize: 15, letterSpacing: 7, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
            </div>

            {/* Army name + faction + player */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_PRI, lineHeight: 1.0, marginBottom: 20 }}>
                {armyName}
              </div>
              {factionName && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ width: 28, height: 3, backgroundColor: GOLD_BRT, marginRight: 12, flexShrink: 0, opacity: 0.8 }} />
                  <div style={{ fontSize: 16, letterSpacing: 4, textTransform: 'uppercase', color: GOLD_BRT }}>{factionName}</div>
                </div>
              )}
              {playerName && (
                <div style={{ fontSize: 14, letterSpacing: 4, textTransform: 'uppercase', color: TEXT_MUT }}>
                  Commanded by {playerName}
                </div>
              )}
            </div>

            {/* Bottom: unit count + URL */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${BORDER_DIM}`, paddingTop: 18 }}>
              <div style={{ fontSize: 13, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>
                {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
              </div>
              <div style={{ fontSize: 15, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
            </div>
          </div>
        </div>
      ),
      { ...size, fonts }
    );
  }

  // ── NO cover image: text-only card ────────────────────────────────────────
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        backgroundColor: BG_VOID,
        backgroundImage: `radial-gradient(ellipse at bottom, ${GOLD}18 0%, transparent 60%), linear-gradient(180deg, ${BG_VOID} 0%, ${BG_DEEP} 100%)`,
        fontFamily: 'Cinzel', color: TEXT_PRI,
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px 52px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 13, height: 13, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 13 }} />
            <div style={{ fontSize: 16, letterSpacing: 8, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
          </div>
          <div style={{ fontSize: 12, letterSpacing: 5, textTransform: 'uppercase', color: TEXT_MUT }}>Army Portfolio</div>
        </div>

        {/* Centre */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
          <div style={{ fontSize: nameSize, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'center', lineHeight: 1.05, marginBottom: 22 }}>
            {armyName}
          </div>
          {factionName && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 36, height: 3, backgroundColor: GOLD_BRT, marginRight: 14, opacity: 0.7, flexShrink: 0 }} />
              <div style={{ fontSize: 18, letterSpacing: 5, textTransform: 'uppercase', color: TEXT_SEC }}>{factionName}</div>
              <div style={{ width: 36, height: 3, backgroundColor: GOLD_BRT, marginLeft: 14, opacity: 0.7, flexShrink: 0 }} />
            </div>
          )}
          {playerName && (
            <div style={{ fontSize: 14, letterSpacing: 5, textTransform: 'uppercase', color: TEXT_MUT, marginTop: 14 }}>
              Commanded by {playerName}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 52px 30px', borderTop: `1px solid ${BORDER_DIM}` }}>
          <div style={{ fontSize: 13, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>
            {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
          </div>
          <div style={{ fontSize: 15, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
