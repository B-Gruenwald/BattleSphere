import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

// Downloadable 1080x1080 branded share image for Instagram / Discord / etc.
// URL:  /api/units/[id]/share-image
// Add  ?download=1  to force a file-download disposition.

export const runtime = 'nodejs';

// Brand palette
const BG_VOID    = '#0a0a0f';
const BG_DEEP    = '#0f0f1a';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#a09880';
const TEXT_MUT   = '#5a5445';
const BORDER_DIM = 'rgba(255, 255, 255, 0.10)';

// Cloudinary square transform — serve a 1080x1080 ready-cropped image.
function squareify(url, size = 1080) {
  if (!url) return null;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${size},h_${size},q_auto,f_auto/`);
}

// Slugify a name for the downloaded filename.
function toSafeFilename(name) {
  return (name || 'unit')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'unit';
}

export async function GET(request, { params }) {
  const { id } = await params;
  const url   = new URL(request.url);
  const forceDownload = url.searchParams.get('download') === '1';
  const admin = createAdminClient();

  // Fetch unit + army + first photo
  const { data: unitRows } = await admin
    .from('army_units')
    .select('*')
    .eq('id', id)
    .limit(1);
  const unit = unitRows?.[0] ?? null;

  if (!unit) {
    return new Response('Unit not found', { status: 404 });
  }

  const { data: armyRows } = await admin
    .from('armies')
    .select('*')
    .eq('id', unit.army_id)
    .limit(1);
  const army = armyRows?.[0] ?? null;

  // Respect visibility: private armies get a 404 here too.
  if (!army || !army.is_public) {
    return new Response('Not found', { status: 404 });
  }

  const { data: photos } = await admin
    .from('army_unit_photos')
    .select('*')
    .eq('unit_id', unit.id)
    .order('is_portrait', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);
  const photoUrl = photos?.[0]?.url ?? null;

  if (!photoUrl) {
    // No photo = no share image. Player should upload first.
    return new Response('No photo available for this unit', { status: 404 });
  }

  const squareUrl   = squareify(photoUrl, 1080);
  const unitName    = unit.name;
  const armyName    = army.name || '';
  const factionName = army.faction_name || '';

  // Choose a headline font-size that fits — rough heuristic.
  const headlineSize = unitName.length > 24 ? 72
                     : unitName.length > 16 ? 88
                     : 104;

  // Load Cinzel font for Satori (woff format — woff2 is not supported)
  const cinzel400 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-400.woff'));
  const cinzel700 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-700.woff'));
  const cinzel900 = fs.readFileSync(path.join(process.cwd(), 'public/fonts/Cinzel-900.woff'));

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: BG_VOID,
          fontFamily: 'Cinzel',
        }}
      >
        {/* Background photo */}
        <img
          src={squareUrl}
          width={1080}
          height={1080}
          style={{
            position: 'absolute',
            inset: 0,
            width: 1080,
            height: 1080,
            objectFit: 'cover',
          }}
        />

        {/* Bottom gradient for legibility */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 560,
            display: 'flex',
            backgroundImage: 'linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,0.82) 62%, rgba(10,10,15,0.96) 100%)',
          }}
        />

        {/* Title block (bottom) */}
        <div
          style={{
            position: 'absolute',
            left: 60,
            right: 60,
            bottom: 60,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Decorative rule */}
          <div
            style={{
              width: 72,
              height: 3,
              backgroundColor: GOLD,
              marginBottom: 26,
            }}
          />

          <div
            style={{
              fontSize: headlineSize,
              lineHeight: 1.02,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: TEXT_PRI,
              fontWeight: 900,
              marginBottom: 24,
            }}
          >
            {unitName}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            {armyName && (
              <div
                style={{
                  fontSize: 28,
                  letterSpacing: 6,
                  textTransform: 'uppercase',
                  color: GOLD_BRT,
                  fontWeight: 600,
                  marginRight: factionName ? 20 : 0,
                }}
              >
                {armyName}
              </div>
            )}
            {factionName && armyName && (
              <div style={{ fontSize: 22, color: TEXT_MUT, marginRight: 20 }}>·</div>
            )}
            {factionName && (
              <div
                style={{
                  fontSize: 22,
                  letterSpacing: 5,
                  textTransform: 'uppercase',
                  color: TEXT_SEC,
                }}
              >
                {factionName}
              </div>
            )}
          </div>

          {/* URL vignette */}
          <div
            style={{
              marginTop: 34,
              paddingTop: 20,
              borderTop: `1px solid ${BORDER_DIM}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 17, letterSpacing: 4, color: TEXT_MUT, textTransform: 'uppercase' }}>
              Painted · Played · Recorded
            </div>
            <div style={{ fontSize: 30, letterSpacing: 5, color: GOLD, fontWeight: 700 }}>
              battlesphere.cc
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'Cinzel', data: cinzel400, weight: 400, style: 'normal' },
        { name: 'Cinzel', data: cinzel700, weight: 700, style: 'normal' },
        { name: 'Cinzel', data: cinzel900, weight: 900, style: 'normal' },
      ],
    }
  );

  // Clone headers so we can customise caching + Content-Disposition.
  const headers = new Headers(response.headers);
  // Cache for 1 hour at the edge; the image changes when photos update.
  headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  if (forceDownload) {
    const filename = `battlesphere-${toSafeFilename(unitName)}.png`;
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
