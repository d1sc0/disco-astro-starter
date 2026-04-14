---

## Styling & Naming Conventions

For details on how styles and class names are structured in this project, see [styling-naming-conventions.md](styling-naming-conventions.md).

# CMS & Content Editing

This project uses Sveltia CMS (Netlify CMS compatible) for editing podcast episodes.

- CMS config: `public/admin/config.yaml`
- Media folder: `src/assets/episode_images`
- Content folder: `src/content/episodes`
- Editable fields: title, draft, pubDate, description, mp3, mp3title, socialImage, body
- Sortable by: title, pubDate
- Default sort: pubDate descending

To access the CMS, open `/admin/` in your deployed site.


## Prebuild Automation for Sveltia CMS

Image path corrections and Markdown file renaming are now handled automatically by the prebuild script:

    src/scripts/pre-build-sveltia-cms-catches.js

This script:

- Fixes image paths in Markdown files (uploaded via Sveltia CMS) to ensure static build compatibility
- Ensures image filenames in Markdown end with _RIGHT, _LEFT, or _FULL (adds _FULL if missing) and renames the image file to match
- Renames Markdown files to match their `slug` frontmatter (if present)

No manual changes are needed after uploading images or creating new posts in the CMS.

---

## Image Generation Configuration

All OG and preview image generation settings (template path, fallback background, output directory, site title, style, and site URL) are managed in:

    src/scripts/image-generation/image-config.json

This makes it easy to update image generation parameters in one place for both scripts.

## CSS Processing

This project uses **PostCSS** with `postcss-preset-env` and **autoprefixer** for modern CSS features and cross-browser compatibility. The configuration is in `postcss.config.cjs` and is automatically picked up by Astro.
