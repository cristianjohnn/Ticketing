import { Ticket } from '../types';

export const DEPARTMENTS = [
    'Executive', 'Marketing', 'I-Wallet', 'Admin', 'I-Tech',
    'Joint Ventures', 'IT', 'Customer Care', 'Secretary',
    'Real Estate', 'Corporate'
];

export const AGENTS = ['Sean Khayle', 'CJ', 'Jeremiah', 'Clarence'];

export function getAssignees(ticket: Ticket): string[] {
    if (!ticket.assignee || ticket.assignee === 'Unassigned') return [];
    return ticket.assignee.split(',').map(a => a.trim()).filter(Boolean);
}

export function formatAssignees(ticket: Ticket): string {
    const list = getAssignees(ticket);
    return list.length > 0 ? list.join(', ') : 'Unassigned';
}

export function formatDate(isoString?: string): string {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return isoString;
    }
}

export function escapeHTML(str: string): string {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function getStatusBadgeClass(status: string): string {
    switch (status) {
        case 'Open': return 'badge-open';
        case 'In Progress': return 'badge-progress';
        case 'Resolved': return 'badge-resolved';
        case 'Closed': return 'badge-closed';
        default: return 'badge-default';
    }
}

export function getPriorityBadgeClass(priority: string): string {
    switch (priority) {
        case 'Low': return 'badge-low';
        case 'Medium': return 'badge-medium';
        case 'High': return 'badge-high';
        case 'Critical': return 'badge-critical';
        default: return 'badge-default';
    }
}

export function getSeverityBadgeClass(severity: string): string {
    switch (severity) {
        case 'Low': return 'badge-severity-low';
        case 'Moderate': return 'badge-severity-moderate';
        case 'High': return 'badge-severity-high';
        case 'Severe': return 'badge-severity-severe';
        default: return 'badge-default';
    }
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number = 300): (...args: Parameters<T>) => void {
    let timer: any;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
