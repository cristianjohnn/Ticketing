export class ArticleModal {
    private element: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'modal-overlay';
        this.element.id = 'article-modal';

        const modal = document.createElement('div');
        modal.className = 'modal glass-card';

        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h3>Create Article</h3>
            <button class="modal-close">&times;</button>
        `;
        modal.appendChild(header);

        const form = document.createElement('form');
        form.id = 'article-form';
        form.innerHTML = `
            <input type="hidden">
            <div class="modal-body">
                <div class="form-group">
                    <label for="article-title">Title <span class="required">*</span></label>
                    <input type="text" id="article-title" class="form-control" placeholder="Article Title" required>
                </div>
                <div class="form-group">
                    <label for="article-category">Category</label>
                    <input type="text" id="article-category" class="form-control" placeholder="e.g. FAQ, Windows, Network" required>
                </div>
                <div class="form-group">
                    <label for="article-content">Content <span class="required">*</span></label>
                    <textarea id="article-content" class="form-control" rows="8" placeholder="Article text content..." required></textarea>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-ghost">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Article</button>
            </div>
        `;
        
        modal.appendChild(form);
        this.element.appendChild(modal);
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}
