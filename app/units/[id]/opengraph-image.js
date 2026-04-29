import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export const runtime     = 'nodejs';
export const alt         = 'BattleSphere Unit Portrait';
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

// Canvas constants — 800×419 (scaled from 1200×630 for WhatsApp <600 KB limit)
const W = 800, H = 419;
const PHOTO_W = H;        // square photo panel = canvas height = 419
const TEXT_W  = W - H;   // 381

function squareify(url, size = PHOTO_W) {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${size},h_${size},q_auto,f_auto/`);
}

export default async function OgImage({ params }) {
  const { id } = await params;
  const admin  = createAdminClient();

  const { data: unitRows } = await admin
    .from('army_units').select('*').eq('id', id).limit(1);
  const unit = unitRows?.[0] ?? null;

  let army = null;
  let photoUrl = null;

  if (unit) {
    const { data: armyRows } = await admin
      .from('armies').select('*').eq('id', unit.army_id).limit(1);
    army = armyRows?.[0] ?? null;

    const { data: photos } = await admin
      .from('army_unit_photos').select('*')
      .eq('unit_id', unit.id)
      .order('is_portrait', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    photoUrl = photos?.[0]?.url ?? null;
  }

  const unitName    = unit?.name || 'Unit';
  const armyName    = army?.name || '';
  const factionName = army?.faction_name || '';
  const squareUrl   = squareify(photoUrl);

  const cinzel400 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-400.woff'));
  const cinzel700 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-700.woff'));
  const cinzel900 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-900.woff'));

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: BG_VOID,
        backgroundImage: `radial-gradient(ellipse at top right, ${GOLD}22 0%, transparent 55%), linear-gradient(180deg, ${BG_VOID} 0%, ${BG_DEEP} 100%)`,
        color: TEXT_PRI, fontFamily: 'Cinzel' }}>

        {/* LEFT: photo */}
        <div style={{ width: PHOTO_W, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRight: `1px solid ${BORDER_DIM}`, backgroundColor: BG_DEEP }}>
          {squareUrl ? (
            <img src={squareUrl} width={PHOTO_W} height={H}
              style={{ width: PHOTO_W, height: H, objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: TEXT_MUT }}>
              <div style={{ width: 19, height: 19, backgroundColor: GOLD, transform: 'rotate(45deg)', opacity: 0.35, marginBottom: 15 }} />
              <div style={{ fontSize: 15, letterSpacing: 4, textTransform: 'uppercase' }}>Portrait Pending</div>
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
            <div style={{ fontSize: unitName.length > 22 ? 37 : 48, lineHeight: 1.05, letterSpacing: 2,
              textTransform: 'uppercase', color: TEXT_PRI, fontWeight: 900, marginBottom: 12 }}>
              {unitName}
            </div>
            {armyName ? (
              <div style={{ fontSize: 15, letterSpacing: 3, textTransform: 'uppercase', color: GOLD_BRT, fontWeight: 600, marginBottom: 5 }}>
                {armyName}
              </div>
            ) : null}
            {factionName ? (
              <div style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_SEC }}>
                {factionName}
              </div>
            ) : null}
          </div>

          {/* Bottom bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: `1px solid ${BORDER_DIM}`, paddingTop: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: TEXT_MUT, textTransform: 'uppercase' }}>
              Narrative Campaign Platform
            </div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
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
