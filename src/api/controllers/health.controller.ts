import { Request, Response } from 'express';
import { getHealthStatus } from '../services/health.service';

export const checkHealth = (req: Request, res: Response): void => {
    try {
        const status = getHealthStatus();
        res.status(200).json(status);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
