// src/routes/roleRoutes.ts
// Admin-only user management routes

import express from 'express';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';
import * as roleController from '../controllers/roleController.ts';

const router = express.Router();

// All admin routes require valid JWT + admin role
router.use(authMiddleware, roleMiddleware(['admin']));

// GET  /api/admin/users             — list all registered users
router.get('/users',              roleController.getAllUsers);

// POST /api/admin/users             — create account directly (no OTP)
router.post('/users',             roleController.createUserByAdmin);

// PUT  /api/admin/users/:id         — edit account details (full_name, email, phone)
router.put('/users/:id',          roleController.updateUserDetails);

// PUT  /api/admin/users/:id/role    — change a user's role
router.put('/users/:id/role',     roleController.updateUserRole);

// PUT  /api/admin/users/:id/status  — toggle active / inactive
router.put('/users/:id/status',   roleController.toggleUserStatus);

// DELETE /api/admin/users/:id     — remove an account
router.delete('/users/:id',       roleController.deleteUser);

export default router;
