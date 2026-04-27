import { Router } from 'express';
import { CategoriaGastoFijoController } from '../controllers/CategoriaGastoFijoController';

const router = Router();

/**
 * @openapi
 * /gastos-fijos-categorias:
 *   get:
 *     tags: [Gastos]
 *     summary: Listar categorías de gasto fijo
 *     responses:
 *       200: { description: Listado, content: { application/json: { schema: { type: array, items: { type: object } } } } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', CategoriaGastoFijoController.getAll);

/**
 * @openapi
 * /gastos-fijos-categorias:
 *   post:
 *     tags: [Gastos]
 *     summary: Crear categoría de gasto fijo
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
router.post('/', CategoriaGastoFijoController.create);

/**
 * @openapi
 * /gastos-fijos-categorias/{id}:
 *   delete:
 *     tags: [Gastos]
 *     summary: Eliminar categoría de gasto fijo
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Eliminada }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
router.delete('/:id', CategoriaGastoFijoController.delete);

export default router;
