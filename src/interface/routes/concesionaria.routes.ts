import { Router } from 'express';
import { ConcesionariaController } from '../controllers/ConcesionariaController';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

/**
 * @openapi
 * /concesionarias:
 *   get:
 *     tags: [Concesionarias]
 *     summary: Listar concesionarias
 *     description: super_admin only. Devuelve todas las concesionarias (tenants) con paginación.
 *     parameters:
 *       - { $ref: '#/components/parameters/pageParam' }
 *       - { $ref: '#/components/parameters/limitParam' }
 *     responses:
 *       200:
 *         description: Listado paginado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results: { type: array, items: { type: object } }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 totalPages: { type: integer }
 *                 totalResults: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', authenticate, ConcesionariaController.getAll);

/**
 * @openapi
 * /concesionarias/{id}:
 *   get:
 *     tags: [Concesionarias]
 *     summary: Obtener concesionaria por id
 *     description: super_admin only.
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Concesionaria encontrada
 *         content: { application/json: { schema: { type: object } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:id', authenticate, ConcesionariaController.getById);

/**
 * @openapi
 * /concesionarias:
 *   post:
 *     tags: [Concesionarias]
 *     summary: Crear concesionaria
 *     description: super_admin only. Crea un nuevo tenant.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string }
 *               cuit: { type: string }
 *               direccion: { type: string }
 *               telefono: { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       201:
 *         description: Concesionaria creada
 *         content: { application/json: { schema: { type: object } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/', authenticate, ConcesionariaController.create);

/**
 * @openapi
 * /concesionarias/{id}:
 *   patch:
 *     tags: [Concesionarias]
 *     summary: Actualizar concesionaria
 *     description: super_admin only.
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               cuit: { type: string }
 *               direccion: { type: string }
 *               telefono: { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Concesionaria actualizada
 *         content: { application/json: { schema: { type: object } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:id', authenticate, ConcesionariaController.update);

/**
 * @openapi
 * /concesionarias/{id}:
 *   delete:
 *     tags: [Concesionarias]
 *     summary: Eliminar concesionaria (soft delete)
 *     description: super_admin only.
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Eliminada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:id', authenticate, ConcesionariaController.delete);

export default router;
