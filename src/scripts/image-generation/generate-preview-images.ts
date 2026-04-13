import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const TEMPLATE_PATH = path.join(
  process.cwd(),
  'src/scripts/image-generation/preview-image-template.html',
);
const BG_PATH = path.join(
  process.cwd(),
  'src/scripts/image-generation/preview-background.png',
);
const OUTPUT_DIR = path.join(process.cwd(), 'public/generated_preview_images');

async function getPosts() {
  const files = fs
    .readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
    const { data } = matter(content);
    const title = data.title
      ? String(data.title)
      : file.replace(/\.(md|mdx)$/, '');
    // Use slug frontmatter if present, else fallback to filename
    const id = data.slug ? String(data.slug) : file.replace(/\.(md|mdx)$/, '');
    return { id, title };
  });
}

function fillTemplate(
  template,
  { siteTitle, episodeNumber, title, siteUrl, bgPath },
) {
  return template
    .replaceAll('%%SITE_TITLE%%', siteTitle)
    .replaceAll('%%EPISODE_NUMBER%%', episodeNumber)
    .replaceAll('%%TITLE%%', title)
    .replaceAll('%%SITE_URL%%', siteUrl)
    .replaceAll('%%PREVIEW_BG%%', bgPath);
}

async function generatePreviewImages() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const posts = await getPosts();
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });
  for (const post of posts) {
    const outFile = `${post.id}.png`;
    const outPath = path.join(OUTPUT_DIR, outFile);
    if (fs.existsSync(outPath)) {
      console.log(`Preview image for ${outFile} already exists, skipping.`);
      continue;
    }
    let postNumber = '';
    const match = post.id.match(/^ep(\d+)-/);
    if (match) {
      postNumber = `Post ${match[1]}`;
    }
    let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    // Read and encode background as base64
    const bgBuffer = fs.readFileSync(BG_PATH);
    const ext = path.extname(BG_PATH).toLowerCase().replace('.', '');
    const mimeType =
      ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const bgBase64 = `data:${mimeType};base64,${bgBuffer.toString('base64')}`;
    // Replace the background url in the template with an <img> tag for reliability
    html = html
      .replace("background: url('%%PREVIEW_BG%%') no-repeat center center;", '')
      .replace(
        '<div class="container">',
        `<div class="container"><img src="${bgBase64}" style="position:absolute;width:100%;height:100%;object-fit:cover;z-index:0;" />`,
      );
    // Read site URL from astro.config.mjs
    const astroConfig = fs.readFileSync(
      path.join(process.cwd(), 'astro.config.mjs'),
      'utf-8',
    );
    const siteUrlMatch = astroConfig.match(/site:\s*['\"]([^'\"]+)['\"]/);
    const siteUrl = siteUrlMatch ? siteUrlMatch[1] : '';
    html = fillTemplate(html, {
      siteTitle: 'BLOG POST',
      episodeNumber: postNumber,
      title: post.title,
      siteUrl,
      bgPath: '', // Not used anymore
    });
    // Debug log
    console.log(`Generating preview: ${outFile}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 600, height: 600 });
    await page.setContent(html, { waitUntil: 'networkidle2' });
    // Wait for all relevant fonts to be loaded
    await page.waitForFunction(
      () => document.fonts.check('1em "Inter"') && document.fonts.ready,
      { timeout: 15000 },
    );
    // Force layout reflow and wait for rendering stability
    await page.evaluate(() => document.body.offsetHeight);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
      path: outPath,
      type: 'png',
      clip: { x: 0, y: 0, width: 600, height: 600 },
    });
    await page.close();
    console.log(`${outFile}`);
  }
  await browser.close();
  console.log('All preview images generated.');
}

generatePreviewImages();
