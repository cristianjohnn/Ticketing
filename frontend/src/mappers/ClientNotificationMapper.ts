import { NotificationCardViewModel } from '../viewmodels/NotificationCardViewModel';
import { NotificationDetailViewModel } from '../viewmodels/NotificationDetailViewModel';

export class ClientNotificationMapper {
    /**
     * Adapts the Staff/Shared Card ViewModel into a Client-friendly Card ViewModel
     * - Simplifies action text (removes workflow jargon)
     */
    public static mapToClientCard(vm: NotificationCardViewModel): NotificationCardViewModel {
        const clientActionText = this.getClientActionText(vm.actionText);
        
        return {
            ...vm,
            actionText: clientActionText
        };
    }

    /**
     * Adapts the Staff/Shared Detail ViewModel into a Client-friendly Detail ViewModel
     * - Removes workflow actions (accept/reject transfer/collab)
     * - Leaves only 'View Ticket' action
     * - Simplifies story
     */
    public static mapToClientDetail(vm: NotificationDetailViewModel): NotificationDetailViewModel {
        // Keep "View Ticket" and "Rate Experience" actions
        const clientActions = vm.actions.filter(a => a.actionType === 'view-ticket' || a.actionType === 'rate-experience');

        // Remove complex workflow stories, fallback to simple message if needed
        let clientStory = vm.content.story;
        if (clientStory) {
            // Simplify or remove story for clients if it's a workflow event
            if (['transferred', 'requested to transfer', 'approved the transfer of', 'declined the transfer of', 'cancelled the transfer of', 'invited you to collaborate on', 'accepted your invitation to collaborate on', 'declined your invitation to collaborate on'].includes(clientStory.action)) {
                clientStory = undefined; // Hide internal workflow stories from clients
            }
        }

        return {
            ...vm,
            content: {
                ...vm.content,
                story: clientStory,
            },
            actions: clientActions
        };
    }

    private static getClientActionText(originalAction: string): string {
        // Translate staff workflow events to simpler client terms, though clients shouldn't see most of these anyway
        switch (originalAction) {
            case 'left a comment': return 'replied to your ticket';
            case 'uploaded an attachment': return 'added an attachment';
            case 'resolved a ticket': return 'resolved your ticket';
            case 'reopened a ticket': return 'reopened your ticket';
            case 'updated ticket status': return 'updated ticket status';
            case 'claimed a ticket': return 'is working on your ticket';
            default: return originalAction;
        }
    }
}
