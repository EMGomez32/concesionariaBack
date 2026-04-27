import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     description: Devuelve el perfil del usuario y un par de tokens (access + refresh). La auditoría registra `accion=login` con IP y userAgent.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LoginResponse' }
 *       401:
 *         description: Credenciales inválidas
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Usuario inactivo
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar access token
 *     description: Intercambia un refresh token válido por un nuevo access token.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Nuevo par de tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access: { type: string }
 *                 refresh: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     description: Registra `accion=logout` en auditoría.
 *     responses:
 *       204:
 *         description: OK (sin contenido)
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.post('/logout', AuthController.logout);

export default router;
