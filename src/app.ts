import express from 'express';
import cors from 'cors';

// Routes
import routes from './api/routes';

// Middleware
import { errorHandler } from './api/middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT ?? 9000);

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
