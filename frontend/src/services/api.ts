import { Ticket, Article, Stats, Note, Attachment } from '../types';

const API_BASE = '/api/v1';

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
    });
    if (!res.ok) {
        let errorMsg = 'An error occurred';
        try {
            const err = await res.json();
            errorMsg = err.error || err.message || errorMsg;
        } catch { }
        throw new Error(errorMsg);
    }
    return res.json();
}

export const ticketsAPI = {
    getAll: (params: Record<string, string> = {}): Promise<Ticket[]> => {
        const query = new URLSearchParams(params).toString();
        return api<Ticket[]>(`/tickets${query ? '?' + query : ''}`);
    },
    getById: (id: string): Promise<Ticket> => api<Ticket>(`/tickets/${id}`),
    create: (ticket: Partial<Ticket>): Promise<Ticket> =>
        api<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(ticket) }),
    update: (id: string, updates: Partial<Ticket>): Promise<Ticket> =>
        api<Ticket>(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    delete: (id: string): Promise<{ success: boolean; id: string }> =>
        api<{ success: boolean; id: string }>(`/tickets/${id}`, { method: 'DELETE' }),
    addNote: (id: string, text: string, author: string): Promise<Note> =>
        api<Note>(`/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify({ text, author }) }),
    uploadAttachment: async (id: string, file: File): Promise<Attachment> => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/tickets/${id}/attachments`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
    },
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
        api<{ success: boolean }>('/articles/reorder', { method: 'PUT', body: JSON.stringify({ order }) }),
};

export const statsAPI = {
    get: (): Promise<Stats> => api<Stats>('/stats'),
};

export const authAPI = {
    login: (role: string, password?: string): Promise<{ success: boolean; message: string }> =>
        api<{ success: boolean; message: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ role, password }),
        }),
};
