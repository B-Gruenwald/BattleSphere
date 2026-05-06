const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.battlesphere.cc';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard',
          '/profile/',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
