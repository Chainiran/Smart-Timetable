const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken, checkRole } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

// GET stamped attendance logs for a specific date
router.get('/', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school } = req.params;
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ message: "Date query parameter is required." });
    }

    try {
        const query = 'SELECT * FROM teacher_attendance WHERE id_school = ? AND attendanceDate = ?';
        const [attendanceRows] = await db.query(query, [id_school, date]);

        // The new frontend expects the raw log data, so we just send it after parsing JSON fields.
        const processedLogs = attendanceRows.map(row => {
            try {
                return {
                    ...row,
                    originalTeacherIds: JSON.parse(row.originalTeacherIds || '[]'),
                    originalTeacherNames: JSON.parse(row.originalTeacherNames || '[]'),
                }
            } catch(e) {
                console.warn(`Could not parse JSON fields for attendance log ${row.id}:`, e);
                return {
                    ...row,
                    originalTeacherIds: [],
                    originalTeacherNames: [],
                }
            }
        });

        res.json(processedLogs);
    } catch (err) {
        console.error("GET /attendance error:", err);
        res.status(500).json({ message: err.message });
    }
});

// POST to save (replace) attendance logs for a specific set of schedule entries
router.post('/', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school } = req.params;
    const attendanceLogs = req.body;

    if (!Array.isArray(attendanceLogs)) {
        return res.status(400).json({ message: "Request body must be an array of attendance records." });
    }

    if (attendanceLogs.length === 0) {
        return res.status(200).json({ success: true, message: 'No records to save.' });
    }

    const attendanceDate = attendanceLogs[0].attendanceDate;
    const entryIdsToUpdate = attendanceLogs.map(log => log.originalScheduleEntryId);

    if (!attendanceDate || !entryIdsToUpdate || entryIdsToUpdate.length === 0) {
        return res.status(400).json({ message: "Records must have an attendanceDate and contain entry IDs to update." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Delete only the records for the specific entries being updated on that date
        const placeholders = entryIdsToUpdate.map(() => '?').join(',');
        await connection.query(
            `DELETE FROM teacher_attendance WHERE id_school = ? AND attendanceDate = ? AND originalScheduleEntryId IN (${placeholders})`,
            [id_school, attendanceDate, ...entryIdsToUpdate]
        );

        // 2. Insert all the new records from the payload
        if (attendanceLogs.length > 0) {
            const query = `
                INSERT INTO teacher_attendance (
                    id, id_school, attendanceDate, originalScheduleEntryId, day, timeSlotPeriod, 
                    startTime, endTime, classGroupId, classGroupName, subjectCode, subjectName, 
                    customActivity, locationId, locationName, originalTeacherIds, originalTeacherNames, 
                    isPresent, substituteTeacherId, notes
                ) VALUES ?
            `;
            const values = attendanceLogs.map(log => [
                log.id || uuidv4(),
                id_school,
                log.attendanceDate,
                log.originalScheduleEntryId,
                log.day,
                log.timeSlotPeriod,
                log.startTime,
                log.endTime,
                log.classGroupId || null,
                log.classGroupName || null,
                log.subjectCode || null,
                log.subjectName || null,
                log.customActivity || null,
                log.locationId || null,
                log.locationName || null,
                JSON.stringify(log.originalTeacherIds || []),
                JSON.stringify(log.originalTeacherNames || []),
                log.isPresent,
                log.substituteTeacherId || null,
                log.notes || null
            ]);

            await connection.query(query, [values]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: 'Attendance records saved successfully.' });
    } catch (err) {
        await connection.rollback();
        console.error("POST /attendance error:", err);
        res.status(500).json({ success: false, message: 'Failed to save attendance records.', error: err.message });
    } finally {
        connection.release();
    }
});

// DELETE to reset attendance logs for specific class groups on a given date
router.delete('/', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school } = req.params;
    const { date, classGroupIds } = req.body;

    if (!date || !Array.isArray(classGroupIds) || classGroupIds.length === 0) {
        return res.status(400).json({ message: "date and a non-empty array of classGroupIds are required." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const placeholders = classGroupIds.map(() => '?').join(',');
        const query = `DELETE FROM teacher_attendance WHERE id_school = ? AND attendanceDate = ? AND classGroupId IN (${placeholders})`;
        const params = [id_school, date, ...classGroupIds];

        const [result] = await connection.query(query, params);
        
        await connection.commit();
        res.status(200).json({ success: true, message: `Reset ${result.affectedRows} attendance records successfully.` });

    } catch (err) {
        await connection.rollback();
        console.error("DELETE /attendance error:", err);
        res.status(500).json({ success: false, message: 'Failed to reset attendance records.', error: err.message });
    } finally {
        connection.release();
    }
});


module.exports = router;