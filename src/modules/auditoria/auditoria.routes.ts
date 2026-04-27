import express from 'express';
import * as auditoriaController from './auditoria.controller';
import * as auditoriaValidation from './auditoria.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

// Audit logs are for super admin or admin to see
router
    .route('/')
    .get(authenticate, tenancy, authorize('admin', 'super_admin'), auditoriaValidation.getAuditLogs, validate, auditoriaController.getAuditLogs);

router
    .route('/export')
    .get(authenticate, tenancy, authorize('admin', 'super_admin'), auditoriaValidation.getAuditLogs, validate, auditoriaController.exportAuditLogs);

router
    .route('/:id')
    .get(authenticate, tenancy, authorize('admin', 'super_admin'), auditoriaValidation.getAuditLogById, validate, auditoriaController.getAuditLogById);

export default router;
