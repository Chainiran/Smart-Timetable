const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all schools (public)
router.get('/', async (req, res) => {
    try {
        // Fetches basic info for the school selection screen from the definitive school_info table
        const [schools] = await db.query('SELECT id_school, name, logoUrl FROM school_info ORDER BY name');
        res.json(schools);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;