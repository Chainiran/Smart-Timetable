const express = require('express');
const db = require('../db');
const { createGenericRoutes } = require('./genericRoutes');
const { authenticateToken, checkRole } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

const router = createGenericRoutes({
    tableName: 'locations',
    idField: 'id',
    columns: ['id', 'name', 'responsibleTeacherId', 'isActive'],
    softDelete: true
});

// POST bulk locations
router.post('/bulk', authenticateToken, checkRole(['super']), async (req, res) => {
    const { id_school } = req.params;
    const locations = req.body; // Expects { name, responsibleTeacherName? }
    if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array of locations.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        for (const loc of locations) {
            let teacherId = null;
            if (loc.responsibleTeacherName) {
                const [teacherRows] = await connection.query('SELECT id FROM teachers WHERE name = ? AND id_school = ?', [loc.responsibleTeacherName, id_school]);
                if (teacherRows.length > 0) {
                    teacherId = teacherRows[0].id;
                }
            }
            
            const query = 'INSERT INTO locations (id, id_school, name, responsibleTeacherId) VALUES (?, ?, ?, ?)';
            await connection.query(query, [uuidv4(), id_school, loc.name, teacherId]);
        }

        await connection.commit();
        res.status(201).json({ message: `Successfully imported ${locations.length} locations.` });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: 'Failed to import locations.', error: err.message });
    } finally {
        connection.release();
    }
});


module.exports = router;
