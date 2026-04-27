import { body, param } from 'express-validator';

/* =========================
   Planes
========================= */

export const createPlan = [
    body('nombre').notEmpty().withMessage('nombre es obligatorio'),
    body('interval').isIn(['MONTH', 'YEAR']).withMessage('interval debe ser MONTH o YEAR'),
    body('precio').isDecimal().withMessage('precio debe ser un número'),
    body('moneda').optional().isString(),
    body('maxUsuarios').optional({ nullable: true }).isInt(),
    body('maxSucursales').optional({ nullable: true }).isInt(),
    body('maxVehiculos').optional({ nullable: true }).isInt(),
    body('activo').optional().isBoolean(),
];

export const updatePlan = [
    param('id').isInt().withMessage('id debe ser un entero'),
    body('nombre').optional().notEmpty(),
    body('interval').optional().isIn(['MONTH', 'YEAR']),
    body('precio').optional().isDecimal(),
    body('moneda').optional().isString(),
    body('maxUsuarios').optional({ nullable: true }).isInt(),
    body('maxSucursales').optional({ nullable: true }).isInt(),
    body('maxVehiculos').optional({ nullable: true }).isInt(),
    body('activo').optional().isBoolean(),
];

/* =========================
   Suscripciones
========================= */

export const updateSubscription = [
    param('id').isInt().withMessage('id debe ser un entero'),
    body('planId').isInt().withMessage('planId es obligatorio'),
    body('status').optional().isIn(['trialing', 'active', 'past_due', 'canceled', 'paused']),
    body('trialEndsAt').optional({ nullable: true }).isISO8601(),
    body('currentPeriodStart').optional({ nullable: true }).isISO8601(),
    body('currentPeriodEnd').optional({ nullable: true }).isISO8601(),
    body('provider').optional({ nullable: true }).isString(),
    body('providerCustomerId').optional({ nullable: true }).isString(),
    body('providerSubscriptionId').optional({ nullable: true }).isString(),
];

/* =========================
   Facturación e Invoices
========================= */

export const createInvoice = [
    body('subscriptionId').isInt().withMessage('subscriptionId es obligatorio'),
    body('status').optional().isIn(['draft', 'open', 'paid', 'void', 'uncollectible']),
    body('numero').optional({ nullable: true }).isString(),
    body('periodoDesde').isISO8601().withMessage('periodoDesde es obligatorio'),
    body('periodoHasta').isISO8601().withMessage('periodoHasta es obligatorio'),
    body('subtotal').isDecimal().withMessage('subtotal es obligatorio'),
    body('impuestos').optional().isDecimal(),
    body('total').isDecimal().withMessage('total es obligatorio'),
    body('moneda').optional().isString(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('providerInvoiceId').optional({ nullable: true }).isString(),
    body('pdfUrl').optional({ nullable: true }).isString(),
];

/* =========================
   Pagos
========================= */

export const registrarPagoInvoice = [
    param('id').isInt().withMessage('id debe ser un entero'),
    body('monto').isDecimal().withMessage('monto es obligatorio'),
    body('moneda').notEmpty().withMessage('moneda es obligatoria'),
    body('metodo').isIn(['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro']).withMessage('metodo no válido'),
    body('provider').optional({ nullable: true }).isString(),
    body('providerPaymentId').optional({ nullable: true }).isString(),
];
