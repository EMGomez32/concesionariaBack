import { Request, Response } from 'express';
import * as archivoService from './archivo.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';

export const createArchivo = catchAsync(async (req: Request, res: Response) => {
    const result = await archivoService.createArchivo(req.body);
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
