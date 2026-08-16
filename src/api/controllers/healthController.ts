import { Request, Response } from 'express';
import { getHealthStatus } from '../services/health';

export const checkHealth = (_req: Request, res: Response): void => {
    try {
        const status = getHealthStatus();
        res.status(200).json(status);
    } catch (error: unknown) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
