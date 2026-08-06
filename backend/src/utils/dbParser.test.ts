import { parseQuery } from './dbParser';

// Simple assert helper since we don't have a test runner installed
function assertEqual(actual: any, expected: any, message: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Assertion failed: ${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
}

function runTests() {
    console.log('Running dbParser regression tests...\n');
    let passed = 0;
    let failed = 0;

    const tests = [
        {
            name: 'Normal named parameter replacement',
            sql: 'SELECT * FROM users WHERE id = @id',
            params: { id: 123 },
            expectedText: 'SELECT * FROM users WHERE id = $1',
            expectedValues: [123]
        },
        {
            name: 'Multiple parameters',
            sql: 'UPDATE users SET name = @name, age = @age WHERE id = @id',
            params: { id: 1, name: 'Alice', age: 30 },
            expectedText: 'UPDATE users SET name = $1, age = $2 WHERE id = $3',
            expectedValues: ['Alice', 30, 1]
        },
        {
            name: 'Repeated parameters',
            sql: 'SELECT * FROM tickets WHERE requester = @user OR assignee = @user',
            params: { user: 'bob' },
            expectedText: 'SELECT * FROM tickets WHERE requester = $1 OR assignee = $2',
            expectedValues: ['bob', 'bob']
        },
        {
            name: '@ inside single-quoted strings',
            sql: "UPDATE users SET bio = 'hello @admin' WHERE id = @id",
            params: { id: 5 },
            expectedText: "UPDATE users SET bio = 'hello @admin' WHERE id = $1",
            expectedValues: [5]
        },
        {
            name: '@ inside single-quoted strings (no parameters at all)',
            sql: "SELECT '@admin'",
            params: { admin: 'test' },
            expectedText: "SELECT '@admin'",
            expectedValues: []
        },
        {
            name: '@ inside double-quoted identifiers',
            sql: 'SELECT "@col" FROM table WHERE id = @id',
            params: { id: 10 },
            expectedText: 'SELECT "@col" FROM table WHERE id = $1',
            expectedValues: [10]
        },
        {
            name: 'Queries using PostgreSQL operators that include @',
            sql: "SELECT * FROM tags WHERE data @> ARRAY['admin'] AND id = @id",
            params: { id: 7 },
            expectedText: "SELECT * FROM tags WHERE data @> ARRAY['admin'] AND id = $1",
            expectedValues: [7]
        },
        {
            name: 'Queries with no parameters',
            sql: 'SELECT * FROM users',
            params: undefined,
            expectedText: 'SELECT * FROM users',
            expectedValues: []
        },
        {
            name: 'Invalid or missing named parameters (should push undefined)',
            sql: 'SELECT * FROM users WHERE id = @missing',
            params: { other: 1 },
            expectedText: 'SELECT * FROM users WHERE id = $1',
            expectedValues: [undefined]
        },
        {
            name: 'Legacy ? placeholder (array support)',
            sql: 'SELECT * FROM users WHERE id = ? AND status = ?',
            params: [123, 'Open'],
            expectedText: 'SELECT * FROM users WHERE id = $1 AND status = $2',
            expectedValues: [123, 'Open']
        },
        {
            name: 'Single quote escaping inside string literals',
            sql: "SELECT 'Don''t reply @admin' WHERE id = @id",
            params: { id: 99 },
            expectedText: "SELECT 'Don''t reply @admin' WHERE id = $1",
            expectedValues: [99]
        },
        {
            name: 'KNOWN LIMITATION: @ inside dollar-quoted strings is processed incorrectly',
            sql: 'SELECT $$hello @admin$$ WHERE id = @id',
            params: { id: 1, admin: 'foo' },
            // Documents that the parser currently replaces @admin inside dollar quotes
            expectedText: 'SELECT $$hello $1$$ WHERE id = $2',
            expectedValues: ['foo', 1]
        },
        {
            name: 'KNOWN LIMITATION: @ inside SQL comments is processed incorrectly',
            sql: 'SELECT * FROM users WHERE id = @id -- contact @admin',
            params: { id: 1, admin: 'foo' },
            // Documents that the parser currently replaces @admin inside comments
            expectedText: 'SELECT * FROM users WHERE id = $1 -- contact $2',
            expectedValues: [1, 'foo']
        }
    ];

    for (const test of tests) {
        try {
            const result = parseQuery(test.sql, test.params);
            assertEqual(result.text, test.expectedText, `Text mismatch in '${test.name}'`);
            assertEqual(result.values, test.expectedValues, `Values mismatch in '${test.name}'`);
            console.log(`✅ Passed: ${test.name}`);
            passed++;
        } catch (err: any) {
            console.error(`❌ Failed: ${test.name}`);
            console.error(err.message);
            failed++;
        }
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
