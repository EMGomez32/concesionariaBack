import express from 'express';
import * as cajaController from './caja.controller';
import * as cajaValidation from './caja.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

// ── Cajas ───────────────────────────────────────────────
router.route('/')
    .get(authenticate, tenancy, cajaController.getCajas)
    .post(authenticate, tenancy, authorize('admin'), cajaValidation.createCaja, validate, cajaController.createCaja);

router.route('/:id')
    .patch(authenticate, tenancy, authorize('admin'), cajaValidation.updateCaja, validate, cajaController.updateCaja)
    .delete(authenticate, tenancy, authorize('admin'), cajaController.deleteCaja);

// ── Movimientos ─────────────────────────────────────────
router.route('/movimientos')
    .get(authenticate, tenancy, cajaController.getMovimientos)
    .post(authenticate, tenancy, authorize('admin', 'cobrador', 'vendedor'), cajaValidation.createMovimiento, validate, cajaController.createMovimiento);

router.delete('/movimientos/:id', authenticate, tenancy, authorize('admin'), cajaController.deleteMovimiento);

// ── Cierres diarios ─────────────────────────────────────
router.route('/cierres')
    .get(authenticate, tenancy, cajaController.getCierres)
    .post(authenticate, tenancy, authorize('admin', 'cobrador'), cajaValidation.cerrarDia, validate, cajaController.cerrarDia);

router.delete('/cierres/:id', authenticate, tenancy, authorize('admin'), cajaController.deleteCierre);

export default router;
