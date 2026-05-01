# Roadmap — AUTENZA

Plan de mejoras post-auditoría arquitectónica de abril 2026.

## Estado actual

| Sprint | Status | Notas |
|---|---|---|
| **Sprint 1 — "No nos rompan"** | ✅ Done | 7 vulnerabilidades críticas cerradas (debug routes, ventas sin auth, secrets hardcoded, swagger en prod, db push --accept-data-loss, hard-delete Concesionaria, JWT min 10) |
| **Sprint 2 — Estabilidad** | ✅ Done | TOCTOU createVenta, refresh atómico, axios lock, graceful shutdown, logger JSON, mass assignment, email enumeration, ESLint backend, Prettier |
| **Sprint 3 — Profesionalizar** | ✅ Done (parcial) | CI GitHub Actions, métricas Prometheus, Sentry SDK, /livez vs /readyz, outbox emails, soft-delete fantasma, FormField wrapper, ARCHITECTURE.md |
| **Sprint 4 — Refactors estructurales** | 🟡 In progress | Foundations hechas: Zod + validateZod, OpenAPI codegen, withTenantTx, migración piloto clientes, refactor parcial PresupuestosPage |
| **Sprint 5 — Compliance** | ⏳ TODO | Ley 25.326, AFIP WSFE, UIF |

---

## Sprint 4 — Refactors estructurales (XL)

### Foundations entregadas (commit Sprint 4 inicial)

✅ **`validateZod` middleware**: reemplazo type-safe de `express-validator`. Schemas viven en `*.schemas.ts` por módulo, errores estructurados con `path/message/code`, soporta `body | query | params`. Migrado: caja, clientes (piloto).

✅ **OpenAPI codegen pipeline**:
- Back: `npm run openapi:export` → `BackConcesionaria/openapi.json` (gitignored).
- Front: `npm run openapi:gen` → `FrontConcesionaria/src/types/api.generated.ts` (5134 líneas). Eventualmente reemplaza los 13 archivos manuales de `src/types/`.
- Workflow: cambiar el spec en el back via `@openapi` JSDoc → exportar → regenerar tipos en el front → CI puede validar drift.

✅ **`withTenantTx` helper**: en `infrastructure/database/withTenantTx.ts`. Abre UNA transacción, setea GUCs (`app.tenant_id`, `app.is_super_admin`) una vez, pasa `tx` "crudo" al callback. Reemplaza el patrón de `prisma.$transaction(...)` que con la extensión de Prisma generaba tx anidadas. Adoptarlo gradualmente en services nuevos.

