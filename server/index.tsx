/** Personal website — Hono JSX SSR with Newsreader + JetBrains Mono + KaTeX. */
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { Style, css } from "hono/css";
import { posts, postsByDate, postByPath, pages } from "./content.ts";

const app = new Hono();
const PORT = Number(process.env.PORT ?? 3000);

// -- Global styles --

const globalCss = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: 'Newsreader', Georgia, 'Times New Roman', serif;
  background: #faf9f7;
  color: #1a1a1a;
  font-size: 17px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
img { max-width: 100%; height: auto; display: block; border-radius: 4px; margin: 1.5rem 0; }
pre {
  background: #1a1a1a;
  color: #e8e8e8;
  padding: 1.25rem;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
  margin: 1.5rem 0;
}
code {
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace;
  font-size: 0.85em;
}
:not(pre) > code {
  background: #eeedeb;
  padding: 0.125em 0.375em;
  border-radius: 3px;
}
blockquote {
  border-left: 2px solid #d0cfcd;
  padding-left: 1.25rem;
  color: #666;
  margin: 1.5rem 0;
  font-style: italic;
}
h1, h2, h3, h4, h5, h6 {
  font-weight: 500;
  line-height: 1.35;
}
h1 { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 0.75rem; }
h2 { font-size: 1.2rem; margin-top: 2rem; margin-bottom: 0.5rem; }
h3 { font-size: 1.1rem; margin-top: 1.75rem; margin-bottom: 0.5rem; }
p { margin-bottom: 1rem; }
ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
li { margin-bottom: 0.25rem; }
hr { border: none; border-top: 1px solid #e0dfdd; margin: 2.5rem 0; }
table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; }
th, td { border: 1px solid #e0dfdd; padding: 0.5rem 0.75rem; text-align: left; }
th { background: #f5f4f2; font-weight: 500; }
.katex-display { margin: 1.5rem 0; overflow-x: auto; }
@media (max-width: 640px) {
  body { font-size: 16px; }
  pre { font-size: 12px; padding: 1rem; }
}
`;

// -- Scoped styles --

const container = css`
  max-width: 600px;
  margin: 0 auto;
  padding: 5rem 1.5rem 3rem;
  @media (max-width: 640px) {
    padding: 3rem 1.25rem 2rem;
  }
`;

const nameStyle = css`
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.3;
`;

const bioStyle = css`
  color: #8a8a8a;
  margin-top: 0.5rem;
  font-size: 0.95rem;
  line-height: 1.6;
  & a {
    text-decoration: underline;
    text-decoration-color: #c0bfbd;
    text-underline-offset: 3px;
    transition: text-decoration-color 0.15s;
  }
  & a:hover { text-decoration-color: #8a8a8a; }
`;

const topLinks = css`
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #8a8a8a;
  display: flex;
  gap: 1.25rem;
  & a { transition: color 0.15s; }
  & a:hover { color: #1a1a1a; }
`;

const rule = css`
  width: 40px;
  height: 1px;
  background: #d0cfcd;
  margin: 3rem 0;
  @media (max-width: 640px) {
    margin: 2.5rem 0;
  }
`;

const sectionLabel = css`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8a8a8a;
  margin-bottom: 1.5rem;
`;

const projectBlock = css`
  margin-bottom: 1.25rem;
`;

const projectName = css`
  font-weight: 500;
  & a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

const projectDesc = css`
  color: #8a8a8a;
  font-size: 0.9rem;
  margin-top: 0.125rem;
`;

const postList = css`
  list-style: none;
  padding: 0;
`;

const postItem = css`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.625rem;
  & a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

const postTitleStyle = css`
  font-size: 0.95rem;
`;

const postYear = css`
  color: #8a8a8a;
  font-size: 0.8rem;
  flex-shrink: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
`;

const backLink = css`
  font-size: 0.85rem;
  color: #8a8a8a;
  transition: color 0.15s;
  &:hover { color: #1a1a1a; }
`;

const articleHeader = css`
  margin-top: 2rem;
  & h1 {
    margin-top: 0;
    margin-bottom: 0.375rem;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
  }
`;

const articleMeta = css`
  color: #8a8a8a;
  font-size: 0.9rem;
`;

const articleBody = css`
  margin-top: 2.5rem;
  & a {
    text-decoration: underline;
    text-decoration-color: #d0cfcd;
    text-underline-offset: 3px;
    transition: text-decoration-color 0.15s;
  }
  & a:hover { text-decoration-color: #1a1a1a; }
`;

const proseLinks = css`
  & a {
    text-decoration: underline;
    text-decoration-color: #d0cfcd;
    text-underline-offset: 3px;
    transition: text-decoration-color 0.15s;
  }
  & a:hover { text-decoration-color: #1a1a1a; }
`;

const footerStyle = css`
  margin-top: 3rem;
  font-size: 0.85rem;
  color: #8a8a8a;
  display: flex;
  gap: 1.25rem;
  & a { transition: color 0.15s; }
  & a:hover { color: #1a1a1a; }
`;

// -- Helpers --

function formatYear(dateStr: string): string {
  return dateStr.slice(0, 4);
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// -- Layout --

function Shell({
  title,
  description,
  katexCss,
  children,
}: {
  title: string;
  description?: string;
  katexCss?: boolean;
  children: unknown;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#faf9f7" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        <link rel="icon" href="/content/assets/favicon/favicon.ico" sizes="any" />
        <link rel="icon" href="/content/assets/favicon/favicon-32x32.png" type="image/png" />
        <link rel="apple-touch-icon" href="/content/assets/favicon/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..500;1,6..72,400..500&family=JetBrains+Mono&display=swap"
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
        <div class={container}>{children}</div>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <>
      <div class={rule} />
      <footer class={footerStyle}>
        <a href="https://x.com/marcospereeira">X</a>
        <a href="https://github.com/marcospgp">GitHub</a>
      </footer>
    </>
  );
}

// -- Routes --

app.use("/favicon.ico", serveStatic({ path: "./content/assets/favicon/favicon.ico" }));
app.use("/content/assets/*", serveStatic({ root: "./" }));

app.get("/health", (c) => c.text("ok"));
app.get("/robots.txt", (c) => c.text("User-agent: *\nAllow: /\n"));

// Home — single page with identity, projects, writing
app.get("/", (c) => {
  return c.html(
    <Shell title="Marcos Pereira" description="Developer from Portugal. Building software with AI.">
      <div class={nameStyle}>Marcos Pereira</div>
      <div class={bioStyle}>
        Developer from Portugal.
        <br />
        Building <a href="https://hesoyam.zip">hesoyam</a>, a software studio.
      </div>
      <div class={topLinks}>
        <a href="https://x.com/marcospereeira">X</a>
        <a href="https://github.com/marcospgp">GitHub</a>
      </div>

      <div class={rule} />

      <div class={sectionLabel}>Projects</div>
      <div class={projectBlock}>
        <div class={projectName}>
          <a href="https://clawr.ing">clawr.ing</a>
        </div>
        <div class={projectDesc}>The phone calling skill for OpenClaw</div>
      </div>
      <div class={projectBlock}>
        <div class={projectName}>
          <a href="https://inkandquill.app">inkandquill.app</a>
        </div>
        <div class={projectDesc}>Voice adventures with AI</div>
      </div>

      <div class={rule} />

      <div class={sectionLabel}>Highlighted</div>
      <ul class={postList}>
        {posts.filter((p) => p.pinned).map((post) => (
          <li class={postItem}>
            <span class={postTitleStyle}>
              <a href={post.path}>{post.title}</a>
            </span>
            <span class={postYear}>{formatYear(post.date)}</span>
          </li>
        ))}
      </ul>

      <div class={rule} />

      <div class={sectionLabel}>Writing</div>
      <ul class={postList}>
        {postsByDate.map((post) => (
          <li class={postItem}>
            <span class={postTitleStyle}>
              <a href={post.path}>{post.title}</a>
            </span>
            <span class={postYear}>{formatYear(post.date)}</span>
          </li>
        ))}
      </ul>

      <Footer />
    </Shell>,
  );
});

// Individual post
app.get("/:year/:month/:day/:slug/", (c) => {
  const { year, month, day, slug } = c.req.param();
  const postPath = `/${year}/${month}/${day}/${slug}/`;
  const post = postByPath.get(postPath);

  if (!post) return c.notFound();

  return c.html(
    <Shell title={`${post.title} | Marcos Pereira`} description={post.description} katexCss={post.hasLatex}>
      <a href="/" class={backLink}>
        ← Marcos Pereira
      </a>
      <div class={articleHeader}>
        <h1>{post.title}</h1>
        <div class={articleMeta}>{formatDateFull(post.date)}</div>
      </div>
      <div class={articleBody} dangerouslySetInnerHTML={{ __html: post.html }} />
      <Footer />
    </Shell>,
  );
});

// Static pages (notes, concepts, resume, about — accessible via direct URL)
for (const page of pages) {
  app.get(page.path, (c) =>
    c.html(
      <Shell title={`${page.title} | Marcos Pereira`}>
        <a href="/" class={backLink}>
          ← Marcos Pereira
        </a>
        <div style="margin-top: 2rem;">
          <div class={proseLinks} dangerouslySetInnerHTML={{ __html: page.html }} />
        </div>
        <Footer />
      </Shell>,
    ),
  );
}

// 404
app.notFound((c) =>
  c.html(
    <Shell title="Not Found | Marcos Pereira">
      <h1 style="margin-top: 0;">Not found</h1>
      <p>
        <a href="/" style="text-decoration: underline; text-underline-offset: 3px">
          Home
        </a>
      </p>
    </Shell>,
    404,
  ),
);

console.log(`marcospereira.me listening on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
