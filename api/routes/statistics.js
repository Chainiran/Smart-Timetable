const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken, checkRole } = require('../authMiddleware');

const THAI_DAYS_OF_WEEK = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// Middleware for this whole route
router.use(authenticateToken, checkRole(['admin', 'super']));

// GET attendance summary statistics
router.get('/attendance-summary', async (req, res) => {
    const { id_school } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required." });
    }

    try {
        // 1. Fetch all necessary data
        const [teachers] = await db.query('SELECT id, name FROM teachers WHERE id_school = ? AND isActive = 1', [id_school]);
        const [logs] = await db.query(
            'SELECT * FROM teacher_attendance WHERE id_school = ? AND attendanceDate BETWEEN ? AND ?',
            [id_school, startDate, endDate]
        );

        // 2. Initialize stats structure for all active teachers
        const stats = {};
        teachers.forEach(t => {
            stats[t.id] = {
                teacherId: t.id,
                teacherName: t.name,
                subjectStats: {}
            };
        });

        // 3. Process each attendance log
        for (const log of logs) {
            const subjectName = log.subjectName || log.customActivity;
            if (!subjectName || subjectName === 'พักเที่ยง') continue;

            const mapKey = log.subjectCode || `activity_${log.customActivity}`;
            const originalTeacherIds = JSON.parse(log.originalTeacherIds || '[]');

            // Helper to initialize subject stats for a given teacher
            const initStat = (teacherId) => {
                if (!stats[teacherId]) return; // Skip if teacher is not active
                if (!stats[teacherId].subjectStats[mapKey]) {
                    stats[teacherId].subjectStats[mapKey] = {
                        subjectName,
                        totalScheduled: 0,
                        taughtBySelf: 0,
                        taughtBySubstitute: 0,
                    };
                }
            };

            // Step 1: Credit all original teachers with a "scheduled" period.
            // A log's existence means it was scheduled for them.
            for (const teacherId of originalTeacherIds) {
                initStat(teacherId);
                if (stats[teacherId]) {
                    stats[teacherId].subjectStats[mapKey].totalScheduled += 1;
                }
            }

            // Step 2: Credit the correct teacher(s) based on how the period was taught.
            if (log.substituteTeacherId) {
                // A substitute taught; credit original teachers with "taughtBySubstitute".
                for (const teacherId of originalTeacherIds) {
                    initStat(teacherId);
                    if (stats[teacherId]) {
                        stats[teacherId].subjectStats[mapKey].taughtBySubstitute += 1;
                    }
                }
            } else if (log.isPresent) {
                // Class was present, no substitute.
                let teachersWhoTaught = originalTeacherIds;
                
                // For custom activities, the 'notes' field stores who actually taught.
                if (log.customActivity && log.notes) {
                    try {
                        const attendedIds = JSON.parse(log.notes);
                        if (Array.isArray(attendedIds) && attendedIds.length > 0) {
                            teachersWhoTaught = attendedIds;
                        }
                    } catch (e) { /* Ignore if notes is not a valid JSON array */ }
                }

                for (const teacherId of teachersWhoTaught) {
                    initStat(teacherId);
                    if (stats[teacherId]) {
                        stats[teacherId].subjectStats[mapKey].taughtBySelf += 1;

                        // If a teacher taught a custom activity they weren't originally scheduled for,
                        // increment their scheduled count to prevent taught > scheduled.
                        if (!originalTeacherIds.includes(teacherId)) {
                             stats[teacherId].subjectStats[mapKey].totalScheduled += 1;
                        }
                    }
                }
            }
            // If !isPresent and no substitute, nothing is credited to taughtBySelf or taughtBySubstitute.
        }
        
        // 4. Format the final response, filtering out teachers with no stats
        const finalResponse = Object.values(stats).filter(
            (teacherStat) => Object.keys(teacherStat.subjectStats).length > 0
        );

        res.json(finalResponse);

    } catch (err) {
        console.error("GET /attendance-summary error:", err);
        res.status(500).json({ message: err.message });
    }
});


// GET substitution summary statistics
router.get('/substitution-summary', async (req, res) => {
    const { id_school } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required." });
    }

    try {
        const query = `
            SELECT
                t.id,
                t.name,
                (SELECT COUNT(*) FROM substitutions s WHERE s.substituteTeacherId = t.id AND s.id_school = ? AND s.substitutionDate BETWEEN ? AND ?) AS taughtAsSubstitute,
                (SELECT COUNT(*) FROM substitutions s WHERE s.absentTeacherId = t.id AND s.id_school = ? AND s.substitutionDate BETWEEN ? AND ?) AS wasSubstitutedFor
            FROM teachers t
            WHERE t.id_school = ? AND t.isActive = 1
            ORDER BY t.name;
        `;
        const [results] = await db.query(query, [id_school, startDate, endDate, id_school, startDate, endDate, id_school]);
        res.json(results);
    } catch (err) {
        console.error("GET /substitution-summary error:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;