import { Request, Response } from 'express';
import * as categoriaService from './categoria.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';

export const getCategorias = catchAsync(async (req: Request, res: Response) => {
    const concesionariaId = req.user?.concesionariaId as number;
    const result = await categoriaService.getCategorias(concesionariaId);
    res.send(ApiResponse.success(result));
});

export const createCategoria = catchAsync(async (req: Request, res: Response) => {
    const data = {
        ...req.body,
        concesionariaId: req.user?.concesionariaId
    };
    const result = await categoriaService.createCategoria(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateCategoria = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await categoriaService.updateCategoria(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteCategoria = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await categoriaService.deleteCategoria(id);
    res.send(ApiResponse.success({ message: 'Categoría eliminada' }));
});
