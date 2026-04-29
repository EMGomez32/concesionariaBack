import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

/**
 * Servicio de analytics. Acepta filtros opcionales por rango de fechas y
 * sucursal. El aislamiento por concesionariaId se garantiza vía RLS
 * (contextMiddleware setea app.tenant_id en la sesión).
 *
 * Para super_admin que pasa concesionariaId explícito, las queries lo
 * recibo y filtro a nivel SQL — RLS no aplica porque is_super_admin=true.
 */

export interface AnalyticsFilter {
    /** Rango inicio (incluido). Default: hace 30 días. */
    from?: Date;
    /** Rango fin (incluido). Default: hoy. */
    to?: Date;
    /** Filtro opcional por sucursal. */
    sucursalId?: number;
    /** Solo super_admin: filtra por una concesionaria específica (RLS bypaseada). */
    concesionariaId?: number;
}

/* ──────────────────────── Helpers ──────────────────────── */

const today = (): Date => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
};

const daysAgo = (n: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
};

const monthsAgo = (n: number): Date => {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

const startOfMonth = (date: Date): Date => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfMonth = (date: Date): Date => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
};

/** Resuelve los filtros con defaults. */
const resolve = (f: AnalyticsFilter) => ({
    from: f.from ?? daysAgo(30),
    to: f.to ?? today(),
    sucursalId: f.sucursalId,
    concesionariaId: f.concesionariaId,
});

const num = (v: unknown): number => Number(v ?? 0);

/* ────────────────────── Overview KPIs ────────────────────── */

export interface OverviewKpis {
    stockTotal: number;
    stockPublicado: number;
    valorInventario: number;
    ventasMes: { cantidad: number; monto: number };
    ventasMesAnterior: { cantidad: number; monto: number };
    ticketPromedioMes: number;
    ingresosCajaMes: number;
    egresosCajaMes: number;
    casosPostventaAbiertos: number;
    cuotasVencidas: { cantidad: number; monto: number };
    presupuestosActivos: number;
}

export const getOverview = async (filter: AnalyticsFilter): Promise<OverviewKpis> => {
    const { concesionariaId } = resolve(filter);
    const tenantClause = concesionariaId
        ? Prisma.sql`AND concesionaria_id = ${concesionariaId}`
        : Prisma.empty;

    const inicioMes = startOfMonth(new Date());
    const finMes = endOfMonth(new Date());
    const inicioMesAnt = startOfMonth(monthsAgo(1));
    const finMesAnt = endOfMonth(monthsAgo(1));

    // ── Stock
    const stockRows = await prisma.$queryRaw<{ total: bigint; publicado: bigint; valor: string }[]>(
        Prisma.sql`
            SELECT
                COUNT(*)::bigint AS total,
                COUNT(*) FILTER (WHERE estado = 'publicado')::bigint AS publicado,
                COALESCE(SUM(precio_lista) FILTER (WHERE estado IN ('preparacion', 'publicado', 'reservado')), 0)::text AS valor
            FROM vehiculos
            WHERE deleted_at IS NULL ${tenantClause}
        `
    );

    // ── Ventas mes actual
    const ventasMesRows = await prisma.$queryRaw<{ cantidad: bigint; monto: string }[]>(
        Prisma.sql`
            SELECT COUNT(*)::bigint AS cantidad, COALESCE(SUM(precio_venta), 0)::text AS monto
            FROM ventas
            WHERE deleted_at IS NULL
              AND fecha_venta >= ${inicioMes} AND fecha_venta <= ${finMes}
              ${tenantClause}
        `
    );

    // ── Ventas mes anterior
    const ventasMesAntRows = await prisma.$queryRaw<{ cantidad: bigint; monto: string }[]>(
        Prisma.sql`
            SELECT COUNT(*)::bigint AS cantidad, COALESCE(SUM(precio_venta), 0)::text AS monto
            FROM ventas
            WHERE deleted_at IS NULL
              AND fecha_venta >= ${inicioMesAnt} AND fecha_venta <= ${finMesAnt}
              ${tenantClause}
        `
    );

    // ── Caja del mes (movimientos)
    const cajaMesRows = await prisma.$queryRaw<{ ingresos: string; egresos: string }[]>(
        Prisma.sql`
            SELECT
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::text AS ingresos,
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0)::text AS egresos
            FROM movimientos_caja
            WHERE deleted_at IS NULL
              AND fecha >= ${inicioMes} AND fecha <= ${finMes}
              ${tenantClause}
        `
    );

    // ── Postventa abierta
    const postvRows = await prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`
            SELECT COUNT(*)::bigint AS total
            FROM postventa_casos
            WHERE deleted_at IS NULL AND estado IN ('pendiente', 'en_proceso')
              ${tenantClause}
        `
    );

    // ── Cuotas vencidas
    const cuotasRows = await prisma.$queryRaw<{ cantidad: bigint; monto: string }[]>(
        Prisma.sql`
            SELECT COUNT(*)::bigint AS cantidad, COALESCE(SUM(saldo_cuota), 0)::text AS monto
            FROM cuotas
            WHERE deleted_at IS NULL
              AND estado IN ('pendiente', 'parcial')
              AND vencimiento < CURRENT_DATE
              ${tenantClause}
        `
    );

    // ── Presupuestos activos (no vencidos, no convertidos)
    const presRows = await prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`
            SELECT COUNT(*)::bigint AS total
            FROM presupuestos
            WHERE deleted_at IS NULL
              AND estado IN ('borrador', 'enviado')
              ${tenantClause}
        `
    );

    const cantidadMes = num(ventasMesRows[0]?.cantidad);
    const montoMes = num(ventasMesRows[0]?.monto);

    return {
        stockTotal: num(stockRows[0]?.total),
        stockPublicado: num(stockRows[0]?.publicado),
        valorInventario: num(stockRows[0]?.valor),
        ventasMes: { cantidad: cantidadMes, monto: montoMes },
        ventasMesAnterior: {
            cantidad: num(ventasMesAntRows[0]?.cantidad),
            monto: num(ventasMesAntRows[0]?.monto),
        },
        ticketPromedioMes: cantidadMes > 0 ? montoMes / cantidadMes : 0,
        ingresosCajaMes: num(cajaMesRows[0]?.ingresos),
        egresosCajaMes: num(cajaMesRows[0]?.egresos),
        casosPostventaAbiertos: num(postvRows[0]?.total),
        cuotasVencidas: {
            cantidad: num(cuotasRows[0]?.cantidad),
            monto: num(cuotasRows[0]?.monto),
        },
        presupuestosActivos: num(presRows[0]?.total),
    };
};

