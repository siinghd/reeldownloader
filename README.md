# ReelGrab

Instagram video downloader with support for Reels, Posts, Stories, and Carousels.

**Live Demo:** https://reelgrab.hsingh.app

## Features

- Download Instagram Reels, Videos, Posts, Stories & Carousels
- Bulk download support for carousel posts
- Quality selector for video downloads
- Download history (stored locally)
- Video preview before download
- Dark/light mode toggle
- No login required

## Installation

```bash
bun install
```

## Configuration

Set your Instagram cookie as an environment variable:

```bash
export INSTAGRAM_COOKIE="your_instagram_cookie_here"
```

## Run

```bash
bun run index.ts
```

Or with PM2:

```bash
PORT=3021 INSTAGRAM_COOKIE="your_cookie" pm2 start bun --name reelgrab -- index.ts
```

## Tech Stack

- [Bun](https://bun.sh) - JavaScript runtime
- TypeScript
- Vanilla CSS with manga-style design
