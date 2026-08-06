import { NotificationCardViewModel } from '../../viewmodels/NotificationCardViewModel';
import { Badge } from '../common/Badge';

export class NotificationCard {
    public static render(vm: NotificationCardViewModel, isSelected: boolean = false, selectionMode: boolean = false, isFocused: boolean = false): string {
        const iconHtml = this.getAvatarOrIcon(vm);
        const badgesHtml = Badge.renderMultiple(vm.badges);

        const checkboxHtml = selectionMode ? `
            <div class="nc-checkbox-wrapper">
                <input type="checkbox" class="nc-checkbox" ${isSelected ? 'checked' : ''} tabindex="-1" />
            </div>
        ` : '';

        return `
            <div class="notification-card ${vm.isUnread ? 'unread' : ''} ${vm.isSelected ? 'active' : ''} ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''} ${isFocused ? 'keyboard-focused' : ''}" data-id="${vm.id}" tabindex="0" role="article" aria-selected="${isSelected}">
                ${vm.isUnread ? '<div class="unread-dot"></div>' : ''}
                
                ${checkboxHtml}
                
                <div class="nc-avatar">
                    ${iconHtml}
                </div>
                
                <div class="nc-content">
                    <div class="nc-header">
                        <span class="nc-actor">${vm.actorName}</span>
                        <span class="nc-action">${vm.actionText}</span>
                        <span class="nc-time">${vm.timeLabel}</span>
                    </div>
                    
                    <div class="nc-body">
                        <div class="nc-title">${vm.referenceId ? `<span class="nc-ref">${vm.referenceId}</span> ` : ''}${vm.title}</div>
                        <div class="nc-preview">${vm.previewText || ''}</div>
                    </div>
                    
                    ${badgesHtml ? `<div class="nc-footer">${badgesHtml}</div>` : ''}
                </div>

                <div class="nc-quick-actions">
                    ${vm.isUnread ? `<button class="icon-btn btn-mark-read" title="Mark Read"><i data-lucide="check"></i></button>` : ''}
                    <button class="icon-btn btn-more-actions" title="More Actions"><i data-lucide="more-horizontal"></i></button>
                </div>
            </div>
        `;
    }

    private static getAvatarOrIcon(vm: NotificationCardViewModel): string {
        if (vm.avatarUrl) {
            return `<img src="${vm.avatarUrl}" class="avatar-circle" alt="${vm.actorName}" />`;
        }
        if (vm.actorInitials) {
            return `<div class="avatar-circle">${vm.actorInitials}</div>`;
        }
        return `<div class="icon-circle ${vm.fallbackIconStyle || ''}"><i data-lucide="${vm.fallbackIcon}"></i></div>`;
    }
}
