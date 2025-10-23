require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// --- Chatbot Proxy Route ---
app.use('/api/chat', require('./routes/chat'));

// --- Public Routes ---
app.use('/api/schools', require('./routes/schools'));

// --- System Admin Routes ---
app.use('/api/system', require('./routes/system'));

app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to Smart Timetable API' });
});

// --- School-Specific Routes ---
// This router will handle all requests prefixed with /api/:id_school
const schoolRouter = express.Router({ mergeParams: true });
schoolRouter.use('/login', require('./routes/auth'));
schoolRouter.use('/school_info', require('./routes/schoolInfo'));
schoolRouter.use('/teachers', require('./routes/teachers'));
schoolRouter.use('/class_groups', require('./routes/classGroups'));
schoolRouter.use('/subjects', require('./routes/subjects'));
schoolRouter.use('/locations', require('./routes/locations'));
schoolRouter.use('/time_slots', require('./routes/timeSlots'));
schoolRouter.use('/schedule', require('./routes/schedule'));
schoolRouter.use('/users', require('./routes/users'));
schoolRouter.use('/publishing', require('./routes/publishing'));
schoolRouter.use('/substitutions', require('./routes/substitutions'));
schoolRouter.use('/attendance', require('./routes/attendance'));
schoolRouter.use('/statistics', require('./routes/statistics'));
schoolRouter.use('/announcements', require('./routes/announcements'));


// Register the school-specific router
app.use('/api/:id_school', schoolRouter);


app.listen(port, () => {
    console.log(`Smart Timetable API listening at http://localhost:${port}`);
});