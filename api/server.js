require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3001;

// --- DATABASE CONNECTION ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(conn => {
        console.log('Connected to the MariaDB/MySQL database.');
        conn.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err.stack);
    });

app.use(cors());
app.use(bodyParser.json());

// --- UTILITIES ---
const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const snakeToCamelCase = str => str.toLowerCase().replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));

const convertKeys = (obj, converter) => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeys(v, converter));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            if (key === 'teacher_ids' && converter === snakeToCamelCase) {
                try {
                    // Parse the JSON string from the DB into an array for the frontend
                    result['teacherIds'] = JSON.parse(obj[key] || '[]');
                } catch (e) {
                    // In case of invalid JSON, default to an empty array
                    result['teacherIds'] = [];
                }
            } else if (key === 'teacherIds' && converter === camelToSnakeCase) {
                // This path is manually handled by most callers, but for robustness:
                result['teacher_ids'] = typeof obj[key] === 'string' ? obj[key] : JSON.stringify(obj[key] || []);
            } else {
                 result[converter(key)] = convertKeys(obj[key], converter);
            }
            return result;
        }, {});
    }
    return obj;
};


const executeQuery = async (sql, params = []) => {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database Query Error:', error);
        throw error;
    }
};

// --- API Endpoints ---

// Generic GET all
const createGetAllEndpoint = (tableName, dbTableName) => async (req, res) => {
    try {
        const items = await executeQuery(`SELECT * FROM ${dbTableName}`);
        const camelCaseItems = convertKeys(items, snakeToCamelCase);
        if (tableName === 'timeSlots') {
             camelCaseItems.sort((a,b) => a.period - b.period);
        }
        res.json(camelCaseItems);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

app.get('/api/teachers', createGetAllEndpoint('teachers', 'teachers'));
app.get('/api/classGroups', createGetAllEndpoint('classGroups', 'class_groups'));
app.get('/api/subjects', createGetAllEndpoint('subjects', 'subjects'));
app.get('/api/locations', createGetAllEndpoint('locations', 'locations'));
app.get('/api/timeSlots', createGetAllEndpoint('timeSlots', 'time_slots'));
app.get('/api/schedule', createGetAllEndpoint('schedule', 'schedule'));


// School Info
app.get('/api/schoolInfo', async (req, res) => {
    try {
        const result = await executeQuery('SELECT * FROM school_info LIMIT 1');
        const info = result[0] || {};
        res.json(convertKeys(info, snakeToCamelCase));
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/schoolInfo', async (req, res) => {
    const info = req.body;
    try {
        const snakeCaseInfo = convertKeys(info, camelToSnakeCase);
        const { name, address, phone, logo_url, academic_year, current_semester } = snakeCaseInfo;
        const query = `
            UPDATE school_info SET 
                name = ?, address = ?, phone = ?, logo_url = ?, academic_year = ?, current_semester = ?
            WHERE id = 1
        `;
        await executeQuery(query, [name, address, phone, logo_url, academic_year, current_semester]);
        const updatedInfo = await executeQuery('SELECT * FROM school_info WHERE id = 1');
        res.json({ success: true, item: convertKeys(updatedInfo[0], snakeToCamelCase) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Generic CRUD
const createCrudEndpoints = (app, apiName, dbTableName, options = {}) => {
    const idField = options.idField || 'id';

    app.post(`/api/${apiName}`, async (req, res) => {
        const newItem = req.body;
        if (newItem.teacherIds && Array.isArray(newItem.teacherIds)) {
            newItem.teacherIds = JSON.stringify(newItem.teacherIds);
        }
        const newItemForDb = convertKeys(newItem, camelToSnakeCase);
        const columns = Object.keys(newItemForDb).join(', ');
        const placeholders = Object.keys(newItemForDb).map(() => '?').join(', ');
        const values = Object.values(newItemForDb);

        try {
            const query = `INSERT INTO ${dbTableName} (${columns}) VALUES (${placeholders})`;
            const result = await executeQuery(query, values);
            const insertedId = result.insertId || newItemForDb[idField];
            const selectQuery = `SELECT * FROM ${dbTableName} WHERE ${idField} = ?`;
            const finalResult = await executeQuery(selectQuery, [insertedId]);
            res.status(201).json({ success: true, item: convertKeys(finalResult[0], snakeToCamelCase) });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'ข้อมูลซ้ำกัน กรุณาตรวจสอบรหัสหรือชื่อที่ไม่ซ้ำกัน' });
            }
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    app.put(`/api/${apiName}/:id`, async (req, res) => {
        const { id } = req.params;
        const updatedItem = req.body;
         if (updatedItem.teacherIds && Array.isArray(updatedItem.teacherIds)) {
            updatedItem.teacherIds = JSON.stringify(updatedItem.teacherIds);
        }
        const updatedItemForDb = convertKeys(updatedItem, camelToSnakeCase);
        const setClauses = Object.keys(updatedItemForDb).map(col => `${col} = ?`).join(', ');
        
        try {
            const query = `UPDATE ${dbTableName} SET ${setClauses} WHERE ${idField} = ?`;
            const result = await executeQuery(query, [...Object.values(updatedItemForDb), id]);
            if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });

            const selectQuery = `SELECT * FROM ${dbTableName} WHERE ${idField} = ?`;
            const finalResult = await executeQuery(selectQuery, [id]);
            res.json({ success: true, item: convertKeys(finalResult[0], snakeToCamelCase) });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                 return res.status(400).json({ success: false, message: 'ข้อมูลซ้ำกัน กรุณาตรวจสอบรหัสหรือชื่อที่ไม่ซ้ำกัน' });
            }
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    app.delete(`/api/${apiName}/:id`, async (req, res) => {
        const { id } = req.params;
        try {
            const result = await executeQuery(`DELETE FROM ${dbTableName} WHERE ${idField} = ?`, [id]);
            if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });
};

createCrudEndpoints(app, 'teachers', 'teachers');
createCrudEndpoints(app, 'classGroups', 'class_groups');
createCrudEndpoints(app, 'locations', 'locations');
createCrudEndpoints(app, 'subjects', 'subjects', { idField: 'code' });
createCrudEndpoints(app, 'timeSlots', 'time_slots');

// Bulk Import
const createBulkImportEndpoint = (app, apiName, dbTableName, options = {}) => {
    app.post(`/api/${apiName}/bulk`, async (req, res) => {
        const newItems = req.body;
        if (!newItems || newItems.length === 0) {
            return res.status(400).json({ success: false, message: 'No items to import.' });
        }

        const client = await pool.getConnection();
        try {
            await client.beginTransaction();
            let addedCount = 0;
            const idPrefix = apiName.slice(0, 1).toUpperCase();

            for (const item of newItems) {
                // Special handling for FKs based on names
                if (apiName === 'classGroups' && item.parentName) {
                    const [parentRes] = await client.execute('SELECT id FROM class_groups WHERE name = ?', [item.parentName]);
                    if (parentRes.length > 0) item.parent_id = parentRes[0].id;
                    delete item.parentName;
                }
                if (apiName === 'locations' && item.responsibleTeacherName) {
                    const [teacherRes] = await client.execute('SELECT id FROM teachers WHERE name = ?', [item.responsibleTeacherName]);
                    if (teacherRes.length > 0) item.responsible_teacher_id = teacherRes[0].id;
                    delete item.responsibleTeacherName;
                }
                if (apiName === 'subjects') {
                    const colors = ['bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-purple-200'];
                    item.color = colors[Math.floor(Math.random() * colors.length)];
                } else if (!item.id) {
                     item.id = `${idPrefix}${Date.now() + addedCount}`;
                }

                const columns = Object.keys(item).join(',');
                const placeholders = Object.keys(item).map(() => '?').join(',');
                const values = Object.values(item);
                const query = `INSERT IGNORE INTO ${dbTableName} (${columns}) VALUES (${placeholders})`;
                
                const [result] = await client.execute(query, values);
                addedCount += result.affectedRows;
            }

            await client.commit();
            res.json({ success: true, message: `เพิ่ม ${addedCount} รายการ, ข้าม ${newItems.length - addedCount} (ซ้ำ)` });
        } catch (e) {
            await client.rollback();
            res.status(500).json({ success: false, message: 'Server error during bulk import' });
            throw e;
        } finally {
            client.release();
        }
    });
};

createBulkImportEndpoint(app, 'teachers', 'teachers');
createBulkImportEndpoint(app, 'subjects', 'subjects');
createBulkImportEndpoint(app, 'classGroups', 'class_groups');
createBulkImportEndpoint(app, 'locations', 'locations');

// Schedule Logic
const checkConflict = async (entry, existingEntryId) => {
    // Check for location conflict
    if (entry.locationId) {
        const locQuery = `
            SELECT s.*, l.name as location_name, c.name as class_group_name FROM schedule s
            JOIN locations l ON s.location_id = l.id
            JOIN class_groups c ON s.class_group_id = c.id
            WHERE s.id != ? AND s.day = ? AND s.time_slot_id = ? AND s.location_id = ?
        `;
        const locResult = await executeQuery(locQuery, [existingEntryId || 'none', entry.day, entry.timeSlotId, entry.locationId]);
        if (locResult.length > 0) {
            const e = locResult[0];
            return { type: 'location', conflictingEntry: e, message: `สถานที่ "${e.location_name}" ถูกใช้โดยกลุ่มเรียน "${e.class_group_name}" ในเวลานี้แล้ว` };
        }
    }
    
    // Check for teacher conflict
    if (entry.teacherIds && entry.teacherIds.length > 0) {
        const teacherIdClauses = entry.teacherIds.map(() => `JSON_CONTAINS(s.teacher_ids, JSON_QUOTE(?))`).join(' OR ');
        const teacherQueryParams = entry.teacherIds;
        
        const teacherQuery = `
            SELECT s.*, c.name as class_group_name, t.name as teacher_name
            FROM schedule s
            LEFT JOIN class_groups c ON s.class_group_id = c.id
            CROSS JOIN JSON_TABLE(s.teacher_ids, '$[*]' COLUMNS(teacher_id VARCHAR(50) PATH '$')) AS jt
            JOIN teachers t ON t.id = jt.teacher_id
            WHERE s.id != ? AND s.day = ? AND s.time_slot_id = ? AND (${teacherIdClauses})
            LIMIT 1
        `;

        const allParams = [existingEntryId || 'none', entry.day, entry.timeSlotId, ...teacherQueryParams];
        const teacherResult = await executeQuery(teacherQuery, allParams);

        if (teacherResult.length > 0) {
            const e = teacherResult[0];
            return { type: 'teacher', conflictingEntry: e, message: `ครู "${e.teacher_name}" มีสอนซ้อนกับกลุ่มเรียน "${e.class_group_name}" ในเวลานี้` };
        }
    }
    
    return null;
};

app.post('/api/schedule', async (req, res) => {
    const newEntryData = req.body;
    try {
        const conflict = await checkConflict(newEntryData);
        if (conflict) {
            return res.status(409).json({ success: false, message: conflict.message, conflict: { ...conflict, conflictingEntry: convertKeys(conflict.conflictingEntry, snakeToCamelCase) } });
        }
        
        newEntryData.id = `SE${Date.now()}`;
        newEntryData.teacher_ids = JSON.stringify(newEntryData.teacherIds || []);
        delete newEntryData.teacherIds;

        const { id, classGroupId, day, timeSlotId, subjectCode, customActivity, teacher_ids, locationId } = newEntryData;
        const columns = 'id, class_group_id, day, time_slot_id, subject_code, custom_activity, teacher_ids, location_id';
        const values = [id, classGroupId, day, timeSlotId, subjectCode, customActivity, teacher_ids, locationId];
        const placeholders = values.map(() => '?').join(',');

        const query = `INSERT INTO schedule (${columns}) VALUES (${placeholders})`;
        await executeQuery(query, values);
        
        const inserted = await executeQuery('SELECT * FROM schedule WHERE id = ?', [id]);
        res.status(201).json({ success: true, item: convertKeys(inserted[0], snakeToCamelCase) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.put('/api/schedule/:id', async (req, res) => {
    const { id } = req.params;
    const updatedEntryData = req.body;
    try {
        const conflict = await checkConflict(updatedEntryData, id);
        if (conflict) {
            return res.status(409).json({ success: false, message: conflict.message, conflict: { ...conflict, conflictingEntry: convertKeys(conflict.conflictingEntry, snakeToCamelCase) } });
        }

        updatedEntryData.teacher_ids = JSON.stringify(updatedEntryData.teacherIds || []);
        delete updatedEntryData.teacherIds;
        
        const snakeCaseData = convertKeys(updatedEntryData, camelToSnakeCase);
        const setClauses = Object.keys(snakeCaseData).map(col => `${col} = ?`).join(', ');
        
        const query = `UPDATE schedule SET ${setClauses} WHERE id = ?`;
        const result = await executeQuery(query, [...Object.values(snakeCaseData), id]);

        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
        
        const updated = await executeQuery('SELECT * FROM schedule WHERE id = ?', [id]);
        res.json({ success: true, item: convertKeys(updated[0], snakeToCamelCase) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/schedule/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await executeQuery(`DELETE FROM schedule WHERE id = ?`, [id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/schedule/resolve-conflict', async (req, res) => {
    const { entryData, conflictingEntryId } = req.body;
    const client = await pool.getConnection();

    try {
        await client.beginTransaction();
        
        await client.execute('DELETE FROM schedule WHERE id = ?', [conflictingEntryId]);

        entryData.teacher_ids = JSON.stringify(entryData.teacherIds || []);
        delete entryData.teacherIds;

        if (entryData.id) { // Update existing
            const snakeCaseData = convertKeys(entryData, camelToSnakeCase);
            const setClauses = Object.keys(snakeCaseData).map(col => `${col} = ?`).join(', ');
            const query = `UPDATE schedule SET ${setClauses} WHERE id = ?`;
            await client.execute(query, [...Object.values(snakeCaseData), entryData.id]);
        } else { // Add new
            entryData.id = `SE${Date.now()}`;
            const snakeCaseData = convertKeys(entryData, camelToSnakeCase);
            const { id, class_group_id, day, time_slot_id, subject_code, custom_activity, teacher_ids, location_id } = snakeCaseData;
            const columns = 'id, class_group_id, day, time_slot_id, subject_code, custom_activity, teacher_ids, location_id';
            const values = [id, class_group_id, day, time_slot_id, subject_code, custom_activity, teacher_ids, location_id];
            const placeholders = values.map(() => '?').join(',');
            const query = `INSERT INTO schedule (${columns}) VALUES (${placeholders})`;
            await client.execute(query, values);
        }
        
        await client.commit();
        res.json({ success: true, message: "บันทึกข้อมูลและลบข้อขัดแย้งสำเร็จ" });
    } catch (error) {
        await client.rollback();
        console.error('Conflict resolution error:', error);
        res.status(500).json({ success: false, message: 'Server error during conflict resolution' });
    } finally {
        client.release();
    }
});

// Root
app.get('/', (req, res) => {
  res.send('Smart Timetable API Server is running!');
});

app.listen(port, () => {
  console.log(`Smart Timetable API listening at http://localhost:${port}`);
});