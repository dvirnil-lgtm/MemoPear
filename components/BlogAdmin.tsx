import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BLOG_POSTS,
  BlogPostView,
  stripInline,
  type BlogBlock,
  type BlogPost,
} from './Blog';
import {
  watchAllPosts,
  savePost,
  renamePost,
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
// A single-screen, owner-only workspace for writing and publishing blog posts
// straight from the app — no code deploy required. Everything about a post
// lives on one screen: the post list on the left, one writing area in the
// middle, and every setting/action for the open post on the right.
//
// The body is written as plain text with a few lightweight shortcuts
// (## / ### headings, **bold**, *italic*, - bullet, > quote, ![alt](url),
// Q:/A: FAQ…) and converted to
// the structured BlogBlock list on save, so the public renderer, JSON-LD and
// the SSR function in functions/blogSsr.js keep working unchanged.
//
// Drafts autosave. Only the title and body are required to publish — the SEO
// description, excerpt, read time and URL are derived automatically unless
// overridden in the settings panel.
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

const truncate = (text: string, max: number): string => {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[,.;:\s]+$/, '') + '…';
};

const BLANK_POST = (): StoredBlogPost => ({
  slug: '',
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  author: 'The MemoPear Team',
  readTime: '',
  conference: '',
  location: '',
  tags: [],
  excerpt: '',
  blocks: [],
  status: 'draft',
  createdAt: 0,
  updatedAt: 0,
});

// ── Plain text <-> blocks ───────────────────────────────────────────────────

/** Serialises structured blocks into the editor's plain-text format. */
export const blocksToText = (blocks: BlogBlock[]): string =>
  blocks
    .map((b) => {
      switch (b.type) {
        case 'p': return b.text;
        case 'h2': return `## ${b.text}`;
        case 'h3': return `### ${b.text}`;
        case 'ul': return b.items.map((i) => `- ${i}`).join('\n');
        case 'quote': return `> ${b.text}`;
        case 'banner': return '[cta]';
        case 'link': return `[${b.label}](${b.url})`;
        case 'image':
          return `![${b.alt || ''}](${b.url}${b.caption ? ` "${b.caption.replace(/"/g, "'")}"` : ''})`;
        case 'faq': return b.items.map((it) => `Q: ${it.q}\nA: ${it.a}`).join('\n\n');
      }
    })
    .join('\n\n');

/** Parses the editor's plain-text format back into structured blocks. */
export const textToBlocks = (text: string): BlogBlock[] => {
  const blocks: BlogBlock[] = [];
  let para: string[] = [];
  let prev: 'p' | 'ul' | 'quote' | 'faqQ' | 'faqA' | 'other' | null = null;
  let afterBlank = false;
  const last = () => blocks[blocks.length - 1];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    para = [];
  };

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    // Lists and FAQs continue across blank lines; everything else ends at one.
    if (!line) { flush(); if (prev !== 'ul' && prev !== 'faqA' && prev !== 'faqQ') prev = null; afterBlank = true; continue; }
    const wasAfterBlank = afterBlank;
    afterBlank = false;

    if ((m = line.match(/^###\s+(.+)$/))) {
      flush(); blocks.push({ type: 'h3', text: m[1].trim() }); prev = 'other';
    } else if ((m = line.match(/^##\s+(.+)$/))) {
      flush(); blocks.push({ type: 'h2', text: m[1].trim() }); prev = 'other';
    } else if ((m = line.match(/^[-*•]\s+(.+)$/))) {
      flush();
      const l = last();
      if (l?.type === 'ul' && prev === 'ul') l.items.push(m[1].trim());
      else blocks.push({ type: 'ul', items: [m[1].trim()] });
      prev = 'ul';
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flush();
      const l = last();
      if (l?.type === 'quote' && prev === 'quote') l.text = `${l.text} ${m[1].trim()}`.trim();
      else blocks.push({ type: 'quote', text: m[1].trim() });
      prev = 'quote';
    } else if (/^\[cta\]$/i.test(line)) {
      flush(); blocks.push({ type: 'banner' }); prev = 'other';
    } else if ((m = line.match(/^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)$/))) {
      flush();
      blocks.push({ type: 'image', url: m[2], alt: m[1].trim(), ...(m[3] ? { caption: m[3].trim() } : {}) });
      prev = 'other';
    } else if ((m = line.match(/^\[([^\]]+)\]\((\S+)\)$/))) {
      flush(); blocks.push({ type: 'link', label: m[1].trim(), url: m[2] }); prev = 'other';
    } else if ((m = line.match(/^Q:\s*(.*)$/i))) {
      flush();
      const l = last();
      const item = { q: m[1].trim(), a: '' };
      if (l?.type === 'faq' && (prev === 'faqA' || prev === 'faqQ')) l.items.push(item);
      else blocks.push({ type: 'faq', items: [item] });
      prev = 'faqQ';
    } else if ((m = line.match(/^A:\s*(.*)$/i)) && last()?.type === 'faq' && prev === 'faqQ') {
      const l = last() as Extract<BlogBlock, { type: 'faq' }>;
      l.items[l.items.length - 1].a = m[1].trim();
      prev = 'faqA';
    } else if (prev === 'faqA' && !wasAfterBlank && last()?.type === 'faq') {
      // Continuation line of a multi-line answer.
      const l = last() as Extract<BlogBlock, { type: 'faq' }>;
      const it = l.items[l.items.length - 1];
      it.a = `${it.a} ${line}`.trim();
    } else {
      para.push(line); prev = 'p';
    }
  }
  flush();

  return blocks.filter((b) => {
    if (b.type === 'faq') b.items = b.items.filter((it) => it.q || it.a);
    if (b.type === 'faq') return b.items.length > 0;
    if (b.type === 'p' || b.type === 'h2' || b.type === 'h3' || b.type === 'quote') return !!b.text.trim();
    return true;
  });
};

