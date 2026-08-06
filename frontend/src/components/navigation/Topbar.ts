import { notificationStore } from '../../state/NotificationStore';
import { IconService } from '../../utils/iconService';
import { MenuIcon } from '../common/Icons';
import { ThemeToggle } from '../common/theme/ThemeToggle';
import { NotificationsDropdown } from '../NotificationsDropdown';

export interface TopbarConfig {
    titleId: string;
    toggleId: string;
    onToggleSidebar: () => void;
    title?: string;
}

export class Topbar {
    private element: HTMLElement;
    private titleElement: HTMLHeadingElement;
    private actionsContainer: HTMLDivElement;
    private themeToggle: ThemeToggle;
    private notifWrapper: HTMLDivElement;
    public notificationsDropdown: NotificationsDropdown;

    constructor(config: TopbarConfig) {
        this.element = document.createElement('header');
        this.element.className = 'topbar';

        // Left section (Toggle & Title)
        const leftDiv = document.createElement('div');
        leftDiv.style.display = 'flex';
        leftDiv.style.alignItems = 'center';
        leftDiv.style.gap = '10px';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'sidebar-toggle';
        toggleBtn.id = config.toggleId;
        toggleBtn.innerHTML = MenuIcon({ size: 24 });
        toggleBtn.addEventListener('click', () => config.onToggleSidebar());

        this.titleElement = document.createElement('h1');
        this.titleElement.className = 'page-title';
        this.titleElement.id = config.titleId;
        if (config.title) {
            this.titleElement.textContent = config.title;
        }

        leftDiv.appendChild(toggleBtn);
        leftDiv.appendChild(this.titleElement);

        // Right section (Actions)
        this.actionsContainer = document.createElement('div');
        this.actionsContainer.className = 'topbar-actions';
        
        // Notifications Bell
        this.notifWrapper = document.createElement('div');
        this.notifWrapper.className = 'notifications-wrapper';
        
        const bellBtn = document.createElement('button');
        bellBtn.className = 'notifications-btn';
        bellBtn.innerHTML = `
            <i data-lucide="bell"></i>
            <span class="notifications-badge" style="display: none;"></span>
        `;
        
        const dropdownContainer = document.createElement('div');
        this.notifWrapper.appendChild(bellBtn);
        this.notifWrapper.appendChild(dropdownContainer);
        
        this.notificationsDropdown = new NotificationsDropdown(dropdownContainer);
        
        const updateBadge = () => {
            const counts = notificationStore.getCounts();
            const badge = bellBtn.querySelector('.notifications-badge') as HTMLElement;
            if (badge) {
                if (counts.unread > 0) {
                    badge.textContent = counts.unread > 99 ? '99+' : counts.unread.toString();
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        };

        notificationStore.subscribe((event) => {
            if (event.unreadCountChanged) {
                updateBadge();
            }
        });
        
        // Initial badge update
        updateBadge();

        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('close-dropdowns', { detail: { except: 'notifications' } }));
            this.notificationsDropdown.toggle();
        });

        this.actionsContainer.appendChild(this.notifWrapper);

        // Add theme toggle (always present on the far right)
        this.themeToggle = new ThemeToggle();
        this.actionsContainer.appendChild(this.themeToggle.getElement());

        this.element.appendChild(leftDiv);
        this.element.appendChild(this.actionsContainer);
        
        // Render Lucide icons for the topbar
        IconService.renderIcons(this.element);
    }

    /**
     * Updates the page title.
     */
    public setTitle(title: string): void {
        this.titleElement.textContent = title;
    }

    /**
     * Replaces any existing custom actions with the provided element, or clears them if null.
     */
    public setActions(element: HTMLElement | null): void {
        if (element && this.actionsContainer.firstChild === element) {
            return; // Identical action container is already mounted
        }
        this.clearActions();
        if (element) {
            this.actionsContainer.insertBefore(element, this.notifWrapper);
        }
    }

    /**
     * Appends a custom action element (like a search bar or filter) before the theme toggle.
     */
    public appendAction(element: HTMLElement): void {
        // Insert before notifWrapper so fixed elements stay on the far right
        this.actionsContainer.insertBefore(element, this.notifWrapper);
    }

    /**
     * Removes all custom action elements.
     */
    public clearActions(): void {
        while (this.actionsContainer.firstChild && this.actionsContainer.firstChild !== this.notifWrapper) {
            this.actionsContainer.removeChild(this.actionsContainer.firstChild);
        }
    }

    /**
     * Returns the root element of the topbar.
     */
    public getElement(): HTMLElement {
        return this.element;
    }
}
