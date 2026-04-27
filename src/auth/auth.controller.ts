import { Request, Response } from 'express';
import * as authService from './auth.service';
import catchAsync from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';
import ApiError from '../utils/ApiError';

export const login = catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        throw new ApiError(400, 'Email y contraseña son requeridos', 'MISSING_CREDENTIALS');
    }
    
    const result = await authService.login(email, password);
    res.send(ApiResponse.success(result));
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshAuth(refreshToken);
    res.send(ApiResponse.success(result));
});

export const logout = catchAsync(async (req: Request, res: Response) => {
    // En una implementación simple sin blacklist, solo respondemos éxito
    res.send(ApiResponse.success({ message: 'Logout exitoso' }));
});

export const me = catchAsync(async (req: any, res: Response) => {
    // El middleware authenticate adjuntará el usuario a req.user
    res.send(ApiResponse.success(req.user));
});
