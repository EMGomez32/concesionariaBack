import express from 'express';
import authRoutes from '../interface/routes/auth.routes';
import accountRoutes from '../modules/account/account.routes';
import cajaRoutes from '../modules/caja/caja.routes';
// concesionarias: migrado interface/ → modules/ (Sprint 4 cont).
import concesionariaRoutes from '../modules/concesionarias/concesionaria.routes';
// sucursales: ya estaba en modules/ (no hubo migración para ésta — venía bien).
import sucursalRoutes from '../modules/sucursales/sucursal.routes';
import marcaRoutes from '../modules/marcas/marca.routes';
import modeloRoutes from '../modules/modelos/modelo.routes';
import versionRoutes from '../modules/versiones/version.routes';
// usuarios: migrado interface/ → modules/ (Sprint 4 cont).
import usuarioRoutes from '../modules/usuarios/usuario.routes';
import rolRoutes from '../modules/roles/rol.routes';
// Migrado de interface/ → modules/ (Sprint 4 piloto). Tiene validación Zod
// y los mismos endpoints. El interface/routes/cliente.routes.ts queda
// huérfano pero no se borra todavía para no romper imports indirectos.
import clienteRoutes from '../modules/clientes/cliente.routes';
// proveedores: migrado de interface/ → modules/ (Sprint 4).
import proveedorRoutes from '../modules/proveedores/proveedor.routes';
// vehiculos: migrado interface/ → modules/ (Sprint 4 cont) con /transferir.
import vehiculoRoutes from '../modules/vehiculos/vehiculo.routes';
// vehiculo-archivos: migrado interface/ → modules/ (Sprint 4 cont) con
// upload multipart (multer + storage adapter).
import archivoRoutes from '../modules/vehiculo-archivos/archivo.routes';
import movimientoRoutes from '../modules/vehiculo-movimientos/movimiento.routes';
import ingresoRoutes from '../modules/vehiculo-ingresos/ingreso.routes';
// reservas: migrado de interface/ → modules/ (Sprint 4).
import reservaRoutes from '../modules/reservas/reserva.routes';
// presupuestos: migrado interface/ → modules/ (Sprint 4 cont) con
// /total y /convertir-en-venta.
import presupuestoRoutes from '../modules/presupuestos/presupuesto.routes';
import ventaRoutes from '../interface/routes/venta.routes';
// gastos: migrado interface/ → modules/ (Sprint 4 cont) con /total.
import gastoRoutes from '../modules/gastos/gasto.routes';
import categoriaRoutes from '../modules/gastos-categorias/categoria.routes';
// gastos-fijos: migrado interface/ → modules/ (Sprint 4 cont) con /total.
import gastoFijoRoutes from '../modules/gastos-fijos/gasto-fijo.routes';
import categoriaFijoRoutes from '../modules/gastos-fijos-categorias/categoria.routes';
// postventa-casos: migrado interface/ → modules/ (Sprint 4 cont) con /total.
import casoRoutes from '../modules/postventa-casos/caso.routes';
// postventa-items: migrado interface/ → modules/ (Sprint 4 cont).
// Schema Zod alineado con Prisma (monto, no costo+precio del module viejo).
import itemRoutes from '../modules/postventa-items/item.routes';
// financieras: migrado interface/ → modules/ (Sprint 4 cont).
import financieraRoutes from '../modules/financieras/financiera.routes';
// financiaciones: migrado interface/ → modules/ (Sprint 4 cont).
import financiacionRoutes from '../modules/financiaciones/financiacion.routes';
// solicitud-financiacion: migrado interface/ → modules/ (Sprint 4 cont)
// con sub-recursos /:id/archivos (list/upload/delete).
import solicitudRoutes from '../modules/financiacion-solicitudes/solicitud.routes';
import auditoriaRoutes from '../modules/auditoria/auditoria.routes';
import billingRoutes from '../modules/billing/billing.routes';
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
