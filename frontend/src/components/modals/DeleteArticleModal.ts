import { ModalsManager } from './ModalsManager';

export class DeleteArticleModal {
    private element: HTMLDivElement;
    private static onConfirmCallback: (() => Promise<void>) | null = null;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'delete-article-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';
        modal.style.maxWidth = '400px';
        modal.style.textAlign = 'center';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3 style="display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--color-danger);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Delete Article
            </h3>
        `;
        modal.appendChild(header);

        const body = document.createElement('div');
        body.className = 'modal-body text-center';
        body.innerHTML = `
            <p style="color: var(--color-text-secondary); margin-bottom: 12px;">Are you sure you want to delete this article?</p>
            <p id="delete-article-name-target" style="font-weight: 600; color: var(--color-text-heading); margin-bottom: 24px; word-break: break-word;"></p>
            <div class="modal-actions centered">
                <button type="button" class="btn btn-ghost" id="cancel-delete-article-btn">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirm-delete-article-btn">Delete</button>
            </div>
        `;
        
        modal.appendChild(body);
        this.element.appendChild(modal);

        this.attachEvents();
    }

    private attachEvents(): void {
        const cancelBtn = this.element.querySelector('#cancel-delete-article-btn');
        const confirmBtn = this.element.querySelector('#confirm-delete-article-btn');

        cancelBtn?.addEventListener('click', () => {
            ModalsManager.closeModal('delete-article-modal');
        });

        confirmBtn?.addEventListener('click', async () => {
            if (DeleteArticleModal.onConfirmCallback) {
                await DeleteArticleModal.onConfirmCallback();
            }
            ModalsManager.closeModal('delete-article-modal');
        });
    }

    public static open(articleTitle: string, onConfirm: () => Promise<void>): void {
        this.onConfirmCallback = onConfirm;

        const titleEl = document.getElementById('delete-article-name-target');
        if (titleEl) {
            titleEl.textContent = `"${articleTitle}"`;
        }

        ModalsManager.openModal('delete-article-modal');
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
