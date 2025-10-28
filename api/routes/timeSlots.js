const express = require('express');
const db = require('../db');
const { createGenericRoutes } = require('./genericRoutes');
const { authenticateToken, checkRole } = require('../authMiddleware');

const router = createGenericRoutes({
    tableName: 'time_slots',
    idField: 'id',
    columns: ['id', 'period', 'startTime', 'endTime'],
    softDelete: true
});

// POST bulk time slots
router.post('/bulk', authenticateToken, checkRole(['super']), async (req, res) => {
    const { id_school } = req.params;
    const timeSlots = req.body;
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array of time slots.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const query = 'INSERT INTO time_slots (id, id_school, period, startTime, endTime) VALUES ?';
        const values = timeSlots.map(ts => [ts.id, id_school, ts.period, ts.startTime, ts.endTime]);
        
        await connection.query(query, [values]);
        await connection.commit();

        res.status(201).json({ message: `Successfully imported ${timeSlots.length} time slots.` });
    } catch (err) {
        await connection.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'One or more time slot IDs already exist.', error: err.message });
        }
        res.status(500).json({ message: 'Failed to import time slots.', error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;