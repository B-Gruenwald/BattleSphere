'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChooseFactionButton from './ChooseFactionButton';

export default function CampaignHeaderActions({
  campaignId,
  campaignSlug,
  publicSlug,
  factions,
  showFactionChooser,
  currentFactionId,
  isOrganiser,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // The "Choose Your Faction" button always renders outside the kebab menu
  // (it's the most important CTA and has its own inline expansion).
  // "Share" and "Admin" are in the kebab on mobile.

  return (
    <>
      {/* ── Desktop: full button row ──────────────────────────────────── */}
      <div className="dash-actions-desktop">
        {showFactionChooser && (
          <ChooseFactionButton
            campaignId={campaignId}
            factions={factions}
            currentFactionId={currentFactionId}
          />
        )}
        <Link href={`/campaign/${publicSlug}`} target="_blank" style={{ textDecoration: 'none' }}>
          <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.6rem' }}>
            Share Public Page ↗
          </button>
        </Link>
        {isOrganiser && (
          <Link href={`/c/${campaignSlug}/admin`}>
            <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Admin</button>
          </Link>
        )}
      </div>

      {/* ── Mobile: Choose Faction (always visible) + kebab menu ─────── */}
      <div className="dash-actions-mobile">
        {showFactionChooser && (
          <ChooseFactionButton
            campaignId={campaignId}
            factions={factions}
            currentFactionId={currentFactionId}
          />
        )}

        {/* Only render kebab if there are items inside it */}
        {(true || isOrganiser) && (
          <div style={{ position: 'relative' }}>
            <button
              className="dash-kebab-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More actions"
            >
              {/* Vertical three-dot (kebab) icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <circle cx="9" cy="3"  r="1.6"/>
                <circle cx="9" cy="9"  r="1.6"/>
                <circle cx="9" cy="15" r="1.6"/>
              </svg>
            </button>

            {menuOpen && (
              <>
                {/* Click-away backdrop */}
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                />
                {/* Dropdown */}
                <div className="dash-kebab-dropdown">
                  <Link
                    href={`/campaign/${publicSlug}`}
                    target="_blank"
                    className="dash-kebab-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Share Public Page ↗
                  </Link>
                  {isOrganiser && (
                    <Link
                      href={`/c/${campaignSlug}/admin`}
                      className="dash-kebab-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
