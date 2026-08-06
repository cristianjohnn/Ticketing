import { supportSidebarConfig } from '../components/navigation/configs/supportSidebarConfig';
import { BaseLayout } from './BaseLayout';

export class SupportLayout extends BaseLayout {
    constructor() {
        super({
            screenId: 'support-screen',
            sidebarConfig: supportSidebarConfig,
            portal: 'support',
            defaultTitle: 'Support Dashboard',
            titleId: 'support-page-title',
            toggleId: 'support-sidebar-toggle',
            sidebarOverlayId: 'support-sidebar-overlay',
            contentId: 'support-content'
        });
    }
}
