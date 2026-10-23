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
        document.querySelectorAll('.sidebar-content nav a').forEach(link => {
            const isCurrentPage = new URL(link.href).pathname.split('/').pop() === currentPage;
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

document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }

    const link = event.target.closest('a');
    if (!link || link.target || link.hasAttribute('download')) {
        return;
    }

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.endsWith('.html')) {
        return;
    }

    event.preventDefault();
    navigateToPage(url);
});

window.addEventListener('popstate', () => {
    navigateToPage(new URL(window.location.href), false);
});
