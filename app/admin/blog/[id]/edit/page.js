import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import BlogPostForm from '../../BlogPostForm';

export const metadata = { title: 'Edit Post · Blog · Admin · BattleSphere' };

export default async function EditBlogPostPage({ params }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: post } = await supabase.from('blog_posts').select('*').eq('id', id).single();
  if (!post) notFound();

  // Also fetch comment count for context
  const { count: commentCount } = await supabase
    .from('blog_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', id)
    .eq('is_deleted', false);

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '780px', margin: '0 auto' }}>
      <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '2.5rem' }}>
        <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Admin</Link>
        <span style={{ color: 'var(--border-dim)' }}>›</span>
        <Link href="/admin/blog" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Blog</Link>
        <span style={{ color: 'var(--border-dim)' }}>›</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Edit</span>
      </nav>

      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e05a5a', marginBottom: '0.5rem' }}>
            Platform Administration
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: 0 }}>Edit Post</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {commentCount > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              💬 {commentCount} comment{commentCount !== 1 ? 's' : ''}
            </span>
          )}
          {post.is_published && (
            <Link href={`/blog/${post.slug}`} style={{ fontSize: '0.8rem', color: 'var(--text-gold)', textDecoration: 'none' }}>
              View live post ↗
            </Link>
          )}
        </div>
      </div>

      <BlogPostForm post={post} />
    </div>
  );
}
