/** Personal website — Hono JSX SSR with Inter + JetBrains Mono + KaTeX. */
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { Style, css } from "hono/css";
import { posts, postByPath, pages, tags } from "./content.ts";

const app = new Hono();
const PORT = Number(process.env.PORT ?? 3000);

// -- Global styles --

const globalCss = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: #fff;
  color: #171717;
  font-size: 16px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; display: block; border-radius: 6px; margin: 1.5rem 0; }
pre {
  background: #18181b;
  color: #e4e4e7;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.7;
  margin: 1.5rem 0;
}
code {
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace;
  font-size: 0.875em;
}
:not(pre) > code {
  background: #f4f4f5;
  padding: 0.125em 0.375em;
  border-radius: 4px;
  font-size: 0.85em;
}
blockquote {
  border-left: 2px solid #e4e4e7;
  padding-left: 1.25rem;
  color: #71717a;
  margin: 1.5rem 0;
}
h1, h2, h3, h4, h5, h6 {
  line-height: 1.3;
  letter-spacing: -0.02em;
  font-weight: 600;
}
h1 { font-size: 1.75rem; margin-top: 2.5rem; margin-bottom: 0.75rem; }
h2 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 0.5rem; }
h3 { font-size: 1.125rem; margin-top: 1.75rem; margin-bottom: 0.5rem; }
p { margin-bottom: 1rem; }
ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
li { margin-bottom: 0.25rem; }
hr { border: none; border-top: 1px solid #e4e4e7; margin: 2.5rem 0; }
table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; font-size: 15px; }
th, td { border: 1px solid #e4e4e7; padding: 0.5rem 0.75rem; text-align: left; }
th { background: #fafafa; font-weight: 600; }

.katex-display { margin: 1.5rem 0; overflow-x: auto; }

@media (max-width: 640px) {
  body { font-size: 15px; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.125rem; }
  pre { font-size: 12px; padding: 0.875rem 1rem; }
}
`;

// -- Scoped styles --

const container = css`
  max-width: 640px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 2.5rem;
  @media (max-width: 640px) {
    padding: 2rem 1.25rem 2rem;
  }
`;

const headerStyle = css`
  margin-bottom: 3rem;
  @media (max-width: 640px) {
    margin-bottom: 2rem;
  }
`;

const siteNameStyle = css`
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
`;

const navStyle = css`
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  @media (max-width: 640px) {
    gap: 1rem;
    font-size: 0.8125rem;
  }
`;

const navLink = css`
  color: #a1a1aa;
  transition: color 0.15s;
  &:hover { color: #171717; }
`;

const navLinkActive = css`
  color: #171717;
`;

const tagFilterStyle = css`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 2rem;
`;

const tagPill = css`
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  border: 1px solid #e4e4e7;
  color: #71717a;
  transition: all 0.15s;
  &:hover { color: #171717; border-color: #a1a1aa; }
`;

const tagPillActive = css`
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  background: #18181b;
  color: #fff;
  border: 1px solid #18181b;
`;

const postListStyle = css`
  list-style: none;
  padding: 0;
`;

const postItemStyle = css`
  margin-bottom: 1.125rem;
`;

const postTitleStyle = css`
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.4;
  & a:hover {
    text-decoration: underline;
    text-decoration-color: #a1a1aa;
    text-underline-offset: 3px;
  }
`;

const postMetaStyle = css`
  font-size: 0.8125rem;
  color: #a1a1aa;
  margin-top: 0.0625rem;
`;

const articleHeaderStyle = css`
  & h1 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    letter-spacing: -0.025em;
  }
`;

const articleBodyStyle = css`
  margin-top: 2rem;
  & a {
    text-decoration: underline;
    text-decoration-color: #d4d4d8;
    text-underline-offset: 3px;
    transition: text-decoration-color 0.15s;
  }
  & a:hover { text-decoration-color: #171717; }
`;

const proseLinks = css`
  & a {
    text-decoration: underline;
    text-decoration-color: #d4d4d8;
    text-underline-offset: 3px;
    transition: text-decoration-color 0.15s;
  }
  & a:hover { text-decoration-color: #171717; }
`;

const footerStyle = css`
  margin-top: 4rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e4e4e7;
  font-size: 0.8125rem;
  color: #a1a1aa;
  display: flex;
  gap: 1rem;
  & a { color: #a1a1aa; transition: color 0.15s; }
  & a:hover { color: #171717; }
`;

// -- Helpers --

const NAV_ITEMS = [
  { href: "/", label: "Posts" },
  { href: "/about-me", label: "About" },
  { href: "/notes", label: "Notes" },
  { href: "/concepts", label: "Concepts" },
];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// -- Layout --

function Layout({
  title,
  description,
  path,
  katexCss,
  children,
}: {
  title: string;
  description?: string;
  path?: string;
  katexCss?: boolean;
  children: unknown;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        <link rel="icon" href="/content/assets/favicon/favicon.ico" sizes="any" />
        <link rel="icon" href="/content/assets/favicon/favicon-32x32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/content/assets/favicon/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..600&family=JetBrains+Mono&display=swap"
          rel="stylesheet"
        />
        {katexCss && (
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/katex@0.16.35/dist/katex.min.css"
            crossorigin=""
          />
        )}
        <style dangerouslySetInnerHTML={{ __html: globalCss }} />
        <Style />
      </head>
      <body>
        <div class={container}>
          <header class={headerStyle}>
            <div class={siteNameStyle}>
              <a href="/">Marcos Pereira</a>
            </div>
            <nav class={navStyle}>
              {NAV_ITEMS.map((item) => (
                <a href={item.href} class={path === item.href ? navLinkActive : navLink}>
                  {item.label}
                </a>
              ))}
            </nav>
          </header>
          <main>{children}</main>
          <footer class={footerStyle}>
            <a href="https://x.com/marcospereeira">X</a>
            <a href="https://github.com/marcospgp">GitHub</a>
          </footer>
        </div>
      </body>
    </html>
  );
}

// -- Routes --

app.use("/favicon.ico", serveStatic({ path: "./content/assets/favicon/favicon.ico" }));
app.use("/content/assets/*", serveStatic({ root: "./" }));

app.get("/health", (c) => c.text("ok"));
app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\n"));

// Home
app.get("/", (c) => {
  const tag = c.req.query("tag");
  const filtered = tag ? posts.filter((p) => p.tag === tag) : posts;

  return c.html(
    <Layout title="Marcos Pereira" description="Developer from Portugal. Writing about web, AI, and game dev." path="/">
      <div class={tagFilterStyle}>
        <a href="/" class={!tag ? tagPillActive : tagPill}>
          All
        </a>
        {tags.map(([t]) => (
          <a href={`/?tag=${encodeURIComponent(t)}`} class={tag === t ? tagPillActive : tagPill}>
            {t}
          </a>
        ))}
      </div>
      <ul class={postListStyle}>
        {filtered.map((post) => (
          <li class={postItemStyle}>
            <div class={postTitleStyle}>
              <a href={post.path}>{post.title}</a>
            </div>
            <div class={postMetaStyle}>
              {formatDateShort(post.date)} · {post.tag}
            </div>
          </li>
        ))}
      </ul>
    </Layout>,
  );
});

// Individual post
app.get("/:year/:month/:day/:slug/", (c) => {
  const { year, month, day, slug } = c.req.param();
  const postPath = `/${year}/${month}/${day}/${slug}/`;
  const post = postByPath.get(postPath);

  if (!post) return c.notFound();

  return c.html(
    <Layout
      title={`${post.title} | Marcos Pereira`}
      description={post.description}
      path={postPath}
      katexCss={post.hasLatex}
    >
      <article>
        <div class={articleHeaderStyle}>
          <h1>{post.title}</h1>
          <div class={postMetaStyle}>
            {formatDateFull(post.date)} · {post.tag}
          </div>
        </div>
        <div class={articleBodyStyle} dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>
    </Layout>,
  );
});

// Static pages (resume still accessible via direct URL but not in nav)
for (const page of pages) {
  app.get(page.path, (c) =>
    c.html(
      <Layout title={`${page.title} | Marcos Pereira`} path={page.path}>
        <div class={proseLinks} dangerouslySetInnerHTML={{ __html: page.html }} />
      </Layout>,
    ),
  );
}

// 404
app.notFound((c) =>
  c.html(
    <Layout title="Not Found | Marcos Pereira">
      <h1>Page not found</h1>
      <p>
        <a href="/" style="text-decoration: underline; text-underline-offset: 3px">
          Go home
        </a>
      </p>
    </Layout>,
    404,
  ),
);

console.log(`marcospereira.me listening on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