/* ────────────────────── Ventas detail ────────────────────── */

export interface VentasAnalytics {
    serieMensual: Array<{ mes: string; cantidad: number; monto: number }>;
    porVendedor: Array<{ vendedorId: number; nombre: string; cantidad: number; monto: number }>;
    porModelo: Array<{ marca: string; modelo: string; cantidad: number; monto: number }>;
    porFormaPago: Array<{ formaPago: string; cantidad: number; monto: number }>;
    conversion: { presupuestos: number; ventas: number; tasa: number };
    diasPromedioStock: number;
}

export const getVentas = async (filter: AnalyticsFilter): Promise<VentasAnalytics> => {
    const r = resolve(filter);
    const tenantClause = r.concesionariaId
        ? Prisma.sql`AND concesionaria_id = ${r.concesionariaId}`
        : Prisma.empty;

    // ── Serie mensual (últimos 12 meses)
    const inicio12 = monthsAgo(11);
    const serieRows = await prisma.$queryRaw<{ mes: string; cantidad: bigint; monto: string }[]>(
        Prisma.sql`
            SELECT
                TO_CHAR(DATE_TRUNC('month', fecha_venta), 'YYYY-MM') AS mes,
                COUNT(*)::bigint AS cantidad,
                COALESCE(SUM(precio_venta), 0)::text AS monto
            FROM ventas
            WHERE deleted_at IS NULL
              AND fecha_venta >= ${inicio12}
              ${tenantClause}
            GROUP BY DATE_TRUNC('month', fecha_venta)
            ORDER BY DATE_TRUNC('month', fecha_venta) ASC
        `
    );

    // ── Top vendedores en el rango
    const vendRows = await prisma.$queryRaw<
        { vendedorId: number; nombre: string; cantidad: bigint; monto: string }[]
    >(
        Prisma.sql`
            SELECT
                v.vendedor_id AS "vendedorId",
                u.nombre,
                COUNT(*)::bigint AS cantidad,
                COALESCE(SUM(v.precio_venta), 0)::text AS monto
            FROM ventas v
            JOIN usuarios u ON u.id = v.vendedor_id
            WHERE v.deleted_at IS NULL
              AND v.fecha_venta >= ${r.from} AND v.fecha_venta <= ${r.to}
              ${r.concesionariaId ? Prisma.sql`AND v.concesionaria_id = ${r.concesionariaId}` : Prisma.empty}
            GROUP BY v.vendedor_id, u.nombre
            ORDER BY monto DESC
            LIMIT 10
        `
    );

    // ── Top modelos vendidos
    const modeloRows = await prisma.$queryRaw<
        { marca: string; modelo: string; cantidad: bigint; monto: string }[]
    >(
        Prisma.sql`
            SELECT
                veh.marca,
                veh.modelo,
                COUNT(*)::bigint AS cantidad,
                COALESCE(SUM(v.precio_venta), 0)::text AS monto
            FROM ventas v
            JOIN vehiculos veh ON veh.id = v.vehiculo_id
            WHERE v.deleted_at IS NULL
              AND v.fecha_venta >= ${r.from} AND v.fecha_venta <= ${r.to}
              ${r.concesionariaId ? Prisma.sql`AND v.concesionaria_id = ${r.concesionariaId}` : Prisma.empty}
            GROUP BY veh.marca, veh.modelo
            ORDER BY cantidad DESC
            LIMIT 10
        `
    );

    // ── Por forma de pago
    const fpRows = await prisma.$queryRaw<
        { formaPago: string; cantidad: bigint; monto: string }[]
    >(
        Prisma.sql`
            SELECT
                forma_pago AS "formaPago",
                COUNT(*)::bigint AS cantidad,
                COALESCE(SUM(precio_venta), 0)::text AS monto
            FROM ventas
            WHERE deleted_at IS NULL
              AND fecha_venta >= ${r.from} AND fecha_venta <= ${r.to}
              ${tenantClause}
            GROUP BY forma_pago
            ORDER BY monto DESC
        `
    );

    // ── Conversión presupuesto → venta
    const convRows = await prisma.$queryRaw<{ presupuestos: bigint; ventas: bigint }[]>(
        Prisma.sql`
            SELECT
                (SELECT COUNT(*) FROM presupuestos
                 WHERE deleted_at IS NULL
                   AND fecha_creacion >= ${r.from} AND fecha_creacion <= ${r.to}
                   ${tenantClause})::bigint AS presupuestos,
                (SELECT COUNT(*) FROM ventas
                 WHERE deleted_at IS NULL
                   AND fecha_venta >= ${r.from} AND fecha_venta <= ${r.to}
                   AND presupuesto_id IS NOT NULL
                   ${tenantClause})::bigint AS ventas
        `
    );

    // ── Días promedio en stock (ingreso → venta)
    const diasRows = await prisma.$queryRaw<{ promedio: string | null }[]>(
        Prisma.sql`
            SELECT AVG(EXTRACT(DAY FROM (v.fecha_venta::timestamp - veh.fecha_ingreso::timestamp)))::text AS promedio
            FROM ventas v
            JOIN vehiculos veh ON veh.id = v.vehiculo_id
            WHERE v.deleted_at IS NULL
              AND v.fecha_venta >= ${r.from} AND v.fecha_venta <= ${r.to}
              ${r.concesionariaId ? Prisma.sql`AND v.concesionaria_id = ${r.concesionariaId}` : Prisma.empty}
        `
    );

    const presupuestos = num(convRows[0]?.presupuestos);
    const ventas = num(convRows[0]?.ventas);

    return {
        serieMensual: serieRows.map(s => ({
            mes: s.mes,
            cantidad: num(s.cantidad),
            monto: num(s.monto),
        })),
        porVendedor: vendRows.map(v => ({
            vendedorId: v.vendedorId,
            nombre: v.nombre,
            cantidad: num(v.cantidad),
            monto: num(v.monto),
        })),
        porModelo: modeloRows.map(m => ({
            marca: m.marca,
            modelo: m.modelo,
            cantidad: num(m.cantidad),
            monto: num(m.monto),
        })),
        porFormaPago: fpRows.map(f => ({
            formaPago: f.formaPago,
            cantidad: num(f.cantidad),
            monto: num(f.monto),
        })),
        conversion: {
            presupuestos,
            ventas,
            tasa: presupuestos > 0 ? (ventas / presupuestos) * 100 : 0,
        },
        diasPromedioStock: Math.round(num(diasRows[0]?.promedio)),
    };
};

