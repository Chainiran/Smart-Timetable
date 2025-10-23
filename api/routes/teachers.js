const express = require('express');
const db = require('../db');
const { createGenericRoutes } = require('./genericRoutes');
const { authenticateToken, checkRole } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

const router = createGenericRoutes({
    tableName: 'teachers',
    idField: 'id',
    columns: ['id', 'prefix', 'name', 'subjectGroup', 'isActive'],
    softDelete: true
});

// POST bulk teachers
router.post('/bulk', authenticateToken, checkRole(['super']), async (req, res) => {
    const { id_school } = req.params;
    const teachers = req.body;
    if (!Array.isArray(teachers) || teachers.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array of teachers.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const query = 'INSERT INTO teachers (id, id_school, prefix, name, subjectGroup) VALUES ?';
        const values = teachers.map(t => [uuidv4(), id_school, t.prefix, t.name, t.subjectGroup]);
        
        await connection.query(query, [values]);
        await connection.commit();

        res.status(201).json({ message: `Successfully imported ${teachers.length} teachers.` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: 'Failed to import teachers.', error: err.message });
    } finally {
        connection.release();
    }
});


module.exports = router;
