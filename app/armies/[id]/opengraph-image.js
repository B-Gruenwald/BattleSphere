import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export const runtime     = 'nodejs';
export const alt         = 'BattleSphere Army Portfolio';
export const size        = { width: 800, height: 419 };
export const contentType = 'image/png';

const BG_VOID    = '#0a0a0f';
const BG_DEEP    = '#0f0f1a';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#a09880';
const TEXT_MUT   = '#5a5445';
const BORDER_DIM = 'rgba(255, 255, 255, 0.10)';

// Canvas — 800×419 (scaled from 1200×630 for WhatsApp <600 KB limit)
const W = 800, H = 419;
const PHOTO_W = H;       // 419 — square photo panel
const TEXT_W  = W - H;  // 381

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

  const fontOptions = {
    fonts: [
      { name: 'Cinzel', data: cinzel400, weight: 400, style: 'normal' },
      { name: 'Cinzel', data: cinzel700, weight: 700, style: 'normal' },
      { name: 'Cinzel', data: cinzel900, weight: 900, style: 'normal' },
    ],
  };

  const { data: armyRows } = await admin.from('armies').select('*').eq('id', id).limit(1);
  const army = armyRows?.[0] ?? null;

  if (!army) {
    return new ImageResponse(
      (<div style={{ width: W, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: BG_VOID, fontFamily: 'Cinzel' }}>
        <div style={{ fontSize: 21, letterSpacing: 5, textTransform: 'uppercase', color: GOLD }}>BattleSphere</div>
      </div>),
      { ...size, ...fontOptions }
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
  const coverUrl    = army.cover_image_url ? cropUrl(army.cover_image_url, PHOTO_W, PHOTO_W) : null;
  const nameSize    = armyName.length > 28 ? 35 : armyName.length > 18 ? 43 : 51;
  const unitLabel   = String(unitCount) + (unitCount === 1 ? ' Unit' : ' Units');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: BG_VOID,
        backgroundImage: `radial-gradient(ellipse at top right, ${GOLD}22 0%, transparent 55%), linear-gradient(180deg, ${BG_VOID} 0%, ${BG_DEEP} 100%)`,
        color: TEXT_PRI, fontFamily: 'Cinzel' }}>

        {/* LEFT: cover photo or placeholder */}
        <div style={{ width: PHOTO_W, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRight: `1px solid ${BORDER_DIM}`, backgroundColor: BG_DEEP, flexShrink: 0 }}>
          {coverUrl ? (
            <img src={coverUrl} width={PHOTO_W} height={H}
              style={{ width: PHOTO_W, height: H, objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: TEXT_MUT }}>
              <div style={{ width: 19, height: 19, backgroundColor: GOLD, transform: 'rotate(45deg)', opacity: 0.35, marginBottom: 15 }} />
              <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase' }}>Army Portfolio</div>
            </div>
          )}
        </div>

        {/* RIGHT: text panel */}
        <div style={{ width: TEXT_W, height: H, padding: '40px 35px', display: 'flex',
          flexDirection: 'column', justifyContent: 'space-between' }}>

          {/* Brand stamp */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 9, height: 9, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 9 }} />
            <div style={{ fontSize: 12, letterSpacing: 5, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>
              BattleSphere
            </div>
          </div>

          {/* Title block */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: nameSize, lineHeight: 1.05, letterSpacing: 2,
              textTransform: 'uppercase', color: TEXT_PRI, fontWeight: 900, marginBottom: 12 }}>
              {armyName}
            </div>
            {factionName ? (
              <div style={{ fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', color: GOLD_BRT, fontWeight: 600, marginBottom: 5 }}>
                {factionName}
              </div>
            ) : null}
            {playerName ? (
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_SEC }}>
                {playerName}
              </div>
            ) : null}
          </div>

          {/* Bottom bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: `1px solid ${BORDER_DIM}`, paddingTop: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: TEXT_MUT, textTransform: 'uppercase' }}>
              {unitLabel}
            </div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
          </div>
        </div>
      </div>
    ),
    { ...size, ...fontOptions }
  );
}
