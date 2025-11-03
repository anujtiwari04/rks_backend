// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const allRoutes = require('./src/routes/index.js'); // <-- Import the master router

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// Use the master router for all API routes
app.use('/api', allRoutes); // All routes will be prefixed with /api

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});