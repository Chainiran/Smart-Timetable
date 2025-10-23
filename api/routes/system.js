const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, checkSystemAdmin } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

// --- System Admin Login ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND id_school IS NULL', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        if (user.role !== 'super') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
            id_school: null,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token: token, user: payload });

    } catch (error) {
        console.error("System Login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// All subsequent routes require system admin authentication
router.use(authenticateToken, checkSystemAdmin);

// --- School Management ---
router.get('/schools', async (req, res) => {
    try {
        const [schools] = await db.query('SELECT * FROM school_info ORDER BY name');
        res.json(schools);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/schools', async (req, res) => {
    const { id_school, name, address, phone, logoUrl, academicYear, currentSemester } = req.body;
    if (!id_school || !name || !academicYear || !currentSemester) {
        return res.status(400).json({ message: 'id_school, name, academicYear, and currentSemester are required.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const schoolData = [id_school, name, address, phone, logoUrl, academicYear, currentSemester];
        await connection.query(
            'INSERT INTO school_info (id_school, name, address, phone, logoUrl, academicYear, currentSemester) VALUES (?, ?, ?, ?, ?, ?, ?)',
            schoolData
        );

        // Add default features for the new school
        const defaultFeatures = [
            [id_school, 'AIChatbot', true],
            [id_school, 'Substitutions', true],
            [id_school, 'TeacherAttendance', true]
        ];
        await connection.query(
            'INSERT INTO school_features (id_school, feature_name, is_enabled) VALUES ?',
            [defaultFeatures]
        );
        
        // Add default publishing status
         await connection.query(
            'INSERT INTO publishing_status (id_school, academicYear, semester, isPublished) VALUES (?, ?, ?, ?)',
            [id_school, academicYear, currentSemester, false]
        );


        await connection.commit();
        res.status(201).json({ id_school, name, ...req.body });

    } catch (err) {
        await connection.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: `School with ID '${id_school}' already exists.` });
        }
        res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
});

router.put('/schools/:id_school', async (req, res) => {
    const { id_school } = req.params;
    const { name, address, phone, logoUrl, academicYear, currentSemester } = req.body;
    try {
        const [result] = await db.query(
            'UPDATE school_info SET name = ?, address = ?, phone = ?, logoUrl = ?, academicYear = ?, currentSemester = ? WHERE id_school = ?',
            [name, address, phone, logoUrl, academicYear, currentSemester, id_school]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'School not found' });
        }
        res.json({ id_school, ...req.body });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- Feature Management ---
router.get('/schools/:id_school/features', async (req, res) => {
    const { id_school } = req.params;
    try {
        const [features] = await db.query('SELECT feature_name, is_enabled FROM school_features WHERE id_school = ?', [id_school]);
        const featureMap = features.reduce((acc, { feature_name, is_enabled }) => {
            acc[feature_name] = !!is_enabled;
            return acc;
        }, {});
        res.json(featureMap);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/schools/:id_school/features', async (req, res) => {
    const { id_school } = req.params;
    const features = req.body; // Expects an object like { "AIChatbot": true, "Substitutions": false }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const [feature_name, is_enabled] of Object.entries(features)) {
            await connection.query(
                'INSERT INTO school_features (id_school, feature_name, is_enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_enabled = ?',
                [id_school, feature_name, is_enabled, is_enabled]
            );
        }
        await connection.commit();
        res.json({ success: true, message: 'Features updated successfully.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
});

// --- All Users Management ---
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, role, id_school FROM users ORDER BY id_school, username');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/users', async (req, res) => {
    const { username, password, role, id_school } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required." });
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const [result] = await db.query(
            'INSERT INTO users (username, password, role, id_school) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role, id_school || null]
        );
        res.status(201).json({ id: result.insertId, username, role, id_school: id_school || null });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Username already exists." });
        }
        res.status(500).json({ message: err.message });
    }
});

router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { password, role, id_school } = req.body;
    let query = 'UPDATE users SET role = ?, id_school = ?';
    const params = [role, id_school || null];

    if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        query += ', password = ?';
        params.push(hashedPassword);
    }
    query += ' WHERE id = ?';
    params.push(id);

    try {
        const [result] = await db.query(query, params);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;