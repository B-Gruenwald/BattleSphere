import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { marked } from 'marked';
import BlogComments from './BlogComments';

const TYPE_CONFIG = {
  dev_update:        { label: 'Dev Update',          colour: '#6b9ecf', icon: '⚙' },
  community_query:   { label: 'Community Query',     colour: '#b78c40', icon: '❓' },
  general:           { label: 'News',                colour: '#7a9e7e', icon: '📣' },
  spotlight:         { label: 'Community Spotlight', colour: '#c97b5a', icon: '✦' },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: post } = await supabase.from('blog_posts').select('title, summary').eq('slug', slug).single();
  if (!post) return { title: 'Not found · BattleSphere' };
  return {
    title: `${post.title} · BattleSphere Blog`,
    description: post.summary || undefined,
  };
}

// Configure marked to be safe
marked.setOptions({ breaks: true });

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!post) notFound();

  // Comments (plain)
  const { data: rawComments } = await supabase
    .from('blog_comments')
    .select('*')
    .eq('post_id', post.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  // Fetch author usernames for comments
  const authorIds = [...new Set((rawComments || []).map(c => c.user_id))];
  let usernameMap = {};
  if (authorIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', authorIds);
    (profiles || []).forEach(p => { usernameMap[p.id] = p.username; });
  }
  const comments = (rawComments || []).map(c => ({
    ...c,
    profiles: { username: usernameMap[c.user_id] || 'User' },
  }));

  // Current user (for comment form)
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const isAdmin = user
    ? (await authClient.from('profiles').select('is_admin').eq('id', user.id).single()).data?.is_admin
    : false;

  const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.general;
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const htmlBody = marked.parse(post.body || '');

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '720px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <Link href="/blog" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Blog</Link>
        <span style={{ color: 'var(--border-dim)' }}>›</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{cfg.icon} {cfg.label}</span>
      </nav>

      {/* Cover image */}
      {post.cover_url && (
        <img
          src={post.cover_url}
          alt=""
          style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', marginBottom: '2rem', opacity: 0.9 }}
        />
      )}

      {/* Type badge + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.54rem', letterSpacing: '0.12em',
          textTransform: 'uppercase', color: cfg.colour,
          border: `1px solid ${cfg.colour}55`, padding: '0.15rem 0.5rem',
        }}>
          {cfg.icon} {cfg.label}
        </span>
        {date && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{date}</span>}
        {isAdmin && (
          <Link href={`/admin/blog/${post.id}/edit`} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
            Edit post →
          </Link>
        )}
      </div>

      {/* Title */}
      <h1 style={{ fontSize: '2.2rem', fontWeight: '700', lineHeight: 1.25, marginBottom: '1.5rem' }}>
        {post.title}
      </h1>

      {/* Body — rendered markdown */}
      <div
        className="blog-body"
        dangerouslySetInnerHTML={{ __html: htmlBody }}
        style={{
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
          fontSize: '1rem',
        }}
      />

      {/* Comments */}
      <BlogComments
        postId={post.id}
        initialComments={comments || []}
        currentUserId={user?.id || null}
        isAdmin={!!isAdmin}
      />
    </div>
  );
}
