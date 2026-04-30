import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Mínimo 32 chars para los JWT secrets — bajo eso es trivial brute-forcear.
// Generar con: openssl rand -base64 48 (~64 chars).
const JWT_SECRET_MIN = 32;

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.preprocess((val) => Number(val), z.number().default(3000)),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(JWT_SECRET_MIN, `JWT_SECRET debe tener al menos ${JWT_SECRET_MIN} caracteres. Generar con: openssl rand -base64 48`),
    JWT_REFRESH_SECRET: z.string().min(JWT_SECRET_MIN, `JWT_REFRESH_SECRET debe tener al menos ${JWT_SECRET_MIN} caracteres. Generar con: openssl rand -base64 48`),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    LOG_LEVEL: z.string().default('debug'),
    CORS_ALLOWED_ORIGINS: z.string().optional().default('http://localhost:5173,http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;
