import { SearchIcon } from '../components/common/Icons';
import { DeleteArticleModal } from '../components/modals/DeleteArticleModal';
import { ModalsManager } from '../components/modals/ModalsManager';
import { showToast } from '../components/Toast';
import { articlesAPI } from '../services/api';
import { store } from '../state/store';
import { Article } from '../types';
import { handleUIError, getErrorMessage } from '../utils/errorHandler';
import { debounce,escapeHTML, formatDate } from '../utils/formatters';
import { LoadingManager } from '../utils/loadingManager';
import { getPortalContentContainer } from '../utils/portalContent';
import { TransitionManager } from '../utils/transitionManager';

export class ArticlesPage {
    private static clientSearchQuery = '';
    private static articleFormInitialized = false;

    public static init(): void {
        this.initArticleModal();
    }

    public static async load(): Promise<void> {
        const user = store.getState().currentUser;
        if (!user) return;
        const container = getPortalContentContainer(user.role);
        if (!container) return;

        LoadingManager.registerSkeleton('articles', () => `
            <div style="margin-bottom:20px;display:flex;gap:15px;align-items:center;justify-content:space-between;">
                <div class="skeleton skeleton-btn" style="flex:1;max-width:400px;height:40px;border-radius:8px;"></div>
                <div class="skeleton skeleton-btn" style="width:100px;height:40px;border-radius:8px;"></div>
            </div>
            <div style="display:grid;gap:15px;grid-template-columns:1fr;align-items:start;">
                ${Array.from({ length: 3 }).map(() => `
                    <div style="background: var(--color-bg-surface); border-radius: 8px; border: 1px solid var(--color-border); padding: 24px;">
                        <div class="skeleton skeleton-text" style="width: 80px; height: 24px; margin-bottom: 12px; border-radius: 12px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; height: 28px; margin-bottom: 16px;"></div>
                        <div class="skeleton skeleton-text" style="width: 100%; margin-bottom: 8px;"></div>
                        <div class="skeleton skeleton-text" style="width: 80%; margin-bottom: 0;"></div>
                    </div>
                `).join('')}
            </div>
        `);

        try {
            LoadingManager.showSkeleton(container, 'articles');
            const isAdmin = user.role === 'admin';
            const articles = await articlesAPI.getAll(isAdmin ? undefined : this.clientSearchQuery);
            await LoadingManager.hideSkeleton(container);

            await TransitionManager.crossFadeContent(container, () => {
                this.renderArticles(articles);
            });
        } catch (err) {
            await LoadingManager.hideSkeleton(container);
            handleUIError(err, 'Failed to load knowledge base articles');
            container.innerHTML = `
                <div class="empty-state" style="margin-top: var(--space-xl);">
                    <div class="empty-state-icon" style="color: var(--color-danger);">
                        <i data-lucide="alert-triangle" style="width: 48px; height: 48px;"></i>
                    </div>
                    <div class="empty-state-title" style="color: var(--color-danger); font-size: 1.25rem;">Failed to Load Articles</div>
                    <p>${escapeHTML(getErrorMessage(err, 'An unexpected error occurred.'))}</p>
                    <button class="btn btn-primary" style="margin-top: var(--space-md);" onclick="window.location.reload()">Retry</button>
                </div>
            `;
            // @ts-ignore
            if (window.lucide) window.lucide.createIcons({ root: container });
        }
    }



    private static renderArticles(articles: Article[]): void {
        const container = getPortalContentContainer(store.getState().currentUser!.role);
        if (!container) return;

        const user = store.getState().currentUser;
        const isAdmin = user?.role === 'admin';

        if (isAdmin) {
            this.renderAdminArticles(container, articles);
        } else {
            this.renderClientArticles(container, articles);
        }
    }

