import { Prisma, VehiculoArchivo } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { storage } from '../../infrastructure/storage/LocalStorageAdapter';

export const getArchivosByVehiculo = async (vehiculoId: number): Promise<VehiculoArchivo[]> => {
    return prisma.vehiculoArchivo.findMany({
        where: { vehiculoId }
    });
};

export const createArchivo = async (data: Prisma.VehiculoArchivoUncheckedCreateInput): Promise<VehiculoArchivo> => {
    return prisma.vehiculoArchivo.create({ data });
};

/**
 * Upload multipart de archivo: persiste binario via storage adapter +
 * crea registro con metadata rica. Migrado desde
 * interface/controllers/VehiculoArchivoController.upload.
 */
export const uploadArchivo = async (params: {
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer };
    vehiculoId: number;
    tipo?: string | null;
    descripcion?: string | null;
    uploadedById?: number | null;
}): Promise<VehiculoArchivo> => {
    const { file, vehiculoId, tipo, descripcion, uploadedById } = params;
    const saved = await storage.save(file, `vehiculos/${vehiculoId}`);

    return prisma.vehiculoArchivo.create({
        data: {
            vehiculoId,
            tipo: tipo ?? null,
            descripcion: descripcion ?? null,
            url: saved.url,
            storageKey: saved.storageKey,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            uploadedById: uploadedById ?? null,
        },
    });
};

export const deleteArchivo = async (id: number): Promise<VehiculoArchivo> => {
    const archivo = await prisma.vehiculoArchivo.findUnique({ where: { id } });
    if (!archivo) throw new ApiError(404, 'Archivo no encontrado');
    // Best-effort: borrar binario del storage. Si falla no bloqueamos el delete
    // del registro (ej: archivo ya borrado, permisos, etc).
    if (archivo.storageKey) {
        try {
            await storage.delete(archivo.storageKey);
        } catch {
            /* best-effort */
        }
    }
    return prisma.vehiculoArchivo.delete({ where: { id } });
};
