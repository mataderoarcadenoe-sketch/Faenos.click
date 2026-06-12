/* C:\Users\Administrador\Desktop\Faenos.click\server.js */
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : false
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==========================================
// INICIALIZACIÓN DE TABLAS Y DATOS DE PRUEBA
// ==========================================
async function initDb() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Roles
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(100) UNIQUE NOT NULL,
                activo BOOLEAN DEFAULT TRUE
            )
        `);

        // 2. Trabajadores
        await client.query(`
            CREATE TABLE IF NOT EXISTS trabajadores (
                id VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                rol VARCHAR(100) NOT NULL,
                whatsapp VARCHAR(50),
                activo BOOLEAN DEFAULT TRUE
            )
        `);

        // 3. Ganaderos
        await client.query(`
            CREATE TABLE IF NOT EXISTS ganaderos (
                id VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(255) UNIQUE NOT NULL,
                ruc VARCHAR(50),
                whatsapp VARCHAR(50),
                codigo VARCHAR(50) UNIQUE NOT NULL,
                activo BOOLEAN DEFAULT TRUE
            )
        `);

        // 4. Especies
        await client.query(`
            CREATE TABLE IF NOT EXISTS especies (
                id VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(100) UNIQUE NOT NULL,
                codigo VARCHAR(50) UNIQUE NOT NULL,
                icono VARCHAR(10),
                activo BOOLEAN DEFAULT TRUE
            )
        `);

        // 5. Tipos de Pago
        await client.query(`
            CREATE TABLE IF NOT EXISTS tipos_pago (
                id VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(100) UNIQUE NOT NULL,
                activo BOOLEAN DEFAULT TRUE
            )
        `);

        // 6. Métodos de Pago
        await client.query(`
            CREATE TABLE IF NOT EXISTS metodos_pago (
                id VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(255) UNIQUE NOT NULL,
                tipo VARCHAR(50) NOT NULL, -- tipoPagoId o nombre tipo
                detalle TEXT,
                activo BOOLEAN DEFAULT TRUE
            )
        `);

        // 7. Recepciones
        await client.query(`
            CREATE TABLE IF NOT EXISTS recepciones (
                id VARCHAR(50) PRIMARY KEY,
                lote_codigo VARCHAR(100) UNIQUE NOT NULL,
                ganadero_id VARCHAR(50) REFERENCES ganaderos(id) ON DELETE SET NULL,
                ganadero_nombre VARCHAR(255),
                especie VARCHAR(50),
                cantidad INTEGER NOT NULL,
                guia_transito VARCHAR(100),
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                observaciones TEXT,
                estado VARCHAR(100) DEFAULT 'Pendiente Inspección',
                estado_cobro VARCHAR(100) DEFAULT 'Pendiente'
            )
        `);

        // 8. Cajas
        await client.query(`
            CREATE TABLE IF NOT EXISTS cajas (
                id VARCHAR(50) PRIMARY KEY,
                encargado_id VARCHAR(50),
                encargado_nombre VARCHAR(255),
                monto_apertura NUMERIC(12, 2) NOT NULL,
                saldo_fisico_real NUMERIC(12, 2),
                diferencia NUMERIC(12, 2),
                estado VARCHAR(50) DEFAULT 'Abierta',
                fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                fecha_cierre TIMESTAMP WITH TIME ZONE,
                observaciones TEXT
            )
        `);

        // 9. Caja Movimientos
        await client.query(`
            CREATE TABLE IF NOT EXISTS caja_movimientos (
                id VARCHAR(50) PRIMARY KEY,
                caja_id VARCHAR(50) REFERENCES cajas(id) ON DELETE CASCADE,
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                tipo VARCHAR(50) NOT NULL, -- Ingreso / Egreso
                monto NUMERIC(12, 2) NOT NULL,
                concepto VARCHAR(255) NOT NULL,
                metodo_pago_id VARCHAR(50),
                referencia VARCHAR(100)
            )
        `);

        // 10. Deudas
        await client.query(`
            CREATE TABLE IF NOT EXISTS deudas (
                id VARCHAR(50) PRIMARY KEY,
                recepcion_id VARCHAR(50) REFERENCES recepciones(id) ON DELETE SET NULL,
                lote_codigo VARCHAR(100) NOT NULL,
                ganadero_id VARCHAR(50) REFERENCES ganaderos(id) ON DELETE CASCADE,
                ganadero_nombre VARCHAR(255),
                monto_total NUMERIC(12, 2) NOT NULL,
                monto_abonado NUMERIC(12, 2) DEFAULT 0.00,
                saldo NUMERIC(12, 2) NOT NULL,
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                estado VARCHAR(50) DEFAULT 'Pendiente'
            )
        `);

        // 11. Abonos
        await client.query(`
            CREATE TABLE IF NOT EXISTS abonos (
                id VARCHAR(50) PRIMARY KEY,
                ganadero_id VARCHAR(50) REFERENCES ganaderos(id) ON DELETE CASCADE,
                ganadero_nombre VARCHAR(255),
                monto NUMERIC(12, 2) NOT NULL,
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                metodo_pago_id VARCHAR(50),
                metodo_pago_nombre VARCHAR(255),
                observaciones TEXT
            )
        `);

        // 12. Abono Detalles
        await client.query(`
            CREATE TABLE IF NOT EXISTS abono_detalles (
                id SERIAL PRIMARY KEY,
                abono_id VARCHAR(50) REFERENCES abonos(id) ON DELETE CASCADE,
                deuda_id VARCHAR(50) REFERENCES deudas(id) ON DELETE CASCADE,
                monto NUMERIC(12, 2) NOT NULL
            )
        `);

        // 13. Pesajes de Animales
        await client.query(`
            CREATE TABLE IF NOT EXISTS pesajes_animales (
                id VARCHAR(50) PRIMARY KEY,
                recepcion_id VARCHAR(50) REFERENCES recepciones(id) ON DELETE CASCADE,
                correlativo_orejera VARCHAR(100) NOT NULL,
                peso_pie_kg NUMERIC(8, 2) NOT NULL,
                creado_el TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 14. Cámaras Frigoríficas (Monitoreo HACCP)
        await client.query(`
            CREATE TABLE IF NOT EXISTS camaras_frigorificas (
                id VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                temperatura_min NUMERIC(6, 2) DEFAULT 0.00,
                temperatura_max NUMERIC(6, 2) DEFAULT 5.00,
                estado VARCHAR(20) DEFAULT 'Activo'
            )
        `);

        // 15. Monitoreo de Temperatura Continuo (HACCP PCC N°1)
        await client.query(`
            CREATE TABLE IF NOT EXISTS temperatura_monitoreo (
                id VARCHAR(50) PRIMARY KEY,
                camara_id VARCHAR(50) REFERENCES camaras_frigorificas(id) ON DELETE CASCADE,
                temperatura NUMERIC(6, 2) NOT NULL,
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                desviacion BOOLEAN DEFAULT FALSE
            )
        `);

        // 16. Productos No Conformes (PNC-001)
        await client.query(`
            CREATE TABLE IF NOT EXISTS productos_no_conformes (
                id VARCHAR(50) PRIMARY KEY,
                origen VARCHAR(100) NOT NULL,
                detalles TEXT NOT NULL,
                lote_codigo VARCHAR(50) NOT NULL,
                accion_correctiva TEXT,
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                responsable VARCHAR(100) NOT NULL,
                estado VARCHAR(20) DEFAULT 'Abierto'
            )
        `);

        // POBLAR DATOS DE PRUEBA SI LAS TABLAS ESTÁN VACÍAS
        
        // Roles
        const rRoles = await client.query('SELECT COUNT(*) FROM roles');
        if (parseInt(rRoles.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO roles (id, nombre, activo) VALUES 
                ('rol-1', 'Cajero', true),
                ('rol-2', 'Operador', true),
                ('rol-3', 'Supervisor', true),
                ('rol-4', 'Administrador', true)
            `);
        }

        // Trabajadores
        const rTrabajadores = await client.query('SELECT COUNT(*) FROM trabajadores');
        if (parseInt(rTrabajadores.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO trabajadores (id, nombre, rol, whatsapp, activo) VALUES
                ('t-1', 'Juan Pérez Prado', 'Cajero', '+51 987654321', true),
                ('t-2', 'María Gómez Torres', 'Operador', '+51 944587123', true),
                ('t-3', 'Carlos Ruiz Rojas', 'Administrador', '+51 912365478', true)
            `);
        }

        // Especies
        const rEspecies = await client.query('SELECT COUNT(*) FROM especies');
        if (parseInt(rEspecies.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO especies (id, nombre, codigo, icono, activo) VALUES
                ('e-1', 'Vacuno', 'VA', '🐄', true),
                ('e-2', 'Porcino', 'PO', '🐖', true),
                ('e-3', 'Ovino', 'OV', '🐑', true),
                ('e-4', 'Caprino', 'CA', '🐐', true)
            `);
        }

        // Ganaderos
        const rGanaderos = await client.query('SELECT COUNT(*) FROM ganaderos');
        if (parseInt(rGanaderos.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO ganaderos (id, nombre, ruc, whatsapp, codigo, activo) VALUES
                ('g-1', 'Agroindustria Atlántica S.A.C.', '20601245891', '+51 987654321', 'AA', true),
                ('g-2', 'Fundo Las Brisas', '20551478962', '+51 944587123', 'LB', true),
                ('g-3', 'Hacienda El Prado', '10447896325', '+51 912365478', 'EP', true)
            `);
        }

        // Tipos Pago
        const rTipos = await client.query('SELECT COUNT(*) FROM tipos_pago');
        if (parseInt(rTipos.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO tipos_pago (id, nombre, activo) VALUES 
                ('tp-1', 'Efectivo', true),
                ('tp-2', 'Crédito', true)
            `);
        }

        // Metodos Pago
        const rMetodos = await client.query('SELECT COUNT(*) FROM metodos_pago');
        if (parseInt(rMetodos.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO metodos_pago (id, nombre, tipo, detalle, activo) VALUES
                ('mp-1', 'Efectivo Caja Chica', 'tp-1', 'Pago en oficina principal', true),
                ('mp-2', 'Línea de Crédito Camal', 'tp-2', 'Crédito aprobado para ganaderos recurrentes', true)
            `);
        }

        // Recepciones
        const rRecepciones = await client.query('SELECT COUNT(*) FROM recepciones');
        if (parseInt(rRecepciones.rows[0].count) === 0) {
            const hoy = new Date();
            const ayer = new Date();
            ayer.setDate(hoy.getDate() - 1);
            const haceDosDias = new Date();
            haceDosDias.setDate(haceDosDias.getDate() - 2);
            
            // Función auxiliar para día juliano
            const getJulian = (d) => {
                const start = new Date(d.getFullYear(), 0, 0);
                const diff = d - start;
                const oneDay = 1000 * 60 * 60 * 24;
                const day = Math.floor(diff / oneDay);
                return String(day).padStart(3, '0');
            };

            await client.query(`
                INSERT INTO recepciones (id, lote_codigo, ganadero_id, ganadero_nombre, especie, cantidad, guia_transito, fecha, observaciones, estado, estado_cobro) VALUES
                ('r-ex-1', 'LBVA159', 'g-2', 'Fundo Las Brisas', 'VA', 15, 'GT-0012100', $1, 'Vacunos de ingreso anterior para registro de deuda histórica.', 'Inspeccionado', 'Al Crédito'),
                ('r-ex-2', 'LBPO160', 'g-2', 'Fundo Las Brisas', 'PO', 12, 'GT-0012101', $1, 'Porcinos de ingreso anterior para registro de deuda histórica.', 'Inspeccionado', 'Al Crédito'),
                ('r-1', $2, 'g-1', 'Agroindustria Atlántica S.A.C.', 'PO', 45, 'GT-0012485', $3, 'Porcinos ingresados en óptimas condiciones corporales.', 'Pendiente Inspección', 'Pendiente'),
                ('r-2', $4, 'g-2', 'Fundo Las Brisas', 'VA', 12, 'GT-0012590', $5, 'Vacunos sin signos clínicos de enfermedades infectocontagiosas.', 'Pendiente Inspección', 'Pendiente')
            `, [
                haceDosDias,
                'AAPO' + getJulian(ayer), ayer,
                'LBVA' + getJulian(hoy), hoy
            ]);
        }

        // Deudas
        const rDeudas = await client.query('SELECT COUNT(*) FROM deudas');
        if (parseInt(rDeudas.rows[0].count) === 0) {
            const haceDosDias = new Date();
            haceDosDias.setDate(haceDosDias.getDate() - 2);
            await client.query(`
                INSERT INTO deudas (id, recepcion_id, lote_codigo, ganadero_id, ganadero_nombre, monto_total, monto_abonado, saldo, fecha, estado) VALUES
                ('deuda-1', 'r-ex-1', 'LBVA159', 'g-2', 'Fundo Las Brisas', 240.00, 100.00, 140.00, $1, 'Parcial'),
                ('deuda-2', 'r-ex-2', 'LBPO160', 'g-2', 'Fundo Las Brisas', 180.00, 0.00, 180.00, $1, 'Pendiente')
            `, [haceDosDias]);
        }

        // Abonos
        const rAbonos = await client.query('SELECT COUNT(*) FROM abonos');
        if (parseInt(rAbonos.rows[0].count) === 0) {
            const haceUnDia = new Date();
            haceUnDia.setDate(haceUnDia.getDate() - 1);
            await client.query(`
                INSERT INTO abonos (id, ganadero_id, ganadero_nombre, monto, fecha, metodo_pago_id, metodo_pago_nombre, observaciones) VALUES
                ('abono-ex-1', 'g-2', 'Fundo Las Brisas', 100.00, $1, 'mp-1', 'Efectivo Caja Chica', 'Abono inicial en efectivo')
            `, [haceUnDia]);
            
            await client.query(`
                INSERT INTO abono_detalles (abono_id, deuda_id, monto) VALUES
                ('abono-ex-1', 'deuda-1', 100.00)
            `);
        }

        // Pesajes de Animales
        const rPesajes = await client.query('SELECT COUNT(*) FROM pesajes_animales');
        if (parseInt(rPesajes.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO pesajes_animales (id, recepcion_id, correlativo_orejera, peso_pie_kg) VALUES 
                ('p-1', 'r-ex-1', 'OR-1001', 450.50),
                ('p-2', 'r-ex-1', 'OR-1002', 462.00),
                ('p-3', 'r-ex-1', 'OR-1003', 448.00),
                ('p-4', 'r-ex-2', 'OR-2001', 95.20),
                ('p-5', 'r-ex-2', 'OR-2002', 98.60)
            `);
        }

        // Cámaras Frigoríficas
        const rCamaras = await client.query('SELECT COUNT(*) FROM camaras_frigorificas');
        if (parseInt(rCamaras.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO camaras_frigorificas (id, nombre, temperatura_min, temperatura_max, estado) VALUES 
                ('c-1', 'Cámara de Vacunos 01', 0.00, 5.00, 'Activo'),
                ('c-2', 'Cámara de Porcinos 01', 0.00, 5.00, 'Activo')
            `);
        }

        // Monitoreo de Temperatura
        const rTemps = await client.query('SELECT COUNT(*) FROM temperatura_monitoreo');
        if (parseInt(rTemps.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO temperatura_monitoreo (id, camara_id, temperatura, desviacion) VALUES 
                ('t-temp-1', 'c-1', 2.30, false),
                ('t-temp-2', 'c-1', 2.10, false),
                ('t-temp-3', 'c-2', 3.40, false),
                ('t-temp-4', 'c-2', 3.60, false)
            `);
        }

        // Productos No Conformes
        const rPncs = await client.query('SELECT COUNT(*) FROM productos_no_conformes');
        if (parseInt(rPncs.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO productos_no_conformes (id, origen, detalles, lote_codigo, accion_correctiva, responsable, estado) VALUES 
                ('pnc-1', 'Inspección Post-Mortem', 'Se detectó parásito Hepática en vísceras de vacuno durante el canalizado.', 'LBVA159', 'Decomiso inmediato y destrucción de las vísceras afectadas.', 'Dr. Alfonso Cárdenas', 'Cerrado')
            `);
        }

        await client.query('COMMIT');
        console.log('Base de datos inicializada y migrada correctamente.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error al inicializar la base de datos:', e);
    } finally {
        client.release();
    }
}

