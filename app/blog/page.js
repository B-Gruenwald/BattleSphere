import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Blog · BattleSphere',
  description: 'Dev updates, community spotlights, and news from the BattleSphere team.',
};

const TYPE_CONFIG = {
  dev_update:        { label: 'Dev Update',          colour: '#6b9ecf', icon: '⚙' },
  community_query:   { label: 'Community Query',     colour: '#b78c40', icon: '❓' },
  general:           { label: 'News',                colour: '#7a9e7e', icon: '📣' },
  spotlight:         { label: 'Community Spotlight', colour: '#c97b5a', icon: '✦' },
};

export default async function BlogPage({ searchParams }) {
  const supabase = createAdminClient();
  const filter = (await searchParams)?.type || null;

  let query = supabase
    .from('blog_posts')
    .select('id, title, slug, summary, type, cover_url, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (filter && TYPE_CONFIG[filter]) query = query.eq('type', filter);

  const { data: posts } = await query;

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-gold)', marginBottom: '0.6rem' }}>
          From the Front Lines
        </p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>BattleSphere Blog</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7 }}>
          Dev updates, community spotlights, and dispatches from the campaign front.
        </p>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        <Link href="/blog" style={{ textDecoration: 'none' }}>
          <span style={{
            padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.78rem',
            border: '1px solid', cursor: 'pointer',
            borderColor: !filter ? 'var(--gold)' : 'var(--border-dim)',
            background: !filter ? 'rgba(183,140,64,0.1)' : 'transparent',
            color: !filter ? 'var(--text-gold)' : 'var(--text-muted)',
          }}>All</span>
        </Link>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <Link key={key} href={`/blog?type=${key}`} style={{ textDecoration: 'none' }}>
            <span style={{
              padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.78rem',
              border: '1px solid', cursor: 'pointer',
              borderColor: filter === key ? cfg.colour : 'var(--border-dim)',
              background: filter === key ? `${cfg.colour}18` : 'transparent',
              color: filter === key ? cfg.colour : 'var(--text-muted)',
            }}>{cfg.icon} {cfg.label}</span>
          </Link>
        ))}
      </div>

      {/* Post list */}
      {!posts?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No posts yet — check back soon.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', borderTop: '1px solid var(--border-dim)' }}>
          {posts.map(post => {
            const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.general;
            const date = post.published_at
              ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : null;
            return (
              <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '1.75rem 0',
                  borderBottom: '1px solid var(--border-dim)',
                  display: 'grid',
                  gridTemplateColumns: post.cover_url ? '1fr 120px' : '1fr',
                  gap: '1.5rem',
                  alignItems: 'center',
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: cfg.colour,
                        border: `1px solid ${cfg.colour}55`, padding: '0.15rem 0.45rem',
                      }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {date && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{date}</span>}
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.35 }}>
                      {post.title}
                    </h2>
                    {post.summary && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                        {post.summary}
                      </p>
                    )}
                  </div>
                  {post.cover_url && (
                    <img src={post.cover_url} alt="" style={{ width: '120px', height: '80px', objectFit: 'cover', opacity: 0.85 }} />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
