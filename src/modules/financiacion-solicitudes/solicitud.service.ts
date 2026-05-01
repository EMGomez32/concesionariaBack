import { Prisma, SolicitudFinanciacion } from '@prisma/client';
import prisma from '../../prisma';
import ApiError from '../../utils/ApiError';
import { QueryOptions, PaginatedResponse } from '../../types/common';
import { storage } from '../../infrastructure/storage/LocalStorageAdapter';

export const getSolicitudes = async (
    filter: Prisma.SolicitudFinanciacionWhereInput,
    options: QueryOptions
): Promise<PaginatedResponse<SolicitudFinanciacion>> => {
    const { limit = 20, page = 1, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const results = await prisma.solicitudFinanciacion.findMany({
        where: filter,
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
            cliente: true,
            financiera: true
        }
    }) as any;

    const total = await prisma.solicitudFinanciacion.count({ where: filter });

    return {
        results,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        totalResults: total,
    };
};

export const createSolicitud = async (data: Prisma.SolicitudFinanciacionUncheckedCreateInput) => {
    return prisma.solicitudFinanciacion.create({
        data: {
            ...data,
            estado: 'pendiente'
        }
    });
};

export const updateSolicitud = async (id: number, data: Prisma.SolicitudFinanciacionUpdateInput) => {
    return prisma.solicitudFinanciacion.update({
        where: { id },
        data
    });
};

export const deleteSolicitud = async (id: number) => {
    return prisma.solicitudFinanciacion.delete({ where: { id } });
};

export const getSolicitudById = async (id: number): Promise<SolicitudFinanciacion> => {
    const result = await prisma.solicitudFinanciacion.findUnique({
        where: { id },
        include: { cliente: true, financiera: true, archivos: true } as never,
    });
    if (!result) throw new ApiError(404, 'Solicitud no encontrada', 'NOT_FOUND');
    return result;
};

/* ── Sub-recursos: archivos ── */

export const listArchivos = async (solicitudId: number) => {
    return prisma.solicitudFinanciacionArchivo.findMany({
        where: { solicitudId },
        orderBy: { createdAt: 'desc' },
    });
};

/**
 * Upload multipart de archivo asociado a una solicitud. Migrado de
 * interface/controllers/SolicitudFinanciacionController.uploadArchivo.
 */
export const uploadArchivo = async (params: {
    solicitudId: number;
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer };
    tipo?: string | null;
    descripcion?: string | null;
    uploadedById?: number | null;
}) => {
    const { solicitudId, file, tipo, descripcion, uploadedById } = params;

    // Verificar que la solicitud existe (lanza 404 si no).
    await getSolicitudById(solicitudId);

    const saved = await storage.save(file, `solicitudes/${solicitudId}`);

    return prisma.solicitudFinanciacionArchivo.create({
        data: {
            solicitudId,
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

export const deleteArchivo = async (archivoId: number) => {
    const archivo = await prisma.solicitudFinanciacionArchivo.findUnique({
        where: { id: archivoId },
    });
    if (!archivo) throw new ApiError(404, 'Archivo no encontrado', 'NOT_FOUND');

    // Best-effort: borrar binario del storage.
    if (archivo.storageKey) {
        try {
            await storage.delete(archivo.storageKey);
        } catch {
            /* best-effort */
        }
    }

    return prisma.solicitudFinanciacionArchivo.delete({ where: { id: archivoId } });
};
