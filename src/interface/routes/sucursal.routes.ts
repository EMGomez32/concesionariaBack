import { Router } from 'express';
import { SucursalController } from '../controllers/SucursalController';

const router = Router();

router.get('/', SucursalController.getAll);
router.get('/:id', SucursalController.getById);
router.post('/', SucursalController.create);
router.patch('/:id', SucursalController.update);
router.delete('/:id', SucursalController.delete);

export default router;
