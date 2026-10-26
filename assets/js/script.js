const safeMarkdownLink = (target, markdownUrl) => {
    try {
        const url = new URL(target, markdownUrl);
        if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
            return null;
        }
        return url.href;
    } catch (error) {
        console.error('Invalid Markdown link:', target, error);
        return null;
    }
};

const safeMarkdownImage = (target, markdownUrl) => {
    if (/^(?:[a-z]+:|\/|\\)/i.test(target)) {
        return null;
    }

    try {
        const imageUrl = new URL(target, markdownUrl);
        const postDirectory = new URL('.', markdownUrl);
        return imageUrl.origin === postDirectory.origin && imageUrl.pathname.startsWith(postDirectory.pathname)
            ? imageUrl.href
            : null;
    } catch (error) {
        console.error('Invalid Markdown image path:', target, error);
        return null;
    }
};

const appendInline = (parent, source, markdownUrl) => {
    const text = source;
    const tokenPattern = /(!?\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let cursor = 0;
    let match;

    while ((match = tokenPattern.exec(text)) !== null) {
        parent.append(document.createTextNode(text.slice(cursor, match.index)));
        const token = match[0];
        const linkMatch = token.match(/^(!?)\[([^\]]*)\]\(([^)]+)\)$/);

        if (linkMatch) {
            const [, imageMarker, label, target] = linkMatch;
            if (imageMarker) {
                const imageUrl = safeMarkdownImage(target, markdownUrl);
                if (!imageUrl) {
                    parent.append(document.createTextNode(label));
                } else {
                    const figure = document.createElement('figure');
                    figure.className = 'post-article-figure';
                    const image = document.createElement('img');
                    image.src = imageUrl;
                    image.alt = label;
                    image.loading = 'lazy';
                    image.addEventListener('error', () => {
                        console.error(`Could not load post image: ${image.src}`);
                        figure.classList.add('post-article-figure-error');
                    }, { once: true });
                    figure.append(image);
                    if (label) {
                        const caption = document.createElement('figcaption');
                        caption.textContent = label;
                        figure.append(caption);
                    }
                    parent.append(figure);
                }
            } else {
                const href = safeMarkdownLink(target, markdownUrl);
                if (!href) {
                    parent.append(document.createTextNode(label));
                } else {
                    const link = document.createElement('a');
                    link.href = href;
                    link.textContent = label;
                    if (new URL(href).origin !== window.location.origin) {
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                    }
                    parent.append(link);
                }
            }
        } else if (token.startsWith('`')) {
            const value = token.slice(1, -1);
            const code = document.createElement('code');
            code.textContent = value;
            parent.append(code);
        } else {
            const emphasis = document.createElement(token.startsWith('**') ? 'strong' : 'em');
            emphasis.textContent = token.startsWith('**') ? token.slice(2, -2) : token.slice(1, -1);
            parent.append(emphasis);
        }

        cursor = tokenPattern.lastIndex;
    }

    parent.append(document.createTextNode(text.slice(cursor)));
};

const tableCells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());

