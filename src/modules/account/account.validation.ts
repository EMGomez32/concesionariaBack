import { body } from 'express-validator';

const passwordRule = body('password')
    .isString().withMessage('Contraseña inválida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[a-z]/).withMessage('Debe incluir al menos una minúscula')
    .matches(/[A-Z]/).withMessage('Debe incluir al menos una mayúscula')
    .matches(/\d/).withMessage('Debe incluir al menos un número');

export const activate = [
    body('token').isString().notEmpty().withMessage('Token requerido'),
    passwordRule,
];

export const requestReset = [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
];

export const confirmReset = [
    body('token').isString().notEmpty().withMessage('Token requerido'),
    passwordRule,
];
