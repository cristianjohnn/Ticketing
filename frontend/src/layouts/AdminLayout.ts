import { adminSidebarConfig } from '../components/navigation/configs/adminSidebarConfig';
import { BaseLayout } from './BaseLayout';

export class AdminLayout extends BaseLayout {
    constructor() {
        super({
            screenId: 'admin-screen',
            sidebarConfig: adminSidebarConfig,
            portal: 'admin',
            defaultTitle: 'Dashboard',
            titleId: 'admin-page-title',
            toggleId: 'admin-sidebar-toggle',
            sidebarOverlayId: 'admin-sidebar-overlay',
            contentId: 'admin-content'
        });
    }
}
