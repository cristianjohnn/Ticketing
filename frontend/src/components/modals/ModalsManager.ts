import { TransitionLifecycle } from '../../utils/TransitionLifecycle';
import { AddCollaboratorModal } from './AddCollaboratorModal';
import { ArticleModal } from './ArticleModal';
import { DeleteArticleModal } from './DeleteArticleModal';
import { EditTicketModal } from './EditTicketModal';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { RatingModal } from './RatingModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { TicketModal } from './TicketModal';
import { TransferTicketModal } from './TransferTicketModal';
import { UpdateStatusModal } from './UpdateStatusModal';
import { UserModal } from './UserModal';
import { ViewTicketModal } from './ViewTicketModal';

export class ModalsManager {
    /**
     * Replaces legacy modals in the DOM with instances of the new TypeScript modals.
     */
    public static initializeModals(): void {
        const root = document.getElementById('modal-root');
        if (!root) {
            console.error('modal-root not found in the DOM.');
            return;
        }

        const appendModal = (ModalClass: any) => {
            const modalInstance = new ModalClass();
            root.appendChild(modalInstance.getElement());
        };

        appendModal(TicketModal);
        appendModal(ViewTicketModal);
        appendModal(EditTicketModal);
        appendModal(UserModal);
        appendModal(ResetPasswordModal);
        appendModal(RatingModal);
        appendModal(ArticleModal);
        appendModal(DeleteArticleModal);
        appendModal(LogoutConfirmModal);
        appendModal(UpdateStatusModal);
        appendModal(TransferTicketModal);
        appendModal(AddCollaboratorModal);
        appendModal(NotificationPreferencesModal);

        // Bind global close listeners to the new modals
        this.initModalCloseListeners();
    }
    /**
     * Opens a modal by adding the 'show' class to its overlay element,
     * then orchestrates the opening motion lifecycle.
     */
    public static openModal(modalId: string): void {
        const overlay = document.getElementById(modalId);
        if (!overlay) return;
        
        TransitionLifecycle.open(overlay, { locksBody: true, timeoutMs: 400 });
    }

    /**
     * Closes a modal by orchestrating the closing motion lifecycle.
     */
    public static closeModal(modalId: string): void {
        const overlay = document.getElementById(modalId);
        if (!overlay) return;
        
        TransitionLifecycle.close(overlay, { timeoutMs: 400 });
    }

    public static initModalCloseListeners(): void {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const overlay = btn.closest('.modal-overlay');
                if (overlay) this.closeModal(overlay.id);
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) {
                    this.closeModal(overlay.id);
                }
            });
        });
    }
}
