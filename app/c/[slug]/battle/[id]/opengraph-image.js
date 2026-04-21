import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

// Rendered at /c/[slug]/battle/[id]/opengraph-image
// Auto-injected as og:image — shows in Discord, Slack, iMessage, etc.
// Layout: if a battle photo (or territory image) is available, it fills the
// left 480 px; text takes the right 720 px. Without a photo the full 1200 px
// is used with the centred VS layout.

export const runtime     = 'nodejs';
export const alt         = 'BattleSphere Battle Record';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ── Brand palette (hardcoded — CSS vars not supported in Satori) ────────────
const BG_VOID    = '#0a0a0f';
const BG_DEEP    = '#0f0f1a';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#a09880';
const TEXT_MUT   = '#5a5445';
const BORDER_DIM = 'rgba(255,255,255,0.09)';

// ── Helpers ─────────────────────────────────────────────────────────────────
function trunc(str, max) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1) + '…';
}

// Apply Cloudinary crop transform; leave non-Cloudinary URLs (Supabase storage etc.) as-is.
function cropUrl(url, w, h) {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${w},h_${h},q_auto,f_auto/`);
}

// ── Main renderer ────────────────────────────────────────────────────────────
export default async function OgImage({ params }) {
  const { slug, id } = await params;
  const admin = createAdminClient();

  // 1. Load fonts
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

  // 2. Fetch campaign
  const { data: campRows } = await admin
    .from('campaigns').select('*').eq('slug', slug).limit(1);
  const campaign = campRows?.[0] ?? null;

  // 3. Fetch battle
  const { data: battleRows } = campaign
    ? await admin.from('battles').select('*').eq('id', id).eq('campaign_id', campaign.id).limit(1)
    : { data: [] };
  const battle = battleRows?.[0] ?? null;

  // Generic fallback card if battle not found
  if (!battle) {
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: BG_VOID, color: TEXT_PRI, fontFamily: 'Cinzel' }}>
          <div style={{ fontSize: 32, letterSpacing: 8, textTransform: 'uppercase', color: GOLD }}>BattleSphere</div>
        </div>
      ),
      { ...size, ...fontOptions }
    );
  }

  // 4. Fetch factions
  const { data: factions } = await admin
    .from('factions').select('*').eq('campaign_id', campaign.id);
  const factionMap    = Object.fromEntries((factions || []).map(f => [f.id, f]));
  const attackerFac   = factionMap[battle.attacker_faction_id];
  const defenderFac   = factionMap[battle.defender_faction_id];
  const winnerFac     = factionMap[battle.winner_faction_id];

  // 5. Fetch territory (include image_url for background fallback)
  let territory = null;
  if (battle.territory_id) {
    const { data: tRows } = await admin
      .from('territories').select('name, image_url').eq('id', battle.territory_id).limit(1);
    territory = tRows?.[0] ?? null;
  }

  // 6. Background photo: battle photo first, then territory image
  let bgPhotoUrl = null;
  const { data: photoRows } = await admin
    .from('battle_photos')
    .select('url')
    .eq('battle_id', id)
    .order('created_at', { ascending: true })
    .limit(1);
  bgPhotoUrl = photoRows?.[0]?.url ?? null;
  if (!bgPhotoUrl && territory?.image_url) {
    bgPhotoUrl = territory.image_url;
  }

  // 7. Derive display values
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

  const attackerGlow   = attackerWon ? `0 0 36px ${attackerColour}55` : 'none';
  const defenderGlow   = defenderWon ? `0 0 36px ${defenderColour}55` : 'none';
  const attackerOpacity = defenderWon ? 0.55 : 1;
  const defenderOpacity = attackerWon ? 0.55 : 1;

  // ── PHOTO LAYOUT (480 photo + 720 text) ───────────────────────────────────
  if (bgPhotoUrl) {
    const PHOTO_W = 480;
    const TEXT_W  = 720;
    const croppedPhoto = cropUrl(bgPhotoUrl, PHOTO_W, 630);

    // In the narrower text panel scale font sizes down slightly
    const headlineSize  = headline
      ? (headline.length > 36 ? 30 : headline.length > 24 ? 36 : 42)
      : 0;
    const factionSize = (name) => name.length > 16 ? 26 : 32;

    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: BG_VOID,
            fontFamily: 'Cinzel',
            color: TEXT_PRI,
          }}
        >
          {/* ── LEFT: photo panel ───────────────────────── */}
          <div
            style={{
              width: PHOTO_W,
              height: 630,
              display: 'flex',
              position: 'relative',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <img
              src={croppedPhoto}
              width={PHOTO_W}
              height={630}
              style={{ width: PHOTO_W, height: 630, objectFit: 'cover' }}
            />
            {/* Right-edge gradient — blends into text panel */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 120,
                height: 630,
                display: 'flex',
                backgroundImage: `linear-gradient(90deg, transparent 0%, ${BG_VOID} 100%)`,
              }}
            />
          </div>

          {/* ── RIGHT: text panel ───────────────────────── */}
          <div
            style={{
              width: TEXT_W,
              height: 630,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '32px 52px 28px 36px',
            }}
          >
            {/* Top: brand + campaign */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 10 }} />
                <div style={{ fontSize: 14, letterSpacing: 7, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>
                  BattleSphere
                </div>
              </div>
              <div style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT }}>
                {trunc(campaignName, 32)}
              </div>
            </div>

            {/* Middle: headline + VS + result */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', gap: 0 }}>
              {headline && (
                <div style={{
                  fontSize: headlineSize,
                  fontWeight: 900,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: TEXT_PRI,
                  textAlign: 'center',
                  lineHeight: 1.1,
                  marginBottom: 20,
                  maxWidth: TEXT_W - 88,
                }}>
                  {headline}
                </div>
              )}

              {/* Factions row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16 }}>
                {/* Attacker */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 28, opacity: attackerOpacity }}>
                  <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: TEXT_MUT, marginBottom: 6 }}>Attacker</div>
                  <div style={{ fontSize: factionSize(attackerName), fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'right', lineHeight: 1.05, textShadow: attackerGlow }}>
                    {attackerName}
                  </div>
                  <div style={{ width: 36, height: 3, backgroundColor: attackerColour, marginTop: 8, opacity: 0.8 }} />
                </div>

                {/* VS divider */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>
                  <div style={{ width: 1, height: 28, backgroundColor: BORDER_DIM }} />
                  <div style={{ width: 12, height: 12, backgroundColor: isDraw ? TEXT_MUT : GOLD, transform: 'rotate(45deg)', margin: '7px 0', opacity: isDraw ? 0.5 : 0.9 }} />
                  <div style={{ fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', color: isDraw ? TEXT_MUT : GOLD_BRT, fontWeight: 700, marginBottom: 7 }}>VS</div>
                  <div style={{ width: 1, height: 28, backgroundColor: BORDER_DIM }} />
                </div>

                {/* Defender */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 28, opacity: defenderOpacity }}>
                  <div style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: TEXT_MUT, marginBottom: 6 }}>Defender</div>
                  <div style={{ fontSize: factionSize(defenderName), fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'left', lineHeight: 1.05, textShadow: defenderGlow }}>
                    {defenderName}
                  </div>
                  <div style={{ width: 36, height: 3, backgroundColor: defenderColour, marginTop: 8, opacity: 0.8 }} />
                </div>
              </div>

              {/* Result + territory */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  fontSize: 11,
                  letterSpacing: 6,
                  textTransform: 'uppercase',
                  color: isDraw ? TEXT_MUT : GOLD_BRT,
                  fontWeight: 700,
                  backgroundColor: isDraw ? 'rgba(255,255,255,0.04)' : `${GOLD}18`,
                  border: `1px solid ${isDraw ? BORDER_DIM : GOLD + '44'}`,
                  padding: '9px 22px',
                }}>
                  {resultLabel}
                </div>
                {territory && (
                  <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: TEXT_MUT, marginTop: 10 }}>
                    {territory.name}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: date + URL */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: `1px solid ${BORDER_DIM}`,
              paddingTop: 16,
            }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: TEXT_MUT, textTransform: 'uppercase' }}>{date}</div>
              <div style={{ fontSize: 13, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
            </div>
          </div>
        </div>
      ),
      { ...size, ...fontOptions }
    );
  }

  // ── TEXT-ONLY LAYOUT (full 1200 × 630, no photo) ─────────────────────────
  const headlineSize = headline
    ? (headline.length > 40 ? 38 : 48)
    : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: BG_VOID,
          backgroundImage: `
            radial-gradient(ellipse 70% 80% at 20% 50%, rgba(139,26,26,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 70% 80% at 80% 50%, rgba(30,50,139,0.10) 0%, transparent 55%),
            radial-gradient(ellipse 60% 40% at 50% 100%, ${GOLD}18 0%, transparent 50%)
          `,
          color: TEXT_PRI,
          fontFamily: 'Cinzel',
        }}
      >
        {/* ── TOP BAR ─────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 52px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, backgroundColor: GOLD, transform: 'rotate(45deg)', marginRight: 12 }} />
            <div style={{ fontSize: 16, letterSpacing: 8, textTransform: 'uppercase', color: GOLD, fontWeight: 700 }}>
              BattleSphere
            </div>
          </div>
          <div style={{ fontSize: 15, letterSpacing: 4, textTransform: 'uppercase', color: TEXT_MUT }}>
            {trunc(campaignName, 40)}
          </div>
        </div>

        {/* ── MAIN CONTENT ────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 60px 0',
          }}
        >
          {headline && (
            <div style={{
              fontSize: headlineSize,
              fontWeight: 900,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: TEXT_PRI,
              textAlign: 'center',
              lineHeight: 1.1,
              marginBottom: 28,
              maxWidth: 960,
            }}>
              {headline}
            </div>
          )}

          {/* Faction matchup */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: headline ? 20 : 12 }}>
            {/* Attacker */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 48, opacity: attackerOpacity }}>
              <div style={{ fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', color: TEXT_MUT, marginBottom: 10 }}>Attacker</div>
              <div style={{ fontSize: attackerName.length > 18 ? 34 : 44, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'right', lineHeight: 1.05, textShadow: attackerGlow }}>
                {attackerName}
              </div>
              <div style={{ width: 48, height: 3, backgroundColor: attackerColour, marginTop: 10, opacity: 0.8 }} />
            </div>

            {/* VS divider */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 32px' }}>
              <div style={{ width: 1, height: 40, backgroundColor: BORDER_DIM }} />
              <div style={{ width: 16, height: 16, backgroundColor: isDraw ? TEXT_MUT : GOLD, transform: 'rotate(45deg)', margin: '10px 0', opacity: isDraw ? 0.5 : 0.9 }} />
              <div style={{ fontSize: 13, letterSpacing: 6, textTransform: 'uppercase', color: isDraw ? TEXT_MUT : GOLD_BRT, fontWeight: 700, marginBottom: 10 }}>VS</div>
              <div style={{ width: 1, height: 40, backgroundColor: BORDER_DIM }} />
            </div>

            {/* Defender */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 48, opacity: defenderOpacity }}>
              <div style={{ fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', color: TEXT_MUT, marginBottom: 10 }}>Defender</div>
              <div style={{ fontSize: defenderName.length > 18 ? 34 : 44, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', color: TEXT_PRI, textAlign: 'left', lineHeight: 1.05, textShadow: defenderGlow }}>
                {defenderName}
              </div>
              <div style={{ width: 48, height: 3, backgroundColor: defenderColour, marginTop: 10, opacity: 0.8 }} />
            </div>
          </div>

          {/* Result + territory */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: narrative ? 18 : 0 }}>
            <div style={{
              fontSize: 13,
              letterSpacing: 7,
              textTransform: 'uppercase',
              color: isDraw ? TEXT_MUT : GOLD_BRT,
              fontWeight: 700,
              backgroundColor: isDraw ? 'rgba(255,255,255,0.04)' : `${GOLD}18`,
              border: `1px solid ${isDraw ? BORDER_DIM : GOLD + '44'}`,
              padding: '10px 28px',
              marginTop: 8,
            }}>
              {resultLabel}
            </div>
            {territory && (
              <div style={{ fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: TEXT_MUT, marginTop: 12 }}>
                {territory.name}
              </div>
            )}
          </div>

          {/* Narrative excerpt */}
          {narrative && (
            <div style={{ fontSize: 17, color: TEXT_SEC, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.6, maxWidth: 820, marginTop: 4 }}>
              "{narrative}"
            </div>
          )}
        </div>

        {/* ── BOTTOM BAR ──────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 52px 28px',
          borderTop: `1px solid ${BORDER_DIM}`,
          marginTop: 20,
        }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: TEXT_MUT, textTransform: 'uppercase' }}>{date}</div>
          <div style={{ fontSize: 14, letterSpacing: 3, color: GOLD, fontWeight: 700 }}>battlesphere.cc</div>
        </div>
      </div>
    ),
    { ...size, ...fontOptions }
  );
}
