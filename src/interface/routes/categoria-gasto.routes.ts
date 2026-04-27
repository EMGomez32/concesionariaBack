import { Router } from 'express';
import { CategoriaGastoController } from '../controllers/CategoriaGastoController';

const router = Router();

/**
 * @openapi
 * /gastos-categorias:
 *   get:
 *     tags: [Gastos]
 *     summary: Listar categorías de gasto vehicular
 *     responses:
 *       200: { description: Listado, content: { application/json: { schema: { type: array, items: { type: object } } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', CategoriaGastoController.getAll);

/**
 * @openapi
 * /gastos-categorias:
 *   post:
 *     tags: [Gastos]
 *     summary: Crear categoría de gasto vehicular
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *     responses:
 *       201: { description: Categoría creada, content: { application/json: { schema: { type: object } } } }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.post('/', CategoriaGastoController.create);

/**
 * @openapi
 * /gastos-categorias/{id}:
 *   delete:
 *     tags: [Gastos]
 *     summary: Eliminar categoría de gasto vehicular
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Eliminada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.delete('/:id', CategoriaGastoController.delete);

export default router;
