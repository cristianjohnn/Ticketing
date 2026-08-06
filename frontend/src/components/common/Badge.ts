import { BadgeViewModel } from '../../viewmodels/NotificationCardViewModel';

export class Badge {
    public static render(badge: BadgeViewModel): string {
        const valueClass = badge.value.toLowerCase().replace(/_/g, '-');
        return `<span class="badge badge-${badge.type} badge-${valueClass}">${badge.text}</span>`;
    }

    public static renderMultiple(badges: BadgeViewModel[]): string {
        return badges.map(b => this.render(b)).join('');
    }
}
