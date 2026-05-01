import { Request, Response } from 'express';
import * as archivoService from './archivo.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';

export const createArchivo = catchAsync(async (req: Request, res: Response) => {
    const result = await archivoService.createArchivo(req.body);
    res.status(201).send(ApiResponse.success(result));
});

/**
 * Upload multipart. multer populates `req.file` con el binario en memoria.
 * Migrado desde interface/controllers/VehiculoArchivoController.upload.
 */
export const uploadArchivo = catchAsync(async (req: Request, res: Response) => {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
        throw new ApiError(400, 'Archivo requerido (campo "file")', 'VALIDATION_ERROR');
    }
    const vehiculoId = parseInt(req.body.vehiculoId, 10);
    if (!vehiculoId) {
        throw new ApiError(400, 'vehiculoId es obligatorio', 'VALIDATION_ERROR');
    }

    const result = await archivoService.uploadArchivo({
        file,
        vehiculoId,
        tipo: req.body.tipo ?? null,
        descripcion: req.body.descripcion ?? null,
        uploadedById: req.user?.userId ?? null,
    });
    res.status(201).send(ApiResponse.success(result));
});

export const getArchivos = catchAsync(async (req: Request, res: Response) => {
    const vehiculoId = parseInt(req.params.vehiculoId as string, 10);
    const result = await archivoService.getArchivosByVehiculo(vehiculoId);
    res.send(ApiResponse.success(result));
});

export const deleteArchivo = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await archivoService.deleteArchivo(id);
    res.send(ApiResponse.success({ message: 'Archivo eliminado' }));
});
