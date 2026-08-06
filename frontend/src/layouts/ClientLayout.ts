import { clientSidebarConfig } from '../components/navigation/configs/clientSidebarConfig';
import { BaseLayout } from './BaseLayout';

export class ClientLayout extends BaseLayout {
    constructor() {
        super({
            screenId: 'client-screen',
            sidebarConfig: clientSidebarConfig,
            portal: 'client',
            defaultTitle: 'My Tickets',
            titleId: 'client-page-title',
            toggleId: 'client-sidebar-toggle',
            sidebarOverlayId: 'client-sidebar-overlay',
            contentId: 'client-content'
        });
    }
}
