// This line loads all the variables from our .env file into process.env
require('dotenv').config();

// --- Import Core Node.js Modules ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Middleware to handle cross-origin requests
const path = require('path'); // Helper for working with file and directory paths

// --- Import API Routes ---
// We will create this file next. It will contain all our application's API endpoints.
const apiRoutes = require('./server/routes/api');

// --- Initialize Express Application ---
const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000

// --- Middleware Setup ---
// This section configures how the server handles incoming requests.

// Enable Cross-Origin Resource Sharing for all routes.
// This is essential to allow our front-end (on a different 'origin') to communicate with our back-end API.
app.use(cors());

// Parse incoming requests with JSON payloads.
// This allows us to read data sent in the 'body' of POST/PUT requests.
app.use(express.json());

// Parse incoming requests with URL-encoded payloads (e.g., from HTML forms).
app.use(express.urlencoded({ extended: true }));

// --- Serve Static Files ---
// These lines tell Express where to find our front-end files (HTML, CSS, JS, images).

// Serve the main front-end application files (citizen and admin portals).
// The 'public' directory is the root for our front-end.
app.use(express.static(path.join(__dirname, 'public')));

// Serve user-uploaded images from the 'public/uploads' directory.
// This makes it possible to view uploaded images via a URL like '/uploads/image-name.jpg'.
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB! Database is ready.'))
  .catch(err => {
    console.error('❌ MongoDB connection error: Could not connect to the database.');
    console.error(err);
    // Exit the application if the database connection fails, as the app cannot run without it.
    process.exit(1);
  });

// --- API Route Handling ---
// All requests that start with '/api' will be handled by our apiRoutes module.
// This keeps our main server file clean and organized.
app.use('/api', apiRoutes);

// --- Root Route ---
// If someone visits the base URL (e.g., http://localhost:3000/),
// they will be automatically redirected to the citizen reporting page.
app.get('/', (req, res) => {
  res.redirect('/citizen/index.html');
});

// --- Start the HTTP Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server is up and running on http://localhost:${PORT}`);
  console.log('Waiting for database connection...');
});