/* ────────────────────── Stock detail ────────────────────── */

export interface StockAnalytics {
    porEstado: Array<{ estado: string; cantidad: number; valor: number }>;
    porMarca: Array<{ marca: string; cantidad: number; valor: number }>;
    porSucursal: Array<{ sucursalId: number; nombre: string; cantidad: number; valor: number }>;
    antiguedad: Array<{ rango: string; cantidad: number }>;
    valorTotal: number;
}

export const getStock = async (filter: AnalyticsFilter): Promise<StockAnalytics> => {
    const r = resolve(filter);
    const tenantClause = r.concesionariaId
        ? Prisma.sql`AND v.concesionaria_id = ${r.concesionariaId}`
        : Prisma.empty;

    // Solo stock vivo (no vendido, no eliminado)
    const baseFilter = Prisma.sql`v.deleted_at IS NULL AND v.estado IN ('preparacion', 'publicado', 'reservado') ${tenantClause}`;

    const estadoRows = await prisma.$queryRaw<{ estado: string; cantidad: bigint; valor: string }[]>(
        Prisma.sql`
            SELECT
                v.estado::text AS estado,
                COUNT(*)::bigint AS cantidad,
                COALESCE(SUM(v.precio_lista), 0)::text AS valor
            FROM vehiculos v
            WHERE v.deleted_at IS NULL ${tenantClause}
            GROUP BY v.estado
        `
    );

    const marcaRows = await prisma.$queryRaw<
        { marca: string; cantidad: bigint; valor: string }[]
    >(
        Prisma.sql`
            SELECT v.marca, COUNT(*)::bigint AS cantidad, COALESCE(SUM(v.precio_lista), 0)::text AS valor
            FROM vehiculos v
            WHERE ${baseFilter}
            GROUP BY v.marca
            ORDER BY cantidad DESC
            LIMIT 10
        `
    );

    const sucRows = await prisma.$queryRaw<
        { sucursalId: number; nombre: string; cantidad: bigint; valor: string }[]
    >(
        Prisma.sql`
            SELECT v.sucursal_id AS "sucursalId", s.nombre,
                COUNT(*)::bigint AS cantidad, COALESCE(SUM(v.precio_lista), 0)::text AS valor
            FROM vehiculos v
            JOIN sucursales s ON s.id = v.sucursal_id
            WHERE ${baseFilter}
            GROUP BY v.sucursal_id, s.nombre
            ORDER BY cantidad DESC
        `
    );

    const antRows = await prisma.$queryRaw<{ rango: string; cantidad: bigint }[]>(
        Prisma.sql`
            SELECT
                CASE
                    WHEN CURRENT_DATE - v.fecha_ingreso <= 30 THEN '0-30 días'
                    WHEN CURRENT_DATE - v.fecha_ingreso <= 60 THEN '31-60 días'
                    WHEN CURRENT_DATE - v.fecha_ingreso <= 90 THEN '61-90 días'
                    WHEN CURRENT_DATE - v.fecha_ingreso <= 180 THEN '91-180 días'
                    ELSE '+180 días'
                END AS rango,
                COUNT(*)::bigint AS cantidad
            FROM vehiculos v
            WHERE ${baseFilter}
            GROUP BY rango
            ORDER BY MIN(CURRENT_DATE - v.fecha_ingreso)
        `
    );

    const valorTotal = estadoRows
        .filter(e => ['preparacion', 'publicado', 'reservado'].includes(e.estado))
        .reduce((acc, e) => acc + num(e.valor), 0);

    return {
        porEstado: estadoRows.map(e => ({
            estado: e.estado,
            cantidad: num(e.cantidad),
            valor: num(e.valor),
        })),
        porMarca: marcaRows.map(m => ({
            marca: m.marca,
            cantidad: num(m.cantidad),
            valor: num(m.valor),
        })),
        porSucursal: sucRows.map(s => ({
            sucursalId: s.sucursalId,
            nombre: s.nombre,
            cantidad: num(s.cantidad),
            valor: num(s.valor),
        })),
        antiguedad: antRows.map(a => ({ rango: a.rango, cantidad: num(a.cantidad) })),
        valorTotal,
    };
};

