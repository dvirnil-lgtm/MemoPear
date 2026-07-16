// ---------------------------------------------------------------------------
// JSON-LD builders shared by App.tsx's runtime meta effect and the
// build-time prerender script, so structured data can never drift between
// what a browser sees and what a non-JS crawler sees.
// ---------------------------------------------------------------------------

import { BLOG_POSTS, SITE_URL, type BlogPost } from '../components/Blog';
import { PAGE_META } from './pageMeta';

export const buildBlogPostJsonLd = (post: BlogPost): object => {
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const faqBlock = post.blocks.find((b) => b.type === 'faq') as
    | { type: 'faq'; items: { q: string; a: string }[] }
    | undefined;

  const graph: object[] = [
    {
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Organization', name: post.author, url: SITE_URL },
      publisher: {
        '@type': 'Organization',
        name: 'MemoPear',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon-512.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      keywords: post.tags.join(', '),
      image: `${SITE_URL}/og-image-1200x630.png`,
    },
  ];

  if (faqBlock) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqBlock.items.map((qa) => ({
        '@type': 'Question',
        name: qa.q,
        acceptedAnswer: { '@type': 'Answer', text: qa.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
};

export const buildBlogIndexJsonLd = (): object => ({
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'MemoPear Blog',
  description: PAGE_META.blog.description,
  url: `${SITE_URL}/blog`,
  blogPost: BLOG_POSTS.map((p) => ({
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.description,
    datePublished: p.date,
    url: `${SITE_URL}/blog/${p.slug}`,
  })),
});
