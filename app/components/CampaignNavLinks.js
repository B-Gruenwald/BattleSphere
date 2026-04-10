'use client';

import { useState } from 'react';
import Link from 'next/link';

const NAV_LINK_STYLE = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.58rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  transition: 'color 0.15s',
};

const LOG_BTN_STYLE = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.55rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  background: 'rgba(183,140,64,0.12)',
  border: '1px solid rgba(183,140,64,0.4)',
  color: 'var(--text-gold)',
  padding: '0.3rem 0.85rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default function CampaignNavLinks({ slug, campaignName, links }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* ── Desktop nav bar ─────────────────────────────────────────── */}
      <div className="camp-nav-desktop">
        {/* Campaign name / dashboard link */}
        <Link href={`/c/${slug}`} style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '220px',
          flexShrink: 0,
        }}>
          {campaignName}
        </Link>

        {/* Nav links + Log Battle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', overflow: 'auto' }}>
          {links.map(l => (
            <Link key={l.label} href={l.href} style={NAV_LINK_STYLE}>
              {l.label}
            </Link>
          ))}
          <Link href={`/c/${slug}/battle/new`}>
            <button style={LOG_BTN_STYLE}>+ Log Battle</button>
          </Link>
        </div>
      </div>

      {/* ── Mobile nav bar ──────────────────────────────────────────── */}
      <div className="camp-nav-mobile">
        {/* Campaign name on the left */}
        <Link href={`/c/${slug}`} style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.58rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-gold)',
          textDecoration: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}>
          {campaignName}
        </Link>

        {/* Right side: Log Battle + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          <Link href={`/c/${slug}/battle/new`}>
            <button style={{ ...LOG_BTN_STYLE, fontSize: '0.5rem', padding: '0.3rem 0.65rem' }}>
              + Log Battle
            </button>
          </Link>

          <button
            className="camp-nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="15" y1="3" x2="3" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <line x1="2" y1="4.5"  x2="16" y2="4.5"  stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                <line x1="2" y1="9"    x2="16" y2="9"    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                <line x1="2" y1="13.5" x2="16" y2="13.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown ─────────────────────────────────────────── */}
      {menuOpen && (
        <div className="camp-nav-dropdown">
          {links.map(l => (
            <Link
              key={l.label}
              href={l.href}
              className="camp-nav-dropdown-item"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
