const express = require('express');
const db = require('../db');
const { createGenericRoutes } = require('./genericRoutes');
const { authenticateToken, checkRole } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

const router = createGenericRoutes({
    tableName: 'class_groups',
    idField: 'id',
    columns: ['id', 'name', 'gradeLevel', 'parentId', 'isActive'],
    softDelete: true
});


// POST bulk class groups
router.post('/bulk', authenticateToken, checkRole(['super']), async (req, res) => {
    const { id_school } = req.params;
    const classGroups = req.body; // Expects an array of { name, gradeLevel, parentName? }
    if (!Array.isArray(classGroups) || classGroups.length === 0) {
        return res.status(400).json({ message: 'Request body must be a non-empty array.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        
        const groupsWithoutParent = classGroups.filter(g => !g.parentName);
        const groupsWithParent = classGroups.filter(g => g.parentName);

        if (groupsWithoutParent.length > 0) {
             const query = 'INSERT INTO class_groups (id, id_school, name, gradeLevel) VALUES ?';
             const values = groupsWithoutParent.map(g => [uuidv4(), id_school, g.name, g.gradeLevel]);
             await connection.query(query, [values]);
        }

        for (const group of groupsWithParent) {
            const [parentRows] = await connection.query('SELECT id FROM class_groups WHERE name = ? AND id_school = ?', [group.parentName, id_school]);
            const parentId = parentRows.length > 0 ? parentRows[0].id : null;
            
            const query = 'INSERT INTO class_groups (id, id_school, name, gradeLevel, parentId) VALUES (?, ?, ?, ?, ?)';
            await connection.query(query, [uuidv4(), id_school, group.name, group.gradeLevel, parentId]);
        }

        await connection.commit();
        res.status(201).json({ message: `Successfully imported ${classGroups.length} class groups.` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: 'Failed to import class groups.', error: err.message });
    } finally {
        connection.release();
    }
});

// GET subjects for a specific class group for a given academic year and semester
router.get('/:id/subjects', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school, id: classGroupId } = req.params;
    const { academicYear, semester } = req.query;

    if (!academicYear || !semester) {
        return res.status(400).json({ message: "academicYear and semester are required query parameters." });
    }

    try {
        const query = `
            SELECT s.* 
            FROM subjects s
            JOIN class_group_subjects cgs ON s.code = cgs.subjectCode AND s.id_school = cgs.id_school
            WHERE cgs.classGroupId = ? 
              AND cgs.academicYear = ? 
              AND cgs.semester = ? 
              AND cgs.id_school = ?
        `;
        const [subjects] = await db.query(query, [classGroupId, academicYear, semester, id_school]);
        res.json(subjects);
    } catch (err) {
        console.error("Error fetching class group subjects:", err);
        res.status(500).json({ message: err.message });
    }
});

// PUT (update/replace) subjects for a class group
router.put('/:id/subjects', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school, id: classGroupId } = req.params;
    const { subjectCodes, academicYear, semester } = req.body;

    if (!Array.isArray(subjectCodes) || !academicYear || !semester) {
        return res.status(400).json({ message: 'Request body must include subjectCodes array, academicYear, and semester.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Delete existing entries for this class group, year, and semester
        await connection.query(
            'DELETE FROM class_group_subjects WHERE classGroupId = ? AND academicYear = ? AND semester = ? AND id_school = ?',
            [classGroupId, academicYear, semester, id_school]
        );

        // Insert new entries if any
        if (subjectCodes.length > 0) {
            const values = subjectCodes.map(code => [id_school, classGroupId, code, academicYear, semester]);
            await connection.query(
                'INSERT INTO class_group_subjects (id_school, classGroupId, subjectCode, academicYear, semester) VALUES ?',
                [values]
            );
        }

        await connection.commit();
        res.json({ success: true, message: `Updated subjects for class group ${classGroupId}.` });
    } catch (err) {
        await connection.rollback();
        console.error("Error updating class group subjects:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
});


module.exports = router;