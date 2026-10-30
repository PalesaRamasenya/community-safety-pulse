const express = require('express');
const cors = require('cors');
require('dotenv').config();

const incidentsRoutes = require('./routes/incidents');
const areasRoutes = require('./routes/areas');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/incidents', incidentsRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler - catches anything thrown/passed via next(err)
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Community Safety Pulse backend running on http://localhost:${PORT}`);
});
