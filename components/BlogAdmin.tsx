import React, { useEffect, useMemo, useState } from 'react';
import {
  BLOG_POSTS,
  BlogPostView,
  type BlogBlock,
  type BlogPost,
} from './Blog';
import {
  watchAllPosts,
  savePost,
  deletePost,
  slugExists,
  uploadBlogImage,
  isBlogAdmin,
  signInWithGoogle,
  type BlogPostStatus,
  type StoredBlogPost,
} from '../firebase';

// ---------------------------------------------------------------------------
// MemoPear Blog CMS
//
// An owner-only editor for creating, editing, and publishing blog posts
// straight from the app — no code deploy required. Posts are stored in the
// `blogPosts` Firestore collection and rendered for crawlers by the
// server-side function in functions/blogSsr.js, so every post ships with a
// full SEO package (title, meta description, canonical, Open Graph, JSON-LD)
// the moment it's published.
//
// Access is gated to the owner accounts in BLOG_ADMIN_EMAILS. The gate here is
// UX only — firestore.rules / storage.rules are the authoritative guard.
// ---------------------------------------------------------------------------

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const BLANK_POST = (): StoredBlogPost => ({
  slug: '',
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  author: 'The MemoPear Team',
  readTime: '5 min read',
  conference: '',
  location: '',
  tags: [],
  excerpt: '',
  blocks: [{ type: 'p', text: '' }],
  status: 'draft',
  createdAt: 0,
  updatedAt: 0,
});

const BLOCK_LABELS: Record<BlogBlock['type'], string> = {
  p: 'Paragraph',
  h2: 'Heading',
  ul: 'Bullet list',
  quote: 'Pull quote',
  banner: 'CTA banner',
  link: 'Link',
  image: 'Image',
  faq: 'FAQ',
};

const newBlock = (type: BlogBlock['type']): BlogBlock => {
  switch (type) {
    case 'p': return { type: 'p', text: '' };
    case 'h2': return { type: 'h2', text: '' };
    case 'ul': return { type: 'ul', items: [''] };
    case 'quote': return { type: 'quote', text: '' };
    case 'banner': return { type: 'banner' };
    case 'link': return { type: 'link', label: '', url: '' };
    case 'image': return { type: 'image', url: '', alt: '', caption: '' };
    case 'faq': return { type: 'faq', items: [{ q: '', a: '' }] };
  }
};

const inputCls =
  'w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pear-500';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-pear-600 text-white font-black rounded-xl text-[11px] uppercase tracking-widest shadow hover:bg-pear-700 disabled:opacity-50 transition-colors';
const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 font-black rounded-xl text-[11px] uppercase tracking-widest hover:border-pear-500 hover:text-pear-600 transition-colors';

// ── Block editor ────────────────────────────────────────────────────────────

