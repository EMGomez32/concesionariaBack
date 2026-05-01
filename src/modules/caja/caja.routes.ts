import express from 'express';
import * as cajaController from './caja.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';
import { validateZod } from '../../middlewares/validateZod';
import {
    createCajaSchema,
    updateCajaSchema,
    createMovimientoSchema,
    cerrarDiaSchema,
} from './caja.schemas';

const router = express.Router();

// ── Cajas ───────────────────────────────────────────────
router.route('/')
    .get(authenticate, tenancy, cajaController.getCajas)
    .post(authenticate, tenancy, authorize('admin'), validateZod(createCajaSchema), cajaController.createCaja);

router.route('/:id')
    .patch(authenticate, tenancy, authorize('admin'), validateZod(updateCajaSchema), cajaController.updateCaja)
    .delete(authenticate, tenancy, authorize('admin'), cajaController.deleteCaja);

// ── Movimientos ─────────────────────────────────────────
router.route('/movimientos')
    .get(authenticate, tenancy, cajaController.getMovimientos)
    .post(authenticate, tenancy, authorize('admin', 'cobrador', 'vendedor'), validateZod(createMovimientoSchema), cajaController.createMovimiento);

router.delete('/movimientos/:id', authenticate, tenancy, authorize('admin'), cajaController.deleteMovimiento);

// ── Cierres diarios ─────────────────────────────────────
router.route('/cierres')
    .get(authenticate, tenancy, cajaController.getCierres)
    .post(authenticate, tenancy, authorize('admin', 'cobrador'), validateZod(cerrarDiaSchema), cajaController.cerrarDia);

router.delete('/cierres/:id', authenticate, tenancy, authorize('admin'), cajaController.deleteCierre);

export default router;
