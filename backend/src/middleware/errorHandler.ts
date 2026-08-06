import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';

export interface CustomError extends Error {
    statusCode?: number;
}

export const errorHandler = (
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    console.error(`[Error] [${req.method}] ${req.url}:`, err);

    res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal Server Error' : err.name || 'API Error',
        message: statusCode === 500 && ENV.NODE_ENV !== 'development' ? 'An unexpected error occurred' : message,
        ...(ENV.NODE_ENV === 'development' && { stack: err.stack })
    });
};
