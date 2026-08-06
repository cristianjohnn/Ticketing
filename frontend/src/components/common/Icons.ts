export interface IconProps {
    size?: number | string;
    className?: string;
    style?: string;
}

function buildSvg(paths: string, props: IconProps): string {
    const size = props.size || 24;
    const className = props.className ? ` class="${props.className}"` : '';
    const style = props.style ? ` style="${props.style}"` : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${className}${style}>${paths}</svg>`;
}

export const PaletteIcon = (props: IconProps = {}) => `<svg width="${props.size || 24}" height="${props.size || 24}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${props.className || ''}"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`;

export function ShieldIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />', props);
}

export function MoonIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />', props);
}

export function SunIcon(props: IconProps = {}): string {
    return buildSvg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>', props);
}

export function UserIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />', props);
}

export function UsersIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', props);
}

export function BarChartIcon(props: IconProps = {}): string {
    return buildSvg('<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>', props);
}

export function KeyIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>', props);
}

export function EyeIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', props);
}


export function DocumentIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', props);
}

export function BookIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>', props);
}

export function PlusIcon(props: IconProps = {}): string {
    return buildSvg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', props);
}

export function LogoutIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>', props);
}

export function DashboardIcon(props: IconProps = {}): string {
    return buildSvg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>', props);
}

export function ListIcon(props: IconProps = {}): string {
    return buildSvg('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', props);
}

export function StarIcon(props: IconProps = {}): string {
    return buildSvg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', props);
}

export function SendIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />', props);
}

export function EditIcon(props: IconProps = {}): string {
    return buildSvg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>', props);
}

export function MenuIcon(props: IconProps = {}): string {
    return buildSvg('<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>', props);
}

export function SearchIcon(props: IconProps = {}): string {
    return buildSvg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', props);
}

export function ChevronLeftIcon(props: IconProps = {}): string {
    return buildSvg('<path d="m15 18-6-6 6-6"/>', props);
}
