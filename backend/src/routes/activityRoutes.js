const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getPetActivities,
  addPetActivity,
  getPetDashboardData
} = require('../controllers/activityController');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', getPetActivities);
router.post('/', addPetActivity);
router.get('/dashboard-data', getPetDashboardData);

module.exports = router;
