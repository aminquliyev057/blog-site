window.loadSiteContent = () => {
    fetch('posts.json')
        .then(response => response.json())
        .then(data => {

            const cardContainer = document.querySelector('#card-container')
            const recentPosts = document.querySelector('#recent-posts ul')

            const posts = data.posts

            posts.sort((a, b) => {
                const dateA = new Date(a.date)
                const dateB = new Date(b.date)

                return dateB - dateA

            })

            if (cardContainer) {
                cardContainer.innerHTML = ''
                renderCards(posts, cardContainer)
            }

            if (recentPosts) {
                recentPosts.innerHTML = ''
                renderRecentBar(posts, recentPosts)
            }
        })
        .catch(error => console.error('Error:', error));
}

document.addEventListener('DOMContentLoaded', window.loadSiteContent);

function renderCards(posts, container) {
    posts.forEach(element => {
        const thumbUrl = element.thumbnail
            ? `assets/img/thumbnails/${encodeURIComponent(element.thumbnail)}`
            : 'assets/img/avatars/avatar.jpg';

        let icon = (element.tag == 'Post') ? 'fas fa-book-open' : 'fas fa-user-secret'
        const card = `
                            <a href="${element.link}">
                                <div class="card">

                                    <div class="card-info">
                                        <h3>${element.title}</h3>
                                        <p>${element.description}</p>
                                        <footer>
                                             <span><i class="fa-regular fa-calendar"></i> ${element.date} | <i
                                                    class="${icon}"></i>${element.tag}</span>
                                        </footer>
                                    </div>
                                    <div class="card-thumbnail" style="background-image: url('${thumbUrl}');">

                                    </div>
                                </div>
                            </a>`
        container.innerHTML += card
    })
}

function renderRecentBar(posts, container) {
    posts.slice(0, 5).forEach(element => {
        const recentPost = `<li><a href="${element.link}">${element.title}</a></li>`
        container.innerHTML += recentPost
    })

}