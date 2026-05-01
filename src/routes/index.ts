import express from 'express';
import authRoutes from '../interface/routes/auth.routes';
import accountRoutes from '../modules/account/account.routes';
import cajaRoutes from '../modules/caja/caja.routes';
import concesionariaRoutes from '../interface/routes/concesionaria.routes';
// sucursales: ya estaba en modules/ (no hubo migración para ésta — venía bien).
import sucursalRoutes from '../modules/sucursales/sucursal.routes';
import marcaRoutes from '../modules/marcas/marca.routes';
import modeloRoutes from '../modules/modelos/modelo.routes';
import versionRoutes from '../modules/versiones/version.routes';
// usuarios: migrado interface/ → modules/ (Sprint 4 cont).
import usuarioRoutes from '../modules/usuarios/usuario.routes';
import rolRoutes from '../interface/routes/rol.routes';
// Migrado de interface/ → modules/ (Sprint 4 piloto). Tiene validación Zod
// y los mismos endpoints. El interface/routes/cliente.routes.ts queda
// huérfano pero no se borra todavía para no romper imports indirectos.
import clienteRoutes from '../modules/clientes/cliente.routes';
// proveedores: migrado de interface/ → modules/ (Sprint 4).
import proveedorRoutes from '../modules/proveedores/proveedor.routes';
// vehiculos: migrado interface/ → modules/ (Sprint 4 cont) con /transferir.
import vehiculoRoutes from '../modules/vehiculos/vehiculo.routes';
import archivoRoutes from '../interface/routes/vehiculo-archivo.routes';
import movimientoRoutes from '../interface/routes/vehiculo-movimiento.routes';
import ingresoRoutes from '../interface/routes/ingreso-vehiculo.routes';
// reservas: migrado de interface/ → modules/ (Sprint 4).
import reservaRoutes from '../modules/reservas/reserva.routes';
import presupuestoRoutes from '../interface/routes/presupuesto.routes';
import ventaRoutes from '../interface/routes/venta.routes';
// gastos: migrado interface/ → modules/ (Sprint 4 cont) con /total.
import gastoRoutes from '../modules/gastos/gasto.routes';
import categoriaRoutes from '../interface/routes/categoria-gasto.routes';
// gastos-fijos: migrado interface/ → modules/ (Sprint 4 cont) con /total.
import gastoFijoRoutes from '../modules/gastos-fijos/gasto-fijo.routes';
import categoriaFijoRoutes from '../interface/routes/categoria-gasto-fijo.routes';
// postventa-casos: migrado interface/ → modules/ (Sprint 4 cont) con /total.
import casoRoutes from '../modules/postventa-casos/caso.routes';
import itemRoutes from '../interface/routes/postventa-item.routes';
// financieras: migrado interface/ → modules/ (Sprint 4 cont).
import financieraRoutes from '../modules/financieras/financiera.routes';
import financiacionRoutes from '../interface/routes/financiacion.routes';
import solicitudRoutes from '../interface/routes/solicitud-financiacion.routes';
import auditoriaRoutes from '../interface/routes/audit-log.routes';
import billingRoutes from '../interface/routes/billing.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import debugRoutes from '../interface/routes/debug.routes';
import { env } from '../config/env';
import ApiResponse from '../utils/ApiResponse';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
    res.send(ApiResponse.success({ status: 'UP', timestamp: new Date() }));
});

// Debug endpoints — SOLO en desarrollo. Estas rutas usan $queryRaw que
// bypasea RLS y filtran data cross-tenant; no deben estar disponibles en
// producción aunque tengan authenticate.
if (env.NODE_ENV !== 'production') {
    router.use('/debug', debugRoutes);
}

// Auth + Account (activación, reset password, invitaciones)
router.use('/auth', authRoutes);
router.use('/account', accountRoutes);

// Caja (movimientos, cierres diarios)
router.use('/caja', cajaRoutes);

// SaaS Core
router.use('/concesionarias', concesionariaRoutes);
router.use('/sucursales', sucursalRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/roles', rolRoutes);

// CRM
router.use('/clientes', clienteRoutes);
router.use('/proveedores', proveedorRoutes);

// Inventario
router.use('/vehiculos', vehiculoRoutes);
router.use('/vehiculo-archivos', archivoRoutes);
router.use('/vehiculo-movimientos', movimientoRoutes);
router.use('/vehiculo-ingresos', ingresoRoutes);

// Catálogo (Marca → Modelo → Versión)
router.use('/marcas', marcaRoutes);
router.use('/modelos', modeloRoutes);
router.use('/versiones', versionRoutes);

// Operaciones
router.use('/reservas', reservaRoutes);
router.use('/presupuestos', presupuestoRoutes);
router.use('/ventas', ventaRoutes);

// Gastos & Postventa
router.use('/gastos', gastoRoutes);
router.use('/gastos-categorias', categoriaRoutes);
router.use('/gastos-fijos', gastoFijoRoutes);
router.use('/gastos-fijos-categorias', categoriaFijoRoutes);
router.use('/postventa-casos', casoRoutes);
router.use('/postventa-items', itemRoutes);

// Financiación
router.use('/financieras', financieraRoutes);
router.use('/financiaciones', financiacionRoutes);
router.use('/financiacion-solicitudes', solicitudRoutes);

// Auditoría
router.use('/auditoria', auditoriaRoutes);

// SaaS Billing
router.use('/billing', billingRoutes);

// Analytics (KPIs y series temporales para admin/super_admin)
router.use('/analytics', analyticsRoutes);

export default router;
