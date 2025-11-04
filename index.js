// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db.config.js');
const allRoutes = require('./src/routes/main.js'); // <-- Import the master router

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:8080', // your React app's URL
    credentials: true,               // if you send cookies or auth headers
  })
);


connectDB();

const PORT = process.env.PORT;

// Use the master router for all API routes
app.use('/api', allRoutes); // All routes will be prefixed with /api

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});