export interface Ticket {
    id: string;
    title: string;
    description: string;
    category: string;
    department: string;
    priority: string;
    severity: string;
    status: string;
    assignee: string;
    requester: string;
    rating: number | null;
    ratingComment: string | null;
    createdAt: string;
    updatedAt: string;
    dueAt?: string;
    notes?: Note[];
    attachments?: Attachment[];
    ratingRequested?: number;
    userId?: string;
    primary_assignee_id?: string | null;
    resolved_at?: string | null;
    resolving_assignee_id?: string | null;
    collaborators?: TicketCollaborator[];
}

export * from './rating.types';

export interface TicketHistory {
    id: string;
    ticket_id: string;
    actor_id: string;
    event_type: string;
    event_data: any;
    created_at: string;
}

export interface TicketCollaborator {
    ticket_id: string;
    user_id: string;
    role?: string;
    created_at?: string;
    username?: string;
    fullName?: string;
}

export interface Note {
    id: number;
    ticketId: string;
    text: string;
    author: string;
    time: string;
}

export interface Article {
    id: string;
    title: string;
    content: string;
    category: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    sortOrder?: number;
}

export interface Attachment {
    id: string;
    ticketId: string;
    filename: string;
    originalname: string;
    size: number;
    uploadedAt: string;
}

export interface UserSession {
    username: string;
    role: string;
}

export interface Stats {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    severe: number;
    critical: number;
    avgRating: string | null;
    rated: number;
}

export interface User {
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}
