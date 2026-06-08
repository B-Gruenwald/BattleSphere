import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Blog · Admin · BattleSphere' };

const TYPE_CONFIG = {
  dev_update:        { label: 'Dev Update',          colour: '#6b9ecf' },
  community_query:   { label: 'Community Query',     colour: '#b78c40' },
  general:           { label: 'News',                colour: '#7a9e7e' },
  spotlight:         { label: 'Community Spotlight', colour: '#c97b5a' },
};

export default async function AdminBlogPage() {
  const supabase = createAdminClient();
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, type, is_published, published_at, created_at')
    .order('created_at', { ascending: false });

  const colHeader = { fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' };
  const COLS = '2fr 1.2fr 80px 130px 80px';

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e05a5a', marginBottom: '0.5rem' }}>
            Platform Administration
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Blog Posts ({(posts || []).length})</h1>
        </div>
        <Link href="/admin/blog/new">
          <button className="btn-primary">+ New Post</button>
        </Link>
      </div>

      <div style={{ border: '1px solid var(--border-dim)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: '1rem', padding: '0.7rem 1.25rem', borderBottom: '1px solid var(--border-dim)', background: 'rgba(255,255,255,0.02)' }}>
          {['Title', 'Type', 'Status', 'Date', ''].map(h => <span key={h} style={colHeader}>{h}</span>)}
        </div>

        {!(posts || []).length ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No posts yet — <Link href="/admin/blog/new" style={{ color: 'var(--text-gold)', textDecoration: 'none' }}>write your first one</Link>.
          </div>
        ) : (posts || []).map(p => {
          const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.general;
          const date = new Date(p.published_at || p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: '1rem', padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border-dim)', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.title}
              </div>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: cfg.colour, border: `1px solid ${cfg.colour}44`, padding: '0.12rem 0.4rem' }}>
                  {cfg.label}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '600', color: p.is_published ? '#4ade80' : 'var(--text-muted)' }}>
                  {p.is_published ? 'Live' : 'Draft'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{date}</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link href={`/admin/blog/${p.id}/edit`} style={{ fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e05a5a', textDecoration: 'none' }}>
                  Edit →
                </Link>
                {p.is_published && (
                  <Link href={`/blog/${p.id}`} style={{ fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', textDecoration: 'none' }}>
                    View ↗
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
