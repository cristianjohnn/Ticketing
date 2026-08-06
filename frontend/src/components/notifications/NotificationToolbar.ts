export class NotificationToolbar {
    private onSearchChange: (search: string) => void;
    private onSortChange: (sort: string) => void;
    private onFilterChange: (filter: string) => void;
    private onMarkAllRead: () => void;
    private onToggleSelectionMode: () => void;
    private onMarkSelectedRead: () => void;

    private readonly FILTERS = [
        { id: 'unread', label: 'Unread' },
        { id: 'assignments', label: 'Assigned to Me' },
        { id: 'collaboration', label: 'Collaboration' },
        { id: 'transfers', label: 'Transfers' },
        { id: 'comments', label: 'Comments' },
        { id: 'system', label: 'System' }
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
        onMarkAllRead: () => void,
        onToggleSelectionMode: () => void,
        onMarkSelectedRead: () => void
    ) {
        this.onSearchChange = onSearchChange;
        this.onSortChange = onSortChange;
        this.onFilterChange = onFilterChange;
        this.onMarkAllRead = onMarkAllRead;
        this.onToggleSelectionMode = onToggleSelectionMode;
        this.onMarkSelectedRead = onMarkSelectedRead;
    }

    public render(
        currentSearch: string, 
        currentSort: string, 
        currentFilter: string, 
        totalCount: number, 
        selectionMode: boolean, 
        selectedCount: number
    ): string {
        const filterName = this.FILTERS.find(f => f.id === currentFilter)?.label || 'All';
        const sortName = this.SORTS.find(s => s.id === currentSort)?.label || 'Newest';
        
        const summaryText = `Showing ${totalCount} notification${totalCount !== 1 ? 's' : ''} • ${filterName} • Sorted by ${sortName}`;

        const chipsHtml = this.FILTERS.map(f => `
            <button class="filter-chip ${currentFilter === f.id ? 'active' : ''}" data-filter="${f.id}">
                ${f.label}
            </button>
        `).join('');

        const activeBadgeHtml = currentFilter ? `
            <div class="active-filter-badge" title="Remove filter">
                <span>${filterName}</span>
                <button class="btn-remove-filter" data-filter="${currentFilter}"><i data-lucide="x"></i></button>
            </div>
            <button class="btn-clear-filters">Clear All Filters</button>
        ` : '';

        return `
            <div class="notifications-toolbar">
                <div class="toolbar-search-container">
                    <div class="toolbar-search">
                        <span class="search-icon"><i data-lucide="search"></i></span>
                        <input type="text" id="notif-search" placeholder="Search notifications..." value="${currentSearch}" autocomplete="off" />
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
                            <select id="notif-sort" title="Sort notifications">
                                ${this.SORTS.map(s => `<option value="${s.id}" ${currentSort === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="toolbar-divider"></div>
                        
                        ${selectionMode ? `
                            <span class="selection-count">${selectedCount} selected</span>
                            <button id="btn-mark-selected-read" class="btn btn-ghost" title="Mark Selected Read" ${selectedCount === 0 ? 'disabled' : ''}>
                                <i data-lucide="check"></i> <span class="action-label">Mark Read</span>
                            </button>
                            <button id="btn-toggle-select" class="btn btn-ghost" title="Cancel Selection">
                                <span class="action-label">Cancel</span>
                            </button>
                        ` : `
                            <button id="btn-toggle-select" class="btn btn-ghost" title="Select Notifications">
                                <i data-lucide="check-square"></i> <span class="action-label">Select</span>
                            </button>
                            <button id="btn-mark-all-read" class="btn btn-ghost" title="Mark All Read">
                                <i data-lucide="check-check"></i> <span class="action-label">Mark All</span>
                            </button>
                        `}
                    </div>
                </div>
                
                ${activeBadgeHtml ? `
                <div class="active-filters">
                    ${activeBadgeHtml}
                </div>
                ` : ''}
            </div>
        `;
    }

    public attachListeners(container: HTMLElement) {
        const searchInput = container.querySelector('#notif-search') as HTMLInputElement;
        let searchTimeout: any;
        searchInput?.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.onSearchChange(searchInput.value);
            }, 300);
        });

        const clearSearchBtn = container.querySelector('.btn-clear-search');
        clearSearchBtn?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            this.onSearchChange('');
        });

        const sortSelect = container.querySelector('#notif-sort') as HTMLSelectElement;
        sortSelect?.addEventListener('change', () => {
            this.onSortChange(sortSelect.value);
        });

        container.querySelectorAll('.filter-chip').forEach(el => {
            el.addEventListener('click', () => {
                const filter = el.getAttribute('data-filter') || '';
                this.onFilterChange(filter);
            });
        });

        const removeFilterBtn = container.querySelector('.btn-remove-filter');
        removeFilterBtn?.addEventListener('click', () => {
            this.onFilterChange('');
        });

        const clearFiltersBtn = container.querySelector('.btn-clear-filters');
        clearFiltersBtn?.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                this.onSearchChange(''); // Clear search as well for "Clear All Filters"
            }
            this.onFilterChange('');
        });

        const toggleSelectBtn = container.querySelector('#btn-toggle-select');
        toggleSelectBtn?.addEventListener('click', () => {
            this.onToggleSelectionMode();
        });

        const markAllBtn = container.querySelector('#btn-mark-all-read');
        markAllBtn?.addEventListener('click', () => {
            this.onMarkAllRead();
        });

        const markSelectedBtn = container.querySelector('#btn-mark-selected-read');
        markSelectedBtn?.addEventListener('click', () => {
            this.onMarkSelectedRead();
        });
    }
}
