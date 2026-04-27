import { Request, Response } from 'express';
import * as itemService from './item.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';

export const createItem = catchAsync(async (req: Request, res: Response) => {
    const result = await itemService.createItem(req.body);
    res.status(201).send(ApiResponse.success(result));
});

export const getItems = catchAsync(async (req: Request, res: Response) => {
    const casoId = parseInt(req.params.casoId as string, 10);
    const result = await itemService.getItemsByCaso(casoId);
    res.send(ApiResponse.success(result));
});

export const deleteItem = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    await itemService.deleteItem(id);
    res.send(ApiResponse.success({ message: 'Item eliminado' }));
});
