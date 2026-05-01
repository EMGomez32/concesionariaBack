/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Smoke test post-deploy.
 *
 * Verifica que los endpoints críticos respondan correctamente después de un
 * deploy. NO requiere un usuario logueado para la mayoría de los checks
 * (usa /livez, /readyz, OPTIONS, y endpoints públicos).
 *
 * Uso:
 *   API_URL=https://api.tudominio.com npm run smoke-test
 *
 * Si pasás credenciales también valida login + auth:
 *   API_URL=... TEST_EMAIL=... TEST_PASSWORD=... npm run smoke-test
 *
 * Sale con exit code 0 si todo pasa, 1 si algún check falla.
 * Útil para meter en CI/CD post-deploy o como cron de health monitoring.
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

interface CheckResult {
    name: string;
    passed: boolean;
    detail?: string;
    durationMs?: number;
}

const results: CheckResult[] = [];

const c = {
    green: (s: string) => `\x1b[32m${s}\x1b[0m`,
    red: (s: string) => `\x1b[31m${s}\x1b[0m`,
    yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
    dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

const check = async (name: string, fn: () => Promise<void>): Promise<void> => {
    const start = Date.now();
    try {
        await fn();
        const durationMs = Date.now() - start;
        results.push({ name, passed: true, durationMs });
        console.log(`  ${c.green('✓')} ${name} ${c.dim(`(${durationMs}ms)`)}`);
    } catch (err) {
        const durationMs = Date.now() - start;
        const detail = err instanceof Error ? err.message : String(err);
        results.push({ name, passed: false, detail, durationMs });
        console.log(`  ${c.red('✗')} ${name} ${c.dim(`(${durationMs}ms)`)}`);
        console.log(`    ${c.red(detail)}`);
    }
};

const expect = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(msg);
};

const fetchJson = async (path: string, init?: RequestInit) => {
    const url = `${API_URL}${path}`;
    const res = await fetch(url, init);
    let body: any;
    try {
        body = await res.json();
    } catch {
        body = null;
    }
    return { res, body };
};

(async () => {
    console.log(`\n🔥 Smoke test: ${c.yellow(API_URL)}\n`);

    // ─── Healthchecks ────────────────────────────────────────────────────
    console.log(c.dim('Healthchecks:'));

    await check('/livez responde 200', async () => {
        const { res, body } = await fetchJson('/livez');
        expect(res.status === 200, `Expected 200, got ${res.status}`);
        expect(body?.status === 'live', 'Body debe tener {status:"live"}');
    });

    await check('/readyz verifica DB', async () => {
        const { res, body } = await fetchJson('/readyz');
        expect(res.status === 200, `Expected 200, got ${res.status} (DB no disponible?)`);
        expect(body?.status === 'ready', 'Body debe tener {status:"ready"}');
    });

    await check('/health (legacy) responde', async () => {
        const { res } = await fetchJson('/health');
        expect(res.status === 200, `Expected 200, got ${res.status}`);
    });

    // ─── Métricas ────────────────────────────────────────────────────────
    console.log(c.dim('\nMétricas:'));

    await check('/metrics expone Prometheus', async () => {
        const res = await fetch(`${API_URL}/metrics`);
        expect(res.status === 200, `Expected 200, got ${res.status}`);
        const text = await res.text();
        expect(
            text.includes('http_requests_total') || text.includes('process_'),
            'Output no parece formato Prometheus'
        );
    });

    // ─── Auth (sin credenciales) ──────────────────────────────────────────
    console.log(c.dim('\nAuth (rechazos esperados):'));

    await check('/api/auth/login rechaza sin credenciales', async () => {
        const { res } = await fetchJson('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        expect(res.status >= 400 && res.status < 500, `Expected 4xx, got ${res.status}`);
    });

    await check('/api/auth/login rechaza credenciales inválidas', async () => {
        const { res } = await fetchJson('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'noexiste@test.com', password: 'wrongwrongwrong' }),
        });
        expect(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await check('/api/vehiculos requiere auth', async () => {
        const { res } = await fetchJson('/api/vehiculos');
        expect(res.status === 401, `Expected 401 (sin token), got ${res.status}`);
    });

    await check('/api/ventas requiere auth (B2 fix)', async () => {
        // Antes del Sprint 1 esto pasaba sin auth — leak crítico.
        const { res } = await fetchJson('/api/ventas');
        expect(res.status === 401, `Expected 401, got ${res.status} (B2 regression!)`);
    });

    // ─── Production hardening ────────────────────────────────────────────
    console.log(c.dim('\nProduction hardening:'));

    await check('/api/debug NO expuesto en prod', async () => {
        const { res } = await fetchJson('/api/debug/concesionarias-raw');
        // Si NODE_ENV=production debería ser 404. En dev es 401 (auth).
        // Lo aceptable es: NO 200 sin auth (eso sería el bug B1).
        expect(res.status !== 200, `B1 regression — /debug/* responde 200 sin auth`);
    });

    await check('/api-docs cerrado en prod', async () => {
        const res = await fetch(`${API_URL}/api-docs`);
        // En prod debería ser 404. En dev es 200 con la UI de Swagger.
        const isDev = res.status === 200 || res.status === 301;
        if (process.env.NODE_ENV === 'production' && isDev) {
            throw new Error('B4 regression — Swagger expuesto en producción');
        }
    });

    // ─── Auth flow completo (si hay credenciales) ────────────────────────
    if (TEST_EMAIL && TEST_PASSWORD) {
        console.log(c.dim('\nAuth flow (con credenciales):'));

        let accessToken = '';
        await check('Login con credenciales válidas', async () => {
            const { res, body } = await fetchJson('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
            });
            expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
            accessToken = body?.tokens?.access || body?.data?.tokens?.access || '';
            expect(!!accessToken, 'No vino access token en la respuesta');
        });

        if (accessToken) {
            await check('GET /api/vehiculos con token funciona', async () => {
                const { res } = await fetchJson('/api/vehiculos', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                expect(res.status === 200, `Expected 200, got ${res.status}`);
            });

            await check('GET /api/clientes con token funciona', async () => {
                const { res } = await fetchJson('/api/clientes', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                expect(res.status === 200, `Expected 200, got ${res.status}`);
            });
        }
    } else {
        console.log(
            c.dim('\n(Para probar auth flow completo: TEST_EMAIL=... TEST_PASSWORD=... npm run smoke-test)')
        );
    }

    // ─── Resumen ─────────────────────────────────────────────────────────
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`\n${'─'.repeat(60)}`);
    if (failed === 0) {
        console.log(`${c.green(`✓ Todos los checks pasaron (${passed}/${total})`)}`);
        process.exit(0);
    } else {
        console.log(`${c.red(`✗ Fallaron ${failed} de ${total} checks`)}`);
        results
            .filter((r) => !r.passed)
            .forEach((r) => console.log(`  ${c.red('✗')} ${r.name}: ${r.detail}`));
        process.exit(1);
    }
})().catch((err) => {
    console.error(c.red(`\n💥 Error inesperado: ${err.message}`));
    process.exit(2);
});
