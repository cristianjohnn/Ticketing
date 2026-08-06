import { store } from '../state/store';
import { AppNotification, Article, Attachment, CreateUserRequest, Note, Stats, Ticket, UpdateUserRequest, User, UserSession, ExecutiveKPIs, TicketTrend, Breakdown, LeaderboardEntry, SidebarStats, RecentFeedback } from '../types';
import { CONFIG } from '../utils/config';
import { ErrorCode } from '../utils/enums';

const API_BASE = CONFIG.API_BASE;

export class APIError extends Error {
    public code: string;
    public status: number;
    public data: unknown;

    constructor(message: string, status: number = 500, data: unknown = null, code: string = ErrorCode.UNKNOWN) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
        this.code = code;
    }
}

const inFlightRequests = new Map<string, Promise<any>>();

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const isGet = !opts.method || opts.method.toUpperCase() === 'GET';
    const requestKey = `${opts.method || 'GET'}:${path}`;

    if (isGet && inFlightRequests.has(requestKey)) {
        return inFlightRequests.get(requestKey);
    }

    const requestPromise = (async () => {
        const user = store.getState().currentUser;
        const token = user ? user.token : null;

        const headers = new Headers(opts.headers || {});

        if (!(opts.body instanceof FormData) && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        let res: Response;
        try {
            res = await fetch(`${API_BASE}${path}`, {
                ...opts,
                headers,
            });
        } catch (networkErr: unknown) {
            throw new APIError(`Network error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`, 0);
        }

        if (!res.ok) {
            let errorMsg = `HTTP Error ${res.status}`;
            let errorData = null;
            try {
                const err = await res.json();
                errorData = err;
                errorMsg = err.error || err.message || errorMsg;
            } catch {
                // Fallback for non-JSON errors
            }
            throw new APIError(errorMsg, res.status, errorData);
        }

        if (res.status === 204) {
            return {} as T;
        }

        try {
            return await res.json();
        } catch {
            return {} as T;
        }
    })();

    if (isGet) {
        inFlightRequests.set(requestKey, requestPromise);
        requestPromise.finally(() => {
            inFlightRequests.delete(requestKey);
        }).catch(() => { /* handled by caller */ });
    }

    return requestPromise;
}

