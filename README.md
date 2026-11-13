# marcospereira.me

https://marcospereira.me is Marcos Pereira's personal site: a homepage, an about page, a resume, and blog posts.

## How it works

- **One Bun server renders everything**: `server/index.tsx` serves each page with Hono, and `server/content.ts` turns the markdown into HTML.
- **The homepage's text lives in `server/index.tsx`, and everything else is markdown under `content/`**.
  - `content/pages/` holds the standalone pages, the resume among them.
  - `content/posts/` holds the blog posts, named `YYYY-MM-DD-slug.md` and served at `/YYYY/MM/DD/slug/`.
  - `content/assets/` holds each post's images, in a folder named after the post.

## Setup

```bash
bun install
bun dev
```

The site is then at http://localhost:3000, or at the port in the `PORT` environment variable.

## Commands

- `bun dev`: start the server and reload when a source file changes. Markdown is read once at startup, so restart it after a content edit.
- `bun start`: start the server as production runs it.
- `bunx tsc --noEmit`: type check.

## Hosting

- The `Dockerfile` builds the server's image, and `/health` answers `ok` for a health check.
