const express = require('express');
const db = require('../db');
const { createGenericRoutes } = require('./genericRoutes');
const { authenticateToken, checkRole } = require('../authMiddleware');

const router = createGenericRoutes({
    tableName: 'subjects',
    idField: 'code',
    columns: ['code', 'name', 'subjectGroup', 'semester', 'gradeLevel', 'credits', 'periodsPerWeek', 'isActive'],
    softDelete: true
});

// POST bulk subjects
router.post('/bulk', authenticateToken, checkRole(['super']), async (req, res) => {
    const { id_school } = req.params;
    const subjects = req.body;
    if (!Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array of subjects.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // For each subject, we need to insert it with the school ID. ON DUPLICATE KEY UPDATE is trickier with composite keys.
        // We will perform an "upsert" manually in a loop for simplicity and correctness.
        let createdCount = 0;
        let updatedCount = 0;

        for (const s of subjects) {
            const [existing] = await connection.query('SELECT code FROM subjects WHERE code = ? AND id_school = ?', [s.code, id_school]);
            
            if (existing.length > 0) {
                // Update
                await connection.query(
                    'UPDATE subjects SET name=?, subjectGroup=?, semester=?, gradeLevel=?, credits=?, periodsPerWeek=? WHERE code = ? AND id_school = ?',
                    [s.name, s.subjectGroup, s.semester, s.gradeLevel, s.credits, s.periodsPerWeek, s.code, id_school]
                );
                updatedCount++;
            } else {
                // Insert
                await connection.query(
                    'INSERT INTO subjects (code, id_school, name, subjectGroup, semester, gradeLevel, credits, periodsPerWeek) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [s.code, id_school, s.name, s.subjectGroup, s.semester, s.gradeLevel, s.credits, s.periodsPerWeek]
                );
                createdCount++;
            }
        }
        
        await connection.commit();

        res.status(201).json({ message: `Successfully imported data: ${createdCount} created, ${updatedCount} updated.` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: 'Failed to import subjects.', error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