const plainText = (blocks: BlogBlock[]): string =>
  blocks
    .map((b) => {
      switch (b.type) {
        case 'p': case 'h2': case 'h3': case 'quote': return stripInline(b.text);
        case 'ul': return b.items.join(' ');
        case 'faq': return b.items.map((i) => `${i.q} ${i.a}`).join(' ');
        default: return '';
      }
    })
    .join(' ');

const autoReadTime = (blocks: BlogBlock[]): string => {
  const words = plainText(blocks).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
};

const firstParagraph = (blocks: BlogBlock[]): string =>
  stripInline((blocks.find((b) => b.type === 'p') as { text: string } | undefined)?.text || '');

// ── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pear-500';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5';
const hintCls = 'text-[10px] text-slate-400 mt-1';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-pear-600 text-white font-black rounded-xl text-[11px] uppercase tracking-widest shadow hover:bg-pear-700 disabled:opacity-50 disabled:cursor-default transition-colors';
const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 font-black rounded-xl text-[11px] uppercase tracking-widest hover:border-pear-500 hover:text-pear-600 disabled:opacity-50 transition-colors';
const toolBtn =
  'px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-pear-600 transition-colors';
const panelCls = 'rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4';

const StatusPill: React.FC<{ status: BlogPostStatus }> = ({ status }) => (
  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${status === 'published' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
    {status === 'published' ? 'Live' : 'Draft'}
  </span>
);

// ── Editor ──────────────────────────────────────────────────────────────────

interface EditorState {
  post: StoredBlogPost;
  body: string;
  tagsText: string;
}

const snapshotOf = (s: EditorState): string =>
  JSON.stringify({ ...s.post, status: undefined, createdAt: undefined, updatedAt: undefined, body: s.body, tagsText: s.tagsText });

const PostEditor: React.FC<{
  initial: StoredBlogPost;
  /** Slug of the saved document, or null for a post that isn't saved yet. */
  savedSlugInitial: string | null;
  onSaved: (slug: string) => void;
  onDeleted: () => void;
  onDuplicate: (post: StoredBlogPost) => void;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
}> = ({ initial, savedSlugInitial, onSaved, onDeleted, onDuplicate, onDirtyChange, onClose }) => {
  const [state, setState] = useState<EditorState>(() => ({
    post: initial,
    body: blocksToText(initial.blocks),
    tagsText: initial.tags.join(', '),
  }));
  const [savedSnapshot, setSavedSnapshot] = useState(() => (savedSlugInitial ? snapshotOf({
    post: initial, body: blocksToText(initial.blocks), tagsText: initial.tags.join(', '),
  }) : ''));
  const [savedSlug, setSavedSlug] = useState<string | null>(savedSlugInitial);
  const [slugTouched, setSlugTouched] = useState(!!savedSlugInitial && initial.slug !== slugify(initial.title));
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initial.updatedAt || null);
  const savingRef = useRef(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const { post, body, tagsText } = state;
  const isLive = post.status === 'published';
  const snapshot = snapshotOf(state);
  // A never-saved post only counts as changed once something has been typed.
  const dirty = savedSlug ? snapshot !== savedSnapshot : !!(post.title.trim() || body.trim());

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);

  const setPost = (patch: Partial<StoredBlogPost>) =>
    setState((s) => ({ ...s, post: { ...s.post, ...patch } }));

  const onTitle = (title: string) =>
    setState((s) => ({
      ...s,
      post: { ...s.post, title, ...(!isLive && !slugTouched ? { slug: slugify(title) } : {}) },
    }));

  const blocks = useMemo(() => textToBlocks(body), [body]);

  /** The post exactly as it will be stored, with auto-derived fields filled in. */
  const build = useCallback((status: BlogPostStatus): StoredBlogPost => {
    const intro = firstParagraph(blocks);
    return {
      ...post,
      slug: post.slug || slugify(post.title),
      title: post.title.trim(),
      description: post.description.trim() || truncate(intro, 155),
      excerpt: post.excerpt.trim() || truncate(intro, 220),
      readTime: post.readTime.trim() || autoReadTime(blocks),
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      blocks,
      status,
    };
  }, [post, blocks, tagsText]);

  const persist = useCallback(async (status: BlogPostStatus, auto = false): Promise<void> => {
    if (savingRef.current) return;
    const next = build(status);
    const fail = (msg: string) => { if (!auto) setError(msg); };
    if (!next.title) return fail('Add a title first.');
    if (!/^[a-z0-9-]+$/.test(next.slug)) return fail('The URL may only contain lowercase letters, numbers and hyphens.');
    if (status === 'published') {
      if (!next.blocks.length) return fail('Write something before publishing.');
      if (!next.date) return fail('Set a publish date in the settings panel.');
    }
    if (!auto) setError('');
    const snapAtSave = snapshot;
    savingRef.current = true;
    setSaving(true);
    try {
      if (savedSlug !== next.slug && (await slugExists(next.slug))) {
        setError(`Another post already uses /blog/${next.slug}. Change the title or the URL in settings.`);
        return;
      }
      if (savedSlug === null) await savePost(next, true);
      else if (savedSlug !== next.slug) await renamePost(savedSlug, next);
      else await savePost(next, false);
      setSavedSlug(next.slug);
      setState((s) => ({ ...s, post: { ...s.post, slug: next.slug, status } }));
      setSavedSnapshot(snapAtSave);
      setLastSavedAt(Date.now());
      onSaved(next.slug);
    } catch (err) {
      setError('Save failed: ' + (err as Error).message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [build, snapshot, savedSlug, onSaved]);

  // Drafts autosave a couple of seconds after you stop typing. Live posts never
  // autosave — changes only go live when you press Update.
  useEffect(() => {
    if (!dirty || isLive || !post.title.trim()) return;
    const t = setTimeout(() => { persist('draft', true); }, 2000);
    return () => clearTimeout(t);
  }, [dirty, isLive, post.title, persist]);

  // Cmd/Ctrl+S saves (updates a live post, saves a draft).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        persist(isLive ? 'published' : 'draft');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [persist, isLive]);

  // ── Body helpers ──
  const insert = (snippet: string, selectFrom?: number, selectLen?: number) => {
    const el = bodyRef.current;
    const start = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const pre = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const post_ = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
    const text = before + pre + snippet + post_ + after;
    setState((s) => ({ ...s, body: text }));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const base = before.length + pre.length;
      const from = base + (selectFrom ?? snippet.length);
      el.setSelectionRange(from, from + (selectLen ?? 0));
    });
  };

  /** Wraps the current line(s) with a prefix, or inserts a template line. */
  const prefixLine = (prefix: string, placeholder: string) => {
    const el = bodyRef.current;
    if (el && el.selectionStart !== el.selectionEnd) {
      const sel = body.slice(el.selectionStart, el.selectionEnd);
      insert(sel.split('\n').map((l) => (l.trim() ? prefix + l.replace(/^(#{2,3}\s+|[-*•]\s+|>\s?)/, '') : l)).join('\n'));
    } else {
      insert(prefix + placeholder, prefix.length, placeholder.length);
    }
  };

  /** Wraps the selection in an inline marker (** bold, * italic), or inserts a placeholder. */
  const wrap = (marker: string, placeholder: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const sel = body.slice(start, end);
    // Toggle off when the selection is already wrapped.
    const before = body.slice(start - marker.length, start);
    const after = body.slice(end, end + marker.length);
    if (sel && before === marker && after === marker) {
      setState((s) => ({ ...s, body: body.slice(0, start - marker.length) + sel + body.slice(end + marker.length) }));
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start - marker.length, end - marker.length); });
      return;
    }
    const inner = sel || placeholder;
    setState((s) => ({ ...s, body: body.slice(0, start) + marker + inner + marker + body.slice(end) }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length + inner.length);
    });
  };

  const uploadImages = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setUploading(true);
    setError('');
    try {
      const slug = post.slug || slugify(post.title);
      const urls = await Promise.all(images.map((f) => uploadBlogImage(f, slug)));
      insert(urls.map((u) => `![](${u})`).join('\n\n'), 2, 0);
    } catch (err) {
      setError('Image upload failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    try {
      setPost({ heroImageUrl: await uploadBlogImage(file, post.slug || slugify(post.title)) });
    } catch (err) {
      setError('Cover upload failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${post.title || 'this post'}"? This can't be undone.`)) return;
    try {
      if (savedSlug) await deletePost(savedSlug);
      onDeleted();
    } catch (err) {
      setError('Delete failed: ' + (err as Error).message);
    }
  };

  const preview = build(post.status);
  const intro = firstParagraph(blocks);
  const words = plainText(blocks).split(/\s+/).filter(Boolean).length;

  const saveLabel = saving
    ? 'Saving…'
    : uploading
      ? 'Uploading…'
      : dirty
        ? (isLive ? 'Unpublished changes' : post.title.trim() ? 'Unsaved' : 'Add a title to save')
        : lastSavedAt
          ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : '';

  // The publish bar sits in the page flow — once above and once below the
  // writing area — rather than floating over the content.
  const errorBox = error && (
    <div className="my-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm px-4 py-3 font-medium flex items-start justify-between gap-3">
      <span>{error}</span>
      <button className="text-rose-400 hover:text-rose-600" onClick={() => setError('')} aria-label="Dismiss">✕</button>
    </div>
  );

  const actionBar = (where: 'top' | 'bottom') => (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 ${where === 'top' ? 'mb-4' : 'mt-4'}`}>
      {where === 'top' && (
        <button onClick={onClose} className="lg:hidden text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-pear-600">← Posts</button>
      )}
      <div className="inline-flex rounded-xl border border-slate-300 dark:border-white/15 p-0.5">
        {(['write', 'preview'] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3.5 py-1.5 rounded-[10px] text-[11px] font-black uppercase tracking-widest transition-colors ${mode === m ? 'bg-pear-600 text-white' : 'text-slate-500 hover:text-pear-600'}`}>
            {m}
          </button>
        ))}
      </div>
      <StatusPill status={post.status} />
      <span className={`text-[11px] font-medium ${dirty && isLive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{saveLabel}</span>
      <div className="ml-auto">
        {isLive ? (
          <button className={btnPrimary} disabled={saving || !dirty} onClick={() => persist('published')}>
            {dirty ? 'Update live post' : 'Up to date'}
          </button>
        ) : (
          <button className={btnPrimary} disabled={saving} onClick={() => persist('published')}>Publish</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-w-0">
      {actionBar('top')}

      {errorBox}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        {/* ── Writing area ── */}
        <div className="min-w-0">
          {mode === 'preview' ? (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <BlogPostView post={preview} posts={[preview]} onBack={() => setMode('write')} onOpenPost={() => {}} onGetStarted={() => {}} />
            </div>
          ) : (
            <>
              <textarea
                value={post.title}
                onChange={(e) => onTitle(e.target.value.replace(/\n/g, ' '))}
                placeholder="Post title"
                rows={1}
                className="w-full resize-none bg-transparent text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none [field-sizing:content]"
              />
              <p className="text-xs text-slate-400 mb-4 truncate">memopear.com/blog/<span className="text-pear-600">{post.slug || 'your-post-url'}</span></p>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 focus-within:ring-2 focus-within:ring-pear-500">
                <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 dark:border-white/10 px-2 py-1.5">
                  <button type="button" className={toolBtn} title="Section heading (shows in the table of contents)" onClick={() => prefixLine('## ', 'Section heading')}>H2</button>
                  <button type="button" className={toolBtn} title="Sub-heading" onClick={() => prefixLine('### ', 'Sub-heading')}>H3</button>
                  <button type="button" className={toolBtn + ' !font-black'} title="Bold (Ctrl/Cmd+B)" onClick={() => wrap('**', 'bold text')}>B</button>
                  <button type="button" className={toolBtn + ' italic font-serif'} title="Italic (Ctrl/Cmd+I)" onClick={() => wrap('*', 'italic text')}>I</button>
                  <span className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
                  <button type="button" className={toolBtn} title="Bullet list" onClick={() => prefixLine('- ', 'List item')}>• List</button>
                  <button type="button" className={toolBtn} title="Pull quote" onClick={() => prefixLine('> ', 'A memorable quote')}>❝ Quote</button>
                  <button type="button" className={toolBtn} title="Link button" onClick={() => insert('[Link text](https://)', 1, 9)}>Link</button>
                  <label className={toolBtn + ' cursor-pointer'} title="Upload image (or paste / drop one into the text)">
                    {uploading ? 'Uploading…' : 'Image'}
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
                      onChange={(e) => { uploadImages(Array.from(e.target.files || [])); e.target.value = ''; }} />
                  </label>
                  <button type="button" className={toolBtn} title="MemoPear call-to-action banner" onClick={() => insert('[cta]')}>CTA banner</button>
                  <button type="button" className={toolBtn} title="FAQ (adds FAQ rich results)" onClick={() => insert('Q: Question?\nA: Answer.', 3, 9)}>FAQ</button>
                  <span className="ml-auto pr-2 text-[10px] text-slate-400">{words} words</span>
                </div>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setState((s) => ({ ...s, body: e.target.value }))}
                  onKeyDown={(e) => {
                    if (!(e.metaKey || e.ctrlKey)) return;
                    const k = e.key.toLowerCase();
                    if (k === 'b') { e.preventDefault(); wrap('**', 'bold text'); }
                    else if (k === 'i') { e.preventDefault(); wrap('*', 'italic text'); }
                  }}
                  onPaste={(e) => {
                    const files = Array.from(e.clipboardData.files || []);
                    if (files.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); uploadImages(files); }
                  }}
                  onDrop={(e) => {
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length) { e.preventDefault(); uploadImages(files); }
                  }}
                  placeholder={'Start writing…\n\nSeparate paragraphs with a blank line.\n## A heading\n### A sub-heading\n**bold** and *italic*\n- A bullet point\n> A pull quote\n\nPaste or drop images right here.'}
                  className="w-full min-h-[60vh] resize-y bg-transparent px-4 py-4 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none font-[inherit]"
                />
              </div>
              <details className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                <summary className="cursor-pointer font-bold">Formatting cheatsheet</summary>
                <div className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 font-mono text-[11px]">
                  <span>## Heading</span><span>### Sub-heading</span>
                  <span>**bold** (Ctrl/Cmd+B)</span><span>*italic* (Ctrl/Cmd+I)</span>
                  <span>- Bullet point</span><span>Blank line — new paragraph</span>
                  <span>&gt; Pull quote</span><span>[cta] — sign-up banner</span>
                  <span>[Label](https://…) — link</span><span>![Alt text](url "Caption") — image</span>
                  <span>Q: Question / A: Answer — FAQ</span>
                </div>
              </details>
            </>
          )}
          {errorBox}
          {actionBar('bottom')}
        </div>

        {/* ── Settings & actions: everything else about the post, in one panel ── */}
        <aside className="space-y-4 xl:sticky xl:top-40">
          <div className={panelCls + ' space-y-3'}>
            <div className="flex items-center justify-between">
              <span className={labelCls + ' !mb-0'}>Status</span>
              <StatusPill status={post.status} />
            </div>
            <div>
              <label className={labelCls}>Publish date</label>
              <input type="date" className={inputCls} value={post.date} onChange={(e) => setPost({ date: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {isLive && (
                <a className={btnGhost} href={`/blog/${savedSlug}`} target="_blank" rel="noopener noreferrer">View live ↗</a>
              )}
              {isLive && (
                <button className={btnGhost} disabled={saving} onClick={() => { if (confirm('Take this post offline? It becomes a draft.')) persist('draft'); }}>Unpublish</button>
              )}
              {!isLive && (
                <button className={btnGhost} disabled={saving || !dirty} onClick={() => persist('draft')}>Save draft</button>
              )}
            </div>
          </div>

          <div className={panelCls + ' space-y-3'}>
            <span className={labelCls}>Cover image</span>
            {post.heroImageUrl && <img src={post.heroImageUrl} alt="" className="w-full rounded-xl border border-slate-200 dark:border-white/10" />}
            <div className="flex items-center gap-3">
              <label className={btnGhost + ' cursor-pointer'}>
                {post.heroImageUrl ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ''; }} />
              </label>
              {post.heroImageUrl && (
                <button className="text-[10px] font-bold uppercase text-rose-500 hover:underline" onClick={() => setPost({ heroImageUrl: undefined })}>Remove</button>
              )}
            </div>
            {!post.heroImageUrl && <p className={hintCls}>Optional — an on-brand graphic is generated if empty.</p>}
          </div>

          <div className={panelCls + ' space-y-3'}>
            <span className={labelCls}>SEO & sharing</span>
            <div>
              <label className={labelCls}>URL</label>
              <input className={inputCls} value={post.slug} disabled={isLive}
                onChange={(e) => { setSlugTouched(true); setPost({ slug: slugify(e.target.value) }); }}
                placeholder="post-url" />
              <p className={hintCls}>{isLive ? "Locked while live — it's the permalink." : 'Follows the title until you edit it.'}</p>
            </div>
            <div>
              <label className={labelCls}>Meta description</label>
              <textarea className={inputCls} rows={3} value={post.description} maxLength={200}
                onChange={(e) => setPost({ description: e.target.value })}
                placeholder={intro ? `Auto: ${truncate(intro, 155)}` : 'Auto-filled from your first paragraph'} />
              <p className={hintCls}>{post.description.length ? `${post.description.length}/155 recommended` : 'Leave empty to use the first paragraph.'}</p>
            </div>
            <div>
              <label className={labelCls}>Excerpt (blog index card)</label>
              <textarea className={inputCls} rows={2} value={post.excerpt}
                onChange={(e) => setPost({ excerpt: e.target.value })}
                placeholder="Auto-filled from your first paragraph" />
            </div>
            <div>
              <label className={labelCls}>Tags</label>
              <input className={inputCls} value={tagsText} onChange={(e) => setState((s) => ({ ...s, tagsText: e.target.value }))} placeholder="Marketing, Lead Capture" />
            </div>
          </div>

          <details className={panelCls}>
            <summary className={labelCls + ' !mb-0 cursor-pointer'}>More details</summary>
            <div className="space-y-3 mt-3">
              <div>
                <label className={labelCls}>Author</label>
                <input className={inputCls} value={post.author} onChange={(e) => setPost({ author: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Read time</label>
                <input className={inputCls} value={post.readTime} onChange={(e) => setPost({ readTime: e.target.value })} placeholder={`Auto: ${autoReadTime(blocks)}`} />
              </div>
              <div>
                <label className={labelCls}>Conference / topic</label>
                <input className={inputCls} value={post.conference} onChange={(e) => setPost({ conference: e.target.value })} placeholder="e.g. CES 2026" />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} value={post.location} onChange={(e) => setPost({ location: e.target.value })} placeholder="e.g. Las Vegas, USA" />
              </div>
            </div>
          </details>

          <div className="flex items-center justify-between px-1">
            <button className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-pear-600"
              onClick={() => onDuplicate(build('draft'))}>Duplicate</button>
            <button className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:underline" onClick={remove}>Delete post</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

// ── Post list (sidebar) ─────────────────────────────────────────────────────

type Filter = 'all' | 'published' | 'draft';

const PostList: React.FC<{
  posts: StoredBlogPost[];
  selectedSlug: string | null;
  onSelect: (p: StoredBlogPost) => void;
  onNew: () => void;
  onSeed: () => void;
  seeding: boolean;
}> = ({ posts, selectedSlug, onSelect, onNew, onSeed, seeding }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const counts = {
    all: posts.length,
    published: posts.filter((p) => p.status === 'published').length,
    draft: posts.filter((p) => p.status === 'draft').length,
  };
  const q = query.trim().toLowerCase();
  const shown = posts.filter(
    (p) => (filter === 'all' || p.status === filter) &&
      (!q || p.title.toLowerCase().includes(q) || p.slug.includes(q) || p.tags.some((t) => t.toLowerCase().includes(q))),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight">Blog</h1>
        <button className={btnPrimary + ' !px-4 !py-2'} onClick={onNew}>+ New post</button>
      </div>
      <input className={inputCls} placeholder="Search posts…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="flex gap-1">
        {(['all', 'published', 'draft'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${filter === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
            {f === 'published' ? 'Live' : f === 'draft' ? 'Drafts' : 'All'} {counts[f]}
          </button>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 p-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-3">No posts yet.</p>
          <button className={btnGhost} onClick={onSeed} disabled={seeding}>
            {seeding ? 'Importing…' : `Import ${BLOG_POSTS.length} starter posts`}
          </button>
        </div>
      )}

      <div className="space-y-1">
        {shown.map((p) => (
          <button key={p.slug} onClick={() => onSelect(p)}
            className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${p.slug === selectedSlug ? 'bg-pear-500/10 ring-1 ring-pear-500/40' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{p.status === 'published' ? p.date : 'Draft'}</span>
            </div>
            <p className="text-sm font-bold leading-snug line-clamp-2">{p.title || '(untitled)'}</p>
          </button>
        ))}
        {posts.length > 0 && shown.length === 0 && <p className="text-xs text-slate-400 px-3 py-2">No matching posts.</p>}
      </div>
    </div>
  );
};

// ── Top-level CMS shell ─────────────────────────────────────────────────────

type Selection = { key: number; slug: string | null; initial: StoredBlogPost };

export const BlogAdmin: React.FC<{
  currentEmail?: string | null;
  onBack: () => void;
}> = ({ currentEmail, onBack }) => {
  const [posts, setPosts] = useState<StoredBlogPost[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [seeding, setSeeding] = useState(false);
  const dirtyRef = useRef(false);
  const keyRef = useRef(0);
  const admin = isBlogAdmin(currentEmail);

  useEffect(() => {
    if (!admin) return;
    return watchAllPosts(setPosts);
  }, [admin]);

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (dirtyRef.current) e.preventDefault(); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const onDirtyChange = useCallback((d: boolean) => { dirtyRef.current = d; }, []);

  const confirmLeave = () =>
    !dirtyRef.current || confirm('You have unsaved changes. Discard them?');

  const open = (slug: string | null, initial: StoredBlogPost) => {
    if (!confirmLeave()) return;
    dirtyRef.current = false;
    keyRef.current += 1;
    setSelection({ key: keyRef.current, slug, initial });
  };

  const close = () => {
    if (!confirmLeave()) return;
    dirtyRef.current = false;
    setSelection(null);
  };

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
    <div className="px-4 md:px-6 py-6 max-w-[1500px] mx-auto animate-in fade-in duration-300">
      <button onClick={() => { if (confirmLeave()) { dirtyRef.current = false; onBack(); } }} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 hover:text-pear-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        Back to site
      </button>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        <div className={`${selection ? 'hidden lg:block' : ''} lg:sticky lg:top-24`}>
          <PostList
            posts={posts}
            selectedSlug={selection?.slug ?? null}
            onSelect={(p) => { if (p.slug !== selection?.slug) open(p.slug, p); }}
            onNew={() => open(null, BLANK_POST())}
            onSeed={seed}
            seeding={seeding}
          />
        </div>

        {selection ? (
          <PostEditor
            key={selection.key}
            initial={selection.initial}
            savedSlugInitial={selection.slug}
            onSaved={(slug) => setSelection((s) => (s ? { ...s, slug } : s))}
            onDeleted={() => { dirtyRef.current = false; setSelection(null); }}
            onDuplicate={(p) => open(null, { ...p, title: `${p.title} (copy)`, slug: '', status: 'draft', createdAt: 0, updatedAt: 0 })}
            onDirtyChange={onDirtyChange}
            onClose={close}
          />
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-slate-300 dark:border-white/15 py-32 px-6">
            <h2 className="text-2xl font-black tracking-tight mb-2">Write something new</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
              Pick a post on the left to edit it, or start a new one. Just a title and your text — everything else fills itself in.
            </p>
            <button className={btnPrimary} onClick={() => open(null, BLANK_POST())}>+ New post</button>
          </div>
        )}
      </div>
    </div>
  );
};