const renderMarkdown = (source, markdownUrl) => {
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    const lines = body.split(/\r?\n/);
    const fragment = document.createDocumentFragment();
    let index = 0;
    let paragraphLines = [];

    const flushParagraph = () => {
        if (!paragraphLines.length) {
            return;
        }
        const paragraph = document.createElement('p');
        appendInline(paragraph, paragraphLines.join(' '), markdownUrl);
        fragment.append(paragraph);
        paragraphLines = [];
    };

    while (index < lines.length) {
        const line = lines[index];
        const trimmed = line.trim();

        if (!trimmed) {
            flushParagraph();
            index += 1;
            continue;
        }

        if (/^```/.test(trimmed)) {
            flushParagraph();
            const codeLines = [];
            index += 1;
            while (index < lines.length && !/^```/.test(lines[index].trim())) {
                codeLines.push(lines[index]);
                index += 1;
            }
            if (index < lines.length) {
                index += 1;
            }

            const codeText = codeLines.join('\n');
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.textContent = codeText;
            pre.append(code);
            fragment.append(pre);
            continue;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            flushParagraph();
            const heading = document.createElement(`h${Math.min(headingMatch[1].length + 1, 6)}`);
            appendInline(heading, headingMatch[2], markdownUrl);
            fragment.append(heading);
            index += 1;
            continue;
        }

        if (trimmed.startsWith('|') && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1])) {
            flushParagraph();
            const table = document.createElement('table');
            table.className = 'post-article-table';
            const header = document.createElement('thead');
            const headerRow = document.createElement('tr');
            tableCells(line).forEach(value => {
                const cell = document.createElement('th');
                appendInline(cell, value, markdownUrl);
                headerRow.append(cell);
            });
            header.append(headerRow);
            table.append(header);
            index += 2;

            const tableBody = document.createElement('tbody');
            while (index < lines.length && lines[index].trim().startsWith('|')) {
                const row = document.createElement('tr');
                tableCells(lines[index]).forEach(value => {
                    const cell = document.createElement('td');
                    appendInline(cell, value, markdownUrl);
                    row.append(cell);
                });
                tableBody.append(row);
                index += 1;
            }
            table.append(tableBody);
            fragment.append(table);
            continue;
        }

        if (/^>\s?/.test(trimmed)) {
            flushParagraph();
            const quote = document.createElement('blockquote');
            appendInline(quote, trimmed.replace(/^>\s?/, ''), markdownUrl);
            fragment.append(quote);
            index += 1;
            continue;
        }

        const listMatch = trimmed.match(/^([-*+]|\d+\.)\s+(.+)$/);
        if (listMatch) {
            flushParagraph();
            const ordered = /^\d+\./.test(listMatch[1]);
            const list = document.createElement(ordered ? 'ol' : 'ul');
            while (index < lines.length) {
                const itemMatch = lines[index].trim().match(/^([-*+]|\d+\.)\s+(.+)$/);
                if (!itemMatch || /^\d+\./.test(itemMatch[1]) !== ordered) {
                    break;
                }
                const item = document.createElement('li');
                appendInline(item, itemMatch[2], markdownUrl);
                list.append(item);
                index += 1;
            }
            fragment.append(list);
            continue;
        }

        paragraphLines.push(trimmed);
        index += 1;
    }

    flushParagraph();
    return fragment;
};

