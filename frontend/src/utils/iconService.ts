import { createIcons, icons } from 'lucide';

export class IconService {
    /**
     * Replaces `<i data-lucide="..."></i>` with actual SVG icons.
     * Call this after inserting HTML that contains Lucide icons.
     */
    public static renderIcons(root?: HTMLElement) {
        createIcons({
            icons,
            nameAttr: 'data-lucide',
            attrs: {
                class: 'lucide-icon',
                'stroke-width': '2'
            },
            ...(root ? { root } : {})
        });
    }
}