    private static renderClientArticles(container: HTMLElement, articles: Article[]): void {
        container.innerHTML = `
            <div style="margin-bottom:20px;display:flex;gap:15px;align-items:center;">
                <div class="search-box" style="flex:1;max-width:400px;">
                    ${SearchIcon({ size: 14 })}
                    <input type="text" id="kb-search-client" style="width: 100%;"
                        placeholder="Search articles, FAQs..." value="${escapeHTML(this.clientSearchQuery)}">
                </div>
                <button class="btn btn-primary" id="kb-search-btn" type="button">Search</button>
            </div>
            <div id="kb-client-list" style="display:grid;gap:15px;grid-template-columns:1fr;align-items:start;"></div>
        `;

        const list = document.getElementById('kb-client-list');
        if (!list) return;

        if (articles.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                    <p>No knowledge base articles available.</p>
                </div>
            `;
        } else {
            list.innerHTML = articles
                .map(
                    a => `
                <div class="kb-article-card">
                    <div class="kb-article-header">
                        <div class="kb-article-meta">
                            <span class="badge-cat">${escapeHTML(a.category)}</span>
                            <span class="kb-article-date">Updated ${formatDate(a.updatedAt)}</span>
                        </div>
                    </div>
                    <h3 class="kb-article-title">${escapeHTML(a.title)}</h3>
                    <div class="kb-article-content">${escapeHTML(a.content)}</div>
                </div>
            `,
                )
                .join('');
        }

        this.bindClientSearch();
    }

    private static renderAdminArticles(container: HTMLElement, articles: Article[]): void {
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <div>
                    <p style="color:var(--color-text-muted);font-size:14px;margin:0">Manage support articles and FAQs</p>
                </div>
                <button class="btn btn-primary" id="btn-new-article" type="button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    New Article
                </button>
            </div>
            <div id="kb-admin-list" style="display:grid;gap:15px;grid-template-columns:1fr;align-items:start;"></div>
        `;

        const list = document.getElementById('kb-admin-list');
        if (!list) return;

        if (articles.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                    <p>No knowledge base articles available.</p>
                </div>
            `;
        } else {
            list.innerHTML = articles
                .map(
                    a => `
                <div class="kb-article-card" data-article-id="${escapeHTML(a.id)}">
                    <div class="kb-article-header">
                        <div class="kb-article-meta">
                            <span class="badge-cat">${escapeHTML(a.category)}</span>
                            <span class="kb-article-date">Updated ${formatDate(a.updatedAt)}</span>
                        </div>
                        <button type="button" class="btn btn-danger btn-sm btn-delete-article" data-id="${escapeHTML(a.id)}" data-title="${escapeHTML(a.title)}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Delete
                        </button>
                    </div>
                    <h3 class="kb-article-title">${escapeHTML(a.title)}</h3>
                    <div class="kb-article-content">${escapeHTML(a.content.substring(0, 300))}${a.content.length > 300 ? '...' : ''}</div>
                    <div style="margin-top:12px;color:var(--color-text-muted);font-size:12px">Author: ${escapeHTML(a.author)}</div>
                </div>
            `,
                )
                .join('');
        }

        // Event delegation for delete buttons
        list.addEventListener('click', (e) => {
            const deleteBtn = (e.target as HTMLElement).closest('.btn-delete-article') as HTMLElement;
            if (!deleteBtn) return;

            const articleId = deleteBtn.getAttribute('data-id');
            const articleTitle = deleteBtn.getAttribute('data-title') || 'this article';
            if (!articleId) return;

            DeleteArticleModal.open(articleTitle, async () => {
                try {
                    await articlesAPI.delete(articleId);
                    showToast('Article deleted successfully', 'success');
                    await this.load();
                } catch (err) {
                    handleUIError(err, 'Failed to delete article');
                }
            });
        });

        document.getElementById('btn-new-article')?.addEventListener('click', () => {
            ModalsManager.openModal('article-modal');
        });
    }

    private static bindClientSearch(): void {
        const searchInput = document.getElementById('kb-search-client') as HTMLInputElement;
        const searchBtn = document.getElementById('kb-search-btn');

        const performSearch = debounce(async () => {
            this.clientSearchQuery = searchInput?.value.trim() || '';
            const filtered = await articlesAPI.getAll(this.clientSearchQuery);
            const list = document.getElementById('kb-client-list');
            if (!list) return;

            if (filtered.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        </div>
                        <p>No matching articles found.</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = filtered
                .map(
                    a => `
                <div class="kb-article-card">
                    <div class="kb-article-header">
                        <div class="kb-article-meta">
                            <span class="badge-cat">${escapeHTML(a.category)}</span>
                            <span class="kb-article-date">Updated ${formatDate(a.updatedAt)}</span>
                        </div>
                    </div>
                    <h3 class="kb-article-title">${escapeHTML(a.title)}</h3>
                    <div class="kb-article-content">${escapeHTML(a.content)}</div>
                </div>
            `,
                )
                .join('');
        }, 300);

        searchInput?.addEventListener('input', performSearch);
        searchBtn?.addEventListener('click', performSearch);
    }

    private static initArticleModal(): void {
        if (this.articleFormInitialized) return;
        this.articleFormInitialized = true;

        const form = document.getElementById('article-form') as HTMLFormElement;
        form?.addEventListener('submit', async e => {
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
                    author: user ? user.username : 'Admin',
                });

                showToast('Article created successfully!', 'success');
                form.reset();
                ModalsManager.closeModal('article-modal');
                await this.load();
            } catch (err: unknown) {
                handleUIError(err, 'Failed to create article');
            }
        });
    }
}
