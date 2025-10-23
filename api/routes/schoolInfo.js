const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken, checkRole } = require('../authMiddleware');

// GET school info for a specific school, including feature flags
router.get('/', async (req, res) => {
    const { id_school } = req.params;
    try {
        const query = `
            SELECT 
                si.*,
                (SELECT JSON_OBJECTAGG(sf.feature_name, sf.is_enabled) 
                 FROM school_features sf 
                 WHERE sf.id_school = si.id_school) as features
            FROM school_info si 
            WHERE si.id_school = ?
        `;
        const [rows] = await db.query(query, [id_school]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'School info not found.' });
        }
        // Parse the features JSON string into an object
        const schoolData = rows[0];
        schoolData.features = schoolData.features ? JSON.parse(schoolData.features) : {};

        // Convert to boolean and provide default values
        schoolData.features.AIChatbot = !!schoolData.features.AIChatbot;
        schoolData.features.Substitutions = !!schoolData.features.Substitutions;
        schoolData.features.TeacherAttendance = !!schoolData.features.TeacherAttendance;


        res.json(schoolData);
    } catch (err) {
        console.error("Error fetching school info with features:", err);
        res.status(500).json({ message: err.message });
    }
});

// PUT (update) school info for a specific school
router.put('/', authenticateToken, checkRole(['super']), async (req, res) => {
    const { id_school } = req.params;
    const { name, address, phone, logoUrl, academicYear, currentSemester } = req.body;
    
    // Create a new status if the year/semester combo doesn't exist
    if (academicYear && currentSemester) {
        try {
            await db.query(
                'INSERT INTO publishing_status (id_school, academicYear, semester, isPublished) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id_school=id_school',
                [id_school, academicYear, currentSemester, false]
            );
        } catch (err) {
            console.error("Error ensuring publishing status exists:", err);
            // Don't block the main update for this, but log it.
        }
    }
    
    try {
        await db.query(
            'UPDATE school_info SET name = ?, address = ?, phone = ?, logoUrl = ?, academicYear = ?, currentSemester = ? WHERE id_school = ?',
            [name, address, phone, logoUrl, academicYear, currentSemester, id_school]
        );
        const [updatedRows] = await db.query('SELECT * FROM school_info WHERE id_school = ?', [id_school]);
        res.json(updatedRows[0]);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;