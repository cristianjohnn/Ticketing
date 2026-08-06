/**
 * Lightweight PostgreSQL parameter parser and query rewriter.
 * 
 * Supports replacing named parameters (e.g., @name) with positional parameters ($1, $2)
 * for use with the pg driver, without requiring a full query builder or ORM.
 * 
 * Features:
 * - Safely ignores string literals ('...') and double-quoted identifiers ("...") 
 *   so @ symbols within them are not mistakenly processed.
 * - Supports legacy array parameter inputs (using ? placeholders).
 * 
 * Limitations:
 * - Does not support dollar-quoted strings (e.g., $$ ... $$). Avoid using @ inside dollar quotes.
 * - Does not support @ inside SQL comments (-- or block comments). Avoid using @ in queries with comments.
 */
export function parseQuery(sql: string, params?: any): { text: string; values: any[] } {
    if (!params) {
        return { text: sql, values: [] };
    }
    
    if (Array.isArray(params)) {
        // Swap standard ? placeholders to $1, $2, etc.
        let index = 1;
        const text = sql.replace(/\?/g, () => `$${index++}`);
        return { text, values: params };
    }
    
    // Match string literals ('...'), identifiers ("..."), and parameters (@param)
    const regex = /('(?:[^']|'')*')|("(?:[^"]|"")*")|@([a-zA-Z0-9_]+)/g;
    let index = 1;
    const values: any[] = [];
    
    const text = sql.replace(regex, (m, singleQuote, doubleQuote, name) => {
        if (singleQuote || doubleQuote) {
            return m; // Leave string literals and identifiers unchanged
        }
        values.push(params[name]);
        return `$${index++}`;
    });
    
    return { text, values };
}
