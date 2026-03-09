/**
 * Content loader — reads markdown files from content/ at startup,
 * parses frontmatter, and renders HTML via marked + highlight.js + KaTeX.
 */
import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import katex from "katex";

const CONTENT_DIR = path.join(import.meta.dir, "..", "content");

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  }),
);

export type Post = {
  slug: string;
  title: string;
  date: string;
  tag: string;
  pinned: boolean;
  description: string;
  html: string;
  /** True if post contains LaTeX and needs KaTeX CSS. */
  hasLatex: boolean;
  /** URL path like /2023/12/15/floating-point/ */
  path: string;
};

export type Page = {
  slug: string;
  title: string;
  html: string;
  path: string;
};

/**
 * Extract math blocks from markdown source before markdown processing,
 * replacing them with placeholders. This prevents markdown from converting
 * LaTeX underscores to <em> tags and braces to other elements.
 */
function extractMath(source: string): {
  text: string;
  blocks: { tex: string; display: boolean }[];
} {
  const blocks: { tex: string; display: boolean }[] = [];
  const PLACEHOLDER = "%%MATH_BLOCK_";

  // Math: $$...$$ — display when alone on a line, inline when mixed with text.
  let text = source.replace(
    /\$\$([\s\S]*?)\$\$/g,
    (match, tex: string, offset: number) => {
      const lineStart = source.lastIndexOf("\n", offset) + 1;
      const lineEnd = source.indexOf("\n", offset + match.length);
      const line = source.slice(
        lineStart,
        lineEnd === -1 ? undefined : lineEnd,
      );
      const display = line.trim() === match.trim();
      const idx = blocks.length;
      blocks.push({ tex: tex.trim(), display });
      return `${PLACEHOLDER}${idx}%%`;
    },
  );

  // Inline math: $...$
  text = text.replace(/(?<![\\$])\$([^\n$]+?)\$(?!\$)/g, (_, tex: string) => {
    const idx = blocks.length;
    blocks.push({ tex: tex.trim(), display: false });
    return `${PLACEHOLDER}${idx}%%`;
  });

  return { text, blocks };
}

/** Render extracted math blocks back into the HTML after markdown processing. */
function renderMathBlocks(
  html: string,
  blocks: { tex: string; display: boolean }[],
): { result: string; found: boolean } {
  if (blocks.length === 0) return { result: html, found: false };

  const katexOpts = { throwOnError: false, trust: true };

  // Strip \label{...} and resolve \eqref{N} → (N) since cross-block
  // references don't work when each block is rendered independently.
  const cleanTex = (tex: string) =>
    tex
      .replace(/\\label\{[^}]*\}/g, "")
      .replace(/\\eqref\{([^}]+)\}/g, "(\\text{$1})");

  let result = html.replace(/%%MATH_BLOCK_(\d+)%%/g, (_, idxStr: string) => {
    const idx = Number(idxStr);
    const block = blocks[idx];
    try {
      return katex.renderToString(cleanTex(block.tex), {
        ...katexOpts,
        displayMode: block.display,
      });
    } catch {
      return `<code>${block.tex}</code>`;
    }
  });

  // \eqref cross-references can't resolve across independently-rendered blocks.
  // Replace any unrendered \eqref{N} with a styled (N) reference.
  result = result.replace(/\\eqref\{([^}]+)\}/g, (_, ref: string) => {
    return `<span class="katex"><span class="katex-html"><span class="base"><span class="mord">(${ref})</span></span></span></span>`;
  });

  return { result, found: true };
}

function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body: match[2] };
}

