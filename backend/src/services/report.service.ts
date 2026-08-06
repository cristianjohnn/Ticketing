import { format } from 'fast-csv';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { db } from '../config/db';
import { StatsFilterParams, StatsRepository } from '../repositories/stats.repository';

export class ReportService {
    public static async streamTicketsCSV(res: Response, filters: StatsFilterParams): Promise<void> {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="tickets_export.csv"');

        const csvStream = format({ headers: true });
        csvStream.pipe(res);

        try {
            // Build query based on filters
            const { clause, values } = StatsRepository.buildWhereClause(filters, 'tickets');
            
            const sql = `
                SELECT 
                    tickets.id as "Ticket ID",
                    tickets.title as "Title",
                    tickets.status as "Status",
                    tickets.priority as "Priority",
                    tickets.severity as "Severity",
                    tickets.category as "Category",
                    tickets.department as "Department",
                    u_requester.username as "Requester",
                    tickets.assignee as "Assignee",
                    tickets."createdAt" as "Created At",
                    tickets."updatedAt" as "Updated At",
                    tickets."dueAt" as "Due At",
                    ticket_ratings.rating as "CSAT Rating",
                    ticket_ratings.feedback as "CSAT Comment"
                FROM tickets
                LEFT JOIN users as u_requester ON tickets."userId" = u_requester.id
                LEFT JOIN ticket_ratings ON tickets.id = ticket_ratings.ticket_id
                ${clause}
                ORDER BY tickets."createdAt" DESC
            `;

            const cursor = await db.query(sql, values);
            
            for (const row of cursor.rows) {
                csvStream.write(row);
            }
            csvStream.end();

        } catch (error) {
            console.error('[ReportService] Export error:', error);
            csvStream.write({ Error: 'Failed to generate report' });
            csvStream.end();
        }
    }

    public static async streamTicketsXLSX(res: Response, filters: StatsFilterParams): Promise<void> {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="tickets_export.xlsx"');

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
        const sheet = workbook.addWorksheet('Tickets');

        // Add Metadata Header
        const filtersList = Object.entries(filters)
            .filter(([k, v]) => v && k !== 'timezoneOffset')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ') || 'None';
            
        sheet.addRow(['Report Name', 'Tickets Export']);
        sheet.addRow(['Generated At', new Date().toISOString()]);
        sheet.addRow(['Filters Applied', filtersList]);
        sheet.addRow([]); // empty row

        // Setup Columns
        sheet.columns = [
            { header: 'Ticket ID', key: 'Ticket ID', width: 15 },
            { header: 'Title', key: 'Title', width: 30 },
            { header: 'Status', key: 'Status', width: 15 },
            { header: 'Priority', key: 'Priority', width: 15 },
            { header: 'Severity', key: 'Severity', width: 15 },
            { header: 'Category', key: 'Category', width: 15 },
            { header: 'Department', key: 'Department', width: 20 },
            { header: 'Requester', key: 'Requester', width: 20 },
            { header: 'Assignee', key: 'Assignee', width: 20 },
            { header: 'Created At', key: 'Created At', width: 20 },
            { header: 'Updated At', key: 'Updated At', width: 20 },
            { header: 'Due At', key: 'Due At', width: 20 },
            { header: 'CSAT Rating', key: 'CSAT Rating', width: 15 },
            { header: 'CSAT Comment', key: 'CSAT Comment', width: 40 }
        ];

        // Format header row
        const headerRow = sheet.getRow(5);
        headerRow.font = { bold: true };
        headerRow.commit();

        try {
            const { clause, values } = StatsRepository.buildWhereClause(filters, 'tickets');
            
            const sql = `
                SELECT 
                    tickets.id as "Ticket ID",
                    tickets.title as "Title",
                    tickets.status as "Status",
                    tickets.priority as "Priority",
                    tickets.severity as "Severity",
                    tickets.category as "Category",
                    tickets.department as "Department",
                    u_requester.username as "Requester",
                    tickets.assignee as "Assignee",
                    tickets."createdAt" as "Created At",
                    tickets."updatedAt" as "Updated At",
                    tickets."dueAt" as "Due At",
                    ticket_ratings.rating as "CSAT Rating",
                    ticket_ratings.feedback as "CSAT Comment"
                FROM tickets
                LEFT JOIN users as u_requester ON tickets."userId" = u_requester.id
                LEFT JOIN ticket_ratings ON tickets.id = ticket_ratings.ticket_id
                ${clause}
                ORDER BY tickets."createdAt" DESC
            `;

            const cursor = await db.query(sql, values);
            
            for (const row of cursor.rows) {
                sheet.addRow(row).commit();
            }

        } catch (error) {
            console.error('[ReportService] XLSX Export error:', error);
            sheet.addRow(['Error generating report', String(error)]).commit();
        } finally {
            await workbook.commit();
        }
    }
}
