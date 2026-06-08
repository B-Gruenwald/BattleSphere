'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── Game systems, grouped by universe ────────────────────────────────────────
const GAME_SYSTEMS = [
  {
    universe: 'Warhammer 40,000',
    games: ['Warhammer 40,000', 'Kill Team', 'Necromunda', 'Horus Heresy (30K)', 'Aeronautica Imperialis'],
  },
  {
    universe: 'Age of Sigmar',
    games: ['Age of Sigmar', 'Warcry', 'Warhammer Underworlds'],
  },
  {
    universe: 'The Old World',
    games: ['The Old World'],
  },
  {
    universe: 'Blood Bowl',
    games: ['Blood Bowl'],
  },
  {
    universe: 'Star Wars',
    games: ['Star Wars: Legion', 'Star Wars: X-Wing', 'Star Wars: Armada', 'Star Wars: Shatterpoint'],
  },
  {
    universe: 'Other',
    games: ['Infinity', 'Bolt Action', 'Marvel Crisis Protocol', 'Malifaux', 'One Page Rules'],
  },
];

const HOBBY_TAGS = [
  'Narrative Player',
  'Competitive Player',
  'Painter First',
  'New to the Hobby',
  'Campaign Organiser',
  'Collector',
  'Lore Enthusiast',
  'Speed Painter',
];

