// src/routes/roleRoutes.js
// Admin-only user management routes

const express        = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const roleController = require('../controllers/roleController');

const router = express.Router();

// All admin routes require valid JWT + admin role
router.use(authMiddleware, roleMiddleware(['admin']));

// GET  /api/admin/users             — list all registered users
router.get('/users',              roleController.getAllUsers);

// PUT  /api/admin/users/:id/role    — change a user's role
router.put('/users/:id/role',     roleController.updateUserRole);

// PUT  /api/admin/users/:id/status  — toggle active / inactive
router.put('/users/:id/status',   roleController.toggleUserStatus);

module.exports = router;
