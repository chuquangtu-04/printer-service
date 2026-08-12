import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Routes
import routes from './api/routes';

// Middleware
import { errorHandler } from './api/middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT ?? 9000);

function logService(message: string) {
    console.log(message);

    try {
        const appData = process.env.APPDATA;
        if (!appData) return;

        const logDir = path.join(appData, 'printer-service');
        fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(path.join(logDir, 'service.log'), `[${new Date().toISOString()}] ${message}\n`);
    } catch {
        // Logging must not stop the printer service.
    }
}

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Error Handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
    logService(`Server is running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
    logService(`Server failed to listen on port ${PORT}: ${error.stack || error.message}`);
});
