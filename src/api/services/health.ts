import packageJson from '../../../package.json';

export const getHealthStatus = () => {
    return {
        success: true,
        version: packageJson.version || "1.0.0",
        status: "running"
    };
};
