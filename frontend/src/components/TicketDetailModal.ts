import { ticketsAPI } from '../services/api';
import { sseClient } from '../services/sseClient';
import { store } from '../state/store';
import { Ticket } from '../types';
import { createElement } from '../utils/dom';
import { handleUIError } from '../utils/errorHandler';
import {
    formatAssignees,
    formatDate,
    getPriorityBadgeClass,
    getSeverityBadgeClass,
    getStatusBadgeClass,
} from '../utils/formatters';
import { resolveTicketCapabilities } from '../utils/ticketPermissions';
import { AddCollaboratorModal } from './AddCollaboratorModal';
import { EditTicketModal } from './EditTicketModal';
import { CSATExpiredBanner } from './csat/CSATExpiredBanner';
import { CSATPromptCard } from './csat/CSATPromptCard';
import { RatingSummary } from './csat/RatingSummary';
import { ratingStore } from '../state/RatingStore';
import { ModalsManager } from './modals/ModalsManager';
import { showToast } from './Toast';
import { TransferTicketModal } from './TransferTicketModal';
import { UpdateStatusModal } from './UpdateStatusModal';

export class TicketDetailModal {
    private container: HTMLElement;
    private ticket: Ticket;
    private onRefresh: () => void;
    private boundEditHandler?: () => void;
    private boundSubmitHandler?: (e: Event) => void;
    private sseHandler?: (payload: any) => void;
    private csatUnsubscribe?: () => void;

    constructor(ticket: Ticket, onRefresh: () => void) {
        this.ticket = ticket;
        this.onRefresh = onRefresh;
        const body = document.getElementById('view-modal-body');
        if (!body) throw new Error('Modal body not found');
        this.container = body;
    }

    public open(): void {
        this.destroy(); // clean up previous if any
        this.create();
        this.render();
        this.attachEvents();

        if (!this.sseHandler) {
            this.sseHandler = (payload: any) => {
                // If the event corresponds to this ticket, refresh it
                if (payload && payload.entityId === this.ticket.id) {
                    ticketsAPI.getById(this.ticket.id).then(updated => {
                        if (updated) {
                            this.ticket = updated;
                            // Re-render the modal in place without closing it
                            this.destroy();
                            this.create();
                            this.render();
                            this.attachEvents();
                            this.onRefresh(); // Also refresh the underlying list
                        }
                    }).catch(console.error);
                }
            };
            
            const events = ['note.added', 'ticket.status_updated', 'ticket.claimed', 'ticket.transferred', 'collaboration.requested', 'collaboration.approved', 'collaboration.rejected', 'attachment.uploaded', 'ticket.reopened'];
            events.forEach(ev => sseClient.on(ev, this.sseHandler!));
        }

        ModalsManager.openModal('view-ticket-modal');
    }

