import express from 'express';
import authRoutes from '../interface/routes/auth.routes';
import accountRoutes from '../modules/account/account.routes';
import cajaRoutes from '../modules/caja/caja.routes';
import concesionariaRoutes from '../interface/routes/concesionaria.routes';
import sucursalRoutes from '../modules/sucursales/sucursal.routes';
import marcaRoutes from '../modules/marcas/marca.routes';
import modeloRoutes from '../modules/modelos/modelo.routes';
import versionRoutes from '../modules/versiones/version.routes';
import usuarioRoutes from '../interface/routes/usuario.routes';
import rolRoutes from '../interface/routes/rol.routes';
import clienteRoutes from '../interface/routes/cliente.routes';
import proveedorRoutes from '../interface/routes/proveedor.routes';
import vehiculoRoutes from '../interface/routes/vehiculo.routes';
import archivoRoutes from '../interface/routes/vehiculo-archivo.routes';
import movimientoRoutes from '../interface/routes/vehiculo-movimiento.routes';
import ingresoRoutes from '../interface/routes/ingreso-vehiculo.routes';
import reservaRoutes from '../interface/routes/reserva.routes';
import presupuestoRoutes from '../interface/routes/presupuesto.routes';
import ventaRoutes from '../interface/routes/venta.routes';
import gastoRoutes from '../interface/routes/gasto.routes';
import categoriaRoutes from '../interface/routes/categoria-gasto.routes';
import gastoFijoRoutes from '../interface/routes/gasto-fijo.routes';
import categoriaFijoRoutes from '../interface/routes/categoria-gasto-fijo.routes';
import casoRoutes from '../interface/routes/postventa-caso.routes';
import itemRoutes from '../interface/routes/postventa-item.routes';
import financieraRoutes from '../interface/routes/financiera.routes';
import financiacionRoutes from '../interface/routes/financiacion.routes';
import solicitudRoutes from '../interface/routes/solicitud-financiacion.routes';
import auditoriaRoutes from '../interface/routes/audit-log.routes';
import billingRoutes from '../interface/routes/billing.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import debugRoutes from '../interface/routes/debug.routes';
import ApiResponse from '../utils/ApiResponse';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
    res.send(ApiResponse.success({ status: 'UP', timestamp: new Date() }));
});

// Debug endpoints
router.use('/debug', debugRoutes);

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
