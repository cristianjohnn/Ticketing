import { Ticket, User, UserSession } from '../types';

export type TicketRelationship = 'Owner' | 'Collaborator' | 'Requester' | 'Administrator' | 'Viewer';

export interface TicketCapabilities {
    relationship: TicketRelationship;
    canEdit: boolean;
    canClaim: boolean;
    canTransfer: boolean;
    canUpdateStatus: boolean;
    canAddCollaborator: boolean;
    canRequestCollaboration: boolean;
    canApproveCollaboration: boolean;
    canPostNote: boolean;
    canUploadAttachment: boolean;
    canViewHistory: boolean;
    canReopen: boolean;
}

export function resolveTicketCapabilities(ticket: Ticket, user: User | UserSession | null): TicketCapabilities {
    if (!user) {
        return {
            relationship: 'Viewer',
            canEdit: false,
            canClaim: false,
            canTransfer: false,
            canUpdateStatus: false,
            canAddCollaborator: false,
            canRequestCollaboration: false,
            canApproveCollaboration: false,
            canPostNote: false,
            canUploadAttachment: false,
            canViewHistory: false,
            canReopen: false
        };
    }

    const isAdmin = user.role === 'admin';
    const isOwner = ticket.primary_assignee_id === user.id;
    // Assume ticket.collaborators is an array of TicketCollaborator.
    const isCollaborator = Array.isArray(ticket.collaborators) && ticket.collaborators.some((c) => c.user_id === user.id);
    // In our system, requester is mapped to `requester` string (name), but do we have `requesterId`? 
    // Let's just use user.username === ticket.requester (or similar) or assume we will just use role client for now for requester logic.
    // Let's refine it.
    
    // Wait, let's just make `isRequester` based on standard logic (maybe `user.username === ticket.requester` for now)
    const isRequester = user.username === ticket.requester || user.fullName === ticket.requester;
    const isItSupport = user.role === 'it-support';
    
    // Determine the highest privilege relationship
    let relationship: TicketRelationship = 'Viewer';
    if (isAdmin) {
        relationship = 'Administrator';
    } else if (isOwner) {
        relationship = 'Owner';
    } else if (isCollaborator) {
        relationship = 'Collaborator';
    } else if (isRequester) {
        relationship = 'Requester';
    }

    const isClosed = ticket.status === 'Resolved' || ticket.status === 'Closed';

    return {
        relationship,
        canEdit: isAdmin || isOwner,
        canClaim: !ticket.primary_assignee_id && (isAdmin || isItSupport) && !isClosed,
        canTransfer: !isClosed && (isAdmin || isOwner),
        canUpdateStatus: !isClosed && (isAdmin || isOwner),
        canAddCollaborator: !isClosed && (isAdmin || isOwner),
        canRequestCollaboration: !isClosed && (isAdmin || isItSupport) && !isOwner && !isCollaborator && !!ticket.primary_assignee_id,
        canApproveCollaboration: !isClosed && (isAdmin || isOwner),
        canPostNote: isAdmin || isOwner || isCollaborator || isRequester,
        canUploadAttachment: isAdmin || isOwner || isCollaborator || isRequester,
        canViewHistory: isAdmin || isOwner || isCollaborator || isItSupport,
        canReopen: isClosed && (isAdmin || isOwner || isRequester)
    };
}
