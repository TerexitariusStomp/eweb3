import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';
import * as transactionController from '../controllers/transaction.controller.js';
import { authenticate, limiter, webhookLimiter } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';

const router = Router();

// Health check - no auth required
router.get('/health', asyncHandler(transactionController.healthCheck));

// Webhook routes - no auth, but rate limited
router.post('/webhook/transaction', webhookLimiter, asyncHandler(webhookController.processWebhook));

// API routes - rate limited but public for dashboard
router.use('/api', limiter);

// Transaction routes
router.get('/api/transactions/recent', asyncHandler(transactionController.getRecentTransactions));
router.get('/api/transaction/:uuid', asyncHandler(transactionController.getTransactionByUUID));
router.get('/api/transactions/empresa/:empresaId', asyncHandler(transactionController.getTransactionsByEmpresa));
router.get('/api/transactions/filter', asyncHandler(transactionController.filterTransactions));

// Analytics routes
router.get('/api/analytics/overview', asyncHandler(transactionController.getOverviewStats));
router.get('/api/analytics/by-type', asyncHandler(transactionController.getStatsByType));
router.get('/api/analytics/empresa/:empresaId', asyncHandler(transactionController.getStatsByEmpresa));
router.get('/api/analytics/trends', asyncHandler(transactionController.getTransactionTrends));

// Admin routes (if needed - require additional auth)
router.post('/api/admin/grant-access', asyncHandler(transactionController.grantAccess));
router.post('/api/admin/revoke-access', asyncHandler(transactionController.revokeAccess));

export default router;