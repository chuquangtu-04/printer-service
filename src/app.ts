import express from 'express';
import cors from 'cors';

// Routes
import healthRoutes from './api/routes/healthRoutes';
import printerRoutes from './api/routes/printerRoutes';
import printRoutes from './api/routes/printRoutes';

// Middleware
import { errorHandler } from './api/middleware/errorHandler';

const app = express();
const PORT = 9000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api', printerRoutes);
app.use('/api', printRoutes);

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