    private create(): void {
        const user = store.getState().currentUser;

        // Header
        const headerDiv = createElement('div', { className: 'detail-header' });
        
        const titleWrapper = createElement('div');
        titleWrapper.appendChild(createElement('span', { className: 'ticket-id-lg', textContent: this.ticket.id }));
        titleWrapper.appendChild(createElement('h2', { textContent: this.ticket.title }));
        
        const badgesWrapper = createElement('div', { 
            attributes: { style: 'display:flex; flex-direction:column; align-items:flex-end; gap:8px;' } 
        });
        
        const detailBadges = createElement('div', { className: 'detail-badges' });
        detailBadges.appendChild(createElement('span', { className: `badge ${getStatusBadgeClass(this.ticket.status)}`, textContent: this.ticket.status }));
        detailBadges.appendChild(createElement('span', { className: `badge ${getPriorityBadgeClass(this.ticket.priority)}`, textContent: this.ticket.priority }));
        detailBadges.appendChild(createElement('span', { className: `badge ${getSeverityBadgeClass(this.ticket.severity)}`, textContent: this.ticket.severity }));
        badgesWrapper.appendChild(detailBadges);

        const caps = resolveTicketCapabilities(this.ticket, user);

        if (caps.canClaim || caps.canTransfer || caps.canAddCollaborator || caps.canUpdateStatus || caps.canEdit || caps.canReopen || caps.canRequestCollaboration) {
            const actionsDiv = createElement('div', { className: 'ticket-actions', attributes: { style: 'display:flex; gap:8px; margin-top:8px;' } });
            
            if (caps.canClaim) {
                const claimBtn = createElement('button', {
                    className: 'btn btn-primary btn-sm',
                    id: 'detail-claim-btn',
                    textContent: 'Claim Ticket',
                    attributes: { style: 'padding: 4px 10px; font-size: 12px;' }
                });
                actionsDiv.appendChild(claimBtn);
            }
            
            if (caps.canTransfer) {
                const transferBtn = createElement('button', {
                    className: 'btn btn-secondary btn-sm',
                    id: 'detail-transfer-btn',
                    textContent: 'Transfer',
                    attributes: { style: 'padding: 4px 10px; font-size: 12px;' }
                });
                actionsDiv.appendChild(transferBtn);
            }

            if (caps.canAddCollaborator) {
                const collabBtn = createElement('button', {
                    className: 'btn btn-secondary btn-sm',
                    id: 'detail-collab-btn',
                    textContent: 'Add Collaborator',
                    attributes: { style: 'padding: 4px 10px; font-size: 12px;' }
                });
                actionsDiv.appendChild(collabBtn);
            }

            if (caps.canRequestCollaboration) {
                const reqCollabBtn = createElement('button', {
                    className: 'btn btn-secondary btn-sm',
                    id: 'detail-req-collab-btn',
                    textContent: 'Request Collaboration',
                    attributes: { style: 'padding: 4px 10px; font-size: 12px;' }
                });
                actionsDiv.appendChild(reqCollabBtn);
            }

            if (caps.canUpdateStatus) {
                const statusBtn = createElement('button', {
                    className: 'btn btn-secondary btn-sm',
                    id: 'detail-status-btn',
                    textContent: 'Update Status',
                    attributes: { style: 'padding: 4px 10px; font-size: 12px;' }
                });
                actionsDiv.appendChild(statusBtn);
            }

            if (caps.canEdit) {
                const editBtnSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Details`;
                const editBtn = createElement('button', {
                    className: 'btn btn-secondary btn-sm',
                    id: 'detail-edit-btn',
                    innerHTML: editBtnSvg,
                    attributes: { style: 'padding: 4px 10px; font-size: 12px; display: flex; align-items: center; gap: 4px;' }
                });
                actionsDiv.appendChild(editBtn);
            }

            if (caps.canReopen) {
                const reopenBtn = createElement('button', {
                    className: 'btn btn-primary btn-sm',
                    id: 'detail-reopen-btn',
                    textContent: 'Reopen Ticket',
                    attributes: { style: 'padding: 4px 10px; font-size: 12px;' }
                });
                actionsDiv.appendChild(reopenBtn);
            }

            if (actionsDiv.children.length > 0) {
                badgesWrapper.appendChild(actionsDiv);
            }
        }

        headerDiv.appendChild(titleWrapper);
        headerDiv.appendChild(badgesWrapper);
        this.container.appendChild(headerDiv);

        // Grid
        const gridDiv = createElement('div', { className: 'modal-detail-grid' });
        const collaboratorsText = this.ticket.collaborators && this.ticket.collaborators.length > 0
            ? this.ticket.collaborators.map(c => c.fullName || c.username || c.user_id).join(', ')
            : 'None';

        const gridItems = [
            { label: 'Requester:', val: this.ticket.requester },
            { label: 'Department:', val: this.ticket.department },
            { label: 'Category:', val: this.ticket.category },
            { label: 'Assignee:', val: formatAssignees(this.ticket) },
            { label: 'Collaborators:', val: collaboratorsText },
            { label: 'Created:', val: formatDate(this.ticket.createdAt) },
            { label: 'Due SLA:', val: formatDate(this.ticket.dueAt) },
        ];
        gridItems.forEach(item => {
            const div = createElement('div', { className: 'detail-item' });
            div.appendChild(createElement('strong', { textContent: item.label }));
            div.appendChild(document.createTextNode(' ' + (item.val || '')));
            gridDiv.appendChild(div);
        });
        this.container.appendChild(gridDiv);

        // CSAT Container
        const csatContainer = createElement('div', { className: 'csat-ticket-container', attributes: { id: `csat-container-${this.ticket.id}`, style: 'margin-bottom: var(--space-md);' } });
        this.container.appendChild(csatContainer);
        this.loadCSATState(csatContainer);

        // Bind reactive updates
        this.csatUnsubscribe = ratingStore.subscribe((event) => {
            if (event.ticketId === this.ticket.id) {
                if (event.type === 'ELIGIBILITY_CHANGED' || event.type === 'RATING_SUBMITTED') {
                    this.loadCSATState(csatContainer);
                }
            }
        });

        // Description
        const descDiv = createElement('div', { className: 'detail-section' });
        descDiv.appendChild(createElement('h3', { textContent: 'Description' }));
        descDiv.appendChild(createElement('p', { className: 'description-text', textContent: this.ticket.description || 'No description provided.' }));
        this.container.appendChild(descDiv);

        // Attachments
        if (this.ticket.attachments && this.ticket.attachments.length > 0) {
            const attDiv = createElement('div', { className: 'detail-section' });
            attDiv.appendChild(createElement('h3', { textContent: 'Attachments' }));
            const attList = createElement('ul', { className: 'attachment-list' });
            this.ticket.attachments.forEach(a => {
                const li = createElement('li');
                const svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
                const link = createElement('a', {
                    className: 'attachment-link',
                    attributes: { href: `/uploads/${a.filename}`, target: '_blank' },
                    innerHTML: svgIcon + ' ' + a.originalname + ' (' + Math.round(a.size / 1024) + ' KB)'
                });
                li.appendChild(link);
                attList.appendChild(li);
            });
            attDiv.appendChild(attList);
            this.container.appendChild(attDiv);
        }

        // Activity & Notes
        const notesDiv = createElement('div', { className: 'detail-section' });
        notesDiv.appendChild(createElement('h3', { textContent: 'Activity & Notes' }));
        
        const notesListDiv = createElement('div', { className: 'notes-list' });
        if (this.ticket.notes && this.ticket.notes.length > 0) {
            this.ticket.notes.forEach(n => {
                const noteItem = createElement('div', { className: 'note-item' });
                const header = createElement('div', { className: 'note-header' });
                header.appendChild(createElement('strong', { textContent: n.author }));
                header.appendChild(createElement('small', { textContent: n.time }));
                noteItem.appendChild(header);
                noteItem.appendChild(createElement('div', { className: 'note-body', textContent: n.text }));
                notesListDiv.appendChild(noteItem);
            });
        } else {
            notesListDiv.appendChild(createElement('p', { className: 'text-muted', textContent: 'No notes recorded.' }));
        }
        notesDiv.appendChild(notesListDiv);

        if (caps.canPostNote) {
            const form = createElement('form', { id: 'add-note-form', className: 'add-note-form', attributes: { style: 'margin-top: var(--space-md);' } });
            form.appendChild(createElement('textarea', { id: 'note-text', className: 'form-control', attributes: { placeholder: 'Add a note or update...', rows: '3', required: 'true' } }));
            form.appendChild(createElement('button', { className: 'btn btn-secondary btn-sm', textContent: 'Post Note', attributes: { type: 'submit', style: 'margin-top: var(--space-sm);' } }));
            
            notesDiv.appendChild(form);
        }
        this.container.appendChild(notesDiv);

        if (caps.canViewHistory) {
            // History Section container
            const historyDiv = createElement('div', { className: 'detail-section', id: 'history-section' });
            historyDiv.appendChild(createElement('h3', { textContent: 'Event History' }));
            const historyLoading = createElement('p', { className: 'text-muted', textContent: 'Loading history...' });
            historyDiv.appendChild(historyLoading);
            this.container.appendChild(historyDiv);

            // Load History
            this.loadHistory();
        }

        if (user && user.role !== 'client') {
            const pendingDiv = createElement('div', { id: 'pending-requests-section', attributes: { style: 'margin-top: var(--space-md); margin-bottom: var(--space-md);' } });
            this.container.insertBefore(pendingDiv, gridDiv);
            this.loadPendingRequests();
        }
    }

    private render(): void {
        // Render implicitly happened during create as we appended to this.container.
    }

    private attachEvents(): void {
        const editBtn = document.getElementById('detail-edit-btn');
        if (editBtn) {
            this.boundEditHandler = () => {
                const editModal = new EditTicketModal(this.ticket, async () => {
                    try {
                        const updated = await ticketsAPI.getById(this.ticket.id);
                        this.ticket = updated;
                        this.open();
                        this.onRefresh();
                    } catch (err) {
                        console.error('Failed to reload ticket after update:', err);
                    }
                });
                editModal.open();
            };
            editBtn.addEventListener('click', this.boundEditHandler);
        }

        const noteForm = document.getElementById('add-note-form');
        if (noteForm) {
            this.boundSubmitHandler = async (e: Event) => {
                e.preventDefault();
                const textarea = document.getElementById('note-text') as HTMLTextAreaElement;
                if (!textarea || !textarea.value.trim()) return;

                const text = textarea.value.trim();
                textarea.value = '';

                try {
                    const user = store.getState().currentUser;
                    const author = user ? (user.fullName || user.username) : 'User';
                    
                    // Optimistic update
                    const newNote = {
                        id: Date.now(),
                        ticketId: this.ticket.id,
                        text,
                        author,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    if (!this.ticket.notes) this.ticket.notes = [];
                    this.ticket.notes.push(newNote);
                    this.open(); // Re-render

                    await ticketsAPI.addNote(this.ticket.id, text, author);
                    showToast('Note added successfully', 'success');
                    
                    // Background sync
                    const updated = await ticketsAPI.getById(this.ticket.id);
                    this.ticket = updated;
                    this.onRefresh();
                } catch (err: unknown) {
                    handleUIError(err, 'Failed to add note');
                }
            };
            noteForm.addEventListener('submit', this.boundSubmitHandler);
        }

        const claimBtn = document.getElementById('detail-claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', async () => {
                try {
                    await ticketsAPI.claim(this.ticket.id);
                    showToast('Ticket claimed successfully', 'success');
                    const updated = await ticketsAPI.getById(this.ticket.id);
                    this.ticket = updated;
                    this.open();
                    this.onRefresh();
                } catch (err) {
                    handleUIError(err, 'Failed to claim ticket');
                }
            });
        }

        const transferBtn = document.getElementById('detail-transfer-btn');
        if (transferBtn) {
            transferBtn.addEventListener('click', () => {
                const transferModal = new TransferTicketModal(this.ticket, async () => {
                    try {
                        const updated = await ticketsAPI.getById(this.ticket.id);
                        this.ticket = updated;
                        this.open();
                        this.onRefresh();
                    } catch (err) {
                        console.error('Failed to reload ticket after transfer:', err);
                    }
                });
                transferModal.open();
            });
        }

        const collabBtn = document.getElementById('detail-collab-btn');
        if (collabBtn) {
            collabBtn.addEventListener('click', () => {
                const collabModal = new AddCollaboratorModal(this.ticket, async () => {
                    try {
                        const updated = await ticketsAPI.getById(this.ticket.id);
                        this.ticket = updated;
                        this.open();
                        this.onRefresh();
                    } catch (err) {
                        console.error('Failed to reload ticket after adding collab:', err);
                    }
                });
                collabModal.open().catch(console.error);
            });
        }

        const reqCollabBtn = document.getElementById('detail-req-collab-btn');
        if (reqCollabBtn) {
            reqCollabBtn.addEventListener('click', async () => {
                try {
                    reqCollabBtn.setAttribute('disabled', 'true');
                    await ticketsAPI.requestCollaboration(this.ticket.id);
                    showToast('Collaboration request submitted.', 'success');
                    const updated = await ticketsAPI.getById(this.ticket.id);
                    this.ticket = updated;
                    this.open();
                    this.onRefresh();
                } catch (err) {
                    handleUIError(err, 'Failed to request collaboration');
                    reqCollabBtn.removeAttribute('disabled');
                }
            });
        }

        const statusBtn = document.getElementById('detail-status-btn');
        if (statusBtn) {
            statusBtn.addEventListener('click', () => {
                const statusModal = new UpdateStatusModal(this.ticket, async () => {
                    try {
                        const updated = await ticketsAPI.getById(this.ticket.id);
                        this.ticket = updated;
                        this.open();
                        this.onRefresh();
                    } catch (err) {
                        console.error('Failed to reload ticket after updating status:', err);
                    }
                });
                statusModal.open();
            });
        }

        const reopenBtn = document.getElementById('detail-reopen-btn');
        if (reopenBtn) {
            reopenBtn.addEventListener('click', async () => {
                if (!confirm('Are you sure you want to reopen this ticket?')) return;
                try {
                    await ticketsAPI.reopen(this.ticket.id);
                    showToast('Ticket reopened successfully', 'success');
                    const updated = await ticketsAPI.getById(this.ticket.id);
                    this.ticket = updated;
                    this.open();
                    this.onRefresh();
                } catch (err) {
                    handleUIError(err, 'Failed to reopen ticket');
                }
            });
        }
    }

    private async loadHistory(): Promise<void> {
        try {
            const history = await ticketsAPI.getHistory(this.ticket.id);
            const historySection = document.getElementById('history-section');
            if (!historySection) return;

            historySection.innerHTML = '';
            historySection.appendChild(createElement('h3', { textContent: 'Event History' }));

            if (history.length === 0) {
                historySection.appendChild(createElement('p', { className: 'text-muted', textContent: 'No history events yet.' }));
                return;
            }

            const timelineContainer = createElement('div', { className: 'timeline-container' });

            // Extensible event renderers
            const renderers: Record<string, (ev: any) => string> = {
                created: () => 'Ticket created.',
                claimed: (ev) => `Claimed by <strong>${ev.event_data?.assignee_name || ev.actor_id}</strong>.`,
                assigned: (ev) => `Assigned to <strong>${ev.event_data?.assignee_name || ev.actor_id}</strong>.`,
                transferred: (ev) => `Transferred to department: <strong>${ev.event_data?.new_department || 'Unknown'}</strong>.`,
                ownership_transferred: (ev) => {
                    let text = `Ownership transferred to <strong>${ev.event_data?.newOwnerName || ev.event_data?.newOwnerId}</strong>.`;
                    if (ev.event_data?.reason) {
                        text += ` Reason: <em>${ev.event_data.reason}</em>`;
                    }
                    if (ev.event_data?.remainedCollaborator) {
                        text += ` (Previous owner remained as collaborator).`;
                    }
                    return text;
                },
                collaborator_added: (ev) => `Collaborator <strong>${ev.event_data?.collaborator_name || ev.event_data?.collaborator_id || 'Unknown'}</strong> added.`,
                collaboration_requested: (ev) => `Collaboration requested by <strong>${ev.event_data?.requester_name || ev.event_data?.request_id}</strong>.`,
                collaboration_approved: (ev) => `Collaboration request for <strong>${ev.event_data?.collaborator_name || ev.event_data?.collaborator_id}</strong> approved.`,
                collaboration_rejected: (ev) => `Collaboration request from <strong>${ev.event_data?.requester_name || ev.event_data?.requester_id}</strong> rejected.`,
                reopened: (ev) => `Reopened: ${ev.event_data?.reason || 'No reason provided'}.`,
                status_updated: (ev) => `Status changed from ${ev.event_data?.old_status} to <strong>${ev.event_data?.new_status}</strong>.`,
                default: (ev) => {
                    const dataStr = ev.event_data ? JSON.stringify(ev.event_data) : '';
                    return `System event: ${ev.event_type} ${dataStr}`;
                }
            };

            history.forEach(ev => {
                const item = createElement('div', { className: 'timeline-item' });
                item.setAttribute('data-event', ev.event_type);
                
                const icon = createElement('div', { className: 'timeline-icon' });
                item.appendChild(icon);

                const content = createElement('div', { className: 'timeline-content' });
                
                const header = createElement('div', { className: 'timeline-header' });
                
                // Format title (capitalize first letter, replace underscores)
                const titleText = ev.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                header.appendChild(createElement('span', { className: 'timeline-title', textContent: titleText }));
                
                const date = new Date(ev.created_at).toLocaleString();
                header.appendChild(createElement('span', { className: 'timeline-time', textContent: date }));
                content.appendChild(header);

                const body = createElement('div', { className: 'timeline-body' });
                const renderFn = renderers[ev.event_type] || renderers['default'];
                body.innerHTML = renderFn(ev);
                content.appendChild(body);

                item.appendChild(content);
                timelineContainer.appendChild(item);
            });

            historySection.appendChild(timelineContainer);
        } catch (err) {
            console.error('Failed to load history', err);
        }
    }

    private async loadPendingRequests(): Promise<void> {
        try {
            const [collabRequests, transferRequests] = await Promise.all([
                ticketsAPI.getPendingRequests(this.ticket.id),
                ticketsAPI.getPendingTransferRequests(this.ticket.id)
            ]);
            
            const pendingDiv = document.getElementById('pending-requests-section');
            if (!pendingDiv) return;
            
            pendingDiv.innerHTML = '';
            
            const user = store.getState().currentUser;
            const isOwner = this.ticket.primary_assignee_id === user?.id;
            const isAdmin = user?.role === 'admin';

            // --- Collaboration Requests ---
            const actionableCollab = collabRequests.filter(req => {
                if (req.target_user_id) {
                    return req.target_user_id === user?.id || isAdmin;
                } else {
                    return isOwner || isAdmin;
                }
            });

            if (actionableCollab.length > 0) {
                const collabBanner = createElement('div', { 
                    className: 'alert alert-info', 
                    attributes: { style: 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;' } 
                });
                collabBanner.appendChild(createElement('strong', { textContent: 'Pending Collaboration Requests' }));

                actionableCollab.forEach(req => {
                    const item = createElement('div', { attributes: { style: 'display: flex; justify-content: space-between; align-items: center; background: var(--color-bg-surface-hover); padding: 8px; border-radius: 4px;' } });
                    
                    let message: string;
                    if (req.target_user_id) {
                        const requesterName = req.requesterName || req.username || req.requester_id;
                        const targetName = req.targetName || req.targetUsername || req.target_user_id;
                        message = req.target_user_id === user?.id 
                            ? `${requesterName} has invited you to collaborate on this ticket.`
                            : `${requesterName} invited ${targetName} to collaborate.`;
                    } else {
                        const name = req.requesterName || req.username || req.requester_id;
                        message = `${name} is requesting to collaborate on this ticket.`;
                    }
                    
                    item.appendChild(createElement('span', { textContent: message }));

                    const actions = createElement('div', { attributes: { style: 'display: flex; gap: 8px;' } });
                    
                    const approveBtn = createElement('button', { className: 'btn btn-primary btn-sm', textContent: 'Approve' });
                    approveBtn.addEventListener('click', async () => {
                        try {
                            await ticketsAPI.approveCollaboration(req.id);
                            showToast(`Request approved successfully`, 'success');
                            const updated = await ticketsAPI.getById(this.ticket.id);
                            this.ticket = updated;
                            this.open();
                            this.onRefresh();
                        } catch (err) { handleUIError(err, 'Failed to approve'); }
                    });

                    const rejectBtn = createElement('button', { className: 'btn btn-secondary btn-sm', textContent: 'Reject' });
                    rejectBtn.addEventListener('click', async () => {
                        try {
                            await ticketsAPI.rejectCollaboration(req.id, 'Rejected');
                            showToast(`Request rejected successfully`, 'success');
                            const updated = await ticketsAPI.getById(this.ticket.id);
                            this.ticket = updated;
                            this.open();
                            this.onRefresh();
                        } catch (err) { handleUIError(err, 'Failed to reject'); }
                    });

                    actions.appendChild(approveBtn);
                    actions.appendChild(rejectBtn);
                    item.appendChild(actions);
                    collabBanner.appendChild(item);
                });
                pendingDiv.appendChild(collabBanner);
            }

            // --- Transfer Requests ---
            const relevantTransfer = transferRequests.filter(req => {
                return req.target_user_id === user?.id || req.requester_id === user?.id || isAdmin;
            });

            if (relevantTransfer.length > 0) {
                const transferBanner = createElement('div', { 
                    className: 'alert alert-warning', 
                    attributes: { style: 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;' } 
                });
                transferBanner.appendChild(createElement('strong', { textContent: 'Pending Ticket Transfer' }));

                relevantTransfer.forEach(req => {
                    const item = createElement('div', { attributes: { style: 'display: flex; justify-content: space-between; align-items: center; background: var(--color-bg-surface-hover); padding: 8px; border-radius: 4px;' } });
                    
                    const requesterName = req.requesterName || req.requesterUsername || req.requester_id;
                    const targetName = req.targetName || req.targetUsername || req.target_user_id;
                    
                    let message: string;
                    if (req.target_user_id === user?.id) {
                        message = `${requesterName} has requested to transfer this ticket to you.`;
                    } else if (req.requester_id === user?.id) {
                        message = `You have requested to transfer this ticket to ${targetName}.`;
                    } else {
                        message = `${requesterName} has requested to transfer this ticket to ${targetName}.`;
                    }
                    
                    item.appendChild(createElement('span', { textContent: message }));

                    const actions = createElement('div', { attributes: { style: 'display: flex; gap: 8px;' } });
                    
                    if (req.target_user_id === user?.id || isAdmin) {
                        const approveBtn = createElement('button', { className: 'btn btn-primary btn-sm', textContent: 'Accept' });
                        approveBtn.addEventListener('click', async () => {
                            try {
                                await ticketsAPI.approveTransfer(req.id);
                                showToast(`Transfer request accepted`, 'success');
                                const updated = await ticketsAPI.getById(this.ticket.id);
                                this.ticket = updated;
                                this.open();
                                this.onRefresh();
                            } catch (err) { handleUIError(err, 'Failed to accept transfer'); }
                        });

                        const rejectBtn = createElement('button', { className: 'btn btn-secondary btn-sm', textContent: 'Reject' });
                        rejectBtn.addEventListener('click', async () => {
                            try {
                                await ticketsAPI.rejectTransfer(req.id, 'Rejected from ticket details');
                                showToast(`Transfer request rejected`, 'success');
                                const updated = await ticketsAPI.getById(this.ticket.id);
                                this.ticket = updated;
                                this.open();
                                this.onRefresh();
                            } catch (err) { handleUIError(err, 'Failed to reject transfer'); }
                        });

                        actions.appendChild(approveBtn);
                        actions.appendChild(rejectBtn);
                    }

                    if (req.requester_id === user?.id || isAdmin) {
                        const cancelBtn = createElement('button', { className: 'btn btn-secondary btn-sm', textContent: 'Cancel Request' });
                        cancelBtn.addEventListener('click', async () => {
                            try {
                                await ticketsAPI.cancelTransfer(req.id);
                                showToast(`Transfer request cancelled`, 'success');
                                const updated = await ticketsAPI.getById(this.ticket.id);
                                this.ticket = updated;
                                this.open();
                                this.onRefresh();
                            } catch (err) { handleUIError(err, 'Failed to cancel transfer'); }
                        });
                        actions.appendChild(cancelBtn);
                    }

                    item.appendChild(actions);
                    transferBanner.appendChild(item);
                });
                pendingDiv.appendChild(transferBanner);
            }

        } catch (err) {
            console.error('Failed to load pending requests', err);
        }
    }

    private async loadCSATState(container: HTMLElement) {
        try {
            const eligibility = await ratingStore.getEligibility(this.ticket.id);
            container.innerHTML = '';
            
            if (eligibility.status === 'RATED' && eligibility.rating) {
                container.innerHTML = RatingSummary.render({ rating: eligibility.rating });
            } else if (eligibility.canRate) {
                const promptEl = CSATPromptCard.render(this.ticket);
                container.appendChild(promptEl);
            } else if (eligibility.status === 'EXPIRED') {
                const expiredEl = CSATExpiredBanner.render();
                container.appendChild(expiredEl);
            }
        } catch (e) {
            console.error('Failed to load CSAT state', e);
        }
    }

    public destroy(): void {
        const editBtn = document.getElementById('detail-edit-btn');
        if (editBtn && this.boundEditHandler) {
            editBtn.removeEventListener('click', this.boundEditHandler);
        }
        const noteForm = document.getElementById('add-note-form');
        if (noteForm && this.boundSubmitHandler) {
            noteForm.removeEventListener('submit', this.boundSubmitHandler);
        }
        if (this.sseHandler) {
            const events = ['note.added', 'ticket.status_updated', 'ticket.claimed', 'ticket.transferred', 'collaboration.requested', 'collaboration.approved', 'collaboration.rejected', 'attachment.uploaded', 'ticket.reopened'];
            events.forEach(ev => sseClient.off(ev, this.sseHandler!));
            this.sseHandler = undefined;
        }
        if (this.csatUnsubscribe) {
            this.csatUnsubscribe();
            this.csatUnsubscribe = undefined;
        }
        this.container.innerHTML = '';
    }
}