export const ticketsAPI = {
    getAll: (params: Record<string, string> = {}): Promise<Ticket[]> => {
        const query = new URLSearchParams(params).toString();
        return api<Ticket[]>(`/tickets${query ? '?' + query : ''}`);
    },
    getRecent: (limit: number = 5): Promise<Ticket[]> => {
        return api<Ticket[]>(`/tickets/recent?limit=${limit}`);
    },
    getById: (id: string): Promise<Ticket> => api<Ticket>(`/tickets/${id}`),
    create: (ticket: Partial<Ticket>): Promise<Ticket> =>
        api<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
    update: (id: string, updates: Partial<Ticket> & { changedBy?: string }): Promise<Ticket> =>
        api<Ticket>(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string): Promise<{ success: boolean; id: string }> =>
        api<{ success: boolean; id: string }>(`/tickets/${id}`, { method: 'DELETE' }),
    addNote: (id: string, text: string, author: string): Promise<Note> =>
        api<Note>(`/tickets/${id}/notes`, {
            method: 'POST',
            body: JSON.stringify({ text, author }),
        }),
    uploadAttachment: (id: string, file: File): Promise<Attachment> => {
        const formData = new FormData();
        formData.append('file', file);
        return api<Attachment>(`/tickets/${id}/attachments`, {
            method: 'POST',
            body: formData,
        });
    },
    claim: (id: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/${id}/claim`, { method: 'POST' }),
    assign: (id: string, assigneeId: string, assigneeName: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/${id}/assign`, {
            method: 'POST',
            body: JSON.stringify({ assigneeId, assigneeName }),
        }),
    transfer: (id: string, payload: { targetUserId: string; reason: string; remainCollaborator: boolean }): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/${id}/transfer`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
    requestTransfer: (id: string, targetUserId: string, reason?: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/${id}/transfer-request`, {
            method: 'POST',
            body: JSON.stringify({ targetUserId, reason }),
        }),
    approveTransfer: (requestId: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/transfer-requests/${requestId}/approve`, { method: 'POST' }),
    rejectTransfer: (requestId: string, reason?: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/transfer-requests/${requestId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),
    cancelTransfer: (requestId: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/transfer-requests/${requestId}/cancel`, { method: 'POST' }),
    getPendingTransferRequests: (id: string): Promise<any[]> =>
        api<any[]>(`/tickets/${id}/transfer-requests/pending`),
    addCollaborator: (id: string, targetUserId: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/${id}/collaborators`, {
            method: 'POST',
            body: JSON.stringify({ targetUserId }),
        }),
    requestCollaboration: (id: string, targetUserId?: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/${id}/collaborators/request`, { 
            method: 'POST',
            body: targetUserId ? JSON.stringify({ targetUserId }) : undefined
        }),
    getPendingRequests: (id: string): Promise<any[]> =>
        api<any[]>(`/tickets/${id}/collaborators/requests/pending`),
    approveCollaboration: (requestId: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/requests/${requestId}/approve`, { method: 'POST' }),
    rejectCollaboration: (requestId: string, reason?: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/requests/${requestId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),
    reopen: (id: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>(`/tickets/${id}/reopen`, { method: 'POST' }),
    getHistory: (id: string): Promise<any[]> => api<any[]>(`/tickets/${id}/history`),
};

export const articlesAPI = {
    getAll: (search?: string): Promise<Article[]> => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return api<Article[]>(`/articles${query}`);
    },
    getById: (id: string): Promise<Article> => api<Article>(`/articles/${id}`),
    create: (article: Partial<Article>): Promise<Article> =>
        api<Article>('/articles', { method: 'POST', body: JSON.stringify(article) }),
    update: (id: string, updates: Partial<Article>): Promise<Article> =>
        api<Article>(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string): Promise<{ success: boolean; id: string }> =>
        api<{ success: boolean; id: string }>(`/articles/${id}`, { method: 'DELETE' }),
    reorder: (order: string[]): Promise<{ success: boolean }> =>
        api<{ success: boolean }>('/articles/reorder', {
            method: 'PUT',
            body: JSON.stringify({ order }),
        }),
};

export const statsAPI = {
    get: (): Promise<Stats> => api<Stats>('/stats'),
    
    getStats: (): Promise<Stats> => api<Stats>('/stats'),
    getExecutiveKPIs: (params: Record<string, string> = {}): Promise<ExecutiveKPIs> => {
        const query = new URLSearchParams(params).toString();
        const tzOffset = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return api<ExecutiveKPIs>(`/stats/executive${query ? '?' + query : ''}`, {
            headers: { 'X-Timezone-Offset': tzOffset }
        });
    },
    getTicketTrends: (params: Record<string, string> = {}): Promise<TicketTrend[]> => {
        const query = new URLSearchParams(params).toString();
        const tzOffset = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return api<TicketTrend[]>(`/stats/tickets/trends${query ? '?' + query : ''}`, {
            headers: { 'X-Timezone-Offset': tzOffset }
        });
    },
    getBreakdowns: (params: Record<string, string> = {}): Promise<Breakdown> => {
        const query = new URLSearchParams(params).toString();
        return api<Breakdown>(`/stats/tickets/breakdowns${query ? '?' + query : ''}`);
    },
    getLeaderboards: (params: Record<string, string> = {}): Promise<LeaderboardEntry[]> => {
        const query = new URLSearchParams(params).toString();
        return api<LeaderboardEntry[]>(`/stats/leaderboards${query ? '?' + query : ''}`);
    },
    getSidebarStats: async (filters: Record<string, string> = {}): Promise<SidebarStats> => {
        const query = new URLSearchParams(filters).toString();
        return api<SidebarStats>(`/stats/sidebar?${query}`);
    },
    getRecentFeedback: async (filters: Record<string, string> = {}): Promise<RecentFeedback[]> => {
        const query = new URLSearchParams(filters).toString();
        return api<RecentFeedback[]>(`/stats/recent-feedback?${query}`);
    }
};

export const usersAPI = {
    getAll: (search?: string): Promise<User[]> => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return api<User[]>(`/users${query}`);
    },
    getByRole: (role: string): Promise<User[]> =>
        api<User[]>(`/users?role=${encodeURIComponent(role)}`),
    create: (userData: CreateUserRequest): Promise<User> =>
        api<User>('/users', { method: 'POST', body: JSON.stringify(userData) }),
    update: (id: string, updates: UpdateUserRequest): Promise<User> =>
        api<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    deactivate: (id: string): Promise<{ success: boolean }> =>
        api<{ success: boolean }>(`/users/${id}/deactivate`, { method: 'PUT' }),
    resetPassword: (id: string, passwordPlain: string): Promise<{ success: boolean }> =>
        api<{ success: boolean }>(`/users/${id}/reset-password`, {
            method: 'PUT',
            body: JSON.stringify({ password: passwordPlain }),
        }),
    changePassword: (
        currentPassword: string,
        newPassword: string,
        confirmPassword: string,
    ): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>('/users/me/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
        }),
};

export const authAPI = {
    login: (
        username: string,
        password?: string,
    ): Promise<{ success: boolean; user: UserSession }> =>
        api<{ success: boolean; user: UserSession }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),
    register: (
        fullName: string,
        username: string,
        email: string,
        password?: string,
    ): Promise<{ success: boolean; user: UserSession }> =>
        api<{ success: boolean; user: UserSession }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ fullName, username, email, password }),
        }),
    validate: (token: string): Promise<{ success: boolean; user: UserSession }> =>
        api<{ success: boolean; user: UserSession }>('/auth/validate', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),
    logout: (token: string): Promise<{ success: boolean }> =>
        api<{ success: boolean }>('/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }),
};

export const notificationsAPI = {
    getUnread: (): Promise<AppNotification[]> => api<AppNotification[]>('/notifications/unread'),
    getAll: (params?: { cursor?: string, limit?: number, search?: string, filter?: string, sort?: string }): Promise<{ data: AppNotification[], counts: Record<string, number>, cursor: string | null }> => {
        const queryParams = new URLSearchParams();
        if (params?.cursor) queryParams.append('cursor', params.cursor);
        if (params?.limit) queryParams.append('limit', String(params.limit));
        if (params?.search) queryParams.append('search', params.search);
        if (params?.filter) queryParams.append('filter', params.filter);
        if (params?.sort) queryParams.append('sort', params.sort);
        const q = queryParams.toString();
        return api<{ data: AppNotification[], counts: Record<string, number>, cursor: string | null }>(`/notifications/all${q ? '?' + q : ''}`);
    },
    markAsRead: (id: string): Promise<AppNotification> => api<AppNotification>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllAsRead: (): Promise<{ success: boolean }> => api<{ success: boolean }>('/notifications/read-all', { method: 'PUT' }),
    markBulkAsRead: (ids: string[]): Promise<{ success: boolean, updatedIds: string[] }> => 
        api<{ success: boolean, updatedIds: string[] }>('/notifications/bulk/read', { 
            method: 'PUT',
            body: JSON.stringify({ ids })
        })
};
