import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export const runtime     = 'nodejs';
export const alt         = 'BattleSphere Battle Record';
export const size        = { width: 800, height: 419 };
export const contentType = 'image/png';

const BG_VOID    = '#0a0a0f';
const BG_DEEP    = '#0f0f1a';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#a09880';
const TEXT_MUT   = '#5a5445';
const BORDER_DIM = 'rgba(255,255,255,0.09)';

// Canvas — 800×419 (scaled from 1200×630 for WhatsApp <600 KB limit)
const W = 800, H = 419;
// Photo layout split: 320 photo + 480 text
const PHOTO_W = 320;
const TEXT_W  = W - PHOTO_W; // 480

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
  const { slug, id } = await params;
  const admin = createAdminClient();

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

  const { data: campRows } = await admin
    .from('campaigns').select('*').eq('slug', slug).limit(1);
  const campaign = campRows?.[0] ?? null;

  const { data: battleRows } = campaign
    ? await admin.from('battles').select('*').eq('id', id).eq('campaign_id', campaign.id).limit(1)
    : { data: [] };
  const battle = battleRows?.[0] ?? null;

  if (!battle) {
    return new ImageResponse(
      (<div style={{ width: W, height: H, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: BG_VOID, color: TEXT_PRI, fontFamily: 'Cinzel' }}>
        <div style={{ fontSize: 21, letterSpacing: 5, textTransform: 'uppercase', color: GOLD }}>BattleSphere</div>
      </div>),
      { ...size, ...fontOptions }
    );
  }

  const { data: factions } = await admin
    .from('factions').select('*').eq('campaign_id', campaign.id);
  const factionMap    = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const attackerFac   = factionMap[battle.attacker_faction_id];
  const defenderFac   = factionMap[battle.defender_faction_id];
  const winnerFac     = factionMap[battle.winner_faction_id];

  let territory = null;
  if (battle.territory_id) {
    const { data: tRows } = await admin
      .from('territories').select('name, image_url').eq('id', battle.territory_id).limit(1);
    territory = tRows?.[0] ?? null;
  }

  let bgPhotoUrl = null;
  const { data: photoRows } = await admin
    .from('battle_photos').select('url').eq('battle_id', id)
    .order('created_at', { ascending: true }).limit(1);
  bgPhotoUrl = photoRows?.[0]?.url ?? null;
  if (!bgPhotoUrl && territory?.image_url) bgPhotoUrl = territory.image_url;

  const isDraw         = !battle.winner_faction_id;
  const attackerWon    = battle.winner_faction_id === battle.attacker_faction_id;
  const defenderWon    = battle.winner_faction_id === battle.defender_faction_id;
  const headline       = battle.headline || null;
  const narrative      = battle.narrative ? trunc(battle.narrative, 100) : null;
  const campaignName   = campaign?.name || 'BattleSphere';
  const attackerName   = attackerFac?.name || 'Attacker';
  const defenderName   = defenderFac?.name || 'Defender';
  const attackerColour = attackerFac?.colour || GOLD;
  const defenderColour = defenderFac?.colour || TEXT_SEC;

  const resultLabel = isDraw
    ? 'Tactical Draw'
    : `${winnerFac?.name || (attackerWon ? attackerName : defenderName)} — Victory`;

  const date = new Date(battle.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const attackerGlow   = attackerWon ? `0 0 24px ${attackerColour}55` : 'none';
  const defenderGlow   = defenderWon ? `0 0 24px ${defenderColour}55` : 'none';
  const attackerOpacity = defenderWon ? 0.55 : 1;
  const defenderOpacity = attackerWon ? 0.55 : 1;

  // ── PHOTO LAYOUT ─────────────────────────────────────────────────────────────
  if (bgPhotoUrl) {
    const croppedPhoto = cropUrl(bgPhotoUrl, PHOTO_W, H);
    const headlineSize = headline
      ? (headline.length > 36 ? 20 : headline.length > 24 ? 24 : 28) : 0;
    const factionSize  = (name) => name.length > 16 ? 17 : 21;

    return new ImageResponse(
      (
        <div style={{ width: W, height: H, display: 'flex', flexDirection: 'row',
          backgroundColor: BG_VOID, fontFamily: 'Cinzel', color: TEXT_PRI }}>

          {/* LEFT: photo */}
          <div style={{ width: PHOTO_W, height: H, display: 'flex', position: 'relative',
            flexShrink: 0, overflow: 'hidden' }}>
            <img src={croppedPhoto} width={PHOTO_W} height={H}
              style={{ width: PHOTO_W, height: H, objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: H,
              display: 'flex', backgroundImage: `linear-gradient(90deg, transparent 0%, ${BG_VOID} 100%)` }} />
          </div>

          {/* RIGHT: text */}
          <div style={{ width: TEXT_W, height: H, display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', padding: '21px 35px 19px 24px' }}>

            {/* Top: brand + campaign */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 7, height: 7, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 7 }} />
                <div style={{ fontSize: 9, letterSpacing: 5, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>
                  BattleSphere
                </div>
              </div>
              <div style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_MUT }}>
                {trunc(campaignName, 32)}
              </div>
            </div>

            {/* Middle: headline + VS + result */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
              justifyContent: 'center' }}>
              {headline ? (
                <div style={{ fontSize: headlineSize, fontWeight: 900, letterSpacing: 2,
                  textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'center',
                  lineHeight: 1.1, marginBottom: 13, maxWidth: TEXT_W - 58 }}>
                  {headline}
                </div>
              ) : null}

              {/* Factions row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', marginBottom: 11 }}>
                {/* Attacker */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-end', paddingRight: 19, opacity: attackerOpacity }}>
                  <div style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT, marginBottom: 4 }}>Attacker</div>
                  <div style={{ fontSize: factionSize(attackerName), fontWeight: 900, letterSpacing: 1,
                    textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'right',
                    lineHeight: 1.05, textShadow: attackerGlow }}>
                    {attackerName}
                  </div>
                  <div style={{ width: 24, height: 2, backgroundColor: attackerColour, marginTop: 5, opacity: 0.8 }} />
                </div>

                {/* VS */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 11px' }}>
                  <div style={{ width: 1, height: 19, backgroundColor: BORDER_DIM }} />
                  <div style={{ width: 8, height: 8, backgroundColor: isDraw ? TEXT_MUT : GOLD,
                    transform: 'rotate(45deg)', margin: '5px 0', opacity: isDraw ? 0.5 : 0.9 }} />
                  <div style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase',
                    color: isDraw ? TEXT_MUT : GOLD_BRT, fontWeight: 700, marginBottom: 5 }}>VS</div>
                  <div style={{ width: 1, height: 19, backgroundColor: BORDER_DIM }} />
                </div>

                {/* Defender */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-start', paddingLeft: 19, opacity: defenderOpacity }}>
                  <div style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT, marginBottom: 4 }}>Defender</div>
                  <div style={{ fontSize: factionSize(defenderName), fontWeight: 900, letterSpacing: 1,
                    textTransform: 'uppercase', color: TEXT_PRI, lineHeight: 1.05, textShadow: defenderGlow }}>
                    {defenderName}
                  </div>
                  <div style={{ width: 24, height: 2, backgroundColor: defenderColour, marginTop: 5, opacity: 0.8 }} />
                </div>
              </div>

              {/* Result */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 8, letterSpacing: 4, textTransform: 'uppercase',
                  color: isDraw ? TEXT_MUT : GOLD_BRT, fontWeight: 700,
                  backgroundColor: isDraw ? 'rgba(255,255,255,0.04)' : `${GOLD}18`,
                  border: `1px solid ${isDraw ? BORDER_DIM : GOLD + '44'}`,
                  padding: '6px 15px' }}>
                  {resultLabel}
                </div>
                {territory ? (
                  <div style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_MUT, marginTop: 7 }}>
                    {territory.name}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Bottom */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: `1px solid ${BORDER_DIM}`, paddingTop: 11 }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: TEXT_MUT, textTransform: 'uppercase' }}>{date}</div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
            </div>
          </div>
        </div>
      ),
      { ...size, ...fontOptions }
    );
  }

  // ── TEXT-ONLY LAYOUT ─────────────────────────────────────────────────────────
  const headlineSize = headline ? (headline.length > 40 ? 25 : 32) : 0;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column',
        backgroundColor: BG_VOID,
        backgroundImage: `
          radial-gradient(ellipse 70% 80% at 20% 50%, rgba(139,26,26,0.12) 0%, transparent 55%),
          radial-gradient(ellipse 70% 80% at 80% 50%, rgba(30,50,139,0.10) 0%, transparent 55%),
          radial-gradient(ellipse 60% 40% at 50% 100%, ${GOLD}18 0%, transparent 50%)
        `,
        color: TEXT_PRI, fontFamily: 'Cinzel' }}>

        {/* TOP BAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '19px 35px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 8 }} />
            <div style={{ fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>BattleSphere</div>
          </div>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT }}>
            {trunc(campaignName, 40)}
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '13px 40px 0' }}>

          {headline ? (
            <div style={{ fontSize: headlineSize, fontWeight: 900, letterSpacing: 2,
              textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'center',
              lineHeight: 1.1, marginBottom: 19, maxWidth: 640 }}>
              {headline}
            </div>
          ) : null}

          {/* Factions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', marginBottom: headline ? 13 : 8 }}>
            {/* Attacker */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'flex-end', paddingRight: 32, opacity: attackerOpacity }}>
              <div style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT, marginBottom: 7 }}>Attacker</div>
              <div style={{ fontSize: attackerName.length > 18 ? 23 : 29, fontWeight: 900, letterSpacing: 2,
                textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'right',
                lineHeight: 1.05, textShadow: attackerGlow }}>
                {attackerName}
              </div>
              <div style={{ width: 32, height: 2, backgroundColor: attackerColour, marginTop: 7, opacity: 0.8 }} />
            </div>

            {/* VS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 21px' }}>
              <div style={{ width: 1, height: 27, backgroundColor: BORDER_DIM }} />
              <div style={{ width: 11, height: 11, backgroundColor: isDraw ? TEXT_MUT : GOLD,
                transform: 'rotate(45deg)', margin: '7px 0', opacity: isDraw ? 0.5 : 0.9 }} />
              <div style={{ fontSize: 9, letterSpacing: 4, textTransform: 'uppercase',
                color: isDraw ? TEXT_MUT : GOLD_BRT, fontWeight: 700, marginBottom: 7 }}>VS</div>
              <div style={{ width: 1, height: 27, backgroundColor: BORDER_DIM }} />
            </div>

            {/* Defender */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', paddingLeft: 32, opacity: defenderOpacity }}>
              <div style={{ fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT, marginBottom: 7 }}>Defender</div>
              <div style={{ fontSize: defenderName.length > 18 ? 23 : 29, fontWeight: 900, letterSpacing: 2,
                textTransform: 'uppercase', color: TEXT_PRI, lineHeight: 1.05, textShadow: defenderGlow }}>
                {defenderName}
              </div>
              <div style={{ width: 32, height: 2, backgroundColor: defenderColour, marginTop: 7, opacity: 0.8 }} />
            </div>
          </div>

          {/* Result */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: narrative ? 12 : 0 }}>
            <div style={{ fontSize: 9, letterSpacing: 5, textTransform: 'uppercase',
              color: isDraw ? TEXT_MUT : GOLD_BRT, fontWeight: 700,
              backgroundColor: isDraw ? 'rgba(255,255,255,0.04)' : `${GOLD}18`,
              border: `1px solid ${isDraw ? BORDER_DIM : GOLD + '44'}`,
              padding: '7px 19px', marginTop: 5 }}>
              {resultLabel}
            </div>
            {territory ? (
              <div style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT, marginTop: 8 }}>
                {territory.name}
              </div>
            ) : null}
          </div>

          {narrative ? (
            <div style={{ fontSize: 11, color: TEXT_SEC, fontStyle: 'italic', textAlign: 'center',
              lineHeight: 1.6, maxWidth: 547, marginTop: 3 }}>
              "{narrative}"
            </div>
          ) : null}
        </div>

        {/* BOTTOM BAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 35px 19px', borderTop: `1px solid ${BORDER_DIM}`, marginTop: 13 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: TEXT_MUT, textTransform: 'uppercase' }}>{date}</div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
        </div>
      </div>
    ),
    { ...size, ...fontOptions }
  );
}
