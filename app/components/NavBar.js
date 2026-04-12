'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import LogoutButton from './LogoutButton';
import FeedbackButton from './FeedbackButton';
import PublicCampaignNavCTA from './PublicCampaignNavCTA';

const navLinkStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.65rem',
  fontWeight: '600',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
};

export default function NavBar({ user, isAdmin, username }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Extract member-area slug (/c/[slug]/...) for the Log a Battle button
  const campaignSlugMatch = pathname?.match(/^\/c\/([^/]+)/);
  const campaignSlug = campaignSlugMatch ? campaignSlugMatch[1] : null;

  // Extract public campaign slug (/campaign/[slug]/...) for the Request Access CTA
  const publicSlugMatch = pathname?.match(/^\/campaign\/([^/]+)/);
  const publicCampaignSlug = publicSlugMatch ? publicSlugMatch[1] : null;

  return (
    <>
      <nav className="site-nav">
        {/* Left side: wordmark + context-aware action button (always visible) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/" className="site-nav__logo">
            BattleSphere
          </Link>
          {/* Member area: Log a Battle */}
          {user && campaignSlug && (
            <Link href={`/c/${campaignSlug}/battle/new`}>
              <button className="btn-primary nav-log-battle">+ Log a Battle</button>
            </Link>
          )}
          {/* Public campaign page: Request Access CTA */}
          {publicCampaignSlug && (
            <PublicCampaignNavCTA slug={publicCampaignSlug} />
          )}
        </div>

        {/* Desktop nav links */}
        <div className="site-nav__desktop">
          {user ? (
            <>
              <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
              {isAdmin && (
                <Link href="/admin" style={{ ...navLinkStyle, color: '#e05a5a' }}>Admin</Link>
              )}
              <FeedbackButton username={username} />
              <span style={{ ...navLinkStyle, opacity: 0.5 }}>{username}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/register" style={navLinkStyle}>Register</Link>
              <Link href="/login">
                <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Log In</button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          className="site-nav__hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <line x1="3" y1="5.5" x2="19" y2="5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="3" y1="16.5" x2="19" y2="16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown menu — only rendered when open */}
      {menuOpen && (
        <div className="site-nav__dropdown">
          {user ? (
            <>
              <Link
                href="/dashboard"
                style={navLinkStyle}
                className="site-nav__dropdown-link"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  style={{ ...navLinkStyle, color: '#e05a5a' }}
                  className="site-nav__dropdown-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              <div className="site-nav__dropdown-link">
                <FeedbackButton username={username} />
              </div>
              <div className="site-nav__dropdown-link" style={{ opacity: 0.5 }}>
                <span style={navLinkStyle}>{username}</span>
              </div>
              <div className="site-nav__dropdown-link">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/register"
                style={navLinkStyle}
                className="site-nav__dropdown-link"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </Link>
              <div className="site-nav__dropdown-link">
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  <button className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Log In</button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
