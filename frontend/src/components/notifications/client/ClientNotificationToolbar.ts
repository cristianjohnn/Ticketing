export class ClientNotificationToolbar {
    private onSearchChange: (search: string) => void;
    private onSortChange: (sort: string) => void;
    private onFilterChange: (filter: string) => void;
    private onMarkAllRead: () => void;

    private readonly FILTERS = [
        { id: 'unread', label: 'Unread' },
        { id: 'comments', label: 'Replies' },
        { id: 'system', label: 'Ticket Status' }
    ];

    private readonly SORTS = [
        { id: 'newest', label: 'Newest' },
        { id: 'oldest', label: 'Oldest' },
        { id: 'unread_first', label: 'Unread First' }
    ];

    constructor(
        onSearchChange: (search: string) => void,
        onSortChange: (sort: string) => void,
        onFilterChange: (filter: string) => void,
        onMarkAllRead: () => void
    ) {
        this.onSearchChange = onSearchChange;
        this.onSortChange = onSortChange;
        this.onFilterChange = onFilterChange;
        this.onMarkAllRead = onMarkAllRead;
    }

    public render(
        currentSearch: string, 
        currentSort: string, 
        currentFilter: string, 
        totalCount: number
    ): string {
        const filterName = this.FILTERS.find(f => f.id === currentFilter)?.label || 'All Updates';
        const sortName = this.SORTS.find(s => s.id === currentSort)?.label || 'Newest';
        
        const summaryText = `Showing ${totalCount} update${totalCount !== 1 ? 's' : ''} • ${filterName} • Sorted by ${sortName}`;

        const chipsHtml = this.FILTERS.map(f => `
            <button class="filter-chip ${currentFilter === f.id ? 'active' : ''}" data-filter="${f.id}">
                ${f.label}
            </button>
        `).join('');

        return `
            <div class="notifications-toolbar">
                <div class="toolbar-search-container">
                    <div class="toolbar-search">
                        <span class="search-icon"><i data-lucide="search"></i></span>
                        <input type="text" id="notif-search" placeholder="Search updates..." value="${currentSearch}" autocomplete="off" />
                        ${currentSearch ? `<button class="btn-clear-search"><i data-lucide="x"></i></button>` : ''}
                    </div>
                </div>
                
                <div class="toolbar-middle">
                    <div class="toolbar-summary">
                        ${summaryText}
                    </div>
                </div>

                <div class="toolbar-bottom">
                    <div class="quick-filters">
                        ${chipsHtml}
                    </div>
                    <div class="toolbar-actions-container">
                        <div class="toolbar-sort">
                            <i data-lucide="filter" class="sort-icon"></i>
                            <select id="notif-sort" title="Sort updates">
                                ${this.SORTS.map(s => `<option value="${s.id}" ${currentSort === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="toolbar-divider"></div>
                        
                        <button id="btn-mark-all-read" class="btn btn-ghost" title="Mark All Updates Read">
                            <i data-lucide="check-check"></i> <span class="action-label">Mark All Read</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    public attachListeners(container: HTMLElement) {
        const searchInput = container.querySelector('#notif-search') as HTMLInputElement;
        const sortSelect = container.querySelector('#notif-sort') as HTMLSelectElement;
        const btnMarkAll = container.querySelector('#btn-mark-all-read');
        const btnClearSearch = container.querySelector('.btn-clear-search');

        let debounceTimeout: any;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    this.onSearchChange((e.target as HTMLInputElement).value);
                }, 300);
            });
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(debounceTimeout);
                    this.onSearchChange(searchInput.value);
                }
            });
        }

        if (btnClearSearch) {
            btnClearSearch.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                this.onSearchChange('');
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.onSortChange((e.target as HTMLSelectElement).value);
            });
        }

        container.querySelectorAll('.filter-chip').forEach(el => {
            el.addEventListener('click', () => {
                const filterVal = el.getAttribute('data-filter');
                if (filterVal !== null) {
                    this.onFilterChange(filterVal);
                }
            });
        });

        if (btnMarkAll) {
            btnMarkAll.addEventListener('click', () => this.onMarkAllRead());
        }
    }
}
