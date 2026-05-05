import './env.js';
import express from 'express';
import cors from 'cors';
import fplRoutes from './routes/fpl.js';
import aiRoutes from './routes/ai.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/fpl', fplRoutes);
app.use('/api/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});