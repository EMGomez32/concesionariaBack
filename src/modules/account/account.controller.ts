import { Request, Response } from 'express';
import * as accountService from './account.service';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';

/**
 * POST /account/activate
 * Body: { token, password }
 * Público (rate-limited).
 */
export const activate = catchAsync(async (req: Request, res: Response) => {
    const { token, password } = req.body;
    const result = await accountService.activateAccount(token, password);
    res.send(ApiResponse.success(result));
});

/**
 * POST /account/password-reset/request
 * Body: { email }
 * Público (rate-limited). Siempre 200 con mensaje genérico.
 */
export const requestReset = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    await accountService.requestPasswordReset(email);
    res.send(ApiResponse.success({
        message: 'Si el email existe en el sistema, te enviamos instrucciones para restablecer tu contraseña.',
    }));
});

/**
 * POST /account/password-reset/confirm
 * Body: { token, password }
 * Público (rate-limited).
 */
export const confirmReset = catchAsync(async (req: Request, res: Response) => {
    const { token, password } = req.body;
    const result = await accountService.confirmPasswordReset(token, password);
    res.send(ApiResponse.success(result));
});

/**
 * POST /account/resend-invitation/:usuarioId
 * Solo admin/super_admin (autenticado).
 */
export const resendInvitation = catchAsync(async (req: Request, res: Response) => {
    const id = parseInt(req.params.usuarioId as string, 10);
    const result = await accountService.resendInvitation(id, req.user?.userId);
    res.send(ApiResponse.success(result));
});
