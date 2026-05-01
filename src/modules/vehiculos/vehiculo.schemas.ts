import { z } from 'zod';

const tipos = ['USADO', 'CERO_KM'] as const;
const origenes = ['compra', 'permuta', 'consignacion', 'otro'] as const;
const estados = ['preparacion', 'publicado', 'reservado', 'vendido', 'devuelto'] as const;

const optInt = z.coerce.number().int().nullable().optional();

export const createVehiculoSchema = z.object({
    sucursalId: z.coerce.number().int().positive('sucursalId debe ser un número'),
    marca: z.string().min(1, 'La marca es obligatoria').max(100),
    modelo: z.string().min(1, 'El modelo es obligatorio').max(100),
    marcaId: optInt,
    modeloId: optInt,
    versionVehiculoId: optInt,
    tipo: z.enum(tipos, { message: 'Tipo inválido' }),
    origen: z.enum(origenes, { message: 'Origen inválido' }),
    estado: z.enum(estados).optional(),
    anio: z.coerce.number().int().min(1900).max(2100).optional(),
    dominio: z.string().max(20).optional(),
    vin: z.string().max(50).optional(),
    kmIngreso: z.coerce.number().int().nonnegative().optional(),
    fechaIngreso: z.string().datetime({ offset: true }).or(z.iso.date()),
    precioLista: z.coerce.number().nonnegative().optional(),
    precioCompra: z.coerce.number().nonnegative().optional(),
    color: z.string().max(50).optional(),
    proveedorCompraId: optInt,
    formaPagoCompra: z.string().max(50).optional(),
    observaciones: z.string().max(2000).optional(),
});

export const updateVehiculoSchema = z.object({
    sucursalId: z.coerce.number().int().positive().optional(),
    marca: z.string().min(1).max(100).optional(),
    modelo: z.string().min(1).max(100).optional(),
    marcaId: optInt,
    modeloId: optInt,
    versionVehiculoId: optInt,
    estado: z.enum(estados).optional(),
    precioLista: z.coerce.number().nonnegative().optional(),
    precioCompra: z.coerce.number().nonnegative().optional(),
    anio: z.coerce.number().int().optional(),
    dominio: z.string().max(20).optional(),
    vin: z.string().max(50).optional(),
    kmIngreso: z.coerce.number().int().nonnegative().optional(),
    color: z.string().max(50).optional(),
    observaciones: z.string().max(2000).optional(),
});

export const transferVehiculoSchema = z.object({
    sucursalDestinoId: z.coerce.number().int().positive('sucursalDestinoId requerido'),
    motivo: z.string().max(500).optional(),
});

export type CreateVehiculoInput = z.infer<typeof createVehiculoSchema>;
export type UpdateVehiculoInput = z.infer<typeof updateVehiculoSchema>;
export type TransferVehiculoInput = z.infer<typeof transferVehiculoSchema>;
