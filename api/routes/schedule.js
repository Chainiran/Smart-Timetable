const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken, checkRole } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

const processDbRow = (row) => {
    if (!row || typeof row !== 'object') {
        return row;
    }
    let parsedTeacherIds = [];
    if (typeof row.teacherIds === 'string') {
        try {
            const parsed = JSON.parse(row.teacherIds);
            if (Array.isArray(parsed)) parsedTeacherIds = parsed;
        } catch (e) {
            console.error(`[API/schedule] Failed to parse teacherIds for schedule ID ${row.id}:`, row.teacherIds);
        }
    } else if (Array.isArray(row.teacherIds)) {
        parsedTeacherIds = row.teacherIds;
    }
    return { ...row, teacherIds: parsedTeacherIds };
};


router.get('/', async (req, res) => {
    const { id_school } = req.params;
    try {
        const query = `
            SELECT s.* 
            FROM schedule s
            JOIN time_slots ts ON s.timeSlotId = ts.id AND s.id_school = ts.id_school
            WHERE s.id_school = ? AND ts.deletedAt IS NULL
        `;
        const [results] = await db.query(query, [id_school]);
        const processedResults = results.map(processDbRow);
        res.json(processedResults);
    } catch (err) {
        console.error('[API/schedule] GET / Error:', err);
        res.status(500).json({ message: 'Failed to retrieve schedule.', error: err.message });
    }
});


const findConflict = async (entry, connection) => {
    const { id_school, day, timeSlotId, teacherIds, locationId, classGroupId, academicYear, semester, id: entryIdToExclude } = entry;
    
    const conditions = ['id_school = ?', 'day = ?', 'timeSlotId = ?', 'academicYear = ?', 'semester = ?'];
    const params = [id_school, day, timeSlotId, academicYear, semester];

    const conflictChecks = [];
    if (teacherIds && teacherIds.length > 0) {
        conflictChecks.push('JSON_OVERLAPS(teacherIds, ?)');
        params.push(JSON.stringify(teacherIds));
    }
    if (locationId) {
        conflictChecks.push('locationId = ?');
        params.push(locationId);
    }
    if (classGroupId) {
        conflictChecks.push('classGroupId = ?');
        params.push(classGroupId);
    }

    if (conflictChecks.length === 0) return null;
    conditions.push(`(${conflictChecks.join(' OR ')})`);

    if (entryIdToExclude) {
        conditions.push('id != ?');
        params.push(entryIdToExclude);
    }
    
    const sql = `SELECT * FROM schedule WHERE ${conditions.join(' AND ')} LIMIT 1`;
    const [conflictingEntries] = await (connection || db).query(sql, params);

    if (conflictingEntries.length > 0) {
        const conflict = processDbRow(conflictingEntries[0]);
        const teacherConflict = teacherIds && teacherIds.length > 0 && conflict.teacherIds.some(tid => teacherIds.includes(tid));
        const locationConflict = locationId && conflict.locationId === locationId;
        const classGroupConflict = classGroupId && conflict.classGroupId === classGroupId;

        if (teacherConflict) return { type: 'teacher', conflictingEntry: conflict, message: 'ครูผู้สอนมีคาบสอนซ้อนในเวลาเดียวกัน' };
        if (locationConflict) return { type: 'location', conflictingEntry: conflict, message: 'สถานที่ถูกใช้งานในเวลาเดียวกัน' };
        if (classGroupConflict) return { type: 'classGroup', conflictingEntry: conflict, message: 'กลุ่มเรียนนี้มีคาบเรียนอื่นในเวลาเดียวกัน' };
    }
    
    return null;
};


