import { Ticket, UserSession } from '../types';

export enum TicketFilterMode {
    Owned = 'owned',
    Unclaimed = 'unclaimed',
    Collaborating = 'collaborating',
    WaitingForClient = 'waiting_for_client',
    DueSoon = 'due_soon',
    All = 'all'
}

export class SupportTicketFilters {
    /**
     * Filters a list of tickets based on the specified TicketFilterMode and the current user.
     * 
     * Future Scalability Note:
     * Currently, filtering is performed client-side across the entire loaded ticket pool. 
     * As the ticket volume grows, this logic should be migrated to the backend API via query parameters 
     * (e.g. GET /api/tickets?mode=unclaimed&limit=50) to support proper pagination and reduce payload sizes.
     */
    public static applyFilter(tickets: Ticket[], mode: TicketFilterMode, currentUser: UserSession): Ticket[] {
        switch (mode) {
            case TicketFilterMode.Owned:
                return tickets.filter(t => t.primary_assignee_id === currentUser.id && t.status !== 'Resolved' && t.status !== 'Closed');
                
            case TicketFilterMode.Unclaimed:
                return tickets.filter(t => !t.primary_assignee_id && t.status !== 'Resolved' && t.status !== 'Closed');
                
            case TicketFilterMode.Collaborating:
                return tickets.filter(t => 
                    Array.isArray(t.collaborators) && 
                    t.collaborators.some(c => c.user_id === currentUser.id) && 
                    t.status !== 'Resolved' && 
                    t.status !== 'Closed'
                );
                
            case TicketFilterMode.WaitingForClient:
                // Assuming 'Waiting for Client' status exists, or use custom logic. 
                // For now, assume it's just 'Pending Client' or similar.
                return tickets.filter(t => t.primary_assignee_id === currentUser.id && t.status === 'Pending Client');
                
            case TicketFilterMode.DueSoon:
                // For due soon, let's filter tickets that are high priority or severe
                return tickets.filter(t => t.primary_assignee_id === currentUser.id && (t.severity === 'Severe' || t.severity === 'Critical') && t.status !== 'Resolved' && t.status !== 'Closed');
                
            case TicketFilterMode.All:
            default:
                return tickets;
        }
    }

    public static filterBySearchAndDropdowns(
        tickets: Ticket[],
        status: string,
        severity: string,
        dept: string,
        searchQuery: string
    ): Ticket[] {
        return tickets
            .filter(t => status === 'all' || t.status === status)
            .filter(t => severity === 'all' || t.severity === severity)
            .filter(t => dept === 'all' || t.department === dept)
            .filter(t => {
                if (!searchQuery) return true;
                const haystack = [t.id, t.title, t.requester, t.department, t.description || '']
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(searchQuery);
            });
    }
}
