import { Registry, collectDefaultMetrics, Histogram, Counter, Gauge } from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

/**
 * Prometheus metrics — endpoint /metrics y middleware HTTP.
 *
 * Antes había un placeholder `metrics.ts` con un `getMetrics()` vacío. Ahora
 * usamos `prom-client` con métricas estándar:
 *
 *   - http_requests_total{method, route, status}    — counter
 *   - http_request_duration_seconds{method, route}  — histogram (p50/p95/p99)
 *   - process_*                                     — default metrics (CPU,
 *     memoria, event loop lag, etc.)
 *
 * El endpoint /metrics se expone en routes/index.ts. En producción conviene
 * gatearlo por IP allowlist (solo Prometheus scraper) o por header secret.
 */

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

const httpRequests = new Counter({
    name: 'http_requests_total',
    help: 'Total de requests HTTP por método/ruta/status',
    labelNames: ['method', 'route', 'status'],
    registers: [registry],
});

const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Latencia de requests HTTP en segundos',
    labelNames: ['method', 'route', 'status'],
    // Buckets pensados para una API CRUD: <50ms, 100ms, 500ms, 1s, 5s, +5s.
    buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
});

const inflight = new Gauge({
    name: 'http_requests_inflight',
    help: 'Requests HTTP en vuelo en este momento',
    registers: [registry],
});

/**
 * Express middleware. Mide latencia y agrupa por la "ruta" registrada
 * (ej: `/api/ventas/:id`) — NO por la URL completa, sino vamos a tener
 * cardinalidad infinita en Prometheus.
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    inflight.inc();
    const end = httpDuration.startTimer();

    res.on('finish', () => {
        const route = req.route?.path
            ? `${req.baseUrl || ''}${req.route.path}`
            : req.path.split('?')[0]; // fallback para 404
        const labels = {
            method: req.method,
            route: route || 'unknown',
            status: String(res.statusCode),
        };
        httpRequests.inc(labels);
        end(labels);
        inflight.dec();
    });

    next();
};

export const metricsEndpoint = async (_req: Request, res: Response) => {
    res.setHeader('Content-Type', registry.contentType);
    res.send(await registry.metrics());
};
