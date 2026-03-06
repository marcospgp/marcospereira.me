/** Personal website — Hono JSX SSR with hono/css scoped styles. */
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { Style, css } from "hono/css";
import { posts, postByPath, pages, pageBySlug, tags } from "./content.ts";

const app = new Hono();

const PORT = Number(process.env.PORT ?? 3000);

// -- Styles --

const globalCss = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { line-height: 1.5; -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body {
  font-family: Georgia, 'Times New Roman', serif;
  background: #fafaf9;
  color: #1c1917;
  min-height: 100vh;
  font-size: 17px;
  line-height: 1.7;
}
a { color: #1c1917; }
a:hover { color: #78716c; }
img { max-width: 100%; height: auto; display: block; border-radius: 4px; margin: 1.5rem 0; }
pre { background: #292524; color: #e7e5e4; padding: 1.25rem; border-radius: 6px; overflow-x: auto; font-size: 0.875rem; line-height: 1.5; margin: 1.5rem 0; }
code { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 0.9em; }
:not(pre) > code { background: #f5f5f4; padding: 0.15em 0.4em; border-radius: 3px; color: #44403c; }
blockquote { border-left: 3px solid #d6d3d1; padding-left: 1rem; color: #78716c; margin: 1.5rem 0; }
h1, h2, h3, h4, h5, h6 { line-height: 1.3; margin-top: 2rem; margin-bottom: 0.75rem; }
h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }
p { margin-bottom: 1rem; }
ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
li { margin-bottom: 0.25rem; }
hr { border: none; border-top: 1px solid #e7e5e4; margin: 2rem 0; }
table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; }
th, td { border: 1px solid #d6d3d1; padding: 0.5rem 0.75rem; text-align: left; }
th { background: #f5f5f4; font-weight: 600; }
`;

const container = css`
  max-width: 680px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
`;

const header = css`
  margin-bottom: 3rem;
`;

const siteName = css`
  font-size: 1.75rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  margin-bottom: 0.5rem;
  & a { text-decoration: none; }
`;

const nav = css`
  display: flex;
  gap: 1.25rem;
  font-size: 0.95rem;
  color: #78716c;
  & a { color: #78716c; text-decoration: none; }
  & a:hover { color: #1c1917; }
`;

const socialLinks = css`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  & a { color: #a8a29e; text-decoration: none; }
  & a:hover { color: #1c1917; }
`;

const postList = css`
  list-style: none;
  padding: 0;
`;

const postItem = css`
  margin-bottom: 1.5rem;
`;

const postTitle = css`
  font-size: 1.1rem;
  font-weight: 400;
  & a { text-decoration: none; border-bottom: 1px solid #d6d3d1; }
  & a:hover { border-color: #1c1917; color: #1c1917; }
`;

const postMeta = css`
  font-size: 0.85rem;
  color: #a8a29e;
  margin-top: 0.15rem;
`;

const articleBody = css`
  margin-top: 2rem;
`;

const articleHeader = css`
  margin-bottom: 0;
  & h1 { margin-top: 0; margin-bottom: 0.5rem; }
`;

const sectionLabel = css`
  font-size: 0.8rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #a8a29e;
  font-weight: 500;
  margin-bottom: 1.25rem;
`;

const tagFilter = css`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
  & a { color: #78716c; text-decoration: none; }
  & a:hover { color: #1c1917; }
`;

const pinnedBadge = css`
  color: #a8a29e;
  font-size: 0.8rem;
`;

const footer = css`
  margin-top: 4rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e7e5e4;
  font-size: 0.85rem;
  color: #a8a29e;
`;

// -- Layout --

function Layout({ title, description, children }: { title: string; description?: string; children: unknown }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
        <Style />
      </head>
      <body>
        <div class={container}>
          <div class={header}>
            <div class={siteName}>
              <a href="/">Marcos Pereira</a>
            </div>
            <div class={socialLinks}>
              <a href="https://x.com/marcospereeira">X</a>
              <a href="https://github.com/marcospgp">GitHub</a>
            </div>
            <div class={nav}>
              <a href="/">Posts</a>
              <a href="/about-me">About</a>
              <a href="/notes">Notes</a>
              <a href="/concepts">Concepts</a>
            </div>
          </div>
          {children}
          <div class={footer}>
            Marcos Pereira
          </div>
        </div>
      </body>
    </html>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// -- Routes --

// Static assets (images from content/assets/)
app.use("/content/assets/*", serveStatic({ root: "./" }));

// Health check
app.get("/health", (c) => c.text("ok"));

// robots.txt
app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\n"));

// Home — post list with optional tag filter
app.get("/", (c) => {
  const tag = c.req.query("tag");
  const filtered = tag ? posts.filter((p) => p.tag === tag) : posts;

  return c.html(
    <Layout title="Marcos Pereira" description="Developer from Portugal. Writing about web, AI, and game dev.">
      <h2 class={sectionLabel}>Posts</h2>
      <div class={tagFilter}>
        <a href="/" style={!tag ? "color: #1c1917; font-weight: 600" : ""}>All</a>
        {tags.map(([t]) => (
          <a href={`/?tag=${encodeURIComponent(t)}`} style={tag === t ? "color: #1c1917; font-weight: 600" : ""}>{t}</a>
        ))}
      </div>
      <ul class={postList}>
        {filtered.map((post) => (
          <li class={postItem}>
            <div class={postTitle}>
              <a href={post.path}>{post.title}</a>
            </div>
            <div class={postMeta}>
              {formatDate(post.date)} · {post.tag}
              {post.pinned && <span class={pinnedBadge}> · Pinned</span>}
            </div>
          </li>
        ))}
      </ul>
    </Layout>,
  );
});

// Individual post — /:year/:month/:day/:slug/
app.get("/:year/:month/:day/:slug/", (c) => {
  const { year, month, day, slug } = c.req.param();
  const postPath = `/${year}/${month}/${day}/${slug}/`;
  const post = postByPath.get(postPath);

  if (!post) return c.notFound();

  return c.html(
    <Layout title={`${post.title} — Marcos Pereira`} description={post.description}>
      <article>
        <div class={articleHeader}>
          <h1>{post.title}</h1>
          <div class={postMeta}>{formatDate(post.date)} · {post.tag}</div>
        </div>
        <div class={articleBody} dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>
    </Layout>,
  );
});

// Static pages (about-me, notes, concepts, resume)
for (const page of pages) {
  app.get(page.path, (c) =>
    c.html(
      <Layout title={`${page.title} — Marcos Pereira`}>
        <div dangerouslySetInnerHTML={{ __html: page.html }} />
      </Layout>,
    ),
  );
}

// 404
app.notFound((c) =>
  c.html(
    <Layout title="Not Found — Marcos Pereira">
      <h1>Page not found</h1>
      <p>
        <a href="/">Go home</a>
      </p>
    </Layout>,
    404,
  ),
);

console.log(`marcospereira.me server listening on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
