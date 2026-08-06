import { UserSession } from '../types';

const SESSION_KEY = 'itsupport_session';
const REMEMBER_TOKEN_KEY = 'itsupport_remembered_token';

interface AppState {
    currentUser: UserSession | null;
    currentView: string;
}

class Store {
    private state: AppState = {
        currentUser: null,
        currentView: 'dashboard',
    };

    private viewListeners: Array<(view: string) => void> = [];
    private sessionListeners: Array<() => void> = [];

    constructor() {
        this.loadSession();
    }

    public getState(): AppState {
        return this.state;
    }

    public subscribeToView(listener: (view: string) => void): () => void {
        this.viewListeners.push(listener);
        return () => {
            this.viewListeners = this.viewListeners.filter(l => l !== listener);
        };
    }

    public subscribeToSession(listener: () => void): () => void {
        this.sessionListeners.push(listener);
        return () => {
            this.sessionListeners = this.sessionListeners.filter(l => l !== listener);
        };
    }

    public loadSession(): UserSession | null {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (raw) {
                this.state.currentUser = JSON.parse(raw);
            } else {
                this.state.currentUser = null;
            }
        } catch {
            this.state.currentUser = null;
        }
        return this.state.currentUser;
    }

    public getRememberedToken(): string | null {
        try {
            return localStorage.getItem(REMEMBER_TOKEN_KEY);
        } catch {
            return null;
        }
    }

    public setSession(session: UserSession | null, rememberMe = false): void {
        this.state.currentUser = session;
        if (session) {
            const raw = JSON.stringify(session);
            sessionStorage.setItem(SESSION_KEY, raw);
            if (rememberMe) {
                localStorage.setItem(REMEMBER_TOKEN_KEY, session.token);
            }
        } else {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(REMEMBER_TOKEN_KEY);
            localStorage.removeItem(SESSION_KEY);
        }
        this.sessionListeners.forEach(l => l());
    }

    public setView(view: string, options?: { force?: boolean }): void {
        const unchanged = this.state.currentView === view;
        this.state.currentView = view;
        if (!unchanged || options?.force) {
            this.viewListeners.forEach(l => l(view));
        }
    }
}

export const store = new Store();
