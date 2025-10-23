const express = require('express');
const router = express.Router({ mergeParams: true }); // Enable mergeParams
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
    const { username, password } = req.body;
    const { id_school } = req.params;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }
    if (!id_school) {
        return res.status(400).json({ message: 'School ID is required for login.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND id_school = ?', [username, id_school]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
            id_school: user.id_school,
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: token,
            user: payload
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Rename the file to login.js or something else if it handles more than just POST /login
// For now, this is fine. The server.js mounts this at '/login'.
module.exports = router;