/* ────────────────────── Financiación ────────────────────── */

export interface FinanciacionAnalytics {
    activas: number;
    montoFinanciadoTotal: number;
    saldoPendiente: number;
    cuotasPorEstado: Array<{ estado: string; cantidad: number; monto: number }>;
    moraSegmentada: Array<{ rango: string; cantidad: number; monto: number }>;
    proximasVencer: Array<{ rango: string; cantidad: number; monto: number }>;
}

export const getFinanciacion = async (filter: AnalyticsFilter): Promise<FinanciacionAnalytics> => {
    const r = resolve(filter);
    const tenantClause = r.concesionariaId
        ? Prisma.sql`AND concesionaria_id = ${r.concesionariaId}`
        : Prisma.empty;

    const activasRows = await prisma.$queryRaw<{ activas: bigint; total: string }[]>(
        Prisma.sql`
            SELECT
                COUNT(*) FILTER (WHERE estado = 'activa')::bigint AS activas,
                COALESCE(SUM(monto_financiado) FILTER (WHERE estado = 'activa'), 0)::text AS total
            FROM financiaciones
            WHERE deleted_at IS NULL ${tenantClause}
        `
    );

    const cuotasRows = await prisma.$queryRaw<
        { estado: string; cantidad: bigint; monto: string }[]
    >(
        Prisma.sql`
            SELECT estado::text, COUNT(*)::bigint AS cantidad, COALESCE(SUM(saldo_cuota), 0)::text AS monto
            FROM cuotas
            WHERE deleted_at IS NULL ${tenantClause}
            GROUP BY estado
        `
    );

    const saldoPendienteRow = await prisma.$queryRaw<{ saldo: string }[]>(
        Prisma.sql`
            SELECT COALESCE(SUM(saldo_cuota), 0)::text AS saldo
            FROM cuotas
            WHERE deleted_at IS NULL AND estado IN ('pendiente', 'parcial') ${tenantClause}
        `
    );

    const moraRows = await prisma.$queryRaw<
        { rango: string; cantidad: bigint; monto: string }[]
    >(
        Prisma.sql`
            SELECT
                CASE
                    WHEN CURRENT_DATE - vencimiento <= 7 THEN '1-7 días'
                    WHEN CURRENT_DATE - vencimiento <= 30 THEN '8-30 días'
                    WHEN CURRENT_DATE - vencimiento <= 60 THEN '31-60 días'
                    WHEN CURRENT_DATE - vencimiento <= 90 THEN '61-90 días'
                    ELSE '+90 días'
                END AS rango,
                COUNT(*)::bigint AS cantidad,
                COALESCE(SUM(saldo_cuota), 0)::text AS monto
            FROM cuotas
            WHERE deleted_at IS NULL
              AND estado IN ('pendiente', 'parcial')
              AND vencimiento < CURRENT_DATE
              ${tenantClause}
            GROUP BY rango
            ORDER BY MIN(CURRENT_DATE - vencimiento)
        `
    );

    const proxRows = await prisma.$queryRaw<
        { rango: string; cantidad: bigint; monto: string }[]
    >(
        Prisma.sql`
            SELECT
                CASE
                    WHEN vencimiento - CURRENT_DATE <= 7 THEN 'Próximos 7 días'
                    WHEN vencimiento - CURRENT_DATE <= 15 THEN '8-15 días'
                    WHEN vencimiento - CURRENT_DATE <= 30 THEN '16-30 días'
                END AS rango,
                COUNT(*)::bigint AS cantidad,
                COALESCE(SUM(saldo_cuota), 0)::text AS monto
            FROM cuotas
            WHERE deleted_at IS NULL
              AND estado IN ('pendiente', 'parcial')
              AND vencimiento >= CURRENT_DATE
              AND vencimiento <= CURRENT_DATE + INTERVAL '30 days'
              ${tenantClause}
            GROUP BY rango
            ORDER BY MIN(vencimiento - CURRENT_DATE)
        `
    );

    return {
        activas: num(activasRows[0]?.activas),
        montoFinanciadoTotal: num(activasRows[0]?.total),
        saldoPendiente: num(saldoPendienteRow[0]?.saldo),
        cuotasPorEstado: cuotasRows.map(c => ({
            estado: c.estado,
            cantidad: num(c.cantidad),
            monto: num(c.monto),
        })),
        moraSegmentada: moraRows.map(m => ({
            rango: m.rango,
            cantidad: num(m.cantidad),
            monto: num(m.monto),
        })),
        proximasVencer: proxRows
            .filter(p => p.rango !== null)
            .map(p => ({
                rango: p.rango,
                cantidad: num(p.cantidad),
                monto: num(p.monto),
            })),
    };
};

