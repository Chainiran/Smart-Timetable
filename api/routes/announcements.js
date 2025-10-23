const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken, checkRole } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

// GET all announcements for a school (admin only)
router.get('/all', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school } = req.params;
    try {
        const [results] = await db.query('SELECT * FROM announcements WHERE id_school = ? ORDER BY updatedAt DESC', [id_school]);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET public (active) announcements for a school
router.get('/public', async (req, res) => {
    const { id_school } = req.params;
    try {
        const [results] = await db.query('SELECT * FROM announcements WHERE id_school = ? AND isActive = 1 ORDER BY updatedAt DESC', [id_school]);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST a new announcement
router.post('/', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school } = req.params;
    const { title, content, isActive } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required.' });
    }

    const newAnnouncement = {
        id: uuidv4(),
        id_school,
        title,
        content,
        isActive: isActive === false ? 0 : 1, // Default to true if not specified
    };

    try {
        await db.query('INSERT INTO announcements SET ?', newAnnouncement);
        const [created] = await db.query('SELECT * FROM announcements WHERE id = ?', [newAnnouncement.id]);
        res.status(201).json(created[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT to update an announcement
router.put('/:id', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school, id } = req.params;
    const { title, content, isActive } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (isActive !== undefined) updates.isActive = isActive;
    
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No fields to update." });
    }
    
    updates.updatedAt = new Date(); // Manually set updatedAt

    try {
        const [result] = await db.query('UPDATE announcements SET ? WHERE id = ? AND id_school = ?', [updates, id, id_school]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Announcement not found.' });
        }
        const [updated] = await db.query('SELECT * FROM announcements WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE an announcement
router.delete('/:id', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school, id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM announcements WHERE id = ? AND id_school = ?', [id, id_school]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Announcement not found.' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