const BlockEditor: React.FC<{
  block: BlogBlock;
  slug: string;
  onChange: (b: BlogBlock) => void;
}> = ({ block, slug, onChange }) => {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File, apply: (url: string) => void) => {
    setUploading(true);
    try {
      apply(await uploadBlogImage(file, slug));
    } catch (err) {
      alert('Image upload failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  switch (block.type) {
    case 'p':
      return (
        <textarea className={inputCls} rows={4} placeholder="Paragraph text…" value={block.text}
          onChange={(e) => onChange({ type: 'p', text: e.target.value })} />
      );
    case 'h2':
      return (
        <input className={inputCls} placeholder="Section heading" value={block.text}
          onChange={(e) => onChange({ type: 'h2', text: e.target.value })} />
      );
    case 'quote':
      return (
        <textarea className={inputCls} rows={2} placeholder="Pull quote" value={block.text}
          onChange={(e) => onChange({ type: 'quote', text: e.target.value })} />
      );
    case 'ul':
      return (
        <div>
          <p className="text-[10px] text-slate-400 mb-1">One bullet per line.</p>
          <textarea className={inputCls} rows={4} placeholder={'First point\nSecond point'} value={block.items.join('\n')}
            onChange={(e) => onChange({ type: 'ul', items: e.target.value.split('\n') })} />
        </div>
      );
    case 'banner':
      return <p className="text-sm text-slate-500 dark:text-slate-400 italic">Renders the "Get started with MemoPear" call-to-action banner.</p>;
    case 'link':
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Link label" value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })} />
          <input className={inputCls} placeholder="https://…" value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })} />
        </div>
      );
    case 'image':
      return (
        <div className="space-y-3">
          {block.url && <img src={block.url} alt="" className="max-h-52 rounded-xl border border-slate-200 dark:border-white/10" />}
          <div className="flex flex-wrap items-center gap-3">
            <label className={btnGhost + ' cursor-pointer'}>
              {uploading ? 'Uploading…' : block.url ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, (url) => onChange({ ...block, url })); }} />
            </label>
            <input className={inputCls + ' flex-1 min-w-[160px]'} placeholder="Or paste image URL" value={block.url}
              onChange={(e) => onChange({ ...block, url: e.target.value })} />
          </div>
          <input className={inputCls} placeholder="Alt text (for accessibility & SEO)" value={block.alt || ''}
            onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          <input className={inputCls} placeholder="Caption (optional)" value={block.caption || ''}
            onChange={(e) => onChange({ ...block, caption: e.target.value })} />
        </div>
      );
    case 'faq':
      return (
        <div className="space-y-3">
          {block.items.map((qa, i) => (
            <div key={i} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Q{i + 1}</span>
                <button type="button" className="text-[10px] font-bold uppercase text-rose-500 hover:underline"
                  onClick={() => onChange({ type: 'faq', items: block.items.filter((_, j) => j !== i) })}>Remove</button>
              </div>
              <input className={inputCls} placeholder="Question" value={qa.q}
                onChange={(e) => onChange({ type: 'faq', items: block.items.map((it, j) => j === i ? { ...it, q: e.target.value } : it) })} />
              <textarea className={inputCls} rows={2} placeholder="Answer" value={qa.a}
                onChange={(e) => onChange({ type: 'faq', items: block.items.map((it, j) => j === i ? { ...it, a: e.target.value } : it) })} />
            </div>
          ))}
          <button type="button" className={btnGhost}
            onClick={() => onChange({ type: 'faq', items: [...block.items, { q: '', a: '' }] })}>+ Add question</button>
        </div>
      );
  }
};

// ── Post editor ─────────────────────────────────────────────────────────────

