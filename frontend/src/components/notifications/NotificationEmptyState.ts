export class NotificationEmptyState {
    public static renderEmptyList(): string {
        return `
            <div class="empty-list-wrapper">
                <div class="glow-icon-container">
                    <div class="glow-bg"></div>
                    <i data-lucide="check-circle-2" style="width: 56px; height: 56px; color: var(--color-primary);"></i>
                </div>
                <h3 class="title-lg" style="color: var(--color-text-primary); font-weight: 700; font-size: 1.25rem;">You're all caught up!</h3>
                <p class="body-md text-muted" style="margin-top: 8px; max-width: 240px; line-height: 1.5;">A clean slate! No new notifications at this time.</p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--color-border); width: 100%; max-width: 240px;">
                    <p class="body-sm" style="color: var(--color-text-secondary); margin-bottom: 8px;">Why not check your pending <strong>Transfers</strong>?</p>
                    <a href="#" onclick="event.preventDefault(); document.querySelector('[data-filter=\\'transfers\\']')?.click();" style="color: var(--color-primary); font-weight: 600; font-size: 0.85rem; text-decoration: none; letter-spacing: 0.05em; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">[View Pending]</a>
                </div>
            </div>
        `;
    }

    public static renderEmptyDetail(): string {
        return `
            <div style="padding: var(--space-xl); height: 100%; box-sizing: border-box;">
                <div class="detail-empty-polished">
                    <div style="position: relative; z-index: 1;">
                        <i data-lucide="mouse-pointer-click" style="width: 56px; height: 56px; color: var(--color-text-secondary); margin-bottom: 20px; opacity: 0.7;"></i>
                    </div>
                    <h3 class="title-lg" style="position: relative; z-index: 1; color: var(--color-text-primary); font-weight: 700; margin-bottom: 8px;">Select a notification</h3>
                    <p class="body-md text-muted" style="position: relative; z-index: 1; max-width: 280px; margin: 0 auto;">Choose a notification from the list to view its details.</p>
                </div>
            </div>
        `;
    }

    public static renderLoadingDetail(): string {
        return `
            <div class="detail-empty">
                <div class="empty-state-icon"><i data-lucide="loader-2" class="animate-spin" style="width: 48px; height: 48px; color: var(--color-text-muted); margin-bottom: var(--space-md);"></i></div>
                <h3 class="title-lg">Loading details...</h3>
            </div>
        `;
    }

    public static renderNotFoundDetail(): string {
        return `
            <div class="detail-empty">
                <div class="empty-state-icon"><i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--color-text-muted); margin-bottom: var(--space-md);"></i></div>
                <h3 class="title-lg">Notification not found</h3>
                <p class="body-md text-muted">The notification you selected no longer exists.</p>
            </div>
        `;
    }

    public static renderLoadingList(): string {
        const skeletonCard = `
            <div class="notification-card">
                <div class="nc-avatar skeleton" style="border-radius: 50%;"></div>
                
                <div class="nc-content">
                    <div class="nc-header">
                        <div class="skeleton" style="width: 80px; height: 14px; border-radius: 4px;"></div>
                        <div class="skeleton" style="width: 110px; height: 14px; border-radius: 4px;"></div>
                        <div class="skeleton" style="width: 40px; height: 12px; margin-left: auto; border-radius: 4px;"></div>
                    </div>
                    
                    <div class="nc-body" style="gap: 6px; margin-top: 4px;">
                        <div class="skeleton" style="width: 70%; height: 16px; border-radius: 4px;"></div>
                        <div class="skeleton" style="width: 95%; height: 14px; border-radius: 4px;"></div>
                        <div class="skeleton" style="width: 60%; height: 14px; border-radius: 4px;"></div>
                    </div>
                    
                    <div class="nc-footer" style="margin-top: 8px;">
                        <div class="skeleton" style="width: 60px; height: 20px; border-radius: 12px;"></div>
                        <div class="skeleton" style="width: 80px; height: 20px; border-radius: 12px;"></div>
                    </div>
                </div>
            </div>
        `;
        return skeletonCard.repeat(5);
    }
}
