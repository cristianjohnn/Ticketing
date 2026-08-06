import { Ticket } from '../types';

function getAssignees(ticket: Ticket): string[] {
    if (!ticket.assignee || ticket.assignee === 'Unassigned') return [];
    return ticket.assignee
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);
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

export function formatRelativeTime(isoString?: string): string {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
        if (diffHour < 24) return `${diffHour} hr${diffHour > 1 ? 's' : ''} ago`;
        if (diffDay === 1) return 'Yesterday';
        if (diffDay < 7) return `${diffDay} days ago`;

        return formatDate(isoString);
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
        case 'Open':
            return 'badge-open';
        case 'In Progress':
            return 'badge-progress';
        case 'Resolved':
            return 'badge-resolved';
        case 'Closed':
            return 'badge-closed';
        default:
            return 'badge-default';
    }
}

export function getPriorityBadgeClass(priority: string): string {
    switch (priority) {
        case 'Low':
            return 'badge-low';
        case 'Medium':
            return 'badge-medium';
        case 'High':
            return 'badge-high';
        case 'Critical':
            return 'badge-critical';
        default:
            return 'badge-default';
    }
}

export function getSeverityBadgeClass(severity: string): string {
    switch (severity) {
        case 'Low':
            return 'badge-severity-low';
        case 'Moderate':
            return 'badge-severity-moderate';
        case 'High':
            return 'badge-severity-high';
        case 'Severe':
            return 'badge-severity-severe';
        default:
            return 'badge-default';
    }
}

export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number = 300,
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function isResolved(ticket: Ticket): boolean {
    return ticket.status === 'Resolved' || ticket.status === 'Closed';
}

export function getSeverityColor(severity: string): string {
    if (severity === 'Severe') return 'var(--badge-danger-text)';
    if (severity === 'High') return 'var(--badge-warning-text)';
    if (severity === 'Moderate') return 'var(--badge-warning-text)';
    return 'var(--badge-success-text)';
}
