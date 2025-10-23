const { createGenericRoutes } = require('./genericRoutes');

const router = createGenericRoutes({
    tableName: 'time_slots',
    idField: 'id',
    columns: ['id', 'period', 'startTime', 'endTime'],
    softDelete: true
});

module.exports = router;
