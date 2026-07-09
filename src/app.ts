import express from 'express';
import cors from 'cors';

// Routes
import healthRoutes from './api/routes/health.route';
import printerRoutes from './api/routes/printer.route';

const app = express();
const PORT = 9000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api', printerRoutes);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
