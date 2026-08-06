# Queue Infrastructure (Placeholder)

This directory serves as the architectural foundation for integrating **BullMQ** or a similar background job processing system in Phase 6.2.

## Naming Conventions
- **Providers**: `*Provider.ts` (e.g., `BullMQProvider.ts`)
- **Jobs**: `*Job.ts` (e.g., `EmailJob.ts`, `ReportExportJob.ts`)
- **Workers**: `*Worker.ts` (e.g., `NotificationWorker.ts`)

## Retry Policy
When implemented, background jobs should follow an exponential backoff retry strategy.
- Short retry: 3 attempts with a 5s delay.
- Long retry: 5 attempts with a 1m backoff for external APIs (like SendGrid).

## Priority Levels
- **Critical (1)**: Password resets, urgent ticket escalations.
- **High (2)**: Email notifications for SLA breaches.
- **Normal (5)**: Standard ticket updates.
- **Low (10)**: Analytics aggregations, report generations, database cleanups.

## Future BullMQ Integration
The `CacheService` RedisProvider instance should be passed to the QueueProvider to reuse the existing connection pool and minimize infrastructure overhead.
