export interface ElementOptions {
    className?: string;
    id?: string;
    textContent?: string;
    innerHTML?: string;
    attributes?: Record<string, string>;
    dataset?: Record<string, string>;
    children?: (HTMLElement | string)[];
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options: ElementOptions = {}
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (options.className) el.className = options.className;
    if (options.id) el.id = options.id;
    if (options.textContent) el.textContent = options.textContent;
    
    // Use cautiously. Preferred to use children or textContent
    if (options.innerHTML) el.innerHTML = options.innerHTML;

    if (options.attributes) {
        for (const [key, val] of Object.entries(options.attributes)) {
            el.setAttribute(key, val);
        }
    }
    if (options.dataset) {
        for (const [key, val] of Object.entries(options.dataset)) {
            el.dataset[key] = val;
        }
    }
    if (options.children) {
        options.children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else {
                el.appendChild(child);
            }
        });
    }
    return el;
}
