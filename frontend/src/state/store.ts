import { Ticket, Article, Stats, UserSession } from '../types';

const SESSION_KEY = 'itsupport_session';

export interface AppState {
    currentUser: UserSession | null;
    tickets: Ticket[];
    articles: Article[];
    stats: Stats | null;
    activeFilter: string;
    activePriority: string;
    activeSeverity: string;
    activeDepartment: string;
    searchQuery: string;
    currentView: string; // 'dashboard' | 'tickets' | 'kb' | 'stats' | 'admin'
}

class Store {
    private state: AppState = {
        currentUser: null,
        tickets: [],
        articles: [],
        stats: null,
        activeFilter: 'all',
        activePriority: 'all',
        activeSeverity: 'all',
        activeDepartment: 'all',
        searchQuery: '',
        currentView: 'dashboard',
    };

    private listeners: (() => void)[] = [];

    constructor() {
        this.loadSession();
    }

    public getState(): AppState {
        return this.state;
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(): void {
        this.listeners.forEach(l => l());
    }

    public loadSession(): UserSession | null {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (raw) {
                this.state.currentUser = JSON.parse(raw);
            }
        } catch {
            this.state.currentUser = null;
        }
        return this.state.currentUser;
    }

    public setSession(session: UserSession | null): void {
        this.state.currentUser = session;
        if (session) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
        this.notify();
    }

    public setTickets(tickets: Ticket[]): void {
        this.state.tickets = tickets;
        this.notify();
    }

    public setArticles(articles: Article[]): void {
        this.state.articles = articles;
        this.notify();
    }

    public setStats(stats: Stats): void {
        this.state.stats = stats;
        this.notify();
    }

    public setFilter(status: string): void {
        this.state.activeFilter = status;
        this.notify();
    }

    public setDepartment(dept: string): void {
        this.state.activeDepartment = dept;
        this.notify();
    }

    public setSearch(query: string): void {
        this.state.searchQuery = query;
        this.notify();
    }

    public setView(view: string): void {
        this.state.currentView = view;
        this.notify();
    }
}

export const store = new Store();
