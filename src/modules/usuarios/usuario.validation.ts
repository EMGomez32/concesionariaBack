import { body } from 'express-validator';

// El alta de usuario YA NO acepta password — se emite por flujo de invitación.
// El usuario crea su contraseña al activar su cuenta vía email.
export const createUser = [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('concesionariaId').optional().isInt(),
    body('sucursalId').optional().isInt(),
    body('roleIds').isArray({ min: 1 }).withMessage('Debe asignarse al menos un rol'),
];

export const updateUser = [
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('activo').optional().isBoolean(),
    body('sucursalId').optional().isInt(),
    body('roleIds').optional().isArray().withMessage('roleIds debe ser un array de IDs de roles'),
];