const PostEditor: React.FC<{
  initial: StoredBlogPost;
  isNew: boolean;
  onDone: () => void;
}> = ({ initial, isNew, onDone }) => {
  const [draft, setDraft] = useState<StoredBlogPost>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [heroUploading, setHeroUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [tagsText, setTagsText] = useState(initial.tags.join(', '));

  const set = (patch: Partial<StoredBlogPost>) => setDraft((d) => ({ ...d, ...patch }));

  const onTitle = (title: string) => {
    set({ title });
    if (isNew && !slugTouched) set({ slug: slugify(title) });
  };

  const setBlock = (i: number, b: BlogBlock) => set({ blocks: draft.blocks.map((x, j) => (j === i ? b : x)) });
  const addBlock = (type: BlogBlock['type']) => set({ blocks: [...draft.blocks, newBlock(type)] });
  const removeBlock = (i: number) => set({ blocks: draft.blocks.filter((_, j) => j !== i) });
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.blocks.length) return;
    const next = [...draft.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set({ blocks: next });
  };

  const uploadHero = async (file: File) => {
    setHeroUploading(true);
    try {
      set({ heroImageUrl: await uploadBlogImage(file, draft.slug || slugify(draft.title)) });
    } catch (err) {
      setError('Hero upload failed: ' + (err as Error).message);
    } finally {
      setHeroUploading(false);
    }
  };

  const commit = async (status: BlogPostStatus) => {
    setError('');
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const post: StoredBlogPost = { ...draft, tags, status };
    const missing = ['title', 'slug', 'description', 'excerpt', 'date'].filter((f) => !(post as any)[f]?.trim?.());
    if (missing.length) { setError('Please fill in: ' + missing.join(', ')); return; }
    if (!/^[a-z0-9-]+$/.test(post.slug)) { setError('Slug may only contain lowercase letters, numbers and hyphens.'); return; }
    setSaving(true);
    try {
      if (isNew && (await slugExists(post.slug))) {
        setError('A post with that slug already exists. Choose a different slug.');
        setSaving(false);
        return;
      }
      await savePost(post, isNew);
      onDone();
    } catch (err) {
      setError('Save failed: ' + (err as Error).message);
      setSaving(false);
    }
  };

  const previewPost: BlogPost = useMemo(
    () => ({ ...draft, tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean) }),
    [draft, tagsText],
  );

  if (showPreview) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur py-3">
          <span className="text-[11px] font-black uppercase tracking-widest text-pear-600">Preview</span>
          <button className={btnGhost} onClick={() => setShowPreview(false)}>← Back to editor</button>
        </div>
        <BlogPostView post={previewPost} posts={[previewPost]} onBack={() => setShowPreview(false)} onOpenPost={() => {}} onGetStarted={() => {}} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-40">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black tracking-tight">{isNew ? 'New post' : 'Edit post'}</h2>
        <button className={btnGhost} onClick={onDone}>← All posts</button>
      </div>

      {error && <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 font-medium">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className={labelCls}>Title</label>
          <input className={inputCls} value={draft.title} onChange={(e) => onTitle(e.target.value)} placeholder="Post title" />
        </div>
        <div>
          <label className={labelCls}>Slug (URL) — /blog/<span className="text-pear-600">{draft.slug || 'your-slug'}</span></label>
          <input className={inputCls} value={draft.slug} disabled={!isNew}
            onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }}
            placeholder="post-url-slug" />
          {!isNew && <p className="text-[10px] text-slate-400 mt-1">The slug can't change after a post is created (it's the permalink).</p>}
        </div>
        <div>
          <label className={labelCls}>Meta description (SEO — under ~155 chars)</label>
          <textarea className={inputCls} rows={2} value={draft.description} maxLength={200}
            onChange={(e) => set({ description: e.target.value })} placeholder="Shown in Google results & social previews" />
          <p className="text-[10px] text-slate-400 mt-1">{draft.description.length}/155 recommended</p>
        </div>
        <div>
          <label className={labelCls}>Excerpt (shown on the blog index card)</label>
          <textarea className={inputCls} rows={2} value={draft.excerpt}
            onChange={(e) => set({ excerpt: e.target.value })} placeholder="One-line teaser" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Publish date</label>
            <input type="date" className={inputCls} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Read time</label>
            <input className={inputCls} value={draft.readTime} onChange={(e) => set({ readTime: e.target.value })} placeholder="5 min read" />
          </div>
          <div>
            <label className={labelCls}>Author</label>
            <input className={inputCls} value={draft.author} onChange={(e) => set({ author: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Conference / topic</label>
            <input className={inputCls} value={draft.conference} onChange={(e) => set({ conference: e.target.value })} placeholder="e.g. CES 2026" />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input className={inputCls} value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Las Vegas, USA" />
          </div>
          <div>
            <label className={labelCls}>Tags (comma-separated)</label>
            <input className={inputCls} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Marketing, Lead Capture" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Hero image (optional — an on-brand graphic is generated if left empty)</label>
          <div className="flex flex-wrap items-center gap-3">
            {draft.heroImageUrl && <img src={draft.heroImageUrl} alt="" className="h-20 rounded-xl border border-slate-200 dark:border-white/10" />}
            <label className={btnGhost + ' cursor-pointer'}>
              {heroUploading ? 'Uploading…' : draft.heroImageUrl ? 'Replace' : 'Upload hero'}
              <input type="file" accept="image/*" className="hidden" disabled={heroUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHero(f); }} />
            </label>
            {draft.heroImageUrl && (
              <button className="text-[10px] font-bold uppercase text-rose-500 hover:underline" onClick={() => set({ heroImageUrl: undefined })}>Remove</button>
            )}
          </div>
        </div>
      </div>

      {/* Content blocks */}
      <div className="mt-10">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Content</h3>
        <div className="space-y-4">
          {draft.blocks.map((block, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-pear-600">{BLOCK_LABELS[block.type]}</span>
                <div className="flex items-center gap-1">
                  <button type="button" className={btnGhost + ' !px-2 !py-1'} onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                  <button type="button" className={btnGhost + ' !px-2 !py-1'} onClick={() => moveBlock(i, 1)} disabled={i === draft.blocks.length - 1} aria-label="Move down">↓</button>
                  <button type="button" className="text-[10px] font-bold uppercase text-rose-500 hover:underline px-2" onClick={() => removeBlock(i)}>Delete</button>
                </div>
              </div>
              <BlockEditor block={block} slug={draft.slug || slugify(draft.title)} onChange={(b) => setBlock(i, b)} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(BLOCK_LABELS) as BlogBlock['type'][]).map((t) => (
            <button key={t} type="button" className={btnGhost} onClick={() => addBlock(t)}>+ {BLOCK_LABELS[t]}</button>
          ))}
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-6 py-4 z-20">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <button className={btnGhost} onClick={() => setShowPreview(true)}>Preview</button>
          <div className="flex items-center gap-3">
            <button className={btnGhost} disabled={saving} onClick={() => commit('draft')}>Save draft</button>
            <button className={btnPrimary} disabled={saving} onClick={() => commit('published')}>
              {saving ? 'Saving…' : draft.status === 'published' ? 'Update & keep live' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Post list ───────────────────────────────────────────────────────────────

const PostList: React.FC<{
  posts: StoredBlogPost[];
  onEdit: (p: StoredBlogPost) => void;
  onNew: () => void;
  onSeed: () => void;
  seeding: boolean;
}> = ({ posts, onEdit, onNew, onSeed, seeding }) => {
  const remove = async (p: StoredBlogPost) => {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    try { await deletePost(p.slug); } catch (err) { alert('Delete failed: ' + (err as Error).message); }
  };
  const togglePublish = async (p: StoredBlogPost) => {
    try { await savePost({ ...p, status: p.status === 'published' ? 'draft' : 'published' }, false); }
    catch (err) { alert('Update failed: ' + (err as Error).message); }
  };

  return (
    <div className="max-w-4xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Blog CMS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Write, edit, and publish posts. Published posts are live and SEO-indexed instantly.</p>
        </div>
        <button className={btnPrimary} onClick={onNew}>+ New post</button>
      </div>

      {posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 p-10 text-center">
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">No posts yet.</p>
          <button className={btnGhost} onClick={onSeed} disabled={seeding}>
            {seeding ? 'Importing…' : 'Import the ' + BLOG_POSTS.length + ' built-in starter posts'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.slug} className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>{p.status}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{p.date}</span>
              </div>
              <p className="font-black tracking-tight truncate">{p.title || '(untitled)'}</p>
              <p className="text-xs text-slate-400 truncate">/blog/{p.slug}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className={btnGhost} onClick={() => togglePublish(p)}>{p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
              <button className={btnGhost} onClick={() => onEdit(p)}>Edit</button>
              <button className="text-[10px] font-bold uppercase text-rose-500 hover:underline px-2" onClick={() => remove(p)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Top-level CMS shell ─────────────────────────────────────────────────────

export const BlogAdmin: React.FC<{
  currentEmail?: string | null;
  onBack: () => void;
}> = ({ currentEmail, onBack }) => {
  const [posts, setPosts] = useState<StoredBlogPost[]>([]);
  const [editing, setEditing] = useState<{ post: StoredBlogPost; isNew: boolean } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const admin = isBlogAdmin(currentEmail);

  useEffect(() => {
    if (!admin) return;
    return watchAllPosts(setPosts);
  }, [admin]);

  const seed = async () => {
    setSeeding(true);
    try {
      for (const p of BLOG_POSTS) {
        await savePost({ ...p, status: 'published' }, !posts.some((x) => x.slug === p.slug));
      }
    } catch (err) {
      alert('Import failed: ' + (err as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  if (!admin) {
    return (
      <div className="max-w-md mx-auto py-24 text-center px-6">
        <h1 className="text-2xl font-black tracking-tight mb-3">Blog CMS</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {currentEmail
            ? `The account ${currentEmail} isn't authorised to manage the blog.`
            : 'Sign in with an authorised owner account to manage the blog.'}
        </p>
        {!currentEmail && (
          <button className={btnPrimary} onClick={() => signInWithGoogle().catch(() => {})}>Sign in with Google</button>
        )}
        <div className="mt-6">
          <button className={btnGhost} onClick={onBack}>← Back to site</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 hover:text-pear-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        Back to site
      </button>
      {editing ? (
        <PostEditor initial={editing.post} isNew={editing.isNew} onDone={() => setEditing(null)} />
      ) : (
        <PostList
          posts={posts}
          onNew={() => setEditing({ post: BLANK_POST(), isNew: true })}
          onEdit={(p) => setEditing({ post: p, isNew: false })}
          onSeed={seed}
          seeding={seeding}
        />
      )}
    </div>
  );
};
