const DEPARTMENTS = [
    'Executive',
    'Marketing',
    'I-Wallet',
    'Admin',
    'I-Tech',
    'Joint Ventures',
    'IT',
    'Customer Care',
    'Secretary',
    'Real Estate',
    'Corporate'
];

export class DepartmentService {
    /**
     * Fetch the list of active departments.
     * Currently returns a static list, but designed to be replaced by an API call
     * when administrator-managed departments are implemented.
     */
    static async getDepartments(): Promise<string[]> {
        // Simulate network delay to ensure consumers handle asynchronous loading
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([...DEPARTMENTS]);
            }, 0); // Fast for now, but enforces async usage
        });
    }

    /**
     * Synchronous getter for cases where data must be immediately available.
     * NOTE: Prefer `getDepartments` when possible to future-proof the application.
     */
    static getDepartmentsSync(): string[] {
        return [...DEPARTMENTS];
    }
}