/* ────────────────────── Caja ────────────────────── */

export interface CajaAnalytics {
    saldosPorCaja: Array<{ cajaId: number; nombre: string; tipo: string; saldo: number }>;
    serieDiaria: Array<{ fecha: string; ingresos: number; egresos: number }>;
    porOrigen: Array<{ origen: string; ingresos: number; egresos: number }>;
    totalIngresos: number;
    totalEgresos: number;
}

export const getCaja = async (filter: AnalyticsFilter): Promise<CajaAnalytics> => {
    const r = resolve(filter);
    const tenantClause = r.concesionariaId
        ? Prisma.sql`AND concesionaria_id = ${r.concesionariaId}`
        : Prisma.empty;

    // Saldo por caja: último cierre + movimientos posteriores
    const saldosRows = await prisma.$queryRaw<
        { cajaId: number; nombre: string; tipo: string; saldo: string }[]
    >(
        Prisma.sql`
            WITH ultimos_cierres AS (
                SELECT DISTINCT ON (caja_id)
                    caja_id, fecha,
                    COALESCE(saldo_real, saldo_teorico) AS saldo_base
                FROM cierres_caja
                WHERE deleted_at IS NULL
                ORDER BY caja_id, fecha DESC
            ),
            deltas AS (
                SELECT
                    m.caja_id,
                    SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END) AS delta
                FROM movimientos_caja m
                LEFT JOIN ultimos_cierres uc ON uc.caja_id = m.caja_id
                WHERE m.deleted_at IS NULL
                  AND (uc.fecha IS NULL OR m.fecha > uc.fecha)
                GROUP BY m.caja_id
            )
            SELECT
                c.id AS "cajaId",
                c.nombre,
                c.tipo::text AS tipo,
                (COALESCE(uc.saldo_base, 0) + COALESCE(d.delta, 0))::text AS saldo
            FROM cajas c
            LEFT JOIN ultimos_cierres uc ON uc.caja_id = c.id
            LEFT JOIN deltas d ON d.caja_id = c.id
            WHERE c.deleted_at IS NULL AND c.activo = true
              ${r.concesionariaId ? Prisma.sql`AND c.concesionaria_id = ${r.concesionariaId}` : Prisma.empty}
            ORDER BY c.id
        `
    );

    const serieRows = await prisma.$queryRaw<
        { fecha: Date; ingresos: string; egresos: string }[]
    >(
        Prisma.sql`
            SELECT fecha,
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::text AS ingresos,
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0)::text AS egresos
            FROM movimientos_caja
            WHERE deleted_at IS NULL
              AND fecha >= ${r.from} AND fecha <= ${r.to}
              ${tenantClause}
            GROUP BY fecha
            ORDER BY fecha ASC
        `
    );

    const origenRows = await prisma.$queryRaw<
        { origen: string; ingresos: string; egresos: string }[]
    >(
        Prisma.sql`
            SELECT origen::text,
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::text AS ingresos,
                COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0)::text AS egresos
            FROM movimientos_caja
            WHERE deleted_at IS NULL
              AND fecha >= ${r.from} AND fecha <= ${r.to}
              ${tenantClause}
            GROUP BY origen
        `
    );

    const totalIngresos = serieRows.reduce((acc, s) => acc + num(s.ingresos), 0);
    const totalEgresos = serieRows.reduce((acc, s) => acc + num(s.egresos), 0);

    return {
        saldosPorCaja: saldosRows.map(s => ({
            cajaId: s.cajaId,
            nombre: s.nombre,
            tipo: s.tipo,
            saldo: num(s.saldo),
        })),
        serieDiaria: serieRows.map(s => ({
            fecha: (s.fecha instanceof Date ? s.fecha : new Date(s.fecha))
                .toISOString().slice(0, 10),
            ingresos: num(s.ingresos),
            egresos: num(s.egresos),
        })),
        porOrigen: origenRows.map(o => ({
            origen: o.origen,
            ingresos: num(o.ingresos),
            egresos: num(o.egresos),
        })),
        totalIngresos,
        totalEgresos,
    };
};

