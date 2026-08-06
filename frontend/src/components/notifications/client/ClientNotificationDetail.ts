import { NotificationDetailViewModel } from '../../../viewmodels/NotificationDetailViewModel';

export class ClientNotificationDetail {
    private onActionClick: (actionType: string, payload: any) => void;
    private onMarkRead: (notificationId: string) => void;

    constructor(
        onActionClick: (actionType: string, payload: any) => void,
        onMarkRead: (notificationId: string) => void
    ) {
        this.onActionClick = onActionClick;
        this.onMarkRead = onMarkRead;
    }

    public render(vm: NotificationDetailViewModel): string {
        let metadataHtml = '';
        let actionsHtml = '';

        if (vm.metadata && vm.metadata.length > 0) {
            metadataHtml = `
                <div class="detail-metadata-grid mt-4">
                    ${vm.metadata.map(m => `
                        <div class="meta-item">
                            <div class="meta-label">${m.label}</div>
                            <div class="meta-value ${m.isPrimary ? 'text-accent' : ''}">${m.value}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (vm.actions && vm.actions.length > 0) {
            actionsHtml = vm.actions.map(a => `
                <button class="btn btn-${a.style} action-btn" data-action="${a.actionType}" data-payload='${JSON.stringify(a.payload || {})}'>
                    ${a.icon ? `<i data-lucide="${a.icon}"></i>` : ''} ${a.label}
                </button>
            `).join('');
        }

        return `
            <div class="detail-header">
                <div class="detail-icon ${vm.header.iconStyle}"><i data-lucide="${vm.header.icon}"></i></div>
                <div class="detail-type meta-sm">${vm.header.typeName}</div>
                <div class="detail-actions-top">
                    <span class="detail-time meta-sm text-muted mr-3">${vm.header.timeLabel}</span>
                    ${vm.isUnread ? `<button class="btn btn-sm btn-ghost" id="btn-mark-read-detail" data-id="${vm.id}"><i data-lucide="check"></i> Mark as Read</button>` : ''}
                </div>
            </div>
            
            <div class="detail-content-scroll">
                <h2 class="detail-title title-lg">${vm.content.title}</h2>
                
                <div class="detail-body">
                    ${vm.content.story ? `<div class="detail-story body-md"><span class="font-semibold">${vm.content.story.actor}</span> ${vm.content.story.action} <strong>${vm.content.story.object}</strong>.</div>` : ''}
                    ${vm.content.message ? `<div class="detail-message text-muted body-md mt-3">${vm.content.message}</div>` : ''}
                    ${metadataHtml}
                </div>
            </div>

            ${actionsHtml ? `
                <div class="detail-actions-bottom">
                    ${actionsHtml}
                </div>
            ` : ''}
        `;
    }

    public attachListeners(container: HTMLElement) {
        const markReadBtn = container.querySelector('#btn-mark-read-detail');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', () => {
                const id = markReadBtn.getAttribute('data-id');
                if (id) this.onMarkRead(id);
            });
        }

        container.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const actionType = btn.getAttribute('data-action');
                const payloadStr = btn.getAttribute('data-payload');
                if (actionType) {
                    let payload = {};
                    try {
                        if (payloadStr) payload = JSON.parse(payloadStr);
                    } catch (e) {
                        console.error('Failed to parse payload', e);
                    }
                    this.onActionClick(actionType, payload);
                }
            });
        });
    }
}
