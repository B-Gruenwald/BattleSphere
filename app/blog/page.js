import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { marked } from 'marked';

export const metadata = {
  title: 'Blog · BattleSphere',
  description: 'Dev updates, community spotlights, and news from the BattleSphere team.',
};

marked.setOptions({ breaks: true });

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
    .select('id, title, slug, summary, body, type, cover_url, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (filter && TYPE_CONFIG[filter]) query = query.eq('type', filter);

  const { data: posts } = await query;
  const [latest, ...older] = posts || [];

  const latestCfg = latest ? (TYPE_CONFIG[latest.type] || TYPE_CONFIG.general) : null;
  const latestDate = latest?.published_at
    ? new Date(latest.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const latestHtml = latest ? marked.parse(latest.body || '') : null;

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

      {!posts?.length ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No posts yet — check back soon.
        </div>
      ) : (
        <>
          {/* Latest post — full content */}
          <div style={{ marginBottom: '4rem', paddingBottom: '3rem', borderBottom: '1px solid var(--border-dim)' }}>
            {latest.cover_url && (
              <img src={latest.cover_url} alt="" style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', marginBottom: '1.75rem', opacity: 0.9 }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '0.52rem', letterSpacing: '0.12em',
                textTransform: 'uppercase', color: latestCfg.colour,
                border: `1px solid ${latestCfg.colour}55`, padding: '0.15rem 0.45rem',
              }}>{latestCfg.icon} {latestCfg.label}</span>
              {latestDate && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{latestDate}</span>}
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Latest post</span>
            </div>
            <h2 style={{ fontSize: '1.9rem', fontWeight: '700', lineHeight: 1.25, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              <Link href={`/blog/${latest.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {latest.title}
              </Link>
            </h2>
            <div
              className="blog-body"
              dangerouslySetInnerHTML={{ __html: latestHtml }}
              style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1rem' }}
            />
            <Link href={`/blog/${latest.slug}`} style={{ display: 'inline-block', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-gold)', textDecoration: 'none' }}>
              Open post + comments →
            </Link>
          </div>

          {/* Older posts — compact list */}
          {older.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Earlier posts
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-dim)' }}>
                {older.map(post => {
                  const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.general;
                  const date = post.published_at
                    ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null;
                  return (
                    <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                      <div className="blog-list-row" style={{
                        padding: '1.25rem 0',
                        borderBottom: '1px solid var(--border-dim)',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '1rem',
                        alignItems: 'start',
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <span style={{
                              fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em',
                              textTransform: 'uppercase', color: cfg.colour,
                            }}>{cfg.icon} {cfg.label}</span>
                          </div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: post.summary ? '0.35rem' : 0, lineHeight: 1.35 }}>
                            {post.title}
                          </h3>
                          {post.summary && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                              {post.summary}
                            </p>
                          )}
                        </div>
                        {date && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingTop: '0.2rem' }}>{date}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
