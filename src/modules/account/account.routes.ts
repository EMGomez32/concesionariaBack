import express from 'express';
import { rateLimit } from 'express-rate-limit';
import * as accountController from './account.controller';
import * as accountValidation from './account.validation';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = express.Router();

/**
 * Rate limit estricto para endpoints públicos (sin auth).
 * Mantiene a raya scripts que pidan resets en bulk o que prueben tokens.
 */
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.', statusCode: 429 } },
});

// ── Públicos ──────────────────────────────────────────
router.post(
    '/activate',
    publicLimiter,
    accountValidation.activate, validate,
    accountController.activate,
);

router.post(
    '/password-reset/request',
    publicLimiter,
    accountValidation.requestReset, validate,
    accountController.requestReset,
);

router.post(
    '/password-reset/confirm',
    publicLimiter,
    accountValidation.confirmReset, validate,
    accountController.confirmReset,
);

// ── Admin (autenticado) ───────────────────────────────
router.post(
    '/resend-invitation/:usuarioId',
    authenticate,
    authorize('admin', 'super_admin'),
    accountController.resendInvitation,
);

export default router;
