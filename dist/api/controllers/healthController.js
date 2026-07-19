"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHealth = void 0;
const health_service_1 = require("../services/health.service");
const checkHealth = (req, res) => {
    try {
        const status = (0, health_service_1.getHealthStatus)();
        res.status(200).json(status);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.checkHealth = checkHealth;