const createOrUpdateEntry = async (req, res, isUpdate = false) => {
    const { id_school } = req.params;
    const { classGroupId, day, timeSlotId, subjectCode, customActivity, teacherIds, locationId } = req.body;
    
    try {
        const [infoRows] = await db.query('SELECT academicYear, currentSemester FROM school_info WHERE id_school = ?', [id_school]);
        if (infoRows.length === 0) return res.status(500).json({ message: 'School info not configured.' });
        
        const { academicYear, currentSemester: semester } = infoRows[0];
        
        const entryData = {
            id: isUpdate ? req.params.id : uuidv4(),
            id_school,
            classGroupId: classGroupId || null, day, timeSlotId, 
            subjectCode: subjectCode || null, customActivity: customActivity || null,
            teacherIds: Array.isArray(teacherIds) ? teacherIds : [], 
            locationId: locationId || null, academicYear, semester
        };

        const conflict = await findConflict(entryData);
        if (conflict) {
            return res.status(409).json({ success: false, message: conflict.message, conflict });
        }
        
        const entryDataForDb = { ...entryData, teacherIds: JSON.stringify(entryData.teacherIds) };
        
        if (isUpdate) {
            const { id, ...updateData } = entryDataForDb;
            const columns = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
            const values = [...Object.values(updateData), id, id_school];
            await db.query(`UPDATE schedule SET ${columns} WHERE id = ? AND id_school = ?`, values);
        } else {
            const columns = Object.keys(entryDataForDb);
            const placeholders = columns.map(() => '?').join(', ');
            await db.query(`INSERT INTO schedule (${columns.join(', ')}) VALUES (${placeholders})`, Object.values(entryDataForDb));
        }
            
        res.status(isUpdate ? 200 : 201).json({ success: true, item: entryData });

    } catch (err) {
        console.error(`[API/schedule] ${isUpdate ? 'PUT' : 'POST'} Error:`, err);
        res.status(500).json({ success: false, message: 'Database error occurred.', error: err.message });
    }
};

router.post('/', authenticateToken, checkRole(['admin', 'super']), (req, res) => createOrUpdateEntry(req, res, false));
router.put('/:id', authenticateToken, checkRole(['admin', 'super']), (req, res) => createOrUpdateEntry(req, res, true));

router.delete('/:id', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school, id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM schedule WHERE id = ? AND id_school = ?', [id, id_school]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Schedule entry not found.' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('[API/schedule] DELETE Error:', err);
        res.status(500).json({ message: 'Failed to delete schedule entry.', error: err.message });
    }
});

router.post('/resolve-conflict', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school } = req.params;
    const { entryToSave, conflictingEntryId } = req.body;
    if (!entryToSave || !conflictingEntryId) return res.status(400).json({ message: "Missing entry data or conflicting entry ID." });
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query('DELETE FROM schedule WHERE id = ? AND id_school = ?', [conflictingEntryId, id_school]);
        
        const [schoolInfoRows] = await connection.query('SELECT academicYear, currentSemester FROM school_info WHERE id_school = ?', [id_school]);
        if (schoolInfoRows.length === 0) {
            await connection.rollback();
            return res.status(500).json({ success: false, message: 'Configuration error: School information not found.' });
        }
        const { academicYear, currentSemester: semester } = schoolInfoRows[0];
        
        const isUpdate = !!entryToSave.id;
        
        const entryData = { ...entryToSave, id: isUpdate ? entryToSave.id : uuidv4(), id_school, teacherIds: Array.isArray(entryToSave.teacherIds) ? entryToSave.teacherIds : [], academicYear, semester };
        const entryDataForDb = { ...entryData, teacherIds: JSON.stringify(entryData.teacherIds) };

        if (isUpdate) {
             const { id, ...updateData } = entryDataForDb;
             const columns = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
             await connection.query(`UPDATE schedule SET ${columns} WHERE id = ? AND id_school = ?`, [...Object.values(updateData), id, id_school]);
        } else {
            const columns = Object.keys(entryDataForDb);
            const placeholders = columns.map(() => '?').join(', ');
            await connection.query(`INSERT INTO schedule (${columns.join(', ')}) VALUES (${placeholders})`, Object.values(entryDataForDb));
        }

        await connection.commit();
        res.status(isUpdate ? 200 : 201).json({ success: true, item: entryData });

    } catch (err) {
        await connection.rollback();
        console.error('[API/schedule] resolve-conflict Error:', err);
        res.status(500).json({ success: false, message: 'Failed to resolve conflict.', error: err.message });
    } finally {
        connection.release();
    }
});

