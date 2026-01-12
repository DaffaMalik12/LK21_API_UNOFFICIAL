import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate API key
 * API key can be sent via:
 * 1. Header: x-api-key
 * 2. Query parameter: api_key
 */
export const validateApiKey = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const apiKey = process.env.API_KEY;

    // Skip validation if API_KEY is not set in environment
    if (!apiKey) {
        console.warn(
            '⚠️  API_KEY not set in environment variables. API is unprotected!'
        );
        next();
        return;
    }

    // Get API key from header or query parameter
    const providedKey =
        req.headers['x-api-key'] || req.query.api_key;

    // Validate API key
    if (!providedKey) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'API key is required. Please provide it via x-api-key header or api_key query parameter.',
        });
        return;
    }

    if (providedKey !== apiKey) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key.',
        });
        return;
    }

    // API key is valid, proceed to next middleware/route
    next();
};
