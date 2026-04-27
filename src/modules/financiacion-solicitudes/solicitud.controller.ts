import { Request, Response } from 'express';
import * as solicitudService from './solicitud.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import parseNumericFields from '../../utils/parseNumericFields';
import ApiResponse from '../../utils/ApiResponse';

export const getSolicitudes = catchAsync(async (req: Request, res: Response) => {
    let filter = pick(req.query, ['estado', 'clienteId', 'vehiculoId', 'financieraId', 'concesionariaId']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

    // Convert numeric fields from strings to numbers
    filter = parseNumericFields(filter, ['clienteId', 'vehiculoId', 'financieraId', 'concesionariaId']);

    const user = req.user;
    if (user && !user.roles.includes('super_admin')) {
        filter.concesionariaId = user.concesionariaId;
    }

    const result = await solicitudService.getSolicitudes(filter, options);
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const createSolicitud = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;
    const data = { ...req.body, concesionariaId: user?.concesionariaId };
    const result = await solicitudService.createSolicitud(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateSolicitud = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await solicitudService.updateSolicitud(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteSolicitud = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await solicitudService.deleteSolicitud(id);
    res.send(ApiResponse.success({ message: 'Solicitud eliminada' }));
});
