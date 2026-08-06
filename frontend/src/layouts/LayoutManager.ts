import { AdminLayout } from './AdminLayout';
import { ClientLayout } from './ClientLayout';
import { LoginLayout } from './LoginLayout';
import { SupportLayout } from './SupportLayout';

export class LayoutManager {
    public static login?: LoginLayout;
    public static client?: ClientLayout;
    public static admin?: AdminLayout;
    public static support?: SupportLayout;
}
