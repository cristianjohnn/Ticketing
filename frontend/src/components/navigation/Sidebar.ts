import { LogoutIcon,ShieldIcon } from '../common/Icons';
import { SidebarConfig } from './configs/SidebarConfig';

export class Sidebar {
    private element: HTMLElement;
    private onNavClickCallback?: (view: string) => void;
    private onLogoutClickCallback?: () => void;

    constructor(config: SidebarConfig) {
        
        this.element = document.createElement('aside');
        this.element.id = config.id;
        this.element.className = 'sidebar' + (config.cssClass ? ` ${config.cssClass}` : '');

        // 1. Brand Section
        const brandDiv = document.createElement('div');
        brandDiv.className = 'sb-brand';
        
        const logoIconDiv = document.createElement('div');
        logoIconDiv.className = 'sb-logo-icon';
        logoIconDiv.innerHTML = ShieldIcon({ size: 22 });
        
        const brandTextDiv = document.createElement('div');
        brandTextDiv.innerHTML = `
            <div class="sb-brand-name">Ticketing System</div>
            <div class="sb-brand-role">${config.portalName}</div>
        `;
        
        brandDiv.appendChild(logoIconDiv);
        brandDiv.appendChild(brandTextDiv);
        this.element.appendChild(brandDiv);

        // 2. User Card Section
        const userCardDiv = document.createElement('div');
        userCardDiv.className = 'sb-user-card';
        userCardDiv.innerHTML = `
            <div class="sb-user-label">LOGGED IN AS</div>
            <div class="sb-user-name" id="${config.id}-name">User</div>
        `;
        // Admin sidebar also had a role/email in some earlier designs but according to index.html it's just LOGGED IN AS and user name.
        this.element.appendChild(userCardDiv);

        // 3. Navigation
        const navDiv = document.createElement('nav');
        navDiv.className = 'sb-nav';

        config.items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'sb-nav-btn';
            btn.setAttribute('data-view', item.view);
            if (item.id) {
                btn.id = item.id;
            }
            if (item.requireAdmin) {
                btn.style.display = 'none';
            }

            let innerHTML = `${item.icon}<span>${item.label}</span>`;
            if (item.hasBadge) {
                const badgeClass = item.badgeClass || 'sb-badge';
                innerHTML += `<span class="${badgeClass}" style="display:none">${item.badgeText || ''}</span>`;
            }
            btn.innerHTML = innerHTML;

            btn.addEventListener('click', () => {
                // Update active state
                navDiv.querySelectorAll('.sb-nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                if (this.onNavClickCallback) {
                    this.onNavClickCallback(item.view);
                }
            });

            navDiv.appendChild(btn);
        });
        this.element.appendChild(navDiv);

        // 4. Custom Stats Box
        if (config.statsBoxHtml) {
            const statsBox = document.createElement('div');
            statsBox.className = 'sb-stats-box';
            statsBox.innerHTML = config.statsBoxHtml;
            this.element.appendChild(statsBox);
        }

        // 5. Bottom Section
        const bottomDiv = document.createElement('div');
        bottomDiv.className = 'sb-bottom';

        if (config.actionBoxHtml) {
            // Render custom bottom actions
            bottomDiv.innerHTML = config.actionBoxHtml;
            
            // Re-attach data-view event listeners for items injected via HTML
            const innerNavBtns = bottomDiv.querySelectorAll('.sb-nav-btn[data-view]');
            innerNavBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const view = btn.getAttribute('data-view');
                    if (view && this.onNavClickCallback) {
                        this.onNavClickCallback(view);
                    }
                });
            });
        }

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-ghost sb-logout-btn';
        // Usually logout has a specific ID like client-logout-btn or admin-logout-btn
        const prefix = config.id.split('-')[0]; // 'client' or 'admin'
        logoutBtn.id = `${prefix}-logout-btn`;
        logoutBtn.innerHTML = `${LogoutIcon({ size: 16 })} Logout`;
        
        logoutBtn.addEventListener('click', () => {
            if (this.onLogoutClickCallback) {
                this.onLogoutClickCallback();
            }
        });

        bottomDiv.appendChild(logoutBtn);

        this.element.appendChild(bottomDiv);
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public onNavClick(callback: (view: string) => void): void {
        this.onNavClickCallback = callback;
    }

    public onLogoutClick(callback: () => void): void {
        this.onLogoutClickCallback = callback;
    }

    public setActiveView(view: string): void {
        this.element.querySelectorAll('.sb-nav-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = this.element.querySelector(`.sb-nav-btn[data-view="${view}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
    }

    public setUserName(name: string): void {
        const nameEl = this.element.querySelector('.sb-user-name');
        if (nameEl) {
            nameEl.textContent = name;
        }
    }
}