/** Convert Jekyll/Liquid syntax to standard markdown. */
function stripJekyll(body: string, currentPostPath: string): string {
  let result = body;

  // /assets/ → /content/assets/ (old path convention)
  result = result.replace(/\(\/assets\//g, "(/content/assets/");

  // {% link assets/... %} → /content/assets/...
  result = result.replace(
    /\{%\s*link\s+assets\/([^%]+?)\s*%\}/g,
    "/content/assets/$1",
  );

  // {% post_link SLUG %} → link to post (slug format: YYYY-MM-DD-title)
  result = result.replace(
    /\{%\s*post_link\s+(\S+)\s*%\}/g,
    (_, slug: string) => {
      const dateMatch = slug.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
      if (dateMatch) {
        const [, y, m, d, s] = dateMatch;
        return `[${s.replace(/-/g, " ")}](/${y}/${m}/${d}/${s}/)`;
      }
      return slug;
    },
  );

  // {% comment %}...{% endcomment %} → remove
  result = result.replace(
    /\{%\s*comment\s*%\}[\s\S]*?\{%\s*endcomment\s*%\}/g,
    "",
  );

  // {% raw %}...{% endraw %} → keep content, strip tags
  result = result.replace(/\{%\s*raw\s*%\}/g, "");
  result = result.replace(/\{%\s*endraw\s*%\}/g, "");

  // {% set ... %} → keep as-is (inside code blocks, will render as text)

  // {: width="400px" } Kramdown attribute syntax → remove
  result = result.replace(/\{:\s*[^}]+\}/g, "");

  // GitHub Gist <script> embeds use document.write() — replace with a link.
  result = result.replace(
    /<script\s+src="(https:\/\/gist\.github\.com\/[^"]+)\.js"\s*><\/script>/g,
    (_, gistUrl: string) => `[View notebook on GitHub](${gistUrl})`,
  );

  return result;
}

function loadPosts(): Post[] {
  const postsDir = path.join(CONTENT_DIR, "posts");
  const files = fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  const posts: Post[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), "utf-8");
    const { meta, body } = parseFrontmatter(raw);

    if (meta.published === "false") continue;

    const dateMatch = file.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/);
    if (!dateMatch) continue;

    const [, year, month, day, slugPart] = dateMatch;
    const date = `${year}-${month}-${day}`;
    const postPath = `/${year}/${month}/${day}/${slugPart}/`;

    const fixedBody = stripJekyll(body, postPath);
    const { text: safeBody, blocks: mathBlocks } = extractMath(fixedBody);
    const rawHtml = marked.parse(safeBody) as string;
    const { result: html, found: hasLatex } = renderMathBlocks(
      rawHtml,
      mathBlocks,
    );

    posts.push({
      slug: slugPart,
      title: meta.title ?? slugPart,
      date,
      tag: meta.tag ?? "",
      pinned: meta.pinned === "true",
      description: meta.description ?? "",
      html,
      hasLatex,
      path: postPath,
    });
  }

  return posts;
}

function loadPages(): Page[] {
  const pagesDir = path.join(CONTENT_DIR, "pages");
  if (!fs.existsSync(pagesDir)) return [];

  const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".md"));
  const pages: Page[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(pagesDir, file), "utf-8");
    const { meta, body } = parseFrontmatter(raw);
    const slug = file.replace(".md", "");

    pages.push({
      slug,
      title: meta.title ?? slug,
      html: marked.parse(stripJekyll(body, `/${slug}`)) as string,
      path: `/${slug}`,
    });
  }

  return pages;
}

/** All published posts, newest first. Pinned posts appear first. */
export const posts: Post[] = (() => {
  const all = loadPosts();
  const pinned = all.filter((p) => p.pinned);
  const regular = all.filter((p) => !p.pinned);
  return [...pinned, ...regular];
})();

/** All published posts in pure chronological order (newest first). */
export const postsByDate: Post[] = loadPosts();

/** All static pages. */
export const pages: Page[] = loadPages();

/** Post lookup by path. */
export const postByPath = new Map(posts.map((p) => [p.path, p]));

/** Page lookup by slug. */
export const pageBySlug = new Map(pages.map((p) => [p.slug, p]));

/** Unique tags with counts, sorted by frequency. */
export const tags = (() => {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (post.tag) counts.set(post.tag, (counts.get(post.tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
})();
