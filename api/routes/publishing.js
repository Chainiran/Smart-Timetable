const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken, checkRole } = require('../authMiddleware');

// GET all publishing statuses for a school
router.get('/', async (req, res) => {
    const { id_school } = req.params;
    try {
        const [statuses] = await db.query('SELECT * FROM publishing_status WHERE id_school = ? ORDER BY academicYear DESC, semester DESC', [id_school]);
        res.json(statuses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// PUT to update a publishing status for a school
router.put('/:id', authenticateToken, checkRole(['super']), async (req, res) => {
    const { id_school, id } = req.params;
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
        return res.status(400).json({ message: "isPublished must be a boolean." });
    }

    try {
        const [result] = await db.query('UPDATE publishing_status SET isPublished = ? WHERE id = ? AND id_school = ?', [isPublished, id, id_school]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Publishing status not found for this school.' });
        }
        
        const [updatedStatus] = await db.query('SELECT * FROM publishing_status WHERE id = ?', [id]);
        res.json(updatedStatus[0]);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
