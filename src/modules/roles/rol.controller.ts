import prisma from '../../prisma';
import ApiResponse from '../../utils/ApiResponse';
import catchAsync from '../../utils/catchAsync';
import { Request, Response } from 'express';

export const getRoles = catchAsync(async (req: Request, res: Response) => {
    const roles = await prisma.rol.findMany();
    res.send(ApiResponse.success(roles));
});