/* ────────────────────── Gastos ────────────────────── */

export interface GastosAnalytics {
    porCategoriaUnidad: Array<{ categoria: string; total: number; cantidad: number }>;
    porCategoriaFijo: Array<{ categoria: string; total: number; cantidad: number }>;
    serieMensual: Array<{ mes: string; unidades: number; fijos: number }>;
    topVehiculos: Array<{ vehiculoId: number; descripcion: string; total: number }>;
    totalUnidadesRango: number;
    totalFijosRango: number;
}

export const getGastos = async (filter: AnalyticsFilter): Promise<GastosAnalytics> => {
    const r = resolve(filter);
    const tenantClauseGv = r.concesionariaId
        ? Prisma.sql`AND gv.concesionaria_id = ${r.concesionariaId}`
        : Prisma.empty;
    const tenantClauseGf = r.concesionariaId
        ? Prisma.sql`AND gf.concesionaria_id = ${r.concesionariaId}`
        : Prisma.empty;

    const catUnidadRows = await prisma.$queryRaw<
        { categoria: string; total: string; cantidad: bigint }[]
    >(
        Prisma.sql`
            SELECT cat.nombre AS categoria,
                COALESCE(SUM(gv.monto), 0)::text AS total,
                COUNT(*)::bigint AS cantidad
            FROM gastos_vehiculo gv
            JOIN categorias_gasto_vehiculo cat ON cat.id = gv.categoria_id
            WHERE gv.deleted_at IS NULL
              AND gv.fecha >= ${r.from} AND gv.fecha <= ${r.to}
              ${tenantClauseGv}
            GROUP BY cat.nombre
            ORDER BY total DESC
            LIMIT 10
        `
    );

    const catFijoRows = await prisma.$queryRaw<
        { categoria: string; total: string; cantidad: bigint }[]
    >(
        Prisma.sql`
            SELECT cat.nombre AS categoria,
                COALESCE(SUM(gf.monto), 0)::text AS total,
                COUNT(*)::bigint AS cantidad
            FROM gastos_fijos gf
            JOIN categorias_gasto_fijo cat ON cat.id = gf.categoria_id
            WHERE gf.deleted_at IS NULL
              AND DATE(MAKE_DATE(gf.anio, gf.mes, 1)) >= DATE_TRUNC('month', ${r.from}::timestamp)
              AND DATE(MAKE_DATE(gf.anio, gf.mes, 1)) <= DATE_TRUNC('month', ${r.to}::timestamp)
              ${tenantClauseGf}
            GROUP BY cat.nombre
            ORDER BY total DESC
            LIMIT 10
        `
    );

    // Series últimos 6 meses
    const inicio6 = monthsAgo(5);

    const serieUnidadRows = await prisma.$queryRaw<{ mes: string; total: string }[]>(
        Prisma.sql`
            SELECT TO_CHAR(DATE_TRUNC('month', gv.fecha), 'YYYY-MM') AS mes,
                COALESCE(SUM(gv.monto), 0)::text AS total
            FROM gastos_vehiculo gv
            WHERE gv.deleted_at IS NULL AND gv.fecha >= ${inicio6}
              ${tenantClauseGv}
            GROUP BY DATE_TRUNC('month', gv.fecha)
            ORDER BY DATE_TRUNC('month', gv.fecha)
        `
    );

    const serieFijoRows = await prisma.$queryRaw<{ mes: string; total: string }[]>(
        Prisma.sql`
            SELECT TO_CHAR(MAKE_DATE(gf.anio, gf.mes, 1), 'YYYY-MM') AS mes,
                COALESCE(SUM(gf.monto), 0)::text AS total
            FROM gastos_fijos gf
            WHERE gf.deleted_at IS NULL
              AND MAKE_DATE(gf.anio, gf.mes, 1) >= DATE_TRUNC('month', ${inicio6}::timestamp)
              ${tenantClauseGf}
            GROUP BY gf.anio, gf.mes
            ORDER BY gf.anio, gf.mes
        `
    );

    // Merge series
    const allMonths = new Map<string, { unidades: number; fijos: number }>();
    serieUnidadRows.forEach(s => {
        allMonths.set(s.mes, { unidades: num(s.total), fijos: 0 });
    });
    serieFijoRows.forEach(s => {
        const ex = allMonths.get(s.mes) ?? { unidades: 0, fijos: 0 };
        ex.fijos = num(s.total);
        allMonths.set(s.mes, ex);
    });
    const serieMensual = Array.from(allMonths.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, v]) => ({ mes, ...v }));

    // Top vehículos con más gastos
    const topVehRows = await prisma.$queryRaw<
        { vehiculoId: number; descripcion: string; total: string }[]
    >(
        Prisma.sql`
            SELECT v.id AS "vehiculoId",
                CONCAT_WS(' ', v.marca, v.modelo, v.dominio) AS descripcion,
                COALESCE(SUM(gv.monto), 0)::text AS total
            FROM gastos_vehiculo gv
            JOIN vehiculos v ON v.id = gv.vehiculo_id
            WHERE gv.deleted_at IS NULL
              AND gv.fecha >= ${r.from} AND gv.fecha <= ${r.to}
              ${tenantClauseGv}
            GROUP BY v.id, v.marca, v.modelo, v.dominio
            ORDER BY total DESC
            LIMIT 5
        `
    );

    const totalUnidadesRango = catUnidadRows.reduce((acc, c) => acc + num(c.total), 0);
    const totalFijosRango = catFijoRows.reduce((acc, c) => acc + num(c.total), 0);

    return {
        porCategoriaUnidad: catUnidadRows.map(c => ({
            categoria: c.categoria,
            total: num(c.total),
            cantidad: num(c.cantidad),
        })),
        porCategoriaFijo: catFijoRows.map(c => ({
            categoria: c.categoria,
            total: num(c.total),
            cantidad: num(c.cantidad),
        })),
        serieMensual,
        topVehiculos: topVehRows.map(t => ({
            vehiculoId: t.vehiculoId,
            descripcion: t.descripcion,
            total: num(t.total),
        })),
        totalUnidadesRango,
        totalFijosRango,
    };
};

