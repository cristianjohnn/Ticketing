import { ChevronLeftIcon } from '../components/common/Icons';
import { ModalsManager } from '../components/modals/ModalsManager';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';
import { Portal, Router } from '../router/router';

export interface BaseLayoutConfig {
    screenId: string;
    sidebarConfig: any;
    portal: Portal;
    defaultTitle: string;
    titleId: string;
    toggleId: string;
    sidebarOverlayId: string;
    contentId: string;
}

export abstract class BaseLayout {
    protected element: HTMLDivElement;
    protected sidebar: Sidebar;
    protected topbar: Topbar;
    protected contentArea: HTMLDivElement;
    protected overlay: HTMLDivElement;
    protected notifBanner: HTMLDivElement;
    protected config: BaseLayoutConfig;

    constructor(config: BaseLayoutConfig) {
        this.config = config;
        
        this.element = document.createElement('div');
        this.element.id = config.screenId;
        this.element.className = 'screen';

        const appShell = document.createElement('div');
        appShell.className = 'app-shell';

        // Notification Banner
        this.notifBanner = document.createElement('div');
        this.notifBanner.className = 'notif-banner';
        this.notifBanner.style.display = 'none';
        this.notifBanner.innerHTML = `
            <span></span>
            <button class="notif-close">&times;</button>
        `;
        appShell.appendChild(this.notifBanner);

        // Sidebar
        this.sidebar = new Sidebar(config.sidebarConfig);
        
        // Wire navigation and logout actions
        this.sidebar.onNavClick((view) => Router.switchView(view, config.portal));
        this.sidebar.onLogoutClick(() => ModalsManager.openModal('logout-confirm-modal'));

        appShell.appendChild(this.sidebar.getElement());

        // Edge Toggle Button
        const edgeToggle = document.createElement('button');
        edgeToggle.className = 'sidebar-edge-toggle';
        edgeToggle.innerHTML = ChevronLeftIcon({ size: 14 });
        edgeToggle.addEventListener('click', () => this.toggleSidebar());
        appShell.appendChild(edgeToggle);

        // Sidebar Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'sidebar-overlay';
        this.overlay.id = config.sidebarOverlayId;
        appShell.appendChild(this.overlay);

        // Main Area
        const mainArea = document.createElement('div');
        mainArea.className = 'main-area';

        // Topbar
        this.topbar = new Topbar({
            titleId: config.titleId,
            toggleId: config.toggleId,
            title: config.defaultTitle,
            onToggleSidebar: () => this.toggleSidebar()
        });
        mainArea.appendChild(this.topbar.getElement());

        // Content Area
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'content-area';
        this.contentArea.id = config.contentId;
        mainArea.appendChild(this.contentArea);

        appShell.appendChild(mainArea);
        this.element.appendChild(appShell);

        // Bind overlay click
        this.overlay.addEventListener('click', () => this.closeSidebar());
        
        // Bind notification close
        const closeBtn = this.notifBanner.querySelector('.notif-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.notifBanner.style.display = 'none';
            });
        }
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public getSidebar(): Sidebar {
        return this.sidebar;
    }

    public getTopbar(): Topbar {
        return this.topbar;
    }

    public getContentArea(): HTMLElement {
        return this.contentArea;
    }

    public showNotification(message: string): void {
        const span = this.notifBanner.querySelector('span');
        if (span) {
            span.textContent = message;
        }
        this.notifBanner.style.display = 'flex';
    }

    protected toggleSidebar(): void {
        const sb = this.sidebar.getElement();
        if (window.innerWidth <= 768) {
            // Mobile: toggle .is-expanded for overlay menu
            if (sb.classList.contains('is-expanded')) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        } else {
            // Desktop: toggle .is-collapsed
            if (sb.classList.contains('is-collapsed')) {
                sb.classList.remove('is-collapsed');
            } else {
                sb.classList.add('is-collapsed');
            }
        }
    }

    protected openSidebar(): void {
        this.sidebar.getElement().classList.remove('is-collapsed');
        this.sidebar.getElement().classList.add('is-expanded');
        this.overlay.classList.add('is-expanded');
    }

    protected closeSidebar(): void {
        this.sidebar.getElement().classList.remove('is-expanded');
        this.overlay.classList.remove('is-expanded');
    }
}
