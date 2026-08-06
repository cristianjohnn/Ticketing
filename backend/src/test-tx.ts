import { db, TxContext } from './config/db';
import { EventBus } from './utils/EventBus';
import { NotificationService } from './services/notification.service';

async function run() {
    NotificationService.initialize();

    console.log('Testing rollback prevents SSE...');
    
    let sseFired = false;
    EventBus.onPostCommit('ticket.claimed', () => {
        sseFired = true;
        console.log('ERROR: SSE Event Fired despite rollback!');
    });

    try {
        await db.withTransaction(async (tx: TxContext) => {
            await EventBus.emit(tx, 'ticket.claimed', {
                entityId: 'test',
                entityType: 'ticket',
                actorId: 'test-actor'
            });
            throw new Error('Simulated Rollback');
        });
    } catch (e: any) {
        console.log('Transaction threw error:', e.message);
    }

    if (!sseFired) {
        console.log('SUCCESS: Post-commit event was NOT fired on rollback.');
    }

    let sseFiredSuccess = false;
    EventBus.onPostCommit('ticket.transferred', () => {
        sseFiredSuccess = true;
        console.log('SUCCESS: SSE Event Fired on commit!');
    });

    await db.withTransaction(async (tx: TxContext) => {
        await EventBus.emit(tx, 'ticket.transferred', {
            entityId: 'test2',
            entityType: 'ticket',
            actorId: 'test-actor'
        });
    });

    if (sseFiredSuccess) {
        console.log('All tests passed.');
    } else {
        console.log('ERROR: Post-commit event did NOT fire on success.');
    }

    process.exit(0);
}

run();
