import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

// Auto-injected as og:image for the landing page (battlesphere.cc/).
// Appears on Discord, Twitter/X, Slack, iMessage, WhatsApp link previews.

export const runtime     = 'nodejs';
export const alt         = 'BattleSphere — Narrative Campaign Platform';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG_VOID    = '#0a0a0f';
const BG_DEEP    = '#0e0e18';
const GOLD       = '#b78c40';
const GOLD_BRT   = '#d4a853';
const TEXT_PRI   = '#e8e0d0';
const TEXT_SEC   = '#8a8070';
const BORDER_DIM = 'rgba(183,140,64,0.18)';

export default async function OgImage() {
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BG_VOID,
          // Gold aurora from top-centre + faint crimson ember bottom-left
          backgroundImage: [
            `radial-gradient(ellipse 110% 55% at 50% -5%, ${GOLD}30 0%, transparent 60%)`,
            `radial-gradient(ellipse 55% 40% at 8% 100%, #8b1a1a22 0%, transparent 55%)`,
            `linear-gradient(180deg, ${BG_DEEP} 0%, ${BG_VOID} 100%)`,
          ].join(', '),
          fontFamily: 'Cinzel',
          padding: '64px 100px',
          position: 'relative',
        }}
      >

        {/* ── Diamond cap ornament ─────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 44,
          }}
        >
          {/* Left rule */}
          <div style={{ width: 120, height: 1, backgroundColor: GOLD, opacity: 0.28 }} />
          {/* Diamond */}
          <div
            style={{
              width: 14,
              height: 14,
              backgroundColor: GOLD,
              transform: 'rotate(45deg)',
              opacity: 0.9,
            }}
          />
          {/* Right rule */}
          <div style={{ width: 120, height: 1, backgroundColor: GOLD, opacity: 0.28 }} />
        </div>

        {/* ── Main title ───────────────────────────────────────── */}
        <div
          style={{
            fontSize: 104,
            fontWeight: 900,
            letterSpacing: 14,
            textTransform: 'uppercase',
            color: TEXT_PRI,
            marginBottom: 32,
            lineHeight: 1,
          }}
        >
          BATTLESPHERE
        </div>

        {/* ── Gold divider ─────────────────────────────────────── */}
        <div
          style={{
            width: 560,
            height: 1,
            backgroundColor: GOLD,
            opacity: 0.30,
            marginBottom: 36,
          }}
        />

        {/* ── Tagline — three natural clauses ──────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {[
            'Document your collection,',
            'run a club league,',
            'or build a living narrative campaign.',
          ].map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: 3,
                color: i === 2 ? GOLD_BRT : TEXT_SEC,
                textAlign: 'center',
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* ── Bottom ornament + domain ──────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginTop: 48,
          }}
        >
          {/* Left rule */}
          <div style={{ width: 80, height: 1, backgroundColor: GOLD, opacity: 0.22 }} />
          {/* Domain */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: 'uppercase',
              color: GOLD,
              opacity: 0.75,
            }}
          >
            battlesphere.cc
          </div>
          {/* Right rule */}
          <div style={{ width: 80, height: 1, backgroundColor: GOLD, opacity: 0.22 }} />
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
