import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const postsDirectory = join(root, 'posts');
const indexPath = join(root, 'posts.json');

const listMarkdownFiles = async directory => {
    const entries = await readdir(directory, { withFileTypes: true });
    const nestedFiles = await Promise.all(entries.map(async entry => {
        const entryPath = join(directory, entry.name);
        if (entry.isDirectory()) {
            return listMarkdownFiles(entryPath);
        }
        return entry.isFile() && extname(entry.name).toLowerCase() === '.md' ? [entryPath] : [];
    }));
    return nestedFiles.flat();
};

const parseFrontMatter = source => {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) {
        return { metadata: {}, body: source };
    }

    const metadata = {};
    match[1].split(/\r?\n/).forEach(line => {
        const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (!field) {
            return;
        }
        let value = field[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        metadata[field[1]] = value;
    });
    return { metadata, body: source.slice(match[0].length) };
};

const cleanMarkdown = value => value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_>#|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const getTitle = (body, metadata, filePath) => {
    if (metadata.title) {
        return metadata.title;
    }
    const heading = body.match(/^#\s+(.+)$/m);
    return heading
        ? cleanMarkdown(heading[1])
        : relative(postsDirectory, dirname(filePath)).split(sep).filter(Boolean).pop() || basename(filePath, extname(filePath));
};

const getDescription = (body, metadata) => {
    if (metadata.description) {
        return metadata.description;
    }
    const paragraph = body.split(/\r?\n/).find(line => line.trim() && !/^\s*(?:#|>|```|\||[-*+]|\d+\.)/.test(line));
    return paragraph ? cleanMarkdown(paragraph).slice(0, 200) : '';
};

const getThumbnail = (body, metadata, markdownPath) => {
    if (metadata.thumbnail) {
        if (metadata.thumbnail.startsWith('assets/') || metadata.thumbnail.startsWith('posts/')) {
            return metadata.thumbnail;
        }
        if (metadata.thumbnail.includes('/')) {
            return `${relative(root, dirname(join(root, markdownPath))).split(sep).join('/')}/${metadata.thumbnail}`;
        }
        return `assets/img/thumbnails/${metadata.thumbnail}`;
    }

    const firstImage = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (!firstImage || /^(?:[a-z]+:|\/|\\)/i.test(firstImage[1])) {
        return '';
    }
    return `${relative(root, dirname(join(root, markdownPath))).split(sep).join('/')}/${firstImage[1]}`;
};

const markdownFiles = await listMarkdownFiles(postsDirectory);
const posts = await Promise.all(markdownFiles.map(async filePath => {
    const source = await readFile(filePath, 'utf8');
    const { metadata, body } = parseFrontMatter(source);
    const markdownPath = relative(root, filePath).split(sep).join('/');
    const folder = relative(postsDirectory, dirname(filePath)).split(sep).join('/');
    const fileName = filePath.slice(0, -extname(filePath).length);
    const slugPath = relative(postsDirectory, fileName).split(sep).join('/');
    const slug = fileName.slice(dirname(filePath).length + 1) === folder.split('/').pop()
        ? folder
        : slugPath;

    return {
        slug,
        title: getTitle(body, metadata, filePath),
        description: getDescription(body, metadata),
        date: metadata.date || '',
        tag: metadata.tag || 'Post',
        link: `post.html?slug=${encodeURIComponent(slug)}`,
        markdown: markdownPath,
        thumbnail: getThumbnail(body, metadata, markdownPath)
    };
}));

posts.sort((first, second) => first.slug.localeCompare(second.slug));
const duplicateSlugs = posts.filter((post, index) => posts.findIndex(candidate => candidate.slug === post.slug) !== index);
if (duplicateSlugs.length) {
    throw new Error(`Duplicate post slug(s): ${duplicateSlugs.map(post => post.slug).join(', ')}`);
}

await writeFile(indexPath, `${JSON.stringify({ posts }, null, 4)}\n`, 'utf8');
console.log(`Generated posts.json with ${posts.length} post(s).`);
