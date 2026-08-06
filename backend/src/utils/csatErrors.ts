export class RatingDomainError extends Error {
    public readonly statusCode: number;

    constructor(message: string, statusCode: number = 400, name: string = 'RatingDomainError') {
        super(message);
        this.name = name;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class DuplicateRatingError extends RatingDomainError {
    constructor(ticketId: string) {
        super(`Ticket ${ticketId} has already been rated and cannot be re-rated.`, 409, 'DuplicateRatingError');
    }
}

export class TicketNotEligibleForRatingError extends RatingDomainError {
    constructor(reason: string = 'Ticket is not in a resolved state.') {
        super(`Ticket is not eligible for CSAT rating: ${reason}`, 400, 'TicketNotEligibleForRatingError');
    }
}

export class SurveyExpiredError extends RatingDomainError {
    constructor(daysAllowed: number) {
        super(`The CSAT survey window of ${daysAllowed} days has expired.`, 410, 'SurveyExpiredError');
    }
}

export class UnauthorizedRatingError extends RatingDomainError {
    constructor(message: string = 'Only the original requester of the ticket may submit CSAT feedback.') {
        super(message, 403, 'UnauthorizedRatingError');
    }
}

export class InvalidRatingValueError extends RatingDomainError {
    constructor(val: any) {
        super(`Invalid rating value (${val}). Rating must be an integer between 1 and 5.`, 400, 'InvalidRatingValueError');
    }
}

export class TicketNotFoundError extends RatingDomainError {
    constructor(ticketId: string) {
        super(`Ticket with ID ${ticketId} was not found.`, 404, 'TicketNotFoundError');
    }
}
