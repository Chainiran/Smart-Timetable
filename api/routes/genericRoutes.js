const express = require('express');
const db = require('../db');
const { authenticateToken, checkRole } = require('../authMiddleware');
const { v4: uuidv4 } = require('uuid');

// A helper function to create generic CRUD routes for a given table, now school-aware
function createGenericRoutes({ tableName, idField, columns, softDelete = false }) {
    const router = express.Router({ mergeParams: true }); // Enable param merging
    
    // GET all active items for a school
    router.get('/', async (req, res) => {
        const { id_school } = req.params;
        try {
            const query = softDelete
              ? `SELECT * FROM ${tableName} WHERE deletedAt IS NULL AND id_school = ?`
              : `SELECT * FROM ${tableName} WHERE id_school = ?`;
            const [results] = await db.query(query, [id_school]);
            res.json(results);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

    // GET all archived items for a school
    if (softDelete) {
        router.get('/archived', authenticateToken, checkRole(['super']), async (req, res) => {
            const { id_school } = req.params;
            try {
                const [results] = await db.query(`SELECT * FROM ${tableName} WHERE deletedAt IS NOT NULL AND id_school = ?`, [id_school]);
                res.json(results);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });
    }

    // GET a single item by ID for a school
    router.get('/:id', async (req, res) => {
        const { id_school, id } = req.params;
        try {
            const [results] = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = ? AND id_school = ?`, [id, id_school]);
            if (results.length === 0) {
                return res.status(404).json({ message: 'Item not found' });
            }
            res.json(results[0]);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

    // POST a new item for a school
    router.post('/', authenticateToken, checkRole(['super']), async (req, res) => {
        const { id_school } = req.params;
        const newItem = { id_school }; // Automatically add school ID
        columns.forEach(col => {
            if (req.body[col] !== undefined) {
                newItem[col] = req.body[col];
            }
        });

        if (idField === 'id' && !newItem.id) {
            newItem.id = uuidv4();
        }

        const queryCols = Object.keys(newItem);
        const queryVals = Object.values(newItem);
        const placeholders = queryCols.map(() => '?').join(', ');

        try {
            await db.query(`INSERT INTO ${tableName} (${queryCols.join(', ')}) VALUES (${placeholders})`, queryVals);
            
            const [createdRows] = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = ? AND id_school = ?`, [newItem[idField], id_school]);
            if (createdRows.length === 0) {
                 return res.status(500).json({ message: "Failed to fetch newly created item." });
            }
            res.status(201).json(createdRows[0]);
        } catch (err) {
             if (err.code === 'ER_DUP_ENTRY') {
                const dupValue = err.message.match(/'(.*?)'/);
                const message = dupValue 
                    ? `ข้อมูล '${dupValue[1]}' ซ้ำกับที่มีอยู่แล้ว`
                    : `ข้อมูลซ้ำกับที่มีอยู่แล้ว`;
                return res.status(409).json({ message });
            }
            res.status(400).json({ message: err.message });
        }
    });

    // PUT to update an item for a school
    router.put('/:id', authenticateToken, checkRole(['super']), async (req, res) => {
        const { id_school, id } = req.params;
        const updates = {};
        columns.forEach(col => {
            if (req.body[col] !== undefined) {
                updates[col] = req.body[col];
            }
        });

        const querySet = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const queryVals = [...Object.values(updates), id, id_school];

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No fields to update." });
        }

        try {
            const [result] = await db.query(`UPDATE ${tableName} SET ${querySet} WHERE ${idField} = ? AND id_school = ?`, queryVals);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Item not found' });
            }

            const newId = updates[idField] || id;
            const [updatedRows] = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = ? AND id_school = ?`, [newId, id_school]);
            
            if (updatedRows.length === 0) {
                return res.status(404).json({ message: 'Updated item not found after update operation.' });
            }
            res.json(updatedRows[0]);
        } catch (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ message: `ไม่สามารถอัปเดตข้อมูลได้ เนื่องจากมีการอ้างอิงจากตารางสอน` });
            }
            if (err.code === 'ER_DUP_ENTRY') {
                const dupValue = err.message.match(/'(.*?)'/);
                const message = dupValue 
                    ? `ข้อมูล '${dupValue[1]}' ซ้ำกับที่มีอยู่แล้ว`
                    : `ข้อมูลซ้ำกับที่มีอยู่แล้ว`;
                return res.status(409).json({ message });
            }
            res.status(400).json({ message: err.message });
        }
    });

    // DELETE an item for a school
    router.delete('/:id', authenticateToken, checkRole(['super']), async (req, res) => {
        const { id_school, id } = req.params;
        try {
             const [itemRows] = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = ? AND id_school = ?`, [id, id_school]);
             if (itemRows.length === 0) {
                return res.status(404).json({ message: 'Item not found' });
            }
            const itemToDelete = itemRows[0];

            if (softDelete) {
                const [result] = await db.query(`UPDATE ${tableName} SET deletedAt = NOW() WHERE ${idField} = ? AND deletedAt IS NULL AND id_school = ?`, [id, id_school]);
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Item not found or already deleted' });
                }
                res.json(itemToDelete);
            } else {
                const [result] = await db.query(`DELETE FROM ${tableName} WHERE ${idField} = ? AND id_school = ?`, [id, id_school]);
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Item not found' });
                }
                res.status(204).send();
            }
        } catch (err) {
             if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                const action = softDelete ? 'จัดเก็บ (ลบ)' : 'ลบ';
                return res.status(409).json({ message: `ไม่สามารถ${action}ข้อมูลนี้ได้ เนื่องจากมีการใช้งานอยู่ในตารางสอน` });
            }
            res.status(500).json({ message: err.message });
        }
    });

    // PUT to toggle item status for a school
    router.put('/:id/status', authenticateToken, checkRole(['super']), async (req, res) => {
        const { id_school, id } = req.params;
        const { isActive } = req.body;
        
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive field must be a boolean.' });
        }

        try {
            const [result] = await db.query(
                `UPDATE ${tableName} SET isActive = ? WHERE ${idField} = ? AND id_school = ?`,
                [isActive, id, id_school]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Item not found' });
            }
            
            const [updatedRows] = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = ? AND id_school = ?`, [id, id_school]);
            res.json(updatedRows[0]);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

    // POST to restore a soft-deleted item for a school
    if (softDelete) {
        router.post('/:id/restore', authenticateToken, checkRole(['super']), async (req, res) => {
            const { id_school, id } = req.params;
            try {
                const [result] = await db.query(`UPDATE ${tableName} SET deletedAt = NULL WHERE ${idField} = ? AND deletedAt IS NOT NULL AND id_school = ?`, [id, id_school]);
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'Archived item not found or already active' });
                }
                const [restoredItem] = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = ? AND id_school = ?`, [id, id_school]);
                res.json(restoredItem[0]);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });
    }

    return router;
}

module.exports = { createGenericRoutes };
