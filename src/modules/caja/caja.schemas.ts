import { z } from 'zod';

/**
 * Zod schemas para el módulo Caja. Reemplazan progresivamente al
 * `caja.validation.ts` con express-validator.
 *
 * Una vez migrados todos los módulos, podemos exportar estos schemas y
 * generar tipos compartidos con el frontend (vía openapi codegen o
 * importando los .schemas.ts directamente si es monorepo).
 */

const tiposCaja = ['efectivo', 'mercado_pago', 'banco', 'otro'] as const;
const tiposMovimiento = ['ingreso', 'egreso'] as const;
const origenesMovimiento = ['manual', 'venta', 'gasto', 'cierre_diferencia', 'ajuste'] as const;

export const createCajaSchema = z.object({
    nombre: z.string().min(1, 'Nombre obligatorio').max(100),
    tipo: z.enum(tiposCaja, { message: 'Tipo de caja inválido' }),
    moneda: z.string().max(10).optional(),
    concesionariaId: z.coerce.number().int().positive().optional(),
});

export const updateCajaSchema = z.object({
    nombre: z.string().min(1).max(100).optional(),
    tipo: z.enum(tiposCaja).optional(),
    moneda: z.string().max(10).optional(),
    activo: z.boolean().optional(),
});

export const createMovimientoSchema = z.object({
    cajaId: z.coerce.number().int().positive('cajaId debe ser un número'),
    tipo: z.enum(tiposMovimiento, { message: 'Tipo inválido' }),
    fecha: z.string().datetime({ offset: true }).or(z.iso.date()),
    monto: z.coerce.number().positive('Monto debe ser mayor a 0'),
    descripcion: z.string().max(500).optional(),
    origen: z.enum(origenesMovimiento).optional(),
});

export const cerrarDiaSchema = z.object({
    cajaId: z.coerce.number().int().positive(),
    fecha: z.string().datetime({ offset: true }).or(z.iso.date()),
    saldoReal: z.coerce.number().nullable().optional(),
    observaciones: z.string().max(1000).nullable().optional(),
});

// Tipos inferidos — los handlers pueden usar `z.infer<typeof ...>`.
export type CreateCajaInput = z.infer<typeof createCajaSchema>;
export type UpdateCajaInput = z.infer<typeof updateCajaSchema>;
export type CreateMovimientoInput = z.infer<typeof createMovimientoSchema>;
export type CerrarDiaInput = z.infer<typeof cerrarDiaSchema>;
