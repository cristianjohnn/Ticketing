import { TicketService } from './src/services/ticket.service'; 
TicketService.getRecent(5).then(console.log).catch(console.error);
