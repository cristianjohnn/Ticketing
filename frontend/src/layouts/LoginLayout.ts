import { BackgroundRenderer } from '../components/background/BackgroundRenderer';
import { ShieldIcon } from '../components/common/Icons';
import { ThemeToggle } from '../components/common/theme/ThemeToggle';

export class LoginLayout {
    private element: HTMLDivElement;
    private contentContainer: HTMLDivElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.id = 'login-screen';
        this.element.className = 'screen';

        const themeToggle = new ThemeToggle(true);
        this.element.appendChild(themeToggle.getElement());

        BackgroundRenderer.init();

        const layoutWrapper = document.createElement('div');
        layoutWrapper.className = 'login-split-layout';

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'login-content-wrapper';

        // --- Left Panel: Platform Information ---
        const leftPanel = document.createElement('div');
        leftPanel.className = 'login-left-panel';
        leftPanel.innerHTML = `
            <div class="platform-info-content">
                <div class="brand-header animate-slide-fade delay-1">
                    <div class="logo-icon-small">
                        ${ShieldIcon({ size: 32 })}
                    </div>
                    <div class="brand-titles">
                        <h2>Ticketing System</h2>
                        <p>Enterprise IT Service Platform</p>
                    </div>
                </div>

                <div class="brand-footer animate-fade-in delay-2">
                    "Delivering reliable IT support through<br>real-time collaboration."
                </div>

                <div class="system-status-list animate-slide-fade delay-3">
                    <div class="status-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                        <span>API Online</span>
                    </div>
                    <div class="status-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                        <span>Database Connected</span>
                    </div>
                    <div class="status-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                        <span>Notification Service Active</span>
                    </div>
                </div>

                <div class="system-meta animate-fade-in delay-4">
                    <div class="meta-row"><span>Version</span> <strong>1.0.0</strong></div>
                    <div class="meta-row"><span>Build</span> <strong>2026.07.31</strong></div>
                    <div class="meta-row"><span>Environment</span> <strong>Production</strong></div>
                </div>
            </div>
        `;

        // --- Right Panel: Authentication ---
        const rightPanel = document.createElement('div');
        rightPanel.className = 'login-right-panel animate-slide-in';

        const card = document.createElement('div');
        card.className = 'login-auth-card';

        const formHeader = document.createElement('div');
        formHeader.className = 'auth-header animate-fade-in delay-5';
        formHeader.innerHTML = `
            <div class="auth-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                SECURE ACCESS
            </div>
            <h1 id="auth-title">Sign in to your account</h1>
            <p class="login-subtitle">Enter your credentials to access the system</p>
        `;

        card.appendChild(formHeader);

