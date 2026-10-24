const navigateToPage = async (url, addHistoryEntry = true) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Page request failed: ${response.status} ${response.statusText}`);
        }

        const markup = await response.text();
        const nextDocument = new DOMParser().parseFromString(markup, 'text/html');
        const nextContent = nextDocument.querySelector('.content-area');
        const currentContent = document.querySelector('.content-area');

        if (!nextContent || !currentContent) {
            throw new Error('The requested page does not contain the site content area.');
        }

        currentContent.innerHTML = nextContent.innerHTML;
        document.title = nextDocument.title;

        const currentPage = url.pathname.split('/').pop();
        const activePage = currentPage === 'post.html' ? 'posts.html' : currentPage;
        document.querySelectorAll('.sidebar-content nav a').forEach(link => {
            const isCurrentPage = new URL(link.href).pathname.split('/').pop() === activePage;
            link.classList.toggle('active', isCurrentPage);

            if (isCurrentPage) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });

        if (addHistoryEntry) {
            window.history.pushState({}, '', url);
        }

        window.scrollTo(0, 0);
        window.loadSiteContent();
    } catch (error) {
        console.error('In-page navigation failed:', error);
        window.location.assign(url.href);
    }
};

const menuToggle = document.querySelector('.mobile-menu-toggle');
const sidebar = document.querySelector('.sidebar');

const updateBackToTopVisibility = () => {
    const button = document.querySelector('.back-to-top');
    if (!button) {
        return;
    }
    button.hidden = window.scrollY < 400;
};

window.updateBackToTopVisibility = updateBackToTopVisibility;
window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
document.addEventListener('scroll', updateBackToTopVisibility, { passive: true, capture: true });
window.addEventListener('scrollend', updateBackToTopVisibility, { passive: true });
window.addEventListener('resize', updateBackToTopVisibility);
updateBackToTopVisibility();

menuToggle?.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    menuToggle.title = isOpen ? 'Close navigation menu' : 'Open navigation menu';
    menuToggle.innerHTML = `<i class="fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'}" aria-hidden="true"></i>`;
});

document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }

    const link = event.target.closest('a');
    if (!link || link.target || link.hasAttribute('download')) {
        return;
    }

    const url = new URL(link.href, window.location.href);
    if (link.matches('.back-to-top')) {
        event.preventDefault();
        window.history.replaceState(window.history.state, '', url);
        window.scrollTo({ top: 0, behavior: 'instant' });
        updateBackToTopVisibility();
        return;
    }

    if (link.closest('.sidebar-content nav') && menuToggle && sidebar) {
        sidebar.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation menu');
        menuToggle.title = 'Open navigation menu';
        menuToggle.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    }

    if (url.origin === window.location.origin
        && url.pathname === window.location.pathname
        && url.search === window.location.search
        && url.hash) {
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (target) {
            event.preventDefault();
            window.history.replaceState(window.history.state, '', url);
            target.scrollIntoView({ behavior: 'instant', block: 'start' });
            return;
        }
    }

    if (url.origin !== window.location.origin || !url.pathname.endsWith('.html')
        || (url.pathname === window.location.pathname && url.search === window.location.search)) {
        return;
    }

    event.preventDefault();
    navigateToPage(url);
});

window.addEventListener('popstate', () => {
    navigateToPage(new URL(window.location.href), false);
});
