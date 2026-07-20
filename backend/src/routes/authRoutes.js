const express = require('express');
const { signup, login, getMe, logout, forgotPassword, resetPassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', signup);
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected route
router.get('/me', authMiddleware, getMe);

module.exports = router;