        const form = document.createElement('form');
        form.id = 'login-form';
        form.className = 'login-form';
        form.innerHTML = `
            <!-- Full Name (Register Only) -->
            <div class="form-group animate-stagger" id="fullName-group" style="display:none">
                <label for="login-fullname">FULL NAME</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input type="text" id="login-fullname" placeholder="Enter your full name">
                </div>
            </div>

            <!-- Username (Both) -->
            <div class="form-group animate-stagger">
                <label for="login-username">USERNAME</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input type="text" id="login-username" placeholder="Enter username" required>
                </div>
            </div>

            <!-- Email (Register Only) -->
            <div class="form-group animate-stagger" id="email-group" style="display:none">
                <label for="login-email">EMAIL</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                    </svg>
                    <input type="email" id="login-email" placeholder="Enter your email">
                </div>
            </div>

            <!-- Password (Both) -->
            <div class="form-group animate-stagger" id="password-group">
                <label for="login-password">PASSWORD</label>
                <div class="input-wrapper" style="position:relative">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input type="password" id="login-password" placeholder="Enter password" required>
                    <button type="button" class="password-toggle-btn" id="login-password-toggle">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
                <div id="password-requirements" style="display:none; margin-top:8px; font-size:12px; overflow:hidden; max-height:0; transition: max-height var(--duration-normal) var(--ease-standard), opacity var(--duration-normal) var(--ease-standard); opacity:0;">
                    <div class="pw-req" data-req="length" style="display:flex;align-items:center;gap:6px;padding:2px 0;color:var(--color-text-muted);transition:color var(--duration-fast) var(--ease-standard)">
                        <svg class="pw-req-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5" opacity="0" class="pw-check-path"/></svg>
                        <span>Minimum 8 characters</span>
                    </div>
                    <div class="pw-req" data-req="uppercase" style="display:flex;align-items:center;gap:6px;padding:2px 0;color:var(--color-text-muted);transition:color var(--duration-fast) var(--ease-standard)">
                        <svg class="pw-req-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5" opacity="0" class="pw-check-path"/></svg>
                        <span>Uppercase letter</span>
                    </div>
                    <div class="pw-req" data-req="lowercase" style="display:flex;align-items:center;gap:6px;padding:2px 0;color:var(--color-text-muted);transition:color var(--duration-fast) var(--ease-standard)">
                        <svg class="pw-req-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5" opacity="0" class="pw-check-path"/></svg>
                        <span>Lowercase letter</span>
                    </div>
                    <div class="pw-req" data-req="number" style="display:flex;align-items:center;gap:6px;padding:2px 0;color:var(--color-text-muted);transition:color var(--duration-fast) var(--ease-standard)">
                        <svg class="pw-req-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5" opacity="0" class="pw-check-path"/></svg>
                        <span>Number</span>
                    </div>
                    <div class="pw-req" data-req="special" style="display:flex;align-items:center;gap:6px;padding:2px 0;color:var(--color-text-muted);transition:color var(--duration-fast) var(--ease-standard)">
                        <svg class="pw-req-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5" opacity="0" class="pw-check-path"/></svg>
                        <span>Special character</span>
                    </div>
                </div>
            </div>

            <!-- Confirm Password (Register Only) -->
            <div class="form-group animate-stagger" id="confirm-password-group" style="display:none">
                <label for="login-confirm-password">CONFIRM PASSWORD</label>
                <div class="input-wrapper">
                    <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input type="password" id="login-confirm-password" placeholder="Confirm password">
                </div>
            </div>

            <!-- Remember Me (Sign In Only) -->
            <div class="checkbox-group animate-stagger" id="remember-me-group">
                <input type="checkbox" id="login-remember" class="custom-checkbox">
                <label for="login-remember">Remember me</label>
            </div>

            <button type="submit" class="btn btn-primary btn-login animate-stagger" id="login-btn">
                <span id="login-btn-text">Sign In</span>
                <svg class="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                </svg>
            </button>
            
            <div class="auth-toggle-container animate-stagger" style="text-align:center; margin-top:20px; font-size:14px; color:var(--color-text-secondary)">
                <span id="auth-toggle-message">Don't have an account?</span>
                <a href="#" id="toggle-auth-mode" style="color:var(--color-primary); text-decoration:none; font-weight:600; margin-left:4px;">Register</a>
            </div>

            <div id="forgot-password-container" class="animate-stagger" style="text-align:center; margin-top:12px;">
                <a href="#" id="forgot-password-link" style="color:var(--color-text-muted); text-decoration:none; font-size:13px;">Forgot Password?</a>
                <div id="forgot-password-message" style="display:none; margin-top:8px; padding:10px; background:var(--color-primary-bg-subtle); border:1px solid var(--color-border); border-radius:6px; font-size:12px; color:var(--color-text-secondary);">
                    This is an internal system. Please contact your <strong>System Administrator</strong> to reset your password.
                </div>
            </div>
        `;

        card.appendChild(form);
        rightPanel.appendChild(card);
        
        contentWrapper.appendChild(leftPanel);
        contentWrapper.appendChild(rightPanel);
        layoutWrapper.appendChild(contentWrapper);
        this.element.appendChild(layoutWrapper);

        this.contentContainer = card;
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public appendContent(content: HTMLElement): void {
        this.contentContainer.appendChild(content);
    }
}
