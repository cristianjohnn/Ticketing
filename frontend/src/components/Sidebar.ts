import { Router } from '../router/router';
import { store } from '../state/store';
import { DEPARTMENTS } from '../utils/formatters';

export class SidebarComponent {
    public static init(): void {
        this.initNavTabs();
        this.renderDepartmentFilters();
    }

    private static initNavTabs(): void {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('data-view');
                if (view) {
                    Router.switchView(view);
                }
            });
        });
    }

    private static renderDepartmentFilters(): void {
        const container = document.getElementById('department-filter-list');
        if (!container) return;

        container.innerHTML = `
            <button class="dept-badge active" data-dept="all">All Departments</button>
            ${DEPARTMENTS.map(d => `<button class="dept-badge" data-dept="${d}">${d}</button>`).join('')}
        `;

        container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('dept-badge')) {
                const dept = target.getAttribute('data-dept') || 'all';
                container.querySelectorAll('.dept-badge').forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                store.setDepartment(dept);
            }
        });
    }
}
