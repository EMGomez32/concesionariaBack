import { Request, Response } from 'express';
import * as concesionariaService from './concesionaria.service';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import ApiResponse from '../../utils/ApiResponse';

export const getConcesionarias = catchAsync(async (req: Request, res: Response) => {
    const filter = pick(req.query, ['nombre', 'email']);
    const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
    const result = await concesionariaService.getConcesionarias(filter, options);
    
    res.send(ApiResponse.success(result.results, {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
    }));
});

export const getConcesionaria = catchAsync(async (req: Request, res: Response) => {
    const result = await concesionariaService.getConcesionariaById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const createConcesionaria = catchAsync(async (req: Request, res: Response) => {
    const result = await concesionariaService.createConcesionaria(req.body);
    res.status(201).send(ApiResponse.success(result));
});

export const updateConcesionaria = catchAsync(async (req: Request, res: Response) => {
    const result = await concesionariaService.updateConcesionaria(parseInt(req.params.id as string, 10), req.body);
    res.send(ApiResponse.success(result));
});

export const deleteConcesionaria = catchAsync(async (req: Request, res: Response) => {
    await concesionariaService.deleteConcesionaria(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success({ message: 'Eliminado con éxito' }));
});
