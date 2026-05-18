const express = require('express');
const router = express.Router();
const { getGroomers, getGroomerById, createBooking, getUserBookings } = require('../controllers/groomingController');

router.get('/', getGroomers);
router.get('/bookings/my-bookings', getUserBookings);
router.get('/:id', getGroomerById);
router.post('/bookings', createBooking);

module.exports = router;
