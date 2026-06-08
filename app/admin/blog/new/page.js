import Link from 'next/link';
import BlogPostForm from '../BlogPostForm';

export const metadata = { title: 'New Post · Blog · Admin · BattleSphere' };

export default function NewBlogPostPage() {
  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '780px', margin: '0 auto' }}>
      <nav style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '2.5rem' }}>
        <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Admin</Link>
        <span style={{ color: 'var(--border-dim)' }}>›</span>
        <Link href="/admin/blog" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Blog</Link>
        <span style={{ color: 'var(--border-dim)' }}>›</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>New Post</span>
      </nav>
      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#e05a5a', marginBottom: '0.5rem' }}>
          Platform Administration
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>New Blog Post</h1>
      </div>
      <BlogPostForm post={null} />
    </div>
  );
}
