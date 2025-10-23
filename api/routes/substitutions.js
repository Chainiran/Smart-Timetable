const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken, checkRole } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

const baseQuery = `
    SELECT
        s.id,
        s.originalScheduleEntryId,
        s.substitutionDate AS date,
        absent_t.name AS absentTeacherName,
        s.reason,
        s.substituteTeacherId,
        sub_t.name AS substituteTeacherName,
        subj.code AS subjectCode,
        IFNULL(subj.name, sch.customActivity) AS subjectName,
        cg.name AS classGroupName,
        loc.name AS locationName,
        ts.period AS timeSlotPeriod,
        ts.startTime,
        ts.endTime,
        s.notes
    FROM substitutions s
    JOIN teachers absent_t ON s.absentTeacherId = absent_t.id AND s.id_school = absent_t.id_school
    JOIN teachers sub_t ON s.substituteTeacherId = sub_t.id AND s.id_school = sub_t.id_school
    JOIN schedule sch ON s.originalScheduleEntryId = sch.id AND s.id_school = sch.id_school
    LEFT JOIN subjects subj ON sch.subjectCode = subj.code AND sch.id_school = subj.id_school
    LEFT JOIN class_groups cg ON sch.classGroupId = cg.id AND sch.id_school = cg.id_school
    LEFT JOIN locations loc ON sch.locationId = loc.id AND sch.id_school = loc.id_school
    JOIN time_slots ts ON sch.timeSlotId = ts.id AND sch.id_school = ts.id_school
`;

// GET substitutions by date for a school
router.get('/', async (req, res) => {
    const { id_school } = req.params;
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ message: 'Date query parameter is required.' });
    }

    try {
        const query = `${baseQuery} WHERE s.substitutionDate = ? AND s.id_school = ? ORDER BY ts.period`;
        const [results] = await db.query(query, [date, id_school]);
        res.json(results);
    } catch (err) {
        console.error("GET /substitutions error:", err);
        res.status(500).json({ message: err.message });
    }
});

// POST a new substitution for a school
router.post('/', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school } = req.params;
    const { substitutionDate, absentTeacherId, substituteTeacherId, originalScheduleEntryId, reason, notes, replaceId } = req.body;
    
    if (!substitutionDate || !absentTeacherId || !substituteTeacherId || !originalScheduleEntryId || !reason) {
        return res.status(400).json({ message: "Missing required fields for substitution." });
    }

    const newSub = {
        id: uuidv4(),
        id_school,
        substitutionDate,
        absentTeacherId,
        substituteTeacherId,
        originalScheduleEntryId,
        reason,
        notes: notes || null
    };

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [scheduleRows] = await connection.query(
            'SELECT timeSlotId FROM schedule WHERE id = ? AND id_school = ?',
            [originalScheduleEntryId, id_school]
        );
        if (scheduleRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Original schedule entry not found." });
        }
        const { timeSlotId } = scheduleRows[0];

        const conflictQuery = `
            SELECT s.id, t.name as substituteTeacherName, cg.name as classGroupName
            FROM substitutions s
            JOIN schedule sch ON s.originalScheduleEntryId = sch.id AND s.id_school = sch.id_school
            JOIN teachers t ON s.substituteTeacherId = t.id AND s.id_school = t.id_school
            LEFT JOIN class_groups cg ON sch.classGroupId = cg.id AND sch.id_school = cg.id_school
            WHERE s.substitutionDate = ? 
              AND s.substituteTeacherId = ? 
              AND sch.timeSlotId = ?
              AND s.id_school = ?`;
        const params = [substitutionDate, substituteTeacherId, timeSlotId, id_school];
        let finalConflictQuery = conflictQuery;

        if (replaceId) {
            finalConflictQuery += ' AND s.id != ?';
            params.push(replaceId);
        }

        const [conflictRows] = await connection.query(finalConflictQuery, params);

        if (conflictRows.length > 0) {
            await connection.rollback();
            const conflict = conflictRows[0];
            const message = `ไม่สามารถจัดสอนแทนได้ เนื่องจากครู ${conflict.substituteTeacherName} มีสอนแทนในคาบเดียวกันที่กลุ่มเรียน ${conflict.classGroupName || 'อื่น'} แล้ว`;
            return res.status(409).json({ message });
        }

        if (replaceId) {
            await connection.query('DELETE FROM substitutions WHERE id = ? AND id_school = ?', [replaceId, id_school]);
        }

        await connection.query('INSERT INTO substitutions SET ?', newSub);
        await connection.commit();

        const getQuery = `${baseQuery} WHERE s.id = ? AND s.id_school = ?`;
        const [newlyCreated] = await connection.query(getQuery, [newSub.id, id_school]);

        if (newlyCreated.length === 0) {
            return res.status(500).json({ message: "Failed to retrieve the created substitution." });
        }
        
        res.status(201).json(newlyCreated[0]);

    } catch (err) {
        await connection.rollback();
        console.error("POST /substitutions error:", err);
        res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
});


// DELETE a substitution
router.delete('/:id', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school, id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM substitutions WHERE id = ? AND id_school = ?', [id, id_school]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Substitution not found.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error("DELETE /substitutions/:id error:", err);
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;