/* ────────────────────── Postventa ────────────────────── */

export interface PostventaAnalytics {
    porEstado: Array<{ estado: string; cantidad: number }>;
    diasPromedioResolucion: number;
    costoTotalMes: number;
    casosMes: number;
    serieMensual: Array<{ mes: string; cantidad: number; costo: number }>;
}

export const getPostventa = async (filter: AnalyticsFilter): Promise<PostventaAnalytics> => {
    const r = resolve(filter);
    const tenantCasos = r.concesionariaId
        ? Prisma.sql`AND pc.concesionaria_id = ${r.concesionariaId}`
        : Prisma.empty;

    const estadoRows = await prisma.$queryRaw<{ estado: string; cantidad: bigint }[]>(
        Prisma.sql`
            SELECT pc.estado::text AS estado, COUNT(*)::bigint AS cantidad
            FROM postventa_casos pc
            WHERE pc.deleted_at IS NULL ${tenantCasos}
            GROUP BY pc.estado
        `
    );

    const diasRow = await prisma.$queryRaw<{ promedio: string | null }[]>(
        Prisma.sql`
            SELECT AVG(EXTRACT(DAY FROM (pc.fecha_cierre::timestamp - pc.fecha_reclamo::timestamp)))::text AS promedio
            FROM postventa_casos pc
            WHERE pc.deleted_at IS NULL
              AND pc.estado = 'cerrado'
              AND pc.fecha_cierre IS NOT NULL
              ${tenantCasos}
        `
    );

    const inicioMes = startOfMonth(new Date());
    const finMes = endOfMonth(new Date());

    const mesRows = await prisma.$queryRaw<{ casos: bigint; costo: string }[]>(
        Prisma.sql`
            SELECT
                (SELECT COUNT(*) FROM postventa_casos pc
                 WHERE pc.deleted_at IS NULL
                   AND pc.fecha_reclamo >= ${inicioMes} AND pc.fecha_reclamo <= ${finMes}
                   ${tenantCasos})::bigint AS casos,
                (SELECT COALESCE(SUM(pi.monto), 0) FROM postventa_items pi
                 JOIN postventa_casos pc ON pc.id = pi.caso_id
                 WHERE pi.deleted_at IS NULL
                   AND pi.fecha >= ${inicioMes} AND pi.fecha <= ${finMes}
                   ${tenantCasos})::text AS costo
        `
    );

    // Serie últimos 6 meses
    const inicio6 = monthsAgo(5);
    const serieRows = await prisma.$queryRaw<
        { mes: string; cantidad: bigint; costo: string }[]
    >(
        Prisma.sql`
            SELECT TO_CHAR(DATE_TRUNC('month', pc.fecha_reclamo), 'YYYY-MM') AS mes,
                COUNT(*)::bigint AS cantidad,
                COALESCE(
                    (SELECT SUM(pi.monto) FROM postventa_items pi
                     WHERE pi.caso_id IN (SELECT id FROM postventa_casos pc2
                                          WHERE DATE_TRUNC('month', pc2.fecha_reclamo) = DATE_TRUNC('month', pc.fecha_reclamo)
                                            AND pc2.deleted_at IS NULL
                                            ${r.concesionariaId ? Prisma.sql`AND pc2.concesionaria_id = ${r.concesionariaId}` : Prisma.empty})
                       AND pi.deleted_at IS NULL),
                    0
                )::text AS costo
            FROM postventa_casos pc
            WHERE pc.deleted_at IS NULL AND pc.fecha_reclamo >= ${inicio6}
              ${tenantCasos}
            GROUP BY DATE_TRUNC('month', pc.fecha_reclamo)
            ORDER BY DATE_TRUNC('month', pc.fecha_reclamo)
        `
    );

    return {
        porEstado: estadoRows.map(e => ({ estado: e.estado, cantidad: num(e.cantidad) })),
        diasPromedioResolucion: Math.round(num(diasRow[0]?.promedio)),
        costoTotalMes: num(mesRows[0]?.costo),
        casosMes: num(mesRows[0]?.casos),
        serieMensual: serieRows.map(s => ({
            mes: s.mes,
            cantidad: num(s.cantidad),
            costo: num(s.costo),
        })),
    };
};