✅ **Migración interface/ → modules/**: 4 dominios migrados (clientes, sucursales, proveedores, reservas) con paridad exacta de endpoints + Zod validation. Otros 18 dominios pendientes — algunos requieren port de endpoints específicos antes de migrar.

✅ **Refactor PresupuestosPage**: **1010 → 744 LOC** (-26%). Extraídos:
- `presupuestos.types.ts` (11 interfaces)
- `presupuestos.utils.ts` (helpers, constantes, calcTotal)
- `modals/EditPresupuestoModal.tsx`
- `modals/ConvertirAVentaModal.tsx`
- `modals/DetailPresupuestoModal.tsx`

Solo queda el CreatePresupuestoModal (~199 LOC) — conviene refactorizar con react-hook-form + Zod resolver.

✅ **Refactor parcial VentasPage**: 799 → 751 LOC. Extraídos:
- `ventas.types.ts` (PagoRow, ExtraRow, CanjeRow, VentaForm, BadgeVariant)
- `ventas.utils.ts` (status maps, transitions, factories)

✅ **Schemas Zod**: caja, clientes, sucursales, proveedores, reservas, vehiculos (preparado para próxima migración), gasto-fijo. 7 módulos cubiertos, 18 pendientes.

### Pendiente del Sprint 4 (incremental)


### A1. Unificar `modules/` vs `interface/` en backend

**Problema**: hay DOS arquitecturas conviviendo. Cada feature nueva fuerza un coin-flip de qué patrón usar. Multiplicó duplicación: dos errorHandlers, dos authenticate, dos config files, tres lugares donde se valida tenancy.

**Plan**:
1. Decidir patrón ganador: **funcional `modules/*`** (más simple, mejor mantenido).
2. Migrar features de `interface/` a `modules/`: cliente, vehiculo, presupuesto, financiacion, financiera, gasto, gasto-fijo, postventa-caso, postventa-item, solicitud-financiacion, audit-log, billing, concesionaria, sucursal, usuario, rol, vehiculo-archivo, vehiculo-movimiento, ingreso-vehiculo, reserva.
3. Para cada feature: copiar a `modules/<dom>/`, ajustar imports, validar tests, remover de `interface/`.
4. Borrar `interface/controllers`, `application/use-cases`, `infrastructure/database/repositories`, middlewares duplicados, `config/index.ts` legacy.
5. Borrar `src/auth/`, `src/middlewares/` (versiones viejas), `src/prisma/` (versión vieja con softDelete legacy).

**Esfuerzo estimado**: 2-3 semanas full-time. Hacerlo feature por feature, un PR por dominio.

**Riesgo**: medio. Hay tests de integration que cubren los flows críticos; correrlos en cada PR ayuda a detectar regresiones.

### A6. Romper pages monolíticas en feature folders (frontend)

**Problema**: `PresupuestosPage.tsx` (1010 LOC), `VentasPage.tsx` (799), `VehiculoDetallePage.tsx` (837) mezclan types, helpers, axios crudo, modales, tablas, filtros y conversiones. Bloquea code-splitting fino, tests y onboarding.

**Plan**: migrar a estructura feature-sliced:
```
src/features/<dominio>/
├── api/         (calls a backend)
├── components/  (sub-componentes específicos)
├── hooks/       (react-query)
├── pages/       (entry points)
├── types/
└── schemas/     (Zod)
```

Empezar por **presupuestos** (la más grande y problemática). Targets:
- Cada Page < 250 LOC
- Cada modal en su componente
- API calls por hook (no `client.post` directo en JSX como hoy en línea 8 de PresupuestosPage)

**Esfuerzo**: 1 semana por dominio. Hacer 3-4 dominios en este sprint.

### A4. Migración progresiva de express-validator a Zod

**Problema**: `zod` ya está como dep para `env.ts`. Validaciones de payloads usan express-validator (verbose, sin type-safety).

**Plan**: por cada `*.validation.ts`, escribir el schema Zod equivalente y reemplazar el middleware `validate`. Beneficios: type-safety entre validation y service, errores estructurados (`ZodIssue[]`), un solo paradigma.

**Esfuerzo**: ~1h por módulo × 25 módulos = 1 semana.

### A9. Shared types con OpenAPI / orval

**Problema**: `src/types/` del front tiene 13 archivos a mano duplicando enums (`EstadoVehiculo`, `EstadoPresupuesto`, `FormaPagoVenta`) que el back declara también. Drift garantizado.

**Plan**:
1. El back ya tiene Swagger. Exportar OpenAPI spec (`/api-docs.json`).
2. Setup `openapi-typescript` u `orval` en el front para generar `src/types/api.generated.ts`.
3. Añadir step a CI que falle si hay drift entre back spec y front types.
4. Migrar las páginas a usar los types generados.

**Esfuerzo**: 2-3 días.

### Capa transaccional honesta

**Problema**: la extensión Prisma abre una transacción por cada operación para setear GUCs. Cuando un service abre `prisma.$transaction(...)`, terminamos con tx anidadas (ineficiente).

**Plan**: helper `withTenantTx(fn)` que abra UNA transacción, setee `app.tenant_id` una vez, y reciba `tx` para pasar a los repositorios. Servicios usan `withTenantTx` en lugar de `prisma.$transaction`.

**Esfuerzo**: 3-4 días + migración de cada service.

---

## Sprint 5 — Compliance (Argentina)

### Ley 25.326 — Protección de Datos Personales

- [ ] Registrar la base de datos ante la AAIP (Agencia de Acceso a la Información Pública).
- [ ] Publicar política de privacidad (frontend).
- [ ] Endpoint `GET /api/account/me/export` que devuelve toda la data del usuario en JSON.
- [ ] Endpoint `DELETE /api/account/me` (right to be forgotten) — soft-delete + scrub de PII.
- [ ] Cifrar at-rest los campos sensibles (DNI, CUIT) con `pgcrypto` o KMS.
- [ ] Retention policy documentada (cuánto guardamos cada tipo de dato).

### AFIP — Facturación electrónica

- [ ] El módulo billing emite "facturas" internas. Sin integración con WSFE no tienen validez fiscal.
- [ ] Si la concesionaria cobra a través del sistema → riesgo legal.
- [ ] Integración con `@afipsdk/afip.ts` o lib similar.
- [ ] Generar comprobantes A/B/C según condición IVA.

### UIF Resolución 28/2018

- [ ] Concesionarias son sujetos obligados.
- [ ] Reportar operaciones >umbral (USD 10k aprox).
- [ ] Export para presentar ROS (Reporte de Operación Sospechosa).

---

## Backlog técnico (sin sprint asignado)

- [ ] **D1. Outbox pattern para auditoría + eventos derivados**: hoy `audit()` se llama post-operación, fuera de la tx. Igual con futuros `MovimientoCaja` derivados de `Venta`. Mover a outbox table + worker para idempotencia y retries.
- [ ] **CSP del front con nonces o hashes** en lugar de `'unsafe-inline'` en style-src.
- [ ] **Multer con disk storage** o S3-compatible en lugar de memoryStorage 25MB (OOM trivial bajo carga).
- [ ] **Bcrypt cost factor 12** (hoy 10).
- [ ] **JWT con `iss`/`aud` explícitos** + `algorithms: ['HS256']` whitelist.
- [ ] **Indices faltantes**: `usuarios.concesionariaId+estado`, `vehiculos.estado+concesionariaId`, `audit_log.concesionariaId+createdAt`.
- [ ] **Cursor-based pagination** en listas grandes (hoy `findMany + count` por separado).
- [ ] **Tests faltantes** del back: financiación, presupuesto→venta, caja, billing.
- [ ] **MSW + tests de hooks de data-fetching** del front.
- [ ] **Playwright E2E** sobre login + alta vehículo + alta venta.
- [ ] **Husky + lint-staged** en pre-commit (lint, format, typecheck).
- [ ] **Coverage threshold** publicado en CI.
- [ ] **CSS strategy unificada**: hoy `index.css` 1730 LOC + 155 `style={{}}` inline + clases custom + utilities a mano. Decidir Tailwind v4 o CSS Modules.
- [ ] **`api/client.ts` interceptor**: ya tiene lock para refresh concurrente (Sprint 2). TODO: usar `useNavigate` desde un componente raíz en lugar del custom event.
- [ ] **DataTable accessibility**: `<tr onClick>` sin `role="button"` ni keyboard nav.
- [ ] **Modal focus trap + restoration** al cerrar.
- [ ] **Toast con sonner o useId()** en lugar de `Date.now()` que colisiona en ráfaga.
- [ ] **Reducir los 976 warnings de ESLint** progresivamente. Bajar `--max-warnings` paso a paso.

---

## Métricas de éxito

| Métrica | Hoy | Target Q3 2026 |
|---|---|---|
| Coverage backend | ~30% | 60% |
| Coverage frontend | <5% | 30% |
| `any` en backend | 437 | <50 |
| ESLint warnings backend | 976 | <100 |
| Pages monolíticas (>500 LOC) | 8 | 0 |
| Tests E2E | 0 | 10+ |
| Sentry/APM | Setup, sin DSN | Activo en prod |
| CI green rate | N/A | >95% |

---

## Cómo contribuir

1. Cada Sprint 4+ requiere un PR por feature (no megapulls).
2. Antes de cada PR: `npm run typecheck && npm run lint && npm test && npm run build`.
3. Linkear el item del roadmap en el PR description.
4. Pedir review antes de mergear.