export default function ProfileSettingsForm({ profile, username }) {
  // ── Username ──
  const cleanInitial = (username || '').replace(/#.*$/, '');
  const [newUsername,    setNewUsername]    = useState(cleanInitial);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameSaved,  setUsernameSaved]  = useState(false);
  const [usernameError,  setUsernameError]  = useState('');

  // ── Visibility ──
  const initialVisibility = profile?.profile_visibility || (profile?.profile_public === false ? 'members' : 'public');
  const [visibility,       setVisibility]       = useState(initialVisibility);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilitySaved,  setVisibilitySaved]  = useState(false);

  // ── Bio ──
  const [bio,       setBio]       = useState(profile?.bio || '');
  const [bioSaving, setBioSaving] = useState(false);
  const [bioSaved,  setBioSaved]  = useState(false);

  // ── Discord ──
  const [discord,       setDiscord]       = useState(profile?.discord_handle || '');
  const [discordSaving, setDiscordSaving] = useState(false);
  const [discordSaved,  setDiscordSaved]  = useState(false);

  // ── Game systems ──
  const [gameSystems,    setGameSystems]    = useState(profile?.game_systems || []);
  const [systemsSaving,  setSystemsSaving]  = useState(false);
  const [systemsSaved,   setSystemsSaved]   = useState(false);

  // ── Hobby tags ──
  const [hobbyTags,   setHobbyTags]   = useState(profile?.hobby_tags || []);
  const [tagsSaving,  setTagsSaving]  = useState(false);
  const [tagsSaved,   setTagsSaved]   = useState(false);

  // ── Social links ──
  const initialSocial = profile?.social_links || {};
  const [website,      setWebsite]      = useState(initialSocial.website   || '');
  const [instagram,    setInstagram]    = useState(initialSocial.instagram || '');
  const [socialSaving, setSocialSaving] = useState(false);
  const [socialSaved,  setSocialSaved]  = useState(false);

  // ── Banner image ──
  const [bannerUrl,       setBannerUrl]       = useState(profile?.banner_image_url || '');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError,     setBannerError]     = useState('');
  const bannerInputRef = useRef(null);

  const DIM  = 'var(--border-dim)';
  const GOLD = 'var(--text-gold)';

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${DIM}`,
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    boxSizing: 'border-box',
  };

  const sectionHeadStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '0.65rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: GOLD,
    marginBottom: '0.6rem',
  };

  const hintStyle = {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    lineHeight: 1.6,
    marginBottom: '1rem',
  };

  const SavedMsg = ({ msg = '✓ Saved' }) => (
    <p style={{ fontSize: '0.78rem', color: 'var(--gold)', marginTop: '0.4rem' }}>{msg}</p>
  );

  const sectionDivider = <div style={{ borderTop: `1px solid ${DIM}`, margin: '2.5rem 0' }} />;

  // ── Helpers ──
  async function patchProfile(updates) {
    const supabase = createClient();
    await supabase.from('profiles').update(updates).eq('id', profile.id);
  }

  function flashSaved(setFn) {
    setFn(true);
    setTimeout(() => setFn(false), 2500);
  }

  // ── Save handlers ──
  async function handleUsernameChange() {
    const trimmed = newUsername.trim();
    if (!trimmed) { setUsernameError('Username cannot be empty.'); return; }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(trimmed)) {
      setUsernameError('3–30 characters, letters, numbers, _ and - only.');
      return;
    }
    setUsernameSaving(true); setUsernameSaved(false); setUsernameError('');
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', profile.id);
    setUsernameSaving(false);
    if (error) {
      setUsernameError(error.message.includes('unique') ? 'That username is already taken.' : error.message);
      return;
    }
    setUsernameSaved(true);
    setTimeout(() => setUsernameSaved(false), 3000);
    window.location.reload();
  }

  async function handleVisibilityChange(val) {
    setVisibility(val); setVisibilitySaving(true); setVisibilitySaved(false);
    await patchProfile({ profile_visibility: val, profile_public: val === 'public' });
    setVisibilitySaving(false); flashSaved(setVisibilitySaved);
  }

  async function handleBioSave() {
    setBioSaving(true); setBioSaved(false);
    await patchProfile({ bio: bio.trim() || null });
    setBioSaving(false); flashSaved(setBioSaved);
  }

  async function handleDiscordSave() {
    setDiscordSaving(true); setDiscordSaved(false);
    await patchProfile({ discord_handle: discord.trim() || null });
    setDiscordSaving(false); flashSaved(setDiscordSaved);
  }

  function toggleSystem(sys) {
    setGameSystems(prev =>
      prev.includes(sys) ? prev.filter(s => s !== sys) : [...prev, sys]
    );
  }

  async function handleSystemsSave() {
    setSystemsSaving(true); setSystemsSaved(false);
    await patchProfile({ game_systems: gameSystems });
    setSystemsSaving(false); flashSaved(setSystemsSaved);
  }

  function toggleTag(tag) {
    setHobbyTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function handleTagsSave() {
    setTagsSaving(true); setTagsSaved(false);
    await patchProfile({ hobby_tags: hobbyTags });
    setTagsSaving(false); flashSaved(setTagsSaved);
  }

  async function handleSocialSave() {
    setSocialSaving(true); setSocialSaved(false);
    await patchProfile({ social_links: { website: website.trim(), instagram: instagram.trim() } });
    setSocialSaving(false); flashSaved(setSocialSaved);
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true); setBannerError('');
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const formData  = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'battlesphere_unsigned');
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
      await patchProfile({ banner_image_url: data.secure_url });
      setBannerUrl(data.secure_url);
    } catch (err) {
      setBannerError(err.message);
    }
    setBannerUploading(false);
  }

  async function handleBannerRemove() {
    await patchProfile({ banner_image_url: null });
    setBannerUrl('');
  }

  const VisOption = ({ val, label, desc }) => {
    const active = visibility === val;
    return (
      <button
        type="button"
        onClick={() => handleVisibilityChange(val)}
        disabled={visibilitySaving}
        style={{
          flex: 1,
          padding: '0.75rem 0.5rem',
          border: `1px solid ${active ? 'var(--gold)' : DIM}`,
          borderLeft: val !== 'public' ? 'none' : undefined,
          background: active ? 'rgba(183,140,64,0.10)' : 'rgba(255,255,255,0.02)',
          color: active ? GOLD : 'var(--text-secondary)',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '0.72rem', color: active ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
      </button>
    );
  };

  return (
    <>
      {/* ── Username ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadStyle}>Username</h2>
        <p style={hintStyle}>
          Your username appears on battle reports, campaign pages, and your public profile URL.
          Changing it will update your profile link — any old links others have saved will no longer work.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newUsername}
            onChange={e => { setNewUsername(e.target.value); setUsernameError(''); setUsernameSaved(false); }}
            placeholder="your_username"
            style={{ ...inputStyle, flex: '1 1 200px' }}
            onFocus={e => e.target.style.borderColor = GOLD}
            onBlur={e => e.target.style.borderColor = DIM}
            maxLength={30}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={handleUsernameChange}
            disabled={usernameSaving || newUsername.trim() === cleanInitial}
            style={{ opacity: (usernameSaving || newUsername.trim() === cleanInitial) ? 0.5 : 1, whiteSpace: 'nowrap' }}
          >
            {usernameSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {usernameError && <p style={{ fontSize: '0.8rem', color: '#e05a5a', marginTop: '0.5rem' }}>{usernameError}</p>}
        {usernameSaved  && <SavedMsg msg="✓ Username updated" />}
        {!usernameError && !usernameSaved && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            Letters, numbers, _ and - only · 3–30 characters
          </p>
        )}
      </section>

      {sectionDivider}

      {/* ── Banner Image ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadStyle}>Profile Banner</h2>
        <p style={hintStyle}>A wide image shown at the top of your public profile. Works best at 1200 × 300 px or similar wide format.</p>

        {bannerUrl ? (
          <div style={{ marginBottom: '1rem' }}>
            <img
              src={bannerUrl}
              alt="Profile banner"
              style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', border: `1px solid ${DIM}`, display: 'block' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button type="button" className="btn-primary" onClick={() => bannerInputRef.current?.click()} disabled={bannerUploading}>
                {bannerUploading ? 'Uploading…' : 'Replace'}
              </button>
              <button
                type="button"
                onClick={handleBannerRemove}
                style={{ background: 'none', border: `1px solid ${DIM}`, color: 'var(--text-muted)', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
          >
            {bannerUploading ? 'Uploading…' : 'Upload Banner Image'}
          </button>
        )}

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleBannerUpload}
        />
        {bannerError && <p style={{ fontSize: '0.8rem', color: '#e05a5a', marginTop: '0.5rem' }}>{bannerError}</p>}
      </section>

      {sectionDivider}

      {/* ── Bio ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadStyle}>Introduction</h2>
        <p style={hintStyle}>A short introduction — who you are, how you play, what you're into. Shown at the top of your profile.</p>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Tell other commanders a bit about yourself…"
          maxLength={500}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderColor = GOLD}
          onBlur={e => e.target.style.borderColor = DIM}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bio.length} / 500</span>
          <button type="button" className="btn-primary" onClick={handleBioSave} disabled={bioSaving}>
            {bioSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {bioSaved && <SavedMsg />}
      </section>

      {sectionDivider}

      {/* ── Discord ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadStyle}>Discord Handle</h2>
        <p style={hintStyle}>Your Discord username so other players can reach you. Shown on your public profile.</p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={discord}
            onChange={e => setDiscord(e.target.value)}
            placeholder="yourhandle"
            maxLength={64}
            style={{ ...inputStyle, flex: '1 1 200px' }}
            onFocus={e => e.target.style.borderColor = GOLD}
            onBlur={e => e.target.style.borderColor = DIM}
          />
          <button type="button" className="btn-primary" onClick={handleDiscordSave} disabled={discordSaving}>
            {discordSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {discordSaved && <SavedMsg />}
      </section>

      {sectionDivider}

      {/* ── Social / Hobby Links ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadStyle}>Hobby Links</h2>
        <p style={hintStyle}>Link your hobby Instagram, painting blog, or personal website.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>Instagram (URL)</label>
            <input
              type="url"
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = GOLD}
              onBlur={e => e.target.style.borderColor = DIM}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem', letterSpacing: '0.05em' }}>Website or Blog (URL)</label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://yourblog.com"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = GOLD}
              onBlur={e => e.target.style.borderColor = DIM}
            />
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={handleSocialSave} disabled={socialSaving}>
          {socialSaving ? 'Saving…' : 'Save'}
        </button>
        {socialSaved && <SavedMsg />}
      </section>

      {sectionDivider}

      {/* ── Game Systems ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadStyle}>Game Systems</h2>
        <p style={hintStyle}>Tick the games you play. Shown on your profile so others know what you're into.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1rem' }}>
          {GAME_SYSTEMS.map(group => (
            <div key={group.universe}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {group.universe}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '0.75rem', borderLeft: `2px solid ${DIM}` }}>
                {group.games.map(game => {
                  const checked = gameSystems.includes(game);
                  return (
                    <label
                      key={game}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSystem(game)}
                        style={{ accentColor: 'var(--gold)', width: '15px', height: '15px', cursor: 'pointer' }}
                      />
                      {game}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={handleSystemsSave} disabled={systemsSaving}>
          {systemsSaving ? 'Saving…' : 'Save Game Systems'}
        </button>
        {systemsSaved && <SavedMsg />}
      </section>

      {sectionDivider}

      {/* ── Hobby Tags ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={sectionHeadStyle}>Hobby Focus</h2>
        <p style={hintStyle}>Pick tags that describe your style. Select as many as apply.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {HOBBY_TAGS.map(tag => {
            const active = hobbyTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '0.4rem 0.9rem',
                  border: `1px solid ${active ? 'var(--gold)' : DIM}`,
                  background: active ? 'rgba(183,140,64,0.12)' : 'rgba(255,255,255,0.02)',
                  color: active ? GOLD : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.12s',
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn-primary" onClick={handleTagsSave} disabled={tagsSaving}>
          {tagsSaving ? 'Saving…' : 'Save'}
        </button>
        {tagsSaved && <SavedMsg />}
      </section>

      {sectionDivider}

      {/* ── Profile Visibility ── */}
      <section>
        <h2 style={sectionHeadStyle}>Profile Visibility</h2>
        <p style={hintStyle}>
          Control who can see your public profile at{' '}
          <strong style={{ color: 'var(--text-primary)' }}>battlesphere.cc/players/{cleanInitial || newUsername.trim()}</strong>.
        </p>

        <div style={{ display: 'flex', gap: '0', marginBottom: '1rem' }}>
          <VisOption val="public"  label="Public"      desc="Anyone, including visitors" />
          <VisOption val="members" label="Members"     desc="Any registered BattleSphere user" />
          <VisOption val="allies"  label="Allies Only" desc="Players who share a campaign with you" />
        </div>

        {visibilitySaving && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Saving…</p>}
        {visibilitySaved  && <SavedMsg />}
      </section>
    </>
  );
}
