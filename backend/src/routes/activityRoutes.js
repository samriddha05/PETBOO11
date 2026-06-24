const express = require('express');
const router = express.Router({ mergeParams: true });
const authMiddleware = require('../middleware/authMiddleware');
const activityController = require('../controllers/activityController');

// GET /pets/:petId/activities/dashboard-data
router.get('/dashboard-data', authMiddleware, activityController.getDashboardData);

// GET /pets/:petId/activities
router.get('/', authMiddleware, activityController.getActivities);

// POST /pets/:petId/activities
router.post('/', authMiddleware, activityController.addActivity);

module.exports = router;
