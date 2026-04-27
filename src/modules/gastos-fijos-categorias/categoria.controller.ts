import { Request, Response } from 'express';
import * as categoriaService from './categoria.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';

export const getCategorias = catchAsync(async (req: Request, res: Response) => {
    const concesionariaId = req.user?.concesionariaId as number;
    const result = await categoriaService.getCategorias(concesionariaId);
    res.send(ApiResponse.success(result));
});

export const getCategoriaById = catchAsync(async (req: Request, res: Response) => {
    const result = await categoriaService.getCategoriaById(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(result));
});

export const createCategoria = catchAsync(async (req: Request, res: Response) => {
    const data = {
        ...req.body,
        concesionariaId: req.user?.concesionariaId
    };
    const result = await categoriaService.createCategoria(data);
    res.status(201).send(ApiResponse.success(result, 'Categoría creada correctamente'));
});

export const updateCategoria = catchAsync(async (req: Request, res: Response) => {
    const result = await categoriaService.updateCategoria(parseInt(req.params.id as string, 10), req.body);
    res.send(ApiResponse.success(result, 'Categoría actualizada correctamente'));
});

export const deleteCategoria = catchAsync(async (req: Request, res: Response) => {
    await categoriaService.deleteCategoria(parseInt(req.params.id as string, 10));
    res.send(ApiResponse.success(null, 'Categoría eliminada correctamente'));
});