// ==========================================
// ENDPOINTS DE LA API REST
// ==========================================

// GET consolidado inicial para optimizar arranque
app.get('/api/data', async (req, res) => {
    try {
        const roles = await pool.query('SELECT * FROM roles ORDER BY nombre');
        const trabajadores = await pool.query('SELECT * FROM trabajadores ORDER BY nombre');
        const ganaderos = await pool.query('SELECT * FROM ganaderos ORDER BY nombre');
        const especies = await pool.query('SELECT * FROM especies ORDER BY nombre');
        const tiposPago = await pool.query('SELECT * FROM tipos_pago ORDER BY nombre');
        const metodosPago = await pool.query('SELECT * FROM metodos_pago ORDER BY nombre');
        const recepciones = await pool.query('SELECT * FROM recepciones ORDER BY fecha DESC');
        
        // Recuperar cajas y sus movimientos
        const cajasRaw = await pool.query('SELECT * FROM cajas ORDER BY fecha_apertura DESC');
        const cajas = [];
        for (const row of cajasRaw.rows) {
            const movs = await pool.query('SELECT id, fecha, tipo, monto, concepto, metodo_pago_id as "metodoPagoId", referencia FROM caja_movimientos WHERE caja_id = $1 ORDER BY fecha ASC', [row.id]);
            cajas.push({
                id: row.id,
                encargadoId: row.encargado_id,
                encargadoNombre: row.encargado_nombre,
                montoApertura: parseFloat(row.monto_apertura),
                saldoFisicoReal: row.saldo_fisico_real !== null ? parseFloat(row.saldo_fisico_real) : null,
                diferencia: row.diferencia !== null ? parseFloat(row.diferencia) : null,
                estado: row.estado,
                fechaApertura: row.fecha_apertura,
                fechaCierre: row.fecha_cierre,
                observaciones: row.observaciones,
                movimientos: movs.rows.map(m => ({
                    id: m.id,
                    fecha: m.fecha,
                    tipo: m.tipo,
                    monto: parseFloat(m.monto),
                    concepto: m.concepto,
                    metodoPagoId: m.metodoPagoId,
                    referencia: m.referencia
                }))
            });
        }

        const deudas = await pool.query('SELECT id, recepcion_id as "recepcionId", lote_codigo, ganadero_id, ganadero_nombre, CAST(monto_total AS double precision) as monto_total, CAST(monto_abonado AS double precision) as monto_abonado, CAST(saldo AS double precision) as saldo, fecha, estado FROM deudas ORDER BY fecha DESC');
        
        const abonosRaw = await pool.query('SELECT * FROM abonos ORDER BY fecha DESC');
        const abonos = [];
        for (const row of abonosRaw.rows) {
            const dets = await pool.query('SELECT deuda_id as "deudaId", CAST(monto AS double precision) as monto FROM abono_detalles WHERE abono_id = $1', [row.id]);
            abonos.push({
                id: row.id,
                ganadero_id: row.ganadero_id,
                ganadero_nombre: row.ganadero_nombre,
                monto: parseFloat(row.monto),
                fecha: row.fecha,
                metodoPagoId: row.metodo_pago_id,
                metodoPagoNombre: row.metodo_pago_nombre,
                observaciones: row.observaciones,
                detalles: dets.rows
            });
        }

        const pesajes = await pool.query('SELECT id, recepcion_id as "recepcionId", correlativo_orejera as "correlativoOrejera", CAST(peso_pie_kg AS double precision) as "pesoPieKg", creado_el as "creadoEl" FROM pesajes_animales ORDER BY creado_el DESC');

        const camaras = await pool.query('SELECT id, nombre, CAST(temperatura_min AS double precision) as "temperaturaMin", CAST(temperatura_max AS double precision) as "temperaturaMax", estado FROM camaras_frigorificas ORDER BY nombre');
        const temperaturas = await pool.query('SELECT id, camara_id as "camaraId", CAST(temperatura AS double precision) as temperatura, fecha, desviacion FROM temperatura_monitoreo ORDER BY fecha DESC LIMIT 50');
        const productosNoConformes = await pool.query('SELECT id, origen, detalles, lote_codigo as "loteCodigo", accion_correctiva as "accionCorrectiva", fecha, responsable, estado FROM productos_no_conformes ORDER BY fecha DESC');

        res.json({
            roles: roles.rows,
            trabajadores: trabajadores.rows,
            ganaderos: ganaderos.rows,
            especies: especies.rows,
            tiposPago: tiposPago.rows,
            metodosPago: metodosPago.rows.map(m => ({
                id: m.id,
                nombre: m.nombre,
                tipo: m.tipo,
                detalle: m.detalle,
                activo: m.activo
            })),
            recepciones: recepciones.rows.map(r => ({
                id: r.id,
                lote_codigo: r.lote_codigo,
                ganadero_id: r.ganadero_id,
                ganadero_nombre: r.ganadero_nombre,
                especie: r.especie,
                cantidad: r.cantidad,
                guia_transito: r.guia_transito,
                fecha: r.fecha,
                observaciones: r.observaciones,
                estado: r.estado,
                estadoCobro: r.estado_cobro
            })),
            cajas,
            deudas: deudas.rows,
            abonos,
            pesajes: pesajes.rows,
            camaras: camaras.rows,
            temperaturas: temperaturas.rows,
            productosNoConformes: productosNoConformes.rows
        });
    } catch (e) {
        console.error('Error al recuperar datos:', e);
        res.status(500).json({ error: 'Error al recuperar datos' });
    }
});

