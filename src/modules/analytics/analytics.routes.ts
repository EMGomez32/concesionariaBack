import express from 'express';
import * as ctl from './analytics.controller';
import { analyticsQuery } from './analytics.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { tenancy } from '../../middlewares/tenancy';

const router = express.Router();

// Solo admin (y super_admin via authorize). Todos los endpoints aceptan
// from, to, sucursalId, concesionariaId (último solo aplica a super_admin).
const guards = [authenticate, tenancy, authorize('admin'), analyticsQuery, validate];

router.get('/overview', ...guards, ctl.getOverview);
router.get('/ventas', ...guards, ctl.getVentas);
router.get('/stock', ...guards, ctl.getStock);
router.get('/financiacion', ...guards, ctl.getFinanciacion);
router.get('/caja', ...guards, ctl.getCaja);
router.get('/gastos', ...guards, ctl.getGastos);
router.get('/postventa', ...guards, ctl.getPostventa);

export default router;
