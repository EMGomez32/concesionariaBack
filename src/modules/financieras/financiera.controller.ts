import { Request, Response } from 'express';
import * as financieraService from './financiera.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';

export const getFinancieras = catchAsync(async (req: Request, res: Response) => {
    const concesionariaId = req.user?.concesionariaId as number;
    const result = await financieraService.getFinancieras(concesionariaId);
    res.send(ApiResponse.success(result));
});

export const getFinanciera = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await financieraService.getFinancieraById(id);
    res.send(ApiResponse.success(result));
});

export const createFinanciera = catchAsync(async (req: Request, res: Response) => {
    const data = { ...req.body, concesionariaId: req.user?.concesionariaId };
    const result = await financieraService.createFinanciera(data);
    res.status(201).send(ApiResponse.success(result));
});

export const updateFinanciera = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const result = await financieraService.updateFinanciera(id, req.body);
    res.send(ApiResponse.success(result));
});

export const deleteFinanciera = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await financieraService.deleteFinanciera(id);
    res.send(ApiResponse.success({ message: 'Financiera eliminada' }));
});
