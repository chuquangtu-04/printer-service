"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthStatus = void 0;
const package_json_1 = __importDefault(require("../../../package.json"));
const getHealthStatus = () => {
    return {
        success: true,
        version: package_json_1.default.version || "1.0.0",
        status: "running"
    };
};
exports.getHealthStatus = getHealthStatus;