// --- GANADEROS ---
app.post('/api/ganaderos', async (req, res) => {
    const { id, nombre, ruc, whatsapp, codigo, activo } = req.body;
    try {
        await pool.query(
            'INSERT INTO ganaderos (id, nombre, ruc, whatsapp, codigo, activo) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, nombre, ruc, whatsapp, codigo, activo]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/ganaderos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, ruc, whatsapp, codigo, activo } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Obtener código antiguo
        const rAnt = await client.query('SELECT codigo FROM ganaderos WHERE id = $1', [id]);
        const antiguoCodigo = rAnt.rows[0]?.codigo;

        await client.query(
            'UPDATE ganaderos SET nombre = $1, ruc = $2, whatsapp = $3, codigo = $4, activo = $5 WHERE id = $6',
            [nombre, ruc, whatsapp, codigo, activo, id]
        );

        if (antiguoCodigo) {
            await client.query(
                'UPDATE recepciones SET ganadero_nombre = $1 WHERE ganadero_id = $2',
                [nombre, id]
            );
            
            if (antiguoCodigo !== codigo) {
                const recs = await client.query('SELECT id, lote_codigo FROM recepciones WHERE ganadero_id = $1', [id]);
                for (const r of recs.rows) {
                    const nuevoLote = r.lote_codigo.replace(antiguoCodigo, codigo);
                    await client.query('UPDATE recepciones SET lote_codigo = $1 WHERE id = $2', [nuevoLote, r.id]);
                }
            }
        }
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.delete('/api/ganaderos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM ganaderos WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- ESPECIES ---
app.post('/api/especies', async (req, res) => {
    const { id, nombre, codigo, icono, activo } = req.body;
    try {
        await pool.query(
            'INSERT INTO especies (id, nombre, codigo, icono, activo) VALUES ($1, $2, $3, $4, $5)',
            [id, nombre, codigo, icono, activo]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/especies/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, codigo, icono, activo } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Obtener código antiguo
        const rAnt = await client.query('SELECT codigo FROM especies WHERE id = $1', [id]);
        const antiguoCodigo = rAnt.rows[0]?.codigo;

        await client.query(
            'UPDATE especies SET nombre = $1, codigo = $2, icono = $3, activo = $4 WHERE id = $5',
            [nombre, codigo, icono, activo, id]
        );

        if (antiguoCodigo && antiguoCodigo !== codigo) {
            const recs = await client.query('SELECT id, lote_codigo FROM recepciones WHERE especie = $1', [antiguoCodigo]);
            for (const r of recs.rows) {
                const ganaderoCod = r.lote_codigo.substring(0, 2);
                const diaJuliano = r.lote_codigo.substring(4);
                const nuevoLote = `${ganaderoCod}${codigo}${diaJuliano}`;
                await client.query(
                    'UPDATE recepciones SET especie = $1, lote_codigo = $2 WHERE id = $3',
                    [codigo, nuevoLote, r.id]
                );
            }
        }
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.delete('/api/especies/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM especies WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- METODOS DE PAGO ---
app.post('/api/metodos-pago', async (req, res) => {
    const { id, nombre, tipo, detalle, activo } = req.body;
    try {
        await pool.query(
            'INSERT INTO metodos_pago (id, nombre, tipo, detalle, activo) VALUES ($1, $2, $3, $4, $5)',
            [id, nombre, tipo, detalle, activo]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/metodos-pago/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, tipo, detalle, activo } = req.body;
    try {
        await pool.query(
            'UPDATE metodos_pago SET nombre = $1, tipo = $2, detalle = $3, activo = $4 WHERE id = $5',
            [nombre, tipo, detalle, activo, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/metodos-pago/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM metodos_pago WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- CARGOS / ROLES ---
app.post('/api/roles', async (req, res) => {
    const { id, nombre, activo } = req.body;
    try {
        await pool.query(
            'INSERT INTO roles (id, nombre, activo) VALUES ($1, $2, $3)',
            [id, nombre, activo]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/roles/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    try {
        await pool.query(
            'UPDATE roles SET nombre = $1, activo = $2 WHERE id = $3',
            [nombre, activo, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/roles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM roles WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- TRABAJADORES ---
app.post('/api/trabajadores', async (req, res) => {
    const { id, nombre, rol, whatsapp, activo } = req.body;
    try {
        await pool.query(
            'INSERT INTO trabajadores (id, nombre, rol, whatsapp, activo) VALUES ($1, $2, $3, $4, $5)',
            [id, nombre, rol, whatsapp, activo]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/trabajadores/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, rol, whatsapp, activo } = req.body;
    try {
        await pool.query(
            'UPDATE trabajadores SET nombre = $1, rol = $2, whatsapp = $3, activo = $4 WHERE id = $5',
            [nombre, rol, whatsapp, activo, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/trabajadores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM trabajadores WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- TIPOS DE PAGO ---
app.post('/api/tipos-pago', async (req, res) => {
    const { id, nombre, activo } = req.body;
    try {
        await pool.query(
            'INSERT INTO tipos_pago (id, nombre, activo) VALUES ($1, $2, $3)',
            [id, nombre, activo]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/tipos-pago/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    try {
        await pool.query(
            'UPDATE tipos_pago SET nombre = $1, activo = $2 WHERE id = $3',
            [nombre, activo, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/tipos-pago/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tipos_pago WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- RECEPCIONES ---
app.post('/api/recepciones', async (req, res) => {
    const { id, lote_codigo, ganadero_id, ganadero_nombre, especie, cantidad, guia_transito, fecha, observaciones, estado, estadoCobro } = req.body;
    try {
        await pool.query(
            'INSERT INTO recepciones (id, lote_codigo, ganadero_id, ganadero_nombre, especie, cantidad, guia_transito, fecha, observaciones, estado, estado_cobro) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
            [id, lote_codigo, ganadero_id, ganadero_nombre, especie, cantidad, guia_transito, fecha, observaciones, estado, estadoCobro]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- PROCESAR COBRO DE UN LOTE ---
app.post('/api/cobros', async (req, res) => {
    const { recepcionId, metodoId, total, obs, esCredito, nuevaDeuda, nuevoMov } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Agregar movimiento a la caja activa
        const rCaja = await client.query('SELECT id FROM cajas WHERE estado = $1 LIMIT 1', ['Abierta']);
        if (rCaja.rows.length === 0) {
            throw new Error('No hay caja activa para procesar cobros.');
        }
        const cajaId = rCaja.rows[0].id;

        await client.query(
            'INSERT INTO caja_movimientos (id, caja_id, fecha, tipo, monto, concepto, metodo_pago_id, referencia) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [nuevoMov.id, cajaId, nuevoMov.fecha, nuevoMov.tipo, nuevoMov.monto, nuevoMov.concepto, nuevoMov.metodoPagoId, nuevoMov.referencia]
        );

        // 2. Modificar el estado de cobro en recepciones
        const estadoCobro = esCredito ? 'A Crédito' : 'Cobrado';
        await client.query(
            'UPDATE recepciones SET estado_cobro = $1 WHERE id = $2',
            [estadoCobro, recepcionId]
        );

        // 3. Si es a crédito, registrar la deuda en deudas
        if (esCredito && nuevaDeuda) {
            await client.query(
                'INSERT INTO deudas (id, recepcion_id, lote_codigo, ganadero_id, ganadero_nombre, monto_total, monto_abonado, saldo, fecha, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [nuevaDeuda.id, nuevaDeuda.recepcionId, nuevaDeuda.lote_codigo, nuevaDeuda.ganadero_id, nuevaDeuda.ganadero_nombre, nuevaDeuda.monto_total, nuevaDeuda.monto_abonado, nuevaDeuda.saldo, nuevaDeuda.fecha, nuevaDeuda.estado]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// --- CAJAS ---
app.post('/api/cajas', async (req, res) => {
    const { id, encargadoId, encargadoNombre, montoApertura, estado, fechaApertura, observaciones } = req.body;
    try {
        // Asegurarse de que no haya otra caja abierta
        const activa = await pool.query('SELECT id FROM cajas WHERE estado = $1', ['Abierta']);
        if (activa.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe un turno de caja abierto.' });
        }

        await pool.query(
            'INSERT INTO cajas (id, encargado_id, encargado_nombre, monto_apertura, estado, fecha_apertura, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, encargadoId, encargadoNombre, montoApertura, estado, fechaApertura, observaciones]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Agregar movimiento extraordinario (Ingreso/Egreso) a caja activa
app.post('/api/cajas/:id/movimientos', async (req, res) => {
    const { id } = req.params; // cajaId
    const { id: movId, fecha, tipo, monto, concepto, metodoPagoId, referencia } = req.body;
    try {
        await pool.query(
            'INSERT INTO caja_movimientos (id, caja_id, fecha, tipo, monto, concepto, metodo_pago_id, referencia) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [movId, id, fecha, tipo, monto, concepto, metodoPagoId, referencia]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Cierre y arqueo de caja
app.put('/api/cajas/:id/cerrar', async (req, res) => {
    const { id } = req.params;
    const { saldoFisicoReal, diferencia, estado, fechaCierre, observaciones } = req.body;
    try {
        await pool.query(
            'UPDATE cajas SET saldo_fisico_real = $1, diferencia = $2, estado = $3, fecha_cierre = $4, observaciones = $5 WHERE id = $6',
            [saldoFisicoReal, diferencia, estado, fechaCierre, observaciones, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- ABONOS A DEUDAS (TRANSACCIÓN FIFO / ESPECÍFICA) ---
app.post('/api/abonos', async (req, res) => {
    const { nuevoAbono, nuevoMov, deudasActualizadas, recepcionesActualizadas } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Registrar el Abono Principal
        await client.query(
            'INSERT INTO abonos (id, ganadero_id, ganadero_nombre, monto, fecha, metodo_pago_id, metodo_pago_nombre, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [nuevoAbono.id, nuevoAbono.ganadero_id, nuevoAbono.ganadero_nombre, nuevoAbono.monto, nuevoAbono.fecha, nuevoAbono.metodoPagoId, nuevoAbono.metodoPagoNombre, nuevoAbono.observaciones]
        );

        // 2. Registrar los Detalles del Abono (Amortizaciones individuales de Lotes)
        for (const det of nuevoAbono.detalles) {
            await client.query(
                'INSERT INTO abono_detalles (abono_id, deuda_id, monto) VALUES ($1, $2, $3)',
                [nuevoAbono.id, det.deudaId, det.monto]
            );
        }

        // 3. Registrar el Movimiento en la Caja Activa
        const rCaja = await client.query('SELECT id FROM cajas WHERE estado = $1 LIMIT 1', ['Abierta']);
        if (rCaja.rows.length === 0) {
            throw new Error('Debe aperturar la caja general para registrar abonos.');
        }
        const cajaId = rCaja.rows[0].id;
        
        await client.query(
            'INSERT INTO caja_movimientos (id, caja_id, fecha, tipo, monto, concepto, metodo_pago_id, referencia) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [nuevoMov.id, cajaId, nuevoMov.fecha, nuevoMov.tipo, nuevoMov.monto, nuevoMov.concepto, nuevoMov.metodoPagoId, nuevoMov.referencia]
        );

        // 4. Actualizar Deudas y sus Estados
        for (const d of deudasActualizadas) {
            await client.query(
                'UPDATE deudas SET monto_abonado = $1, saldo = $2, estado = $3 WHERE id = $4',
                [d.monto_abonado, d.saldo, d.estado, d.id]
            );
        }

        // 5. Actualizar Recepciones afectadas (estadoCobro pase a Cobrado si se liquidó completamente)
        for (const r of recepcionesActualizadas) {
            await client.query(
                'UPDATE recepciones SET estado_cobro = $1 WHERE id = $2',
                [r.estadoCobro, r.id]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});


// --- PESAJES ANIMALES ---
app.post('/api/pesajes', async (req, res) => {
    const { id, recepcion_id, correlativo_orejera, peso_pie_kg } = req.body;
    try {
        await pool.query(
            'INSERT INTO pesajes_animales (id, recepcion_id, correlativo_orejera, peso_pie_kg) VALUES ($1, $2, $3, $4)',
            [id, recepcion_id, correlativo_orejera, peso_pie_kg]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/pesajes/:id', async (req, res) => {
    const { id } = req.params;
    const { correlativo_orejera, peso_pie_kg } = req.body;
    try {
        await pool.query(
            'UPDATE pesajes_animales SET correlativo_orejera = $1, peso_pie_kg = $2 WHERE id = $3',
            [correlativo_orejera, peso_pie_kg, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/pesajes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM pesajes_animales WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});


// --- CÁMARAS FRIGORÍFICAS ---
app.post('/api/camaras', async (req, res) => {
    const { id, nombre, temperatura_min, temperatura_max, estado } = req.body;
    try {
        await pool.query(
            'INSERT INTO camaras_frigorificas (id, nombre, temperatura_min, temperatura_max, estado) VALUES ($1, $2, $3, $4, $5)',
            [id, nombre, temperatura_min, temperatura_max, estado]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/camaras/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, temperatura_min, temperatura_max, estado } = req.body;
    try {
        await pool.query(
            'UPDATE camaras_frigorificas SET nombre = $1, temperatura_min = $2, temperatura_max = $3, estado = $4 WHERE id = $5',
            [nombre, temperatura_min, temperatura_max, estado, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/camaras/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM camaras_frigorificas WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- MONITOREO DE TEMPERATURA ---
app.post('/api/temperatura-monitoreo', async (req, res) => {
    const { id, camara_id, temperatura, desviacion } = req.body;
    try {
        await pool.query(
            'INSERT INTO temperatura_monitoreo (id, camara_id, temperatura, desviacion) VALUES ($1, $2, $3, $4)',
            [id, camara_id, temperatura, desviacion]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- PRODUCTOS NO CONFORMES (PNC) ---
app.post('/api/productos-no-conformes', async (req, res) => {
    const { id, origen, detalles, lote_codigo, accion_correctiva, responsable, estado } = req.body;
    try {
        await pool.query(
            'INSERT INTO productos_no_conformes (id, origen, detalles, lote_codigo, accion_correctiva, responsable, estado) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, origen, detalles, lote_codigo, accion_correctiva, responsable, estado]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/productos-no-conformes/:id', async (req, res) => {
    const { id } = req.params;
    const { origen, detalles, lote_codigo, accion_correctiva, responsable, estado } = req.body;
    try {
        await pool.query(
            'UPDATE productos_no_conformes SET origen = $1, detalles = $2, lote_codigo = $3, accion_correctiva = $4, responsable = $5, estado = $6 WHERE id = $7',
            [origen, detalles, lote_codigo, accion_correctiva, responsable, estado, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/productos-no-conformes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM productos_no_conformes WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});


// Levantar servidor e inicializar base de datos
app.listen(PORT, async () => {
    console.log(`Servidor de Faenos.click corriendo en puerto ${PORT}`);
    if (process.env.DATABASE_URL) {
        await initDb();
    } else {
        console.warn('CUIDADO: DATABASE_URL no definida. El servidor corre sin persistencia en base de datos.');
    }
});
