/**
 * Content loader — reads markdown files from content/ at startup,
 * parses frontmatter, and renders HTML via marked + highlight.js.
 */
import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

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
  /** URL path like /2023/12/15/floating-point/ */
  path: string;
};

export type Page = {
  slug: string;
  title: string;
  html: string;
  path: string;
};

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body: match[2] };
}

function loadPosts(): Post[] {
  const postsDir = path.join(CONTENT_DIR, "posts");
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md")).sort().reverse();

  const posts: Post[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(postsDir, file), "utf-8");
    const { meta, body } = parseFrontmatter(raw);

    // Skip unpublished posts
    if (meta.published === "false") continue;

    // Parse date and slug from filename: 2023-12-15-floating-point.md
    const dateMatch = file.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/);
    if (!dateMatch) continue;

    const [, year, month, day, slugPart] = dateMatch;
    const slug = slugPart;
    const date = `${year}-${month}-${day}`;
    const postPath = `/${year}/${month}/${day}/${slug}/`;

    // Fix asset paths: /assets/... -> /content/assets/...
    const fixedBody = body.replace(/\(\/assets\//g, "(/content/assets/");

    posts.push({
      slug,
      title: meta.title ?? slug,
      date,
      tag: meta.tag ?? "",
      pinned: meta.pinned === "true",
      description: meta.description ?? "",
      html: marked.parse(fixedBody) as string,
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
      html: marked.parse(body) as string,
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

/** All static pages. */
export const pages: Page[] = loadPages();

/** Post lookup by path. */
export const postByPath = new Map(posts.map((p) => [p.path, p]));

/** Page lookup by slug. */
export const pageBySlug = new Map(pages.map((p) => [p.slug, p]));

/** Unique tags with counts. */
export const tags = (() => {
  const counts = new Map<string, number>();
  for (const post of posts) {
    if (post.tag) counts.set(post.tag, (counts.get(post.tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
})();
