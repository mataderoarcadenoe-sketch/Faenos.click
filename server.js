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
                estado_cobro VARCHAR(100) DEFAULT 'Pendiente',
                registro_establo VARCHAR(150)
            )
        `);
        await client.query(`ALTER TABLE recepciones ADD COLUMN IF NOT EXISTS registro_establo VARCHAR(150)`);
        await client.query(`
            UPDATE recepciones 
            SET registro_establo = CASE 
                WHEN lote_codigo = 'LBVA159' THEN 'EST-PE-10294'
                WHEN lote_codigo = 'LBPO160' THEN 'EST-PE-10294'
                WHEN lote_codigo = 'AAPO161' THEN 'EST-PE-09432'
                WHEN lote_codigo = 'LBVA162' THEN 'EST-PE-10294'
                ELSE registro_establo
            END
            WHERE registro_establo IS NULL
        `);
        await client.query(`UPDATE recepciones SET lote_codigo = 'LBVA163-OLD' WHERE lote_codigo = 'LBVA163'`);

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

        // 17. Despacho y Salida de Producto Terminado (Kardex - CD-BPM-CPT-002 y CPT-001)
        await client.query(`
            CREATE TABLE IF NOT EXISTS despacho_producto (
                id VARCHAR(50) PRIMARY KEY,
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                lote_codigo VARCHAR(50) NOT NULL,
                cliente VARCHAR(150) NOT NULL,
                guia_remision VARCHAR(50) NOT NULL,
                cantidad_carcasas INTEGER NOT NULL CHECK (cantidad_carcasas > 0),
                peso_total NUMERIC(10, 2) NOT NULL CHECK (peso_total > 0.00),
                temperatura_carne NUMERIC(6, 2) NOT NULL,
                observaciones TEXT,
                responsable VARCHAR(100) NOT NULL
            )
        `);

        // 18. Control de Transporte de Despacho (CD-BPM-CPT-003)
        await client.query(`
            CREATE TABLE IF NOT EXISTS transporte_despacho (
                id VARCHAR(50) PRIMARY KEY,
                despacho_id VARCHAR(50) REFERENCES despacho_producto(id) ON DELETE CASCADE,
                placa_vehiculo VARCHAR(20) NOT NULL,
                conductor VARCHAR(100) NOT NULL,
                licencia VARCHAR(50) NOT NULL,
                higiene_furgon VARCHAR(20) DEFAULT 'Conforme',
                temperatura_furgon NUMERIC(6, 2) NOT NULL,
                hermeticidad BOOLEAN DEFAULT TRUE,
                observaciones TEXT
            )
        `);

        // 19. Control de Cloro Residual en Agua Potable (CD-POES-CA-001)
        await client.query(`
            CREATE TABLE IF NOT EXISTS control_cloro (
                id VARCHAR(50) PRIMARY KEY,
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                hora TIME NOT NULL,
                punto_muestreo VARCHAR(100) NOT NULL,
                cloro_residual NUMERIC(6, 2) NOT NULL,
                desviacion BOOLEAN DEFAULT FALSE,
                observaciones TEXT,
                responsable VARCHAR(100) NOT NULL
            )
        `);

        // 20. Registro de Higiene y Saneamiento POES (CD-POES-LDISHV-001 y LDEU-002)
        await client.query(`
            CREATE TABLE IF NOT EXISTS registro_higiene_poes (
                id VARCHAR(50) PRIMARY KEY,
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                tipo_item VARCHAR(30) NOT NULL,
                nombre_item VARCHAR(100) NOT NULL,
                frecuencia VARCHAR(20) NOT NULL,
                limpieza_estado VARCHAR(20) DEFAULT 'Conforme',
                desinfectante VARCHAR(50) NOT NULL,
                concentracion_ppm INTEGER NOT NULL,
                observaciones TEXT,
                responsable VARCHAR(100) NOT NULL
            )
        `);

        // 21. Registro de Control de Accesos y Visitas (CD-BPM-CP-002)
        await client.query(`
            CREATE TABLE IF NOT EXISTS registro_visitas (
                id VARCHAR(50) PRIMARY KEY,
                fecha DATE DEFAULT CURRENT_DATE,
                visitante_nombre VARCHAR(150) NOT NULL,
                visitante_dni VARCHAR(15) NOT NULL,
                institucion VARCHAR(100) NOT NULL,
                hora_ingreso TIME NOT NULL,
                hora_caliente TIME, -- hora de salida
                sintomas_salud BOOLEAN DEFAULT FALSE,
                epp_entregado VARCHAR(150) NOT NULL,
                responsable VARCHAR(100) NOT NULL
            )
        `);

        // 22. Registro de Capacitaciones de Personal (CD-BPM-CP-001)
        await client.query(`
            CREATE TABLE IF NOT EXISTS registro_capacitaciones (
                id VARCHAR(50) PRIMARY KEY,
                fecha DATE DEFAULT CURRENT_DATE,
                tema VARCHAR(200) NOT NULL,
                ponente VARCHAR(100) NOT NULL,
                duracion_horas NUMERIC(4, 1) NOT NULL,
                asistentes_ids TEXT NOT NULL,
                observaciones TEXT
            )
        `);

        // Nuevas alteraciones para Trazabilidad
        await client.query(`ALTER TABLE despacho_producto ADD COLUMN IF NOT EXISTS fecha_produccion DATE`);
        await client.query(`ALTER TABLE despacho_producto ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE`);
        await client.query(`ALTER TABLE transporte_despacho ADD COLUMN IF NOT EXISTS fumigacion BOOLEAN DEFAULT TRUE`);
        await client.query(`ALTER TABLE transporte_despacho ADD COLUMN IF NOT EXISTS apilamiento_adecuado BOOLEAN DEFAULT TRUE`);

        // Migración de Códigos de Especie semilla
        await client.query(`
            UPDATE especies SET codigo = 'GV' WHERE id = 'e-1' AND codigo = 'VA';
            UPDATE especies SET codigo = 'GP' WHERE id = 'e-2' AND codigo = 'PO';
            UPDATE especies SET codigo = 'GO' WHERE id = 'e-3' AND codigo = 'OV';
            UPDATE especies SET codigo = 'GC' WHERE id = 'e-4' AND codigo = 'CA';
        `);

        // Actualización de códigos de lote de recepciones existentes (y del campo especie)
        await client.query(`
            UPDATE recepciones SET especie = 'GV', lote_codigo = REPLACE(lote_codigo, 'VA', 'GV') WHERE especie = 'VA';
            UPDATE recepciones SET especie = 'GP', lote_codigo = REPLACE(lote_codigo, 'PO', 'GP') WHERE especie = 'PO';
            UPDATE recepciones SET especie = 'GO', lote_codigo = REPLACE(lote_codigo, 'OV', 'GO') WHERE especie = 'OV';
            UPDATE recepciones SET especie = 'GC', lote_codigo = REPLACE(lote_codigo, 'CA', 'GC') WHERE especie = 'CA';
        `);

        // Actualización de códigos de lote en deudas
        await client.query(`
            UPDATE deudas SET lote_codigo = REPLACE(lote_codigo, 'VA', 'GV') WHERE lote_codigo LIKE '%VA%';
            UPDATE deudas SET lote_codigo = REPLACE(lote_codigo, 'PO', 'GP') WHERE lote_codigo LIKE '%PO%';
            UPDATE deudas SET lote_codigo = REPLACE(lote_codigo, 'OV', 'GO') WHERE lote_codigo LIKE '%OV%';
            UPDATE deudas SET lote_codigo = REPLACE(lote_codigo, 'CA', 'GC') WHERE lote_codigo LIKE '%CA%';
        `);

        // Actualización de códigos de lote en despachos
        await client.query(`
            UPDATE despacho_producto SET lote_codigo = REPLACE(lote_codigo, 'VA', 'GV') WHERE lote_codigo LIKE '%VA%';
            UPDATE despacho_producto SET lote_codigo = REPLACE(lote_codigo, 'PO', 'GP') WHERE lote_codigo LIKE '%PO%';
            UPDATE despacho_producto SET lote_codigo = REPLACE(lote_codigo, 'OV', 'GO') WHERE lote_codigo LIKE '%OV%';
            UPDATE despacho_producto SET lote_codigo = REPLACE(lote_codigo, 'CA', 'GC') WHERE lote_codigo LIKE '%CA%';
        `);

        // Completar la Fecha de Producción y Vencimiento para despachos históricos
        await client.query(`
            UPDATE despacho_producto dp
            SET fecha_produccion = COALESCE((SELECT fecha::date FROM recepciones r WHERE r.lote_codigo = dp.lote_codigo), dp.fecha::date)
            WHERE dp.fecha_produccion IS NULL
        `);
        await client.query(`
            UPDATE despacho_producto dp
            SET fecha_vencimiento = (dp.fecha_produccion + INTERVAL '7 days')::date
            WHERE dp.fecha_vencimiento IS NULL
        `);

        // Actualización de códigos de lote en productos no conformes
        await client.query(`
            UPDATE productos_no_conformes SET lote_codigo = REPLACE(lote_codigo, 'VA', 'GV') WHERE lote_codigo LIKE '%VA%';
            UPDATE productos_no_conformes SET lote_codigo = REPLACE(lote_codigo, 'PO', 'GP') WHERE lote_codigo LIKE '%PO%';
            UPDATE productos_no_conformes SET lote_codigo = REPLACE(lote_codigo, 'OV', 'GO') WHERE lote_codigo LIKE '%OV%';
            UPDATE productos_no_conformes SET lote_codigo = REPLACE(lote_codigo, 'CA', 'GC') WHERE lote_codigo LIKE '%CA%';
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
                INSERT INTO recepciones (id, lote_codigo, ganadero_id, ganadero_nombre, especie, cantidad, guia_transito, fecha, observaciones, estado, estado_cobro, registro_establo) VALUES
                ('r-ex-1', 'LBVA159', 'g-2', 'Fundo Las Brisas', 'VA', 15, 'GT-0012100', $1, 'Vacunos de ingreso anterior para registro de deuda histórica.', 'Inspeccionado', 'Al Crédito', 'EST-PE-10294'),
                ('r-ex-2', 'LBPO160', 'g-2', 'Fundo Las Brisas', 'PO', 12, 'GT-0012101', $1, 'Porcinos de ingreso anterior para registro de deuda histórica.', 'Inspeccionado', 'Al Crédito', 'EST-PE-10294'),
                ('r-1', $2, 'g-1', 'Agroindustria Atlántica S.A.C.', 'PO', 45, 'GT-0012485', $3, 'Porcinos ingresados en óptimas condiciones corporales.', 'Pendiente Inspección', 'Pendiente', 'EST-PE-09432'),
                ('r-2', $4, 'g-2', 'Fundo Las Brisas', 'VA', 12, 'GT-0012590', $5, 'Vacunos sin signos clínicos de enfermedades infectocontagiosas.', 'Pendiente Inspección', 'Pendiente', 'EST-PE-10294')
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

        // 17. Despachos y Transportes Semilla
        const rDespachos = await client.query('SELECT COUNT(*) FROM despacho_producto');
        if (parseInt(rDespachos.rows[0].count) === 0) {
            const hoy = new Date();
            const ayer = new Date();
            ayer.setDate(hoy.getDate() - 1);

            await client.query(`
                INSERT INTO despacho_producto (id, fecha, lote_codigo, cliente, guia_remision, cantidad_carcasas, peso_total, temperatura_carne, observaciones, responsable) VALUES 
                ('desp-1', $1, 'LBVA159', 'Carnicería Doris S.A.C.', 'GR-001-4820', 15, 3450.50, 4.20, 'Despacho de vacunos históricos en óptimas condiciones de frío.', 'Carlos Ruiz Rojas'),
                ('desp-2', $2, 'LBPO160', 'Supermercados Metro', 'GR-001-4821', 10, 850.20, 3.80, 'Despacho regular de porcinos.', 'Carlos Ruiz Rojas')
            `, [ayer, hoy]);

            await client.query(`
                INSERT INTO transporte_despacho (id, despacho_id, placa_vehiculo, conductor, licencia, higiene_furgon, temperatura_furgon, hermeticidad, observaciones) VALUES 
                ('trans-1', 'desp-1', 'A3F-820', 'Pedro Mendoza', 'Q12345678', 'Conforme', 3.20, true, 'Vehículo limpio y desinfectado antes de la carga.'),
                ('trans-2', 'desp-2', 'F4G-910', 'Manuel Silva', 'P87654321', 'Conforme', 2.90, true, 'Equipado con refrigeración operativa.')
            `);
        }

        // 18. Control de Cloro Semilla
        const rCloro = await client.query('SELECT COUNT(*) FROM control_cloro');
        if (parseInt(rCloro.rows[0].count) === 0) {
            const hoy = new Date();
            const ayer = new Date();
            ayer.setDate(hoy.getDate() - 1);
            
            await client.query(`
                INSERT INTO control_cloro (id, fecha, hora, punto_muestreo, cloro_residual, desviacion, observaciones, responsable) VALUES 
                ('cloro-1', $1, '08:30:00', 'Sala de Faenado - Punto 01', 0.80, false, 'Cloración en rango óptimo.', 'Carlos Ruiz Rojas'),
                ('cloro-2', $1, '16:00:00', 'Servicios Higiénicos Personal', 0.85, false, 'Medición de la tarde.', 'Carlos Ruiz Rojas'),
                ('cloro-3', $2, '09:15:00', 'Lavado de Manos - Ingreso', 0.75, false, 'Dosificación estable.', 'Carlos Ruiz Rojas')
            `, [ayer, hoy]);
        }

        // 19. Registro POES Semilla
        const rPoes = await client.query('SELECT COUNT(*) FROM registro_higiene_poes');
        if (parseInt(rPoes.rows[0].count) === 0) {
            const hoy = new Date();
            await client.query(`
                INSERT INTO registro_higiene_poes (id, fecha, tipo_item, nombre_item, frecuencia, limpieza_estado, desinfectante, concentracion_ppm, observaciones, responsable) VALUES 
                ('poes-1', $1, 'Equipo', 'Sierra de Pecho - Vacunos', 'Diaria', 'Conforme', 'Hipoclorito de Sodio', 200, 'Limpieza profunda al final de la jornada.', 'Carlos Ruiz Rojas'),
                ('poes-2', $1, 'Instalacion', 'Pisos Sala de Oreado', 'Diaria', 'Conforme', 'Hipoclorito de Sodio', 200, 'Lavado con detergente industrial y desinfección posterior.', 'Carlos Ruiz Rojas'),
                ('poes-3', $1, 'Utensilio', 'Cuchillos de Degüello', 'Diaria', 'Conforme', 'Hipoclorito de Sodio', 100, 'Desinfección por inmersión.', 'Carlos Ruiz Rojas')
            `, [hoy]);
        }

        // 20. Visitas Semilla
        const rVisitas = await client.query('SELECT COUNT(*) FROM registro_visitas');
        if (parseInt(rVisitas.rows[0].count) === 0) {
            const ayer = new Date();
            await client.query(`
                INSERT INTO registro_visitas (id, fecha, visitante_nombre, visitante_dni, institucion, hora_ingreso, hora_caliente, sintomas_salud, epp_entregado, responsable) VALUES 
                ('visita-1', $1, 'Sofía Lara Ruiz', '45678912', 'SENASA (Inspección)', '09:00:00', '11:30:00', false, 'Cofia, mascarilla, guardapolvo, botas', 'Carlos Ruiz Rojas'),
                ('visita-2', $1, 'Luis Vega Montes', '78945612', 'Mantenimiento de Balanzas', '14:00:00', '15:45:00', false, 'Cofia, casco, botas de seguridad', 'Carlos Ruiz Rojas')
            `, [ayer]);
        }

        // 21. Capacitaciones Semilla
        const rCapacitaciones = await client.query('SELECT COUNT(*) FROM registro_capacitaciones');
        if (parseInt(rCapacitaciones.rows[0].count) === 0) {
            const haceTresDias = new Date();
            haceTresDias.setDate(haceTresDias.getDate() - 3);
            await client.query(`
                INSERT INTO registro_capacitaciones (id, fecha, tema, ponente, duracion_horas, asistentes_ids, observaciones) VALUES 
                ('cap-1', $1, 'Buenas Prácticas de Manufactura en Faenado e Higiene Personal', 'Dra. Elena Ramos (Consultora)', 2.0, 't-1,t-2', 'Capacitación mensual obligatoria teórica y práctica.')
            `, [haceTresDias]);
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

        const pesajes = await pool.query('SELECT id, recepcion_id, correlativo_orejera, CAST(peso_pie_kg AS double precision) as peso_pie_kg, creado_el as fecha FROM pesajes_animales ORDER BY creado_el DESC');

        const camaras = await pool.query('SELECT id, nombre, CAST(temperatura_min AS double precision) as "temperaturaMin", CAST(temperatura_max AS double precision) as "temperaturaMax", estado FROM camaras_frigorificas ORDER BY nombre');
        const temperaturas = await pool.query('SELECT id, camara_id as "camaraId", CAST(temperatura AS double precision) as temperatura, fecha, desviacion FROM temperatura_monitoreo ORDER BY fecha DESC LIMIT 50');
        const productosNoConformes = await pool.query('SELECT id, origen, detalles, lote_codigo as "loteCodigo", accion_correctiva as "accionCorrectiva", fecha, responsable, estado FROM productos_no_conformes ORDER BY fecha DESC');

        // Nuevos Datasets de la Fase 15
        const despachosRaw = await pool.query('SELECT id, fecha, lote_codigo as "loteCodigo", cliente, guia_remision as "guiaRemision", cantidad_carcasas as "cantidadCarcasas", CAST(peso_total AS double precision) as "pesoTotal", CAST(temperatura_carne AS double precision) as "temperaturaCarne", observaciones, responsable, fecha_produccion as "fechaProduccion", fecha_vencimiento as "fechaVencimiento" FROM despacho_producto ORDER BY fecha DESC');
        const despachos = [];
        for (const d of despachosRaw.rows) {
            const t = await pool.query('SELECT id, placa_vehiculo as "placaVehiculo", conductor, licencia, higiene_furgon as "higieneFurgon", CAST(temperatura_furgon AS double precision) as "temperaturaFurgon", hermeticidad, observaciones, fumigacion, apilamiento_adecuado as "apilamientoAdecuado" FROM transporte_despacho WHERE despacho_id = $1', [d.id]);
            despachos.push({
                ...d,
                transporte: t.rows[0] || null
            });
        }

        const controlCloro = await pool.query('SELECT id, fecha, hora, punto_muestreo as "puntoMuestreo", CAST(cloro_residual AS double precision) as "cloroResidual", desviacion, observaciones, responsable FROM control_cloro ORDER BY fecha DESC, hora DESC');
        
        const registrosHigiene = await pool.query('SELECT id, fecha, tipo_item as "tipoItem", nombre_item as "nombreItem", frecuencia, limpieza_estado as "limpiezaEstado", desinfectante, concentracion_ppm as "concentracionPpm", observaciones, responsable FROM registro_higiene_poes ORDER BY fecha DESC');
        
        const visitas = await pool.query('SELECT id, fecha, visitante_nombre as "visitanteNombre", visitante_dni as "visitanteDni", institucion, hora_ingreso as "horaIngreso", hora_caliente as "horaSalida", sintomas_salud as "sintomasSalid", epp_entregado as "eppEntregado", responsable FROM registro_visitas ORDER BY fecha DESC, hora_ingreso DESC');
        
        const capacitaciones = await pool.query('SELECT id, fecha, tema, ponente, CAST(duracion_horas AS double precision) as "duracionHoras", asistentes_ids as "asistentesIds", observaciones FROM registro_capacitaciones ORDER BY fecha DESC');

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
                registro_establo: r.registro_establo,
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
            productosNoConformes: productosNoConformes.rows,
            despachos,
            controlCloro: controlCloro.rows,
            registrosHigiene: registrosHigiene.rows,
            visitas: visitas.rows,
            capacitaciones: capacitaciones.rows
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
    const { id, lote_codigo, ganadero_id, ganadero_nombre, especie, cantidad, guia_transito, fecha, observaciones, estado, estadoCobro, registro_establo } = req.body;
    try {
        await pool.query(
            'INSERT INTO recepciones (id, lote_codigo, ganadero_id, ganadero_nombre, especie, cantidad, guia_transito, fecha, observaciones, estado, estado_cobro, registro_establo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [id, lote_codigo, ganadero_id, ganadero_nombre, especie, cantidad, guia_transito, fecha, observaciones, estado, estadoCobro, registro_establo]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/recepciones/:id', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        await pool.query(
            'UPDATE recepciones SET estado = $1 WHERE id = $2',
            [estado, id]
        );
        res.json({ success: true });
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

// --- DESPACHOS Y TRANSPORTES ---
app.post('/api/despachos', async (req, res) => {
    const { nuevoDespacho, nuevoTransporte } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'INSERT INTO despacho_producto (id, fecha, lote_codigo, cliente, guia_remision, cantidad_carcasas, peso_total, temperatura_carne, observaciones, responsable, fecha_produccion, fecha_vencimiento) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
            [nuevoDespacho.id, nuevoDespacho.fecha, nuevoDespacho.loteCodigo, nuevoDespacho.cliente, nuevoDespacho.guiaRemision, nuevoDespacho.cantidadCarcasas, nuevoDespacho.pesoTotal, nuevoDespacho.temperaturaCarne, nuevoDespacho.observaciones, nuevoDespacho.responsable, nuevoDespacho.fechaProduccion, nuevoDespacho.fechaVencimiento]
        );

        if (nuevoTransporte) {
            await client.query(
                'INSERT INTO transporte_despacho (id, despacho_id, placa_vehiculo, conductor, licencia, higiene_furgon, temperatura_furgon, hermeticidad, observaciones, fumigacion, apilamiento_adecuado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [nuevoTransporte.id, nuevoDespacho.id, nuevoTransporte.placaVehiculo, nuevoTransporte.conductor, nuevoTransporte.licencia, nuevoTransporte.higieneFurgon, nuevoTransporte.temperaturaFurgon, nuevoTransporte.hermeticidad, nuevoTransporte.observaciones, nuevoTransporte.fumigacion, nuevoTransporte.apilamientoAdecuado]
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

app.put('/api/despachos/:id', async (req, res) => {
    const { id } = req.params;
    const { nuevoDespacho, nuevoTransporte } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE despacho_producto SET fecha = $1, lote_codigo = $2, cliente = $3, guia_remision = $4, cantidad_carcasas = $5, peso_total = $6, temperatura_carne = $7, observaciones = $8, responsable = $9, fecha_produccion = $10, fecha_vencimiento = $11 WHERE id = $12',
            [nuevoDespacho.fecha, nuevoDespacho.loteCodigo, nuevoDespacho.cliente, nuevoDespacho.guiaRemision, nuevoDespacho.cantidadCarcasas, nuevoDespacho.pesoTotal, nuevoDespacho.temperaturaCarne, nuevoDespacho.observaciones, nuevoDespacho.responsable, nuevoDespacho.fechaProduccion, nuevoDespacho.fechaVencimiento, id]
        );

        if (nuevoTransporte) {
            // Verificar si ya existe transporte para este despacho
            const rTrans = await client.query('SELECT id FROM transporte_despacho WHERE despacho_id = $1', [id]);
            if (rTrans.rows.length > 0) {
                await client.query(
                    'UPDATE transporte_despacho SET placa_vehiculo = $1, conductor = $2, licencia = $3, higiene_furgon = $4, temperatura_furgon = $5, hermeticidad = $6, observaciones = $7, fumigacion = $8, apilamiento_adecuado = $9 WHERE despacho_id = $10',
                    [nuevoTransporte.placaVehiculo, nuevoTransporte.conductor, nuevoTransporte.licencia, nuevoTransporte.higieneFurgon, nuevoTransporte.temperaturaFurgon, nuevoTransporte.hermeticidad, nuevoTransporte.observaciones, nuevoTransporte.fumigacion, nuevoTransporte.apilamientoAdecuado, id]
                );
            } else {
                await client.query(
                    'INSERT INTO transporte_despacho (id, despacho_id, placa_vehiculo, conductor, licencia, higiene_furgon, temperatura_furgon, hermeticidad, observaciones, fumigacion, apilamiento_adecuado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                    [nuevoTransporte.id || 'trans-' + Date.now(), id, nuevoTransporte.placaVehiculo, nuevoTransporte.conductor, nuevoTransporte.licencia, nuevoTransporte.higieneFurgon, nuevoTransporte.temperaturaFurgon, nuevoTransporte.hermeticidad, nuevoTransporte.observaciones, nuevoTransporte.fumigacion, nuevoTransporte.apilamientoAdecuado]
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

app.delete('/api/despachos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM despacho_producto WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- CONTROL DE CLORO ---
app.post('/api/control-cloro', async (req, res) => {
    const { id, fecha, hora, punto_muestreo, cloro_residual, desviacion, observaciones, responsable } = req.body;
    try {
        await pool.query(
            'INSERT INTO control_cloro (id, fecha, hora, punto_muestreo, cloro_residual, desviacion, observaciones, responsable) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, fecha, hora, punto_muestreo, cloro_residual, desviacion, observaciones, responsable]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/control-cloro/:id', async (req, res) => {
    const { id } = req.params;
    const { fecha, hora, punto_muestreo, cloro_residual, desviacion, observaciones, responsable } = req.body;
    try {
        await pool.query(
            'UPDATE control_cloro SET fecha = $1, hora = $2, punto_muestreo = $3, cloro_residual = $4, desviacion = $5, observaciones = $6, responsable = $7 WHERE id = $8',
            [fecha, hora, punto_muestreo, cloro_residual, desviacion, observaciones, responsable, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/control-cloro/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM control_cloro WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- REGISTRO HIGIENE POES ---
app.post('/api/registro-higiene-poes', async (req, res) => {
    const { id, fecha, tipo_item, nombre_item, frecuencia, limpieza_estado, desinfectante, concentracion_ppm, observaciones, responsable } = req.body;
    try {
        await pool.query(
            'INSERT INTO registro_higiene_poes (id, fecha, tipo_item, nombre_item, frecuencia, limpieza_estado, desinfectante, concentracion_ppm, observaciones, responsable) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [id, fecha, tipo_item, nombre_item, frecuencia, limpieza_estado, desinfectante, concentracion_ppm, observaciones, responsable]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/registro-higiene-poes/:id', async (req, res) => {
    const { id } = req.params;
    const { fecha, tipo_item, nombre_item, frecuencia, limpieza_estado, desinfectante, concentracion_ppm, observaciones, responsable } = req.body;
    try {
        await pool.query(
            'UPDATE registro_higiene_poes SET fecha = $1, tipo_item = $2, nombre_item = $3, frecuencia = $4, limpieza_estado = $5, desinfectante = $6, concentracion_ppm = $7, observaciones = $8, responsable = $9 WHERE id = $10',
            [fecha, tipo_item, nombre_item, frecuencia, limpieza_estado, desinfectante, concentracion_ppm, observaciones, responsable, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/registro-higiene-poes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM registro_higiene_poes WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- REGISTRO VISITAS ---
app.post('/api/visitas', async (req, res) => {
    const { id, fecha, visitante_nombre, visitante_dni, institucion, hora_ingreso, hora_caliente, sintomas_salud, epp_entregado, responsable } = req.body;
    try {
        await pool.query(
            'INSERT INTO registro_visitas (id, fecha, visitante_nombre, visitante_dni, institucion, hora_ingreso, hora_caliente, sintomas_salud, epp_entregado, responsable) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [id, fecha, visitante_nombre, visitante_dni, institucion, hora_ingreso, hora_caliente, sintomas_salud, epp_entregado, responsable]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/visitas/:id', async (req, res) => {
    const { id } = req.params;
    const { fecha, visitante_nombre, visitante_dni, institucion, hora_ingreso, hora_caliente, sintomas_salud, epp_entregado, responsable } = req.body;
    try {
        await pool.query(
            'UPDATE registro_visitas SET fecha = $1, visitante_nombre = $2, visitante_dni = $3, institucion = $4, hora_ingreso = $5, hora_caliente = $6, sintomas_salud = $7, epp_entregado = $8, responsable = $9 WHERE id = $10',
            [fecha, visitante_nombre, visitante_dni, institucion, hora_ingreso, hora_caliente, sintomas_salud, epp_entregado, responsable, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/visitas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM registro_visitas WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- CAPACITACIONES ---
app.post('/api/capacitaciones', async (req, res) => {
    const { id, fecha, tema, ponente, duracion_horas, asistentes_ids, observaciones } = req.body;
    try {
        await pool.query(
            'INSERT INTO registro_capacitaciones (id, fecha, tema, ponente, duracion_horas, asistentes_ids, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, fecha, tema, ponente, duracion_horas, asistentes_ids, observaciones]
        );
        res.status(201).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/capacitaciones/:id', async (req, res) => {
    const { id } = req.params;
    const { fecha, tema, ponente, duracion_horas, asistentes_ids, observaciones } = req.body;
    try {
        await pool.query(
            'UPDATE registro_capacitaciones SET fecha = $1, tema = $2, ponente = $3, duracion_horas = $4, asistentes_ids = $5, observaciones = $6 WHERE id = $7',
            [fecha, tema, ponente, duracion_horas, asistentes_ids, observaciones, id]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/capacitaciones/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM registro_capacitaciones WHERE id = $1', [id]);
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