const formatPostDate = date => {
    if (!date) {
        return '';
    }
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const appendPostTitle = (element, post) => {
    const heartIndex = post.slug === 'friendzone' ? post.title.lastIndexOf('💔') : -1;
    if (heartIndex === -1) {
        element.textContent = post.title;
        return;
    }

    const heart = document.createElement('span');
    heart.className = 'post-title-heart';
    heart.textContent = '💔';
    heart.title = 'Maybe in another universe...';
    heart.setAttribute('role', 'img');
    heart.setAttribute('aria-label', 'Broken heart: Maybe in another universe...');
    element.replaceChildren(
        document.createTextNode(post.title.slice(0, heartIndex)),
        heart,
        document.createTextNode(post.title.slice(heartIndex + '💔'.length))
    );
};

const renderCards = (posts, container) => {
    const fragment = document.createDocumentFragment();

    posts.forEach(post => {
        const link = document.createElement('a');
        link.href = post.link;
        const card = document.createElement('div');
        card.className = 'card';
        const info = document.createElement('div');
        info.className = 'card-info';
        const title = document.createElement('h3');
        appendPostTitle(title, post);
        const description = document.createElement('p');
        description.textContent = post.description;
        const footer = document.createElement('footer');
        const dateAndTag = document.createElement('span');
        const icon = document.createElement('i');
        icon.className = post.tag === 'Post' ? 'fas fa-book-open' : 'fas fa-user-secret';
        if (post.date) {
            dateAndTag.append(document.createTextNode(`${formatPostDate(post.date)} | `));
        }
        dateAndTag.append(icon, document.createTextNode(` ${post.tag || 'Post'}`));
        footer.append(dateAndTag);
        info.append(title, description, footer);

        const thumbnail = document.createElement('div');
        thumbnail.className = 'card-thumbnail';
        thumbnail.style.backgroundImage = `url("${post.thumbnail || 'assets/img/avatars/avatar.jpg'}")`;
        card.append(info, thumbnail);
        link.append(card);
        fragment.append(link);
    });

    container.replaceChildren(fragment);
};

const renderRecentPosts = (posts, container) => {
    const fragment = document.createDocumentFragment();
    posts.slice(0, 5).forEach(post => {
        const item = document.createElement('li');
        const date = document.createElement('span');
        date.className = 'recent-post-date';
        date.textContent = formatPostDate(post.date);
        const link = document.createElement('a');
        link.href = post.link;
        appendPostTitle(link, post);
        item.append(date, link);
        fragment.append(item);
    });
    container.replaceChildren(fragment);
};

const renderPostToc = article => {
    const toc = document.querySelector('#post-toc');
    const list = document.querySelector('#post-toc-list');
    if (!toc || !list) {
        return;
    }

    const headings = article.querySelectorAll('h2, h3, h4');
    const usedIds = new Set();
    const rootList = document.createElement('ul');
    const parents = [{ level: 1, list: rootList }];

    headings.forEach((heading, index) => {
        const baseId = heading.textContent
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || `section-${index + 1}`;
        let id = baseId;
        let suffix = 2;
        while (usedIds.has(id)) {
            id = `${baseId}-${suffix}`;
            suffix += 1;
        }
        usedIds.add(id);
        heading.id = id;

        const level = Number(heading.tagName.slice(1));
        while (parents[parents.length - 1].level >= level) {
            parents.pop();
        }

        const parent = parents[parents.length - 1];
        const item = document.createElement('li');
        item.className = `post-toc-level-${level}`;
        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = heading.textContent;
        item.append(link);
        parent.list.append(item);

        const childList = document.createElement('ul');
        item.append(childList);
        parents.push({ level, list: childList });
    });

    list.replaceChildren(...rootList.children);
    toc.hidden = headings.length === 0;
};

const renderPost = async (posts) => {
    const article = document.querySelector('#post-content');
    if (!article) {
        return;
    }

    const slug = new URLSearchParams(window.location.search).get('slug');
    const post = posts.find(item => item.slug === slug);
    const heading = document.querySelector('#page-header');
    const meta = document.querySelector('.post-article-meta');
    const breadcrumbTitle = document.querySelector('#post-breadcrumb-title');

    if (!post) {
        heading.textContent = 'Post not found';
        meta.textContent = '';
        article.textContent = 'This post could not be found. Browse the posts page to see available articles.';
        renderPostToc(article);
        return;
    }

    appendPostTitle(heading, post);
    document.title = `${post.title} | Amin Guliyev`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', post.description);
    appendPostTitle(breadcrumbTitle, post);
    meta.textContent = [formatPostDate(post.date), post.tag].filter(Boolean).join(' · ');

    try {
        const response = await fetch(post.markdown);
        if (!response.ok) {
            throw new Error(`Markdown request failed: ${response.status} ${response.statusText}`);
        }
        const markdown = await response.text();
        article.replaceChildren(renderMarkdown(markdown, new URL(post.markdown, window.location.href)));
        renderPostToc(article);
    } catch (error) {
        console.error(`Could not load post "${post.slug}":`, error);
        article.textContent = 'This post could not be loaded. Please try again later.';
        article.classList.add('post-article-load-error');
        renderPostToc(article);
    }
};

window.loadSiteContent = async () => {
    try {
        const response = await fetch('posts.json');
        if (!response.ok) {
            throw new Error(`Post index request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const posts = Array.isArray(data.posts) ? data.posts : [];
        posts.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));

        const cardContainer = document.querySelector('#card-container');
        const recentPosts = document.querySelector('#recent-posts > ul');
        if (cardContainer) {
            renderCards(posts, cardContainer);
        }
        if (recentPosts) {
            renderRecentPosts(posts, recentPosts);
        }
        await renderPost(posts);
        window.updateBackToTopVisibility?.();
    } catch (error) {
        console.error('Could not load the post index:', error);
        const cardContainer = document.querySelector('#card-container');
        if (cardContainer) {
            cardContainer.textContent = 'Posts could not be loaded. Please try again later.';
        }
        const article = document.querySelector('#post-content');
        if (article) {
            article.textContent = 'This post could not be loaded. Please try again later.';
            article.classList.add('post-article-load-error');
        }
        window.updateBackToTopVisibility?.();
    }
};

document.addEventListener('DOMContentLoaded', window.loadSiteContent);