router.post('/bulk-activity', authenticateToken, checkRole(['admin', 'super']), async (req, res) => {
    const { id_school } = req.params;
    const { customActivity, days, timeSlotIds, classGroupIds, teacherIds, locationId } = req.body;

    if (!customActivity || !Array.isArray(days) || days.length === 0 || !Array.isArray(timeSlotIds) || timeSlotIds.length === 0 || ((!Array.isArray(classGroupIds) || classGroupIds.length === 0) && (!Array.isArray(teacherIds) || teacherIds.length === 0))) {
        return res.status(400).json({ message: "Missing required fields: customActivity, days, timeSlotIds, and at least one of classGroupIds or teacherIds." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [infoRows] = await connection.query('SELECT academicYear, currentSemester FROM school_info WHERE id_school = ?', [id_school]);
        if (infoRows.length === 0) {
            await connection.rollback();
            return res.status(500).json({ message: 'School info not configured.' });
        }
        const { academicYear, currentSemester: semester } = infoRows[0];

        let successCount = 0;
        let conflictCount = 0;
        const conflicts = [];

        const classGroupLoopTargets = (classGroupIds && classGroupIds.length > 0) ? classGroupIds : [null];

        for (const day of days) {
            for (const timeSlotId of timeSlotIds) {
                for (const classGroupId of classGroupLoopTargets) {
                    const entryData = {
                        id_school, day, timeSlotId, 
                        classGroupId: classGroupId, // This will be null if classGroupIds is empty
                        teacherIds: teacherIds || [],
                        locationId: locationId || null,
                        academicYear, semester,
                        customActivity
                    };
                    
                    const conflict = await findConflict(entryData, connection);
                    
                    if (conflict) {
                        conflictCount++;
                        let conflictGroupName = 'N/A';
                        if (classGroupId) {
                            const [classGroupRows] = await connection.query('SELECT name from class_groups WHERE id = ?', [classGroupId]);
                            if (classGroupRows.length > 0) {
                                conflictGroupName = classGroupRows[0].name;
                            }
                        }
                        const [timeSlotRows] = await connection.query('SELECT period from time_slots WHERE id = ?', [timeSlotId]);
                        const timeSlotName = timeSlotRows.length > 0 ? `คาบ ${timeSlotRows[0].period}` : 'Unknown Time';
                        
                        conflicts.push({ day, timeSlot: timeSlotName, classGroup: conflictGroupName, reason: conflict.message });
                        continue; // Skip this entry
                    }

                    const entryForDb = {
                        id: uuidv4(),
                        id_school, 
                        classGroupId: classGroupId, // This will be null if classGroupIds is empty
                        day, timeSlotId, customActivity,
                        teacherIds: JSON.stringify(teacherIds || []),
                        locationId: locationId || null,
                        academicYear, semester
                    };

                    const columns = Object.keys(entryForDb).filter(k => entryForDb[k] !== undefined);
                    const placeholders = columns.map(() => '?').join(', ');
                    const values = columns.map(k => entryForDb[k]);

                    await connection.query(`INSERT INTO schedule (${columns.join(', ')}) VALUES (${placeholders})`, values);
                    successCount++;
                }
            }
        }
        
        await connection.commit();
        
        let message = `เพิ่มกิจกรรมสำเร็จ ${successCount} รายการ`;
        if (conflictCount > 0) {
            message += ` | ข้าม ${conflictCount} รายการเนื่องจากเกิดข้อขัดแย้ง`;
        }
        
        res.status(200).json({ success: true, message, conflicts });
    } catch (err) {
        await connection.rollback();
        console.error('[API/schedule] POST /bulk-activity Error:', err);
        res.status(500).json({ message: 'Database error occurred during bulk activity creation.', error: err.message });
    } finally {
        connection.release();
    }
});


module.exports = router;