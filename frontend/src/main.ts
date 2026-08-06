import './style.css';

import { cleanupServiceWorkers } from './bootstrap/serviceWorkerCleanup';
import { BackgroundRenderer } from './components/background/BackgroundRenderer';
import { SplashManager } from './components/common/SplashManager';
import { ThemeManager } from './components/common/theme/ThemeManager';
import { ModalsManager } from './components/modals/ModalsManager';
import { AdminLayout } from './layouts/AdminLayout';
import { ClientLayout } from './layouts/ClientLayout';
import { LayoutManager } from './layouts/LayoutManager';
import { LoginLayout } from './layouts/LoginLayout';
import { SupportLayout } from './layouts/SupportLayout';
import { ArticlesPage } from './pages/Articles';
import { CreateTicketPage } from './pages/CreateTicket';
import { LoginPage } from './pages/Login';
import { Router } from './router/router';
import { store } from './state/store';

class App {
    public static init(): void {
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize foundational modules
            cleanupServiceWorkers();
            ThemeManager.initialize();
            BackgroundRenderer.init();
            
            // Ensure splash is visible
            SplashManager.show();

            // Setup Layouts
            const legacyLogin = document.getElementById('login-screen');
            if (legacyLogin) {
                LayoutManager.login = new LoginLayout();
                legacyLogin.replaceWith(LayoutManager.login.getElement());
            }

            const legacyClient = document.getElementById('client-screen');
            if (legacyClient) {
                LayoutManager.client = new ClientLayout();
                legacyClient.replaceWith(LayoutManager.client.getElement());
            }

            const legacyAdmin = document.getElementById('admin-screen');
            if (legacyAdmin) {
                LayoutManager.admin = new AdminLayout();
                legacyAdmin.replaceWith(LayoutManager.admin.getElement());
            }

            const legacySupport = document.getElementById('support-screen');
            if (legacySupport) {
                LayoutManager.support = new SupportLayout();
                legacySupport.replaceWith(LayoutManager.support.getElement());
            }

            ModalsManager.initializeModals();



            LoginPage.init();
            CreateTicketPage.init();
            ArticlesPage.init();

            const session = store.loadSession();
            const rememberedToken = store.getRememberedToken();
            const tokenToValidate = session ? session.token : rememberedToken;
            const isRemembered = !session && !!rememberedToken;

            if (tokenToValidate) {
                import('./services/api').then(({ authAPI }) => {
                    authAPI
                        .validate(tokenToValidate)
                        .then(res => {
                            SplashManager.hide();
                            if (res.success) {
                                store.setSession(res.user, isRemembered);
                                Router.enterPortal();
                            } else {
                                store.setSession(null);
                                Router.showScreen('login-screen');
                            }
                        })
                        .catch(() => {
                            SplashManager.hide();
                            store.setSession(null);
                            Router.showScreen('login-screen');
                        });
                });
            } else {
                SplashManager.hide();
                Router.showScreen('login-screen');
            }
        });
    }
}

App.init();
