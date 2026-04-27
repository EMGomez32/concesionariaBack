import express from 'express';
import * as billingController from './billing.controller';
import * as billingValidation from './billing.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { tenancy } from '../../middlewares/tenancy';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

/* =========================
   Planes
========================= */

router
    .route('/planes')
    .post(authenticate, authorize('super_admin'), billingValidation.createPlan, validate, billingController.createPlan)
    .get(authenticate, billingController.getPlanes);

router
    .route('/planes/:id')
    .patch(authenticate, authorize('super_admin'), billingValidation.updatePlan, validate, billingController.updatePlan);

/* =========================
   Suscripciones
========================= */

router
    .route('/subscription')
    .get(authenticate, tenancy, billingController.getMySubscription);

router
    .route('/concesionarias/:id/subscription')
    .get(authenticate, authorize('super_admin'), billingController.getSubscriptionByConcesionariaId)
    .patch(authenticate, authorize('super_admin'), billingValidation.updateSubscription, validate, billingController.updateSubscription);

/* =========================
   Facturación e Invoices
========================= */

router
    .route('/invoices')
    .get(authenticate, billingController.getInvoices)
    .post(authenticate, authorize('super_admin'), billingValidation.createInvoice, validate, billingController.createInvoice);

router
    .route('/invoices/:id')
    .get(authenticate, billingController.getInvoiceById);

router
    .route('/invoices/:id/payments')
    .post(authenticate, authorize('super_admin'), billingValidation.registrarPagoInvoice, validate, billingController.registrarPagoInvoice);

export default router;
