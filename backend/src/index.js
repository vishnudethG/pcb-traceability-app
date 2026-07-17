const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bomRoutes = require('./routes/bomRoutes');
const modelRoutes = require('./routes/modelRoutes');
const iqirRoutes = require('./routes/iqirRoutes');
const grnRoutes = require('./routes/grnRoutes');

// Import Routes
const customerRoutes = require('./routes/customerRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/customers', customerRoutes);
app.use('/api/boms', bomRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/grns', grnRoutes);
app.use('/api/iqir', iqirRoutes);

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'PCB Traceability API is running!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});