const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const bcrypt = require('bcryptjs');
const { authenticateToken, checkRole } = require('../authMiddleware');

router.use(authenticateToken, checkRole(['super']));

router.get('/', async (req, res) => {
    const { id_school } = req.params;
    try {
        const [users] = await db.query('SELECT id, username, role, id_school FROM users WHERE id_school = ?', [id_school]);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    const { id_school } = req.params;
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required." });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            'INSERT INTO users (username, password, role, id_school) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role, id_school]
        );
        
        const newUser = { id: result.insertId, username, role, id_school };
        res.status(201).json(newUser);

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Username already exists for this school." });
        }
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id_school, id } = req.params;
    const { password, role } = req.body;

    if (!role && !password) {
        return res.status(400).json({ message: "Either role or password must be provided." });
    }

    try {
        let query;
        const params = [];

        if (password && role) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET password = ?, role = ? WHERE id = ? AND id_school = ?';
            params.push(hashedPassword, role, id, id_school);
        } else if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET password = ? WHERE id = ? AND id_school = ?';
            params.push(hashedPassword, id, id_school);
        } else { // only role
            query = 'UPDATE users SET role = ? WHERE id = ? AND id_school = ?';
            params.push(role, id, id_school);
        }

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const [updatedUser] = await db.query('SELECT id, username, role, id_school FROM users WHERE id = ?', [id]);
        res.json(updatedUser[0]);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id_school, id } = req.params;

    // Security check: Prevent users from deleting their own account
    if (req.user.id == id) {
        return res.status(403).json({ message: 'ไม่สามารถลบข้อมูลผู้ใช้งานของตัวเองได้' });
    }

    try {
        const [result] = await db.query('DELETE FROM users WHERE id = ? AND id_school = ?', [id, id_school]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;