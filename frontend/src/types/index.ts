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
    collaborators?: TicketCollaborator[];
}

export interface TicketHistory {
    id: string;
    ticket_id: string;
    actor_id: string;
    event_type: string;
    event_data: any;
    created_at: string;
}

export interface AppNotification {
    id: string;
    recipient_id: string;
    actor_id?: string;
    type: string;
    entity_type: string;
    entity_id: string;
    title: string;
    message: string;
    metadata?: any;
    read_at?: string;
    created_at: string;
    actor_name?: string;
    actor_full_name?: string;
    ticket_title?: string;
    ticket_status?: string;
    ticket_priority?: string;
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
    id: string;
    username: string;
    fullName: string;
    email: string;
    role: string;
    token: string;
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

export interface ExecutiveKPIs {
    total_tickets: number;
    open_tickets: number;
    pending_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    total_reopens: number;
    avg_resolution_time_seconds: number | null;
    avg_response_time_seconds: number | null;
    overall_csat: number | null;
    total_ratings: number;
    eligible_surveys: number;
    prev_total_tickets?: number;
    prev_open_tickets?: number;
    prev_resolved_tickets?: number;
    prev_avg_resolution_time_seconds?: number | null;
}

export interface TicketTrend {
    date: string;
    created: number;
    resolved: number;
}

export interface Breakdown {
    byCategory: { category: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    byStatus: { status: string; count: number }[];
    byAging?: { age_group: string; count: number }[];
}

export interface SidebarStats {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    severe_tickets: number;
    resolved_tickets: number;
    avg_csat: number | null;
}

export interface LeaderboardEntry {
    tech_id: string;
    tech_name: string;
    tickets_resolved: number;
    avg_csat: number;
    total_ratings: number;
    avg_resolution_time_seconds: number;
    total_reopens: number;
}


export interface RecentFeedback {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    ticket_title: string;
    ticket_id: string;
}

export interface TechStat {
    tech_id: string;
    tech_name: string;
    tickets_resolved: number;
    avg_csat: number | null;
    total_ratings: number;
    avg_resolution_time_seconds: number | null;
    total_reopens: number;
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

export interface CreateUserRequest {
    username: string;
    fullName: string;
    email: string;
    role: string;
    password?: string;
}

export interface UpdateUserRequest {
    username?: string;
    fullName?: string;
    email?: string;
    role?: string;
    active?: boolean;
    password?: string;
}

export interface TicketCollaborationRequest {
    id: string;
    ticket_id: string;
    requester_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    approver_id: string | null;
    responded_at: string | null;
    rejection_reason: string | null;
    cancelled_at: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
    username?: string;
    requesterName?: string;
}

export interface NotificationQuery {
    cursor?: string;
    search?: string;
    filter?: string;
    sort?: string;
    limit?: number;
}

export * from './rating.types';

