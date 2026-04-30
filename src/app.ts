import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env';
import { contextMiddleware } from './interface/middlewares/context.middleware';
import { requestLogger } from './interface/middlewares/requestLogger.middleware';
import { errorHandler } from './interface/middlewares/error.middleware';
import { notFound } from './interface/middlewares/notFound.middleware';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpecs from './config/swagger';
import prisma from './infrastructure/database/prisma';
import { logger } from './infrastructure/logging/logger';

const app = express();

// Detrás de un reverse proxy (Coolify/Traefik/NPM) — confiar en X-Forwarded-*
// para que `req.ip` y rate-limit tengan la IP real del cliente, no la del
// proxy. Sin esto, todos los requests aparecen con la IP del bridge Docker
// y el rate limiter de abajo deja pasar todo. `1` confía en 1 hop (el RP);
// si hay más layers (CDN → RP → app), aumentar.
app.set('trust proxy', 1);

// Security Middlewares
// Versión "dev-friendly":
//  - HSTS 1 año + includeSubDomains, sin preload (para no quedar atado).
//  - CSP heredada del default (permite 'unsafe-inline' en styles, no en scripts).
//  - crossOriginResourcePolicy 'cross-origin' para que el frontend pueda
//    consumir /uploads desde su origen (sino el browser bloquea la imagen).
//  - referrerPolicy strict-origin-when-cross-origin (no leak del path).
app.use(helmet({
    hsts: {
        maxAge: 60 * 60 * 24 * 365, // 1 año
        includeSubDomains: true,
        preload: false,
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Permissions-Policy: bloquea features del browser que no usamos.
// Helmet 8 no incluye este header por default, lo seteamos a mano.
app.use((_req, res, next) => {
    res.setHeader(
        'Permissions-Policy',
        [
            'accelerometer=()',
            'camera=()',
            'geolocation=()',
            'gyroscope=()',
            'magnetometer=()',
            'microphone=()',
            'payment=()',
            'usb=()',
            'interest-cohort=()',
        ].join(', ')
    );
    next();
});

// Rangos privados que skipean el rate limit (loopback + Docker bridge).
// Restringido a 172.16.0.0/12 (RFC 1918 — el rango real de Docker), antes
// estaba `172.*` que cubre todo 172.0.0.0/8 (incluye IPs públicas).
const isPrivateIp = (ip: string): boolean => {
    if (!ip) return false;
    const norm = ip.replace(/^::ffff:/, ''); // IPv4 mapeado a IPv6
    if (norm === '127.0.0.1' || norm === '::1') return true;
    // Loopback IPv6 abreviado
    if (norm.startsWith('::1')) return true;
    // 172.16.0.0/12 → 172.16.x.x a 172.31.x.x
    const m = norm.match(/^172\.(\d+)\./);
    if (m) {
        const second = parseInt(m[1], 10);
        return second >= 16 && second <= 31;
    }
    // 10.0.0.0/8 (algunos setups Docker custom)
    if (norm.startsWith('10.')) return true;
    // 192.168.0.0/16 (LAN)
    if (norm.startsWith('192.168.')) return true;
    return false;
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Skip para healthcheck y para tráfico interno (loopback, Docker bridges,
    // LAN). El cliente externo nunca debería llegar con una IP de estos rangos
    // si `trust proxy` está bien configurado.
    skip: (req) => {
        if (req.path === '/health') return true;
        return isPrivateIp(req.ip || '');
    },
});
app.use(limiter);

// CORS — solo browsers de la app permitida.
// Requests sin Origin (curl, Postman, healthcheck server-to-server) se
// permiten porque CORS no aporta seguridad ahí — la auth JWT los frena.
// Para producción, sumar el dominio real al env CORS_ALLOWED_ORIGINS.
const allowedOrigins = env.CORS_ALLOWED_ORIGINS
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Denegado: callback(null, false) NO setea Access-Control-Allow-Origin,
        // así el browser bloquea solo. Evita generar 500 desde el errorHandler
        // y deja un log explícito.
        logger.warn(`[cors] origin rechazado: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    maxAge: 86400, // cachear el preflight 24h
}));

// Basic Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable caching in development
if (env.NODE_ENV === 'development') {
    app.use((_req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        next();
    });
}

// Core Middleware: Multi-tenancy Context
app.use(contextMiddleware);
app.use(requestLogger);

// Health check (simplified using extended prisma)
app.get('/health', async (_req, res) => {
    try {
        await (prisma as any).$queryRaw`SELECT 1`;
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: 'Database unavailable' });
    }
});

// Archivos subidos (servidos como estáticos)
const uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true }));

// Rutas de la API
app.use('/api', routes);

// Swagger Documentation — solo expuesto en desarrollo. En producción
// facilita reconnaissance (lista todos los endpoints, schemas, params)
// y abre vector de mass-assignment ataques. Si se necesita en prod,
// gatearlo con basic-auth o IP allowlist.
if (env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Concesionaria API Docs',
    }));
}

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
