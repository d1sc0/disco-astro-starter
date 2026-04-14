import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, '../content/posts');

function fixImagePathsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  // Fix path and suffix, and rename image if needed
  content = content.replace(
    /\]\(\/src\/assets\/uploaded_images\/([^\)]+)\)/g,
    (match, p1) => {
      // p1 is the filename, e.g. foo.jpg
      const ext = path.extname(p1);
      const base = p1.slice(0, -ext.length);
      // Case-insensitive check for RIGHT, LEFT, FULL at end of base (no underscore)
      const baseUpper = base.toUpperCase();
      if (
        !baseUpper.endsWith('RIGHT') &&
        !baseUpper.endsWith('LEFT') &&
        !baseUpper.endsWith('FULL')
      ) {
        changed = true;
        const newName = `${base}_FULL${ext}`;
        // Try to rename the image file if it exists
        const imgDir = path.join(__dirname, '../assets/uploaded_images');
        const oldPath = path.join(imgDir, p1);
        const newPath = path.join(imgDir, newName);
        if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
          fs.renameSync(oldPath, newPath);
          console.log(`Renamed image: ${oldPath} -> ${newPath}`);
        }
        return `](../../assets/uploaded_images/${newName})`;
      } else {
        changed = true;
        return `](../../assets/uploaded_images/${p1})`;
      }
    },
  );
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed image paths in: ${filePath}`);
  }
}

function renameFileToSlug(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(content);
  if (data.slug) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const newName = `${data.slug}${ext}`;
    const newPath = path.join(dir, newName);
    if (path.basename(filePath) !== newName && !fs.existsSync(newPath)) {
      fs.renameSync(filePath, newPath);
      console.log(`Renamed file: ${filePath} -> ${newPath}`);
      return newPath;
    }
  }
  return filePath;
}

function walkDir(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.md')) {
      fixImagePathsInFile(fullPath);
      // If renamed, update path for further processing
      renameFileToSlug(fullPath);
    }
  });
}

walkDir(POSTS_DIR);
