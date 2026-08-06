import { articlesAPI } from '../services/api';
import { store } from '../state/store';
import { escapeHTML, formatDate, debounce } from '../utils/formatters';
import { showToast } from '../components/Toast';
import { ModalsComponent } from '../components/Modals';

export class ArticlesPage {
    public static init(): void {
        this.initSearch();
        this.initArticleModal();
    }

    public static async load(): Promise<void> {
        try {
            const articles = await articlesAPI.getAll();
            store.setArticles(articles);
            this.renderArticles(articles);
        } catch (err) {
            console.error('Failed to load KB articles:', err);
        }
    }

    private static renderArticles(articles: any[]): void {
        const container = document.getElementById('articles-list');
        if (!container) return;

        if (articles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📚</div>
                    <p>No knowledge base articles available.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = articles.map(a => `
            <div class="article-card">
                <div class="article-card-header">
                    <span class="badge badge-category">${escapeHTML(a.category)}</span>
                    <small class="text-muted">${formatDate(a.createdAt)}</small>
                </div>
                <h3>${escapeHTML(a.title)}</h3>
                <p class="article-preview">${escapeHTML(a.content.substring(0, 150))}${a.content.length > 150 ? '...' : ''}</p>
                <div class="article-card-footer">
                    <small>Author: ${escapeHTML(a.author)}</small>
                </div>
            </div>
        `).join('');
    }

    private static initSearch(): void {
        const searchInput = document.getElementById('kb-search') as HTMLInputElement;
        const handleSearch = debounce(async () => {
            const query = searchInput.value.trim();
            const filtered = await articlesAPI.getAll(query);
            this.renderArticles(filtered);
        }, 300);

        searchInput?.addEventListener('input', handleSearch);
    }

    private static initArticleModal(): void {
        const newBtn = document.getElementById('new-article-btn');
        const form = document.getElementById('article-form') as HTMLFormElement;

        newBtn?.addEventListener('click', () => {
            ModalsComponent.openModal('article-modal');
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = store.getState().currentUser;
            const titleInput = document.getElementById('article-title') as HTMLInputElement;
            const categoryInput = document.getElementById('article-category') as HTMLInputElement;
            const contentInput = document.getElementById('article-content') as HTMLTextAreaElement;

            if (!titleInput.value.trim() || !contentInput.value.trim()) {
                showToast('Title and content are required', 'error');
                return;
            }

            try {
                await articlesAPI.create({
                    title: titleInput.value.trim(),
                    category: categoryInput.value.trim() || 'General',
                    content: contentInput.value.trim(),
                    author: user ? user.username : 'Admin'
                });

                showToast('Article created successfully!', 'success');
                form.reset();
                ModalsComponent.closeModal('article-modal');
                this.load();
            } catch (err: any) {
                showToast(err.message || 'Failed to create article', 'error');
            }
        });
    }
}
