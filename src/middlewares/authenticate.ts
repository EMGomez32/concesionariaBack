import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import ApiError from '../utils/ApiError';
import { TokenPayload } from '../auth/auth.service';

export const authenticate = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new ApiError(401, 'Token no proporcionado', 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
        req.user = payload;
        next();
    } catch (error) {
        return next(new ApiError(401, 'Token inválido o expirado', 'UNAUTHORIZED'));
    }
};
