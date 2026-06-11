/* C:\Users\Administrador\Desktop\Faenos.click\app.js */

// Estructuras de datos iniciales en localStorage
let ganaderos = JSON.parse(localStorage.getItem('ganaderos')) || [];
let recepciones = JSON.parse(localStorage.getItem('recepciones')) || [];
let especies = JSON.parse(localStorage.getItem('especies')) || [];
let metodosPago = JSON.parse(localStorage.getItem('metodosPago')) || [];
let cajas = JSON.parse(localStorage.getItem('cajas')) || [];
let trabajadores = JSON.parse(localStorage.getItem('trabajadores')) || [];
let editingGanaderoId = null; // Estado de edición global
let editingEspecieId = null; // Estado de edición de especie global
let editingPagoId = null; // Estado de edición de pago global
let editingTrabajadorId = null; // Estado de edición de trabajador global


// ==========================================
// CONTROL DE MODALES DE FORMULARIO
// ==========================================

function openModal(tipo) {
    const modal = document.getElementById(`modal-${tipo}`);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(tipo) {
    const modal = document.getElementById(`modal-${tipo}`);
    if (modal) {
        modal.classList.remove('active');
        
        // Si cancelamos la edición de ganadero al cerrar
        if (tipo === 'ganadero' && editingGanaderoId !== null) {
            cancelarEdicion();
        }
        
        // Si cerramos el modal de especie, restablecer estado
        if (tipo === 'especie') {
            cancelarEdicionEspecie();
        }
        
        // Si cerramos el modal de pago, restablecer estado
        if (tipo === 'pago') {
            cancelarEdicionPago();
        }
        
        // Si cerramos el modal de trabajador, restablecer estado
        if (tipo === 'trabajador') {
            cancelarEdicionTrabajador();
        }
        
        // Si cerramos el modal de arqueo, limpiar campos y estilos
        if (tipo === 'arqueo') {
            const form = document.getElementById('form-arqueo');
            if (form) form.reset();
            const statusBox = document.getElementById('arqueo-status-box');
            if (statusBox) {
                statusBox.innerText = 'Ingrese el monto físico para calcular el cuadre';
                statusBox.className = '';
            }
        }
        
        // Si cerramos el modal de cobrar, limpiar campos
        if (tipo === 'cobrar') {
            const form = document.getElementById('form-cobrar');
            if (form) form.reset();
            
            const inputMetodo = document.getElementById('cobrar-pago-metodo');
            if (inputMetodo) inputMetodo.value = '';
            
            const txtMetodo = document.getElementById('custom-select-cobro-pago-text');
            if (txtMetodo) txtMetodo.innerText = 'Elige un método de pago...';
            
            document.querySelectorAll('#custom-select-cobro-pago-options .custom-select-option').forEach(el => el.classList.remove('selected'));
        }
    }
}

// Toggle Sidebar en Móviles y Tablets
function toggleSidebar() {
    const sidebar = document.getElementById('dashboard-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('mobile-active');
        overlay.classList.toggle('active');
    }
}

// ==========================================
// SISTEMA DE ALERTAS Y TOASTS PERSONALIZADOS
// ==========================================

// Sistema de Toasts (Notificaciones Flotantes)
function showToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${tipo}`;
    
    let icon = '';
    let title = '';
    switch(tipo) {
        case 'success': 
            icon = '<i class="fa-solid fa-circle-check"></i>'; 
            title = 'Éxito';
            break;
        case 'error': 
            icon = '<i class="fa-solid fa-circle-xmark"></i>'; 
            title = 'Error';
            break;
        case 'warning': 
            icon = '<i class="fa-solid fa-triangle-exclamation"></i>'; 
            title = 'Advertencia';
            break;
    }

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${mensaje}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto-eliminar en 4 segundos
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

// Modal de Confirmación Personalizado (Retorna una Promesa)
function customConfirm(mensaje) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-modal-message');
        const btnAccept = document.getElementById('btn-confirm-accept');
        const btnCancel = document.getElementById('btn-confirm-cancel');

        if (!overlay || !messageEl || !btnAccept || !btnCancel) {
            resolve(confirm(mensaje)); // Fallback seguro
            return;
        }

        // Configurar mensaje
        messageEl.innerText = mensaje;

        // Mostrar modal
        overlay.classList.add('active');

        // Handlers
        const onAccept = () => {
            cleanup();
            resolve(true);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            overlay.classList.remove('active');
            btnAccept.removeEventListener('click', onAccept);
            btnCancel.removeEventListener('click', onCancel);
        };

        // Escuchar eventos
        btnAccept.addEventListener('click', onAccept);
        btnCancel.addEventListener('click', onCancel);
    });
}

// Inicialización de datos de prueba si el almacén local está vacío
function initDataPrueba() {
    if (trabajadores.length === 0) {
        trabajadores = [
            { id: 't-1', nombre: 'Juan Pérez Prado', rol: 'Cajero', whatsapp: '+51 987654321', activo: true },
            { id: 't-2', nombre: 'María Gómez Torres', rol: 'Operador', whatsapp: '+51 944587123', activo: true },
            { id: 't-3', nombre: 'Carlos Ruiz Rojas', rol: 'Administrador', whatsapp: '+51 912365478', activo: true }
        ];
        localStorage.setItem('trabajadores', JSON.stringify(trabajadores));
    }

    if (metodosPago.length === 0) {
        metodosPago = [
            { id: 'mp-1', nombre: 'Efectivo Caja Chica', tipo: 'Efectivo', detalle: 'Pago en oficina principal', activo: true },
            { id: 'mp-2', nombre: 'Transferencia BCP', tipo: 'Transferencia', detalle: 'Cta Corriente BCP N° 191-12345678-0-90', activo: true },
            { id: 'mp-3', nombre: 'Yape Camal', tipo: 'Yape/Plin', detalle: 'Cel: +51 987654321', activo: true }
        ];
        localStorage.setItem('metodosPago', JSON.stringify(metodosPago));
    }

    if (especies.length === 0) {
        especies = [
            { id: 'e-1', nombre: 'Vacuno', codigo: 'VA', icono: '🐄', activo: true },
            { id: 'e-2', nombre: 'Porcino', codigo: 'PO', icono: '🐖', activo: true },
            { id: 'e-3', nombre: 'Ovino', codigo: 'OV', icono: '🐑', activo: true },
            { id: 'e-4', nombre: 'Caprino', codigo: 'CA', icono: '🐐', activo: true }
        ];
        localStorage.setItem('especies', JSON.stringify(especies));
    }

    if (ganaderos.length === 0) {
        ganaderos = [
            { id: 'g-1', nombre: 'Agroindustria Atlántica S.A.C.', ruc: '20601245891', whatsapp: '+51 987654321', codigo: 'AA', activo: true },
            { id: 'g-2', nombre: 'Fundo Las Brisas', ruc: '20551478962', whatsapp: '+51 944587123', codigo: 'LB', activo: true },
            { id: 'g-3', nombre: 'Hacienda El Prado', ruc: '10447896325', whatsapp: '+51 912365478', codigo: 'EP', activo: true }
        ];
        localStorage.setItem('ganaderos', JSON.stringify(ganaderos));
    }

    if (recepciones.length === 0) {
        const hoy = new Date();
        const ayer = new Date();
        ayer.setDate(hoy.getDate() - 1);

        recepciones = [
            {
                id: 'r-1',
                lote_codigo: 'AAPO' + getJulianDay(ayer),
                ganadero_id: 'g-1',
                ganadero_nombre: 'Agroindustria Atlántica S.A.C.',
                especie: 'PO',
                cantidad: 45,
                guia_transito: 'GT-0012485',
                fecha: ayer.toISOString(),
                observaciones: 'Porcinos ingresados en óptimas condiciones corporales.',
                estado: 'Pendiente Inspección',
                estadoCobro: 'Pendiente'
            },
            {
                id: 'r-2',
                lote_codigo: 'LBVA' + getJulianDay(hoy),
                ganadero_id: 'g-2',
                ganadero_nombre: 'Fundo Las Brisas',
                especie: 'VA',
                cantidad: 12,
                guia_transito: 'GT-0012590',
                fecha: hoy.toISOString(),
                observaciones: 'Vacunos sin signos clínicos de enfermedades infectocontagiosas.',
                estado: 'Pendiente Inspección',
                estadoCobro: 'Pendiente'
            }
        ];
        localStorage.setItem('recepciones', JSON.stringify(recepciones));
    }
}

// Algoritmo de Cálculo de Día Juliano (Día del año: 1-365/366)
function getJulianDay(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    return String(day).padStart(3, '0');
}

// Cambiar de Pestañas (Routing de la SPA)
function switchTab(tabName) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('onclick').includes(tabName)) {
            item.classList.add('active');
        }
    });

    let titleText = 'Ingreso de Ganado (Recepción)';
    if (tabName === 'ganaderos') {
        titleText = 'Gestión de Ganaderos';
    } else if (tabName === 'trabajadores') {
        titleText = 'Gestión de Personal (Trabajadores)';
    } else if (tabName === 'configuraciones') {
        titleText = 'Configuración del Sistema';
    } else if (tabName === 'caja') {
        titleText = 'Caja General y Control de Cobros';
    }
    document.getElementById('header-title-text').innerText = titleText;

    // Si salimos de ganaderos, cancelamos la edición activa por seguridad
    if (tabName !== 'ganaderos' && editingGanaderoId !== null) {
        cancelarEdicion();
    }

    // Si salimos de trabajadores, cancelamos la edición activa por seguridad
    if (tabName !== 'trabajadores' && editingTrabajadorId !== null) {
        cancelarEdicionTrabajador();
    }

    // Si salimos de configuraciones, cancelamos la edición de especies activa
    if (tabName !== 'configuraciones' && editingEspecieId !== null) {
        cancelarEdicionEspecie();
    }

    // Cerrar sidebar en móviles tras cambiar de pestaña
    const sidebar = document.getElementById('dashboard-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('mobile-active')) {
        sidebar.classList.remove('mobile-active');
        overlay.classList.remove('active');
    }

    renderAll();
}

// Navegación de Sub-Pestañas en el Módulo de Configuración
function switchConfigSubTab(subTabName) {
    document.querySelectorAll('.config-subtab-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.config-nav-item').forEach(el => el.classList.remove('active'));
    
    const targetSubTab = document.getElementById(`config-subtab-${subTabName}`);
    if (targetSubTab) {
        targetSubTab.classList.add('active');
    }
    
    const navItems = document.querySelectorAll('.config-nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('onclick').includes(subTabName)) {
            item.classList.add('active');
        }
    });
}

// Preview del Lote Juliano en tiempo real en el formulario de recepción
function previewLoteCode() {
    const ganaderoId = document.getElementById('recepcion-ganadero').value;
    const especie = document.getElementById('recepcion-especie').value;
    
    if (!ganaderoId || !especie) {
        document.getElementById('lote-preview-code').innerText = '--';
        return;
    }

    const ganadero = ganaderos.find(g => g.id === ganaderoId);
    if (ganadero) {
        const codigoProv = ganadero.codigo.toUpperCase();
        const diaJuliano = getJulianDay(new Date());
        document.getElementById('lote-preview-code').innerText = `${codigoProv}${especie}${diaJuliano}`;
    }
}

// Guardar o Actualizar Ganadero
function saveGanadero(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('ganadero-nombre').value.trim();
    const ruc = document.getElementById('ganadero-ruc').value.trim();
    const whatsapp = document.getElementById('ganadero-whatsapp').value.trim();
    const codigo = document.getElementById('ganadero-codigo').value.trim().toUpperCase();

    // Validar duplicado de código (excluyendo el actual si estamos editando)
    if (ganaderos.some(g => g.codigo === codigo && g.id !== editingGanaderoId)) {
        showToast('El código de proveedor ya está asignado a otro ganadero.', 'error');
        return;
    }
    // Validar duplicado de RUC (excluyendo el actual si estamos editando)
    if (ganaderos.some(g => g.ruc === ruc && g.id !== editingGanaderoId)) {
        showToast('Ya existe otro ganadero registrado con este RUC.', 'error');
        return;
    }
    if (codigo.length !== 2) {
        showToast('El código de proveedor debe tener exactamente 2 letras.', 'error');
        return;
    }

    if (editingGanaderoId !== null) {
        // MODO EDICIÓN
        const ganaderoIdx = ganaderos.findIndex(g => g.id === editingGanaderoId);
        if (ganaderoIdx !== -1) {
            ganaderos[ganaderoIdx].nombre = nombre;
            ganaderos[ganaderoIdx].ruc = ruc;
            ganaderos[ganaderoIdx].whatsapp = whatsapp;
            
            const antiguoCodigo = ganaderos[ganaderoIdx].codigo;
            ganaderos[ganaderoIdx].codigo = codigo;

            // Actualizar recepciones
            recepciones.forEach(r => {
                if (r.ganadero_id === editingGanaderoId) {
                    r.ganadero_nombre = nombre;
                    if (antiguoCodigo !== codigo) {
                        r.lote_codigo = r.lote_codigo.replace(antiguoCodigo, codigo);
                    }
                }
            });

            localStorage.setItem('recepciones', JSON.stringify(recepciones));
            localStorage.setItem('ganaderos', JSON.stringify(ganaderos));
            
            showToast('Ganadero actualizado exitosamente.', 'success');
            closeModal('ganadero'); // Cerrará y cancelará la edición
        }
    } else {
        // MODO NUEVO REGISTRO
        const nuevoGanadero = {
            id: 'g-' + Date.now(),
            nombre,
            ruc,
            whatsapp,
            codigo,
            activo: true
        };

        ganaderos.push(nuevoGanadero);
        localStorage.setItem('ganaderos', JSON.stringify(ganaderos));
        showToast('Ganadero registrado exitosamente.', 'success');
        closeModal('ganadero');
    }
    
    renderAll();
}

// Cargar Datos en Formulario para Edición
function editGanadero(id) {
    const ganadero = ganaderos.find(g => g.id === id);
    if (!ganadero) return;

    editingGanaderoId = id;

    // Rellenar formulario
    document.getElementById('ganadero-nombre').value = ganadero.nombre;
    document.getElementById('ganadero-whatsapp').value = ganadero.whatsapp;
    
    const rucVal = ganadero.ruc || '';
    document.getElementById('ganadero-ruc').value = rucVal;
    
    // Configurar radio del documento segun longitud
    const radioRuc = document.querySelector('input[name="tipo-documento"][value="RUC"]');
    const radioDni = document.querySelector('input[name="tipo-documento"][value="DNI"]');
    if (rucVal.length === 8) {
        if (radioDni) radioDni.checked = true;
    } else {
        if (radioRuc) radioRuc.checked = true;
    }
    onChangeTipoDocumento();
    
    const inputCodigo = document.getElementById('ganadero-codigo');
    inputCodigo.value = ganadero.codigo;

    // Modificar UI del Modal de Formulario
    document.getElementById('modal-ganadero-title').innerHTML = `
        <i class="fa-solid fa-user-pen" style="color: var(--color-admin);"></i>
        Editar Ganadero
    `;
    document.getElementById('text-submit-ganadero').innerText = 'Guardar Cambios';

    // Proteger integridad
    const tieneLotes = recepciones.some(r => r.ganadero_id === id);
    if (tieneLotes) {
        inputCodigo.disabled = true;
        inputCodigo.title = "No se puede editar el código de lote porque tiene lotes ingresados.";
    } else {
        inputCodigo.disabled = false;
        inputCodigo.title = "";
    }

    // Abrir Modal
    openModal('ganadero');
}

// Cancelar Edición y restaurar formulario
function cancelarEdicion() {
    editingGanaderoId = null;

    // Limpiar formulario
    document.getElementById('form-ganadero').reset();
    onChangeTipoDocumento();

    const inputCodigo = document.getElementById('ganadero-codigo');
    inputCodigo.disabled = false;
    inputCodigo.title = "";

    // Restaurar UI del Modal
    document.getElementById('modal-ganadero-title').innerHTML = `
        <i class="fa-solid fa-user-plus" style="color: var(--color-client);"></i>
        Registrar Ganadero
    `;
    document.getElementById('text-submit-ganadero').innerText = 'Registrar Ganadero';
    
    // Cerrar si estaba activo
    const modal = document.getElementById('modal-ganadero');
    if (modal && modal.classList.contains('active')) {
        modal.classList.remove('active');
    }
}

// Guardar Ingreso de Ganado
function saveIngreso(event) {
    event.preventDefault();

    const ganaderoId = document.getElementById('recepcion-ganadero').value;
    const especie = document.getElementById('recepcion-especie').value;
    const cantidad = parseInt(document.getElementById('recepcion-cantidad').value);
    const guia = document.getElementById('recepcion-guia').value.trim();
    const observaciones = document.getElementById('recepcion-observaciones').value.trim();

    if (!ganaderoId || !especie || !cantidad || !guia) {
        showToast('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    const ganadero = ganaderos.find(g => g.id === ganaderoId);
    if (!ganadero) return;

    const codigoLote = ganadero.codigo.toUpperCase() + especie + getJulianDay(new Date());

    if (recepciones.some(r => r.lote_codigo === codigoLote)) {
        showToast(`El lote ${codigoLote} ya registra ingresos hoy.`, 'warning');
    }

    const nuevoIngreso = {
        id: 'r-' + Date.now(),
        lote_codigo: codigoLote,
        ganadero_id: ganaderoId,
        ganadero_nombre: ganadero.nombre,
        especie: especie,
        cantidad: cantidad,
        guia_transito: guia,
        fecha: new Date().toISOString(),
        observaciones: observaciones || 'Sin observaciones adicionales.',
        estado: 'Pendiente Inspección',
        estadoCobro: 'Pendiente'
    };

    recepciones.push(nuevoIngreso);
    localStorage.setItem('recepciones', JSON.stringify(recepciones));

    document.getElementById('form-recepcion').reset();
    
    // Restablecer Selects Personalizados
    document.getElementById('recepcion-ganadero').value = '';
    const textGanadero = document.getElementById('custom-select-ganadero-text');
    if (textGanadero) textGanadero.innerText = 'Elige un ganadero...';
    document.querySelectorAll('#custom-select-ganadero-options .custom-select-option').forEach(el => el.classList.remove('selected'));
    
    document.getElementById('recepcion-especie').value = '';
    const textEspecie = document.getElementById('custom-select-especie-text');
    if (textEspecie) textEspecie.innerText = 'Elige una especie...';
    document.querySelectorAll('#custom-select-especie-options .custom-select-option').forEach(el => el.classList.remove('selected'));
    
    document.getElementById('lote-preview-code').innerText = '--';
    
    closeModal('recepcion');
    renderAll();
    showToast(`Ingreso registrado con Lote: ${codigoLote}`, 'success');
}

// Eliminar Ganadero
async function deleteGanadero(id) {
    const confirmado = await customConfirm('¿Está seguro de eliminar este ganadero? La acción es permanente.');
    if (confirmado) {
        if (recepciones.some(r => r.ganadero_id === id)) {
            showToast('No se puede eliminar: tiene lotes e ingresos asociados.', 'error');
            return;
        }

        if (editingGanaderoId === id) {
            cancelarEdicion();
        }

        ganaderos = ganaderos.filter(g => g.id !== id);
        localStorage.setItem('ganaderos', JSON.stringify(ganaderos));
        renderAll();
        showToast('Ganadero eliminado correctamente.', 'success');
    }
}

// Filtrar Ganaderos
function filterGanaderos() {
    const query = document.getElementById('search-ganaderos').value.toLowerCase();
    const rows = document.querySelectorAll('#table-ganaderos-body tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Filtrar Recepciones
function filterRecepciones() {
    const query = document.getElementById('search-recepciones').value.toLowerCase();
    const rows = document.querySelectorAll('#table-recepciones-body tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// Renderizar todo en pantalla
function renderAll() {
    // 1. Tabla de Ganaderos
    const tbodyGanaderos = document.getElementById('table-ganaderos-body');
    tbodyGanaderos.innerHTML = '';
    
    ganaderos.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="lote-tag">${g.codigo}</span></td>
            <td><strong>${g.nombre}</strong></td>
            <td>${g.ruc}</td>
            <td><i class="fa-brands fa-whatsapp" style="color: #25d366; margin-right: 6px;"></i>${g.whatsapp}</td>
            <td>
                <button onclick="editGanadero('${g.id}')" style="background: none; border: none; color: var(--color-admin); cursor: pointer; font-size: 15px; margin-right: 12px;" title="Editar">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteGanadero('${g.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 15px;" title="Eliminar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbodyGanaderos.appendChild(tr);
    });

    // 2. Dropdown de Ganaderos Personalizado
    const customOptionsGanadero = document.getElementById('custom-select-ganadero-options');
    if (customOptionsGanadero) {
        customOptionsGanadero.innerHTML = '';
        ganaderos.forEach(g => {
            const divOpt = document.createElement('div');
            divOpt.className = 'custom-select-option';
            divOpt.innerText = `${g.nombre} (${g.codigo})`;
            divOpt.setAttribute('data-value', g.id);
            // Comprobar si es el seleccionado actual
            const selectedVal = document.getElementById('recepcion-ganadero').value;
            if (selectedVal === g.id) {
                divOpt.classList.add('selected');
            }
            divOpt.onclick = (event) => selectGanaderoOption(g.id, `${g.nombre} (${g.codigo})`, event);
            customOptionsGanadero.appendChild(divOpt);
        });
    }

    // 2b. Dropdown de Especies Personalizado
    const customOptionsEspecie = document.getElementById('custom-select-especie-options');
    if (customOptionsEspecie) {
        customOptionsEspecie.innerHTML = '';
        especies.forEach(e => {
            if (e.activo) {
                const divOpt = document.createElement('div');
                divOpt.className = 'custom-select-option';
                divOpt.innerText = `${e.icono} ${e.nombre} (${e.codigo})`;
                divOpt.setAttribute('data-value', e.codigo);
                // Comprobar si es el seleccionado actual
                const selectedVal = document.getElementById('recepcion-especie').value;
                if (selectedVal === e.codigo) {
                    divOpt.classList.add('selected');
                }
                divOpt.onclick = (event) => selectEspecieOption(e.codigo, `${e.icono} ${e.nombre} (${e.codigo})`, event);
                customOptionsEspecie.appendChild(divOpt);
            }
        });
    }

    // 3. Tabla de Recepciones
    const tbodyRecepciones = document.getElementById('table-recepciones-body');
    tbodyRecepciones.innerHTML = '';

    const recepcionesOrdenadas = [...recepciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    recepcionesOrdenadas.forEach(r => {
        const fechaLegible = new Date(r.fecha).toLocaleString('es-PE', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        
        let especieLabel = r.especie;
        const especieObj = especies.find(e => e.codigo === r.especie);
        if (especieObj) {
            especieLabel = `${especieObj.icono} ${especieObj.nombre}`;
        }

        let cobroCell = '';
        if (r.estadoCobro === 'Cobrado') {
            cobroCell = `<span class="badge badge-success" style="background: rgba(5, 150, 105, 0.08); color: var(--color-ops); border: 1px solid rgba(5, 150, 105, 0.15);"><i class="fa-solid fa-circle-check"></i> Cobrado</span>`;
        } else {
            cobroCell = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge badge-pending" style="padding: 2px 6px; font-size: 10px;">Pendiente</span>
                    <button onclick="iniciarCobro('${r.id}')" class="btn-primary" style="width: auto; padding: 4px 8px; font-size: 11px; margin-top: 0; background: linear-gradient(135deg, var(--color-ops), #047857); box-shadow: none;">
                        <i class="fa-solid fa-file-invoice-dollar"></i> Cobrar
                    </button>
                </div>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="lote-tag" style="border-color: var(--color-client); color: #ea580c; background: rgba(234, 88, 12, 0.05);">${r.lote_codigo}</span></td>
            <td><strong>${r.ganadero_nombre}</strong></td>
            <td>${especieLabel}</td>
            <td style="font-weight: 600;">${r.cantidad}</td>
            <td>${r.guia_transito}</td>
            <td style="font-size: 12px; color: var(--text-secondary);">${fechaLegible}</td>
            <td>${cobroCell}</td>
            <td><span class="badge badge-pending">${r.estado}</span></td>
        `;
        tbodyRecepciones.appendChild(tr);
    });

    // 4. Métricas
    document.getElementById('stat-total-ganaderos').innerText = ganaderos.length;
    document.getElementById('stat-ganaderos-activos').innerText = ganaderos.filter(g => g.activo).length;
    document.getElementById('stat-ultimo-codigo').innerText = ganaderos.length > 0 ? ganaderos[ganaderos.length - 1].codigo : '--';

    const hoyStr = new Date().toDateString();
    const ingresosHoy = recepciones.filter(r => new Date(r.fecha).toDateString() === hoyStr);
    
    document.getElementById('stat-ingresos-hoy').innerText = ingresosHoy.length;
    document.getElementById('stat-total-cabezas').innerText = recepciones.reduce((acc, curr) => acc + curr.cantidad, 0);
    document.getElementById('stat-dia-juliano').innerText = getJulianDay(new Date());

    // 5. Tabla de Especies en Módulo de Configuración
    const tbodyEspecies = document.getElementById('table-especies-body');
    if (tbodyEspecies) {
        tbodyEspecies.innerHTML = '';
        especies.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size: 20px;">${e.icono}</td>
                <td><strong>${e.nombre}</strong></td>
                <td><span class="lote-tag" style="border-color: var(--color-client); color: var(--color-client); background: rgba(234, 88, 12, 0.05);">${e.codigo}</span></td>
                <td><span class="badge badge-success">Activo</span></td>
                <td>
                    <button onclick="editEspecie('${e.id}')" style="background: none; border: none; color: var(--color-admin); cursor: pointer; font-size: 15px; margin-right: 12px;" title="Editar">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteEspecie('${e.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 15px;" title="Eliminar">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            tbodyEspecies.appendChild(tr);
        });
    }

    // 6. Tabla de Métodos de Pago en Módulo de Configuración
    const tbodyPagos = document.getElementById('table-pagos-body');
    if (tbodyPagos) {
        tbodyPagos.innerHTML = '';
        metodosPago.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.nombre}</strong></td>
                <td><span class="badge" style="background: rgba(79, 70, 229, 0.08); color: var(--color-admin); border: 1px solid rgba(79, 70, 229, 0.15);">${m.tipo}</span></td>
                <td style="font-size: 13px; color: var(--text-secondary);">${m.detalle}</td>
                <td><span class="badge badge-success">Activo</span></td>
                <td>
                    <button onclick="editPago('${m.id}')" style="background: none; border: none; color: var(--color-admin); cursor: pointer; font-size: 15px; margin-right: 12px;" title="Editar">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deletePago('${m.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 15px;" title="Eliminar">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            tbodyPagos.appendChild(tr);
        });
    }

    // 7. Dropdown de Métodos de Pago para Cobros (Modal Cobrar)
    const customOptionsCobroPago = document.getElementById('custom-select-cobro-pago-options');
    if (customOptionsCobroPago) {
        customOptionsCobroPago.innerHTML = '';
        metodosPago.forEach(m => {
            if (m.activo) {
                const divOpt = document.createElement('div');
                divOpt.className = 'custom-select-option';
                divOpt.innerText = `${m.nombre} (${m.tipo})`;
                divOpt.setAttribute('data-value', m.id);
                // Comprobar si es el seleccionado actual
                const selectedVal = document.getElementById('cobrar-pago-metodo').value;
                if (selectedVal === m.id) {
                    divOpt.classList.add('selected');
                }
                divOpt.onclick = (event) => selectCobroPagoOption(m.id, `${m.nombre} (${m.tipo})`, event);
                customOptionsCobroPago.appendChild(divOpt);
            }
        });
    }

    // 8. Vistas condicionales y Balances de Caja General
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    const panelCerrada = document.getElementById('caja-estado-cerrada');
    const panelAbierta = document.getElementById('caja-estado-abierta');
    
    if (cajaActiva) {
        if (panelCerrada) panelCerrada.classList.remove('active');
        if (panelAbierta) panelAbierta.classList.add('active');
        
        // Calcular métricas
        const ingresos = cajaActiva.movimientos.filter(m => m.tipo === 'Ingreso').reduce((acc, curr) => acc + curr.monto, 0);
        const egresos = cajaActiva.movimientos.filter(m => m.tipo === 'Egreso').reduce((acc, curr) => acc + curr.monto, 0);
        const saldoActual = cajaActiva.montoApertura + ingresos - egresos;
        
        // Pintar métricas
        const valApertura = document.getElementById('caja-val-apertura');
        const valIngresos = document.getElementById('caja-val-ingresos');
        const valEgresos = document.getElementById('caja-val-egresos');
        const valSaldo = document.getElementById('caja-val-saldo');
        
        if (valApertura) valApertura.innerText = `S/. ${cajaActiva.montoApertura.toFixed(2)}`;
        if (valIngresos) valIngresos.innerText = `S/. ${ingresos.toFixed(2)}`;
        if (valEgresos) valEgresos.innerText = `S/. ${egresos.toFixed(2)}`;
        if (valSaldo) valSaldo.innerText = `S/. ${saldoActual.toFixed(2)}`;
        
        // Poblar movimientos del turno activo
        const tbodyMovs = document.getElementById('table-movimientos-body');
        if (tbodyMovs) {
            tbodyMovs.innerHTML = '';
            
            if (cajaActiva.movimientos.length === 0) {
                tbodyMovs.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 16px;">No hay movimientos en este turno.</td></tr>`;
            } else {
                const movsOrdenados = [...cajaActiva.movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                movsOrdenados.forEach(m => {
                    const horaLegible = new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const metodoObj = metodosPago.find(mp => mp.id === m.metodoPagoId);
                    const metodoNombre = metodoObj ? metodoObj.nombre : (m.metodoPagoId === 'mp-1' ? 'Efectivo Caja Chica' : 'Otro');
                    
                    let badgeTipo = '';
                    let montoEstilo = '';
                    if (m.tipo === 'Ingreso') {
                        badgeTipo = `<span class="badge badge-success" style="background: rgba(5, 150, 105, 0.08); color: var(--color-ops); border: 1px solid rgba(5, 150, 105, 0.15);"><i class="fa-solid fa-arrow-down-long"></i> Ingreso</span>`;
                        montoEstilo = `color: var(--color-ops); font-weight: 600;`;
                    } else {
                        badgeTipo = `<span class="badge" style="background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15);"><i class="fa-solid fa-arrow-up-long"></i> Egreso</span>`;
                        montoEstilo = `color: #ef4444; font-weight: 600;`;
                    }
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-size: 12px; color: var(--text-secondary);">${horaLegible}</td>
                        <td>
                            <strong>${m.concepto}</strong>
                            ${m.referencia && m.referencia !== 'Manual' ? `<br><small style="font-size: 10px; color: var(--text-secondary);">Ref: ${m.referencia}</small>` : ''}
                        </td>
                        <td><span style="font-size: 12px;">${metodoNombre}</span></td>
                        <td>${badgeTipo}</td>
                        <td style="${montoEstilo}">S/. ${m.monto.toFixed(2)}</td>
                    `;
                    tbodyMovs.appendChild(tr);
                });
            }
        }
    } else {
        if (panelCerrada) panelCerrada.classList.add('active');
        if (panelAbierta) panelAbierta.classList.remove('active');
    }

    // 9. Historial de Cajas Cerradas
    const tbodyHistorialCajas = document.getElementById('table-historial-cajas-body');
    if (tbodyHistorialCajas) {
        tbodyHistorialCajas.innerHTML = '';
        const cajasCerradas = cajas.filter(c => c.estado === 'Cerrada').sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre));
        
        if (cajasCerradas.length === 0) {
            tbodyHistorialCajas.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 16px;">No hay registros de cajas liquidadas anteriores.</td></tr>`;
        } else {
            cajasCerradas.forEach(c => {
                const fechaAperturaLegible = new Date(c.fechaApertura).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const fechaCierreLegible = new Date(c.fechaCierre).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                const encargado = c.trabajadorNombre || 'Operador General';
                const teorico = c.montoCierre || 0;
                const real = c.montoReal !== null && c.montoReal !== undefined ? c.montoReal : teorico;
                const dif = c.diferencia !== null && c.diferencia !== undefined ? c.diferencia : 0;
                
                let badgeArqueo = '';
                if (Math.abs(dif) < 0.01) {
                    badgeArqueo = `<span class="badge arqueo-cuadrado" style="font-size: 11px;">S/. 0.00 (Ok)</span>`;
                } else if (dif < 0) {
                    badgeArqueo = `<span class="badge arqueo-faltante" style="font-size: 11px;">S/. ${dif.toFixed(2)} (Faltante)</span>`;
                } else {
                    badgeArqueo = `<span class="badge arqueo-sobrante" style="font-size: 11px;">S/. +${dif.toFixed(2)} (Sobrante)</span>`;
                }
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-size: 12px; color: var(--text-secondary);">${fechaAperturaLegible}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${fechaCierreLegible}</td>
                    <td><strong>${encargado}</strong></td>
                    <td style="font-weight: 500;">S/. ${c.montoApertura.toFixed(2)}</td>
                    <td style="color: var(--color-admin); font-weight: 500;">S/. ${teorico.toFixed(2)}</td>
                    <td style="font-weight: 600; color: var(--text-primary);">S/. ${real.toFixed(2)}</td>
                    <td>${badgeArqueo}</td>
                    <td><span class="badge badge-success" style="background: rgba(5, 150, 105, 0.08); color: var(--color-ops); border: 1px solid rgba(5, 150, 105, 0.15);"><i class="fa-solid fa-circle-check"></i> Liquidada</span></td>
                `;
                tbodyHistorialCajas.appendChild(tr);
            });
        }
    }

    // 10. Tabla de Trabajadores
    const tbodyTrabajadores = document.getElementById('table-trabajadores-body');
    if (tbodyTrabajadores) {
        tbodyTrabajadores.innerHTML = '';
        trabajadores.forEach(t => {
            const tr = document.createElement('tr');
            const statusBadge = t.activo 
                ? `<span class="badge badge-success">Activo</span>`
                : `<span class="badge" style="background: rgba(100, 116, 139, 0.08); color: #64748b; border: 1px solid rgba(100, 116, 139, 0.15);">Inactivo</span>`;
                
            tr.innerHTML = `
                <td><strong>${t.nombre}</strong></td>
                <td><span class="badge" style="background: rgba(79, 70, 229, 0.08); color: var(--color-admin); border: 1px solid rgba(79, 70, 229, 0.15); font-weight: 600;">${t.rol}</span></td>
                <td><i class="fa-brands fa-whatsapp" style="color: #25d366; margin-right: 6px;"></i>${t.whatsapp}</td>
                <td>${statusBadge}</td>
                <td>
                    <button onclick="editTrabajador('${t.id}')" style="background: none; border: none; color: var(--color-admin); cursor: pointer; font-size: 15px; margin-right: 12px;" title="Editar">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteTrabajador('${t.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 15px;" title="Eliminar">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            tbodyTrabajadores.appendChild(tr);
        });
    }

    // 11. Métricas de Trabajadores
    const totalTrab = document.getElementById('stat-total-trabajadores');
    if (totalTrab) totalTrab.innerText = trabajadores.length;
    
    const activosTrab = document.getElementById('stat-trabajadores-activos');
    if (activosTrab) activosTrab.innerText = trabajadores.filter(t => t.activo).length;
    
    const cajerosTrab = document.getElementById('stat-trabajadores-cajeros');
    if (cajerosTrab) cajerosTrab.innerText = trabajadores.filter(t => t.activo && (t.rol === 'Cajero' || t.rol === 'Administrador')).length;

    // 12. Dropdown de Trabajadores en Apertura de Caja
    const customOptionsTrabajador = document.getElementById('custom-select-trabajador-options');
    if (customOptionsTrabajador) {
        customOptionsTrabajador.innerHTML = '';
        trabajadores.forEach(t => {
            if (t.activo) {
                const divOpt = document.createElement('div');
                divOpt.className = 'custom-select-option';
                divOpt.innerText = `${t.nombre} (${t.rol})`;
                divOpt.setAttribute('data-value', t.id);
                
                const selectedVal = document.getElementById('caja-trabajador-id').value;
                if (selectedVal === t.id) {
                    divOpt.classList.add('selected');
                }
                
                divOpt.onclick = (event) => selectTrabajadorAperturaOption(t.id, `${t.nombre} (${t.rol})`, event);
                customOptionsTrabajador.appendChild(divOpt);
            }
        });
    }
}

// Generar un código único de 2 letras a partir de una razón social
function generarCodigoGanadero(nombre) {
    if (!nombre) return '';
    
    // Palabras, preposiciones y términos corporativos a ignorar
    const ignorar = [
        'sac', 'sa', 'eirl', 'srl', 'sas', 'de', 'la', 'el', 'las', 'los', 'y', 'en', 'del',
        's.a.c.', 's.a.', 'e.i.r.l.', 's.r.l.', 's.a.s.', 'fundo', 'hacienda', 'agropecuaria', 'agroindustria',
        'grupo', 'empresa', 'corporacion'
    ];
    
    // Limpiar caracteres especiales, pasar a minúsculas y separar por palabras
    const palabras = nombre
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñü\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0 && !ignorar.includes(w));
        
    let codigo = '';
    
    if (palabras.length >= 2) {
        // Tomar primera letra de las dos primeras palabras significativas
        codigo = (palabras[0][0] + palabras[1][0]).toUpperCase();
    } else if (palabras.length === 1) {
        // Si hay una sola palabra, tomar las dos primeras letras
        const palabra = palabras[0];
        codigo = palabra.substring(0, Math.min(2, palabra.length)).toUpperCase();
    } else {
        // Fallback si todo se ignoró: usar el nombre original
        const palabrasOrig = nombre.toUpperCase().replace(/[^A-Z]/g, '').split(/\s+/).filter(w => w.length > 0);
        if (palabrasOrig.length >= 2) {
            codigo = palabrasOrig[0][0] + palabrasOrig[1][0];
        } else if (nombre.length >= 2) {
            codigo = nombre.substring(0, 2).toUpperCase();
        } else {
            codigo = 'XX';
        }
    }
    
    // Asegurar 2 caracteres rellenando con X si es muy corto
    codigo = codigo.padEnd(2, 'X').substring(0, 2);
    
    // Resolver colisiones si el código ya existe
    let codigoFinal = codigo;
    let intento = 1;
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    while (ganaderos.some(g => g.codigo === codigoFinal && g.id !== editingGanaderoId)) {
        // Si hay colisión, cambiar la segunda letra secuencialmente
        const letraAlternativa = letras[intento % letras.length];
        codigoFinal = codigo[0] + letraAlternativa;
        intento++;
        if (intento > 100) { // Evitar bucle infinito
            codigoFinal = 'G' + String(Math.floor(Math.random() * 10));
            break;
        }
    }
    
    return codigoFinal;
}

// Configurar evento input para autogeneración del código
function setupCodigoAutogenerado() {
    const inputNombre = document.getElementById('ganadero-nombre');
    const inputCodigo = document.getElementById('ganadero-codigo');
    
    if (inputNombre && inputCodigo) {
        inputNombre.addEventListener('input', () => {
            // Solo autogenerar si estamos en modo creación
            if (editingGanaderoId === null) {
                const sugerido = generarCodigoGanadero(inputNombre.value);
                inputCodigo.value = sugerido;
            }
        });
    }
}

// ==========================================
// CONTROL DE DESPLEGABLES PERSONALIZADOS (CUSTOM SELECT)
// ==========================================

// Alternar apertura de los selects
function toggleCustomSelect(tipo, event) {
    if (event) {
        event.stopPropagation();
    }
    const container = document.getElementById(`custom-select-${tipo}-container`);
    if (!container) return;

    // Cerrar otros desplegables abiertos por seguridad
    document.querySelectorAll('.custom-select-container').forEach(el => {
        if (el !== container) {
            el.classList.remove('active');
        }
    });

    container.classList.toggle('active');
}

// Seleccionar Ganadero
function selectGanaderoOption(id, texto, event) {
    if (event) {
        event.stopPropagation();
    }
    const inputHidden = document.getElementById('recepcion-ganadero');
    const triggerText = document.getElementById('custom-select-ganadero-text');
    const container = document.getElementById('custom-select-ganadero-container');
    const options = document.querySelectorAll('#custom-select-ganadero-options .custom-select-option');

    if (inputHidden && triggerText && container) {
        inputHidden.value = id;
        triggerText.innerText = texto;
        
        // Marcar la opción como seleccionada
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === id) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        
        container.classList.remove('active');
        previewLoteCode(); // Actualizar preview
    }
}

// Seleccionar Especie
function selectEspecieOption(especie, texto, event) {
    if (event) {
        event.stopPropagation();
    }
    const inputHidden = document.getElementById('recepcion-especie');
    const triggerText = document.getElementById('custom-select-especie-text');
    const container = document.getElementById('custom-select-especie-container');
    const options = document.querySelectorAll('#custom-select-especie-options .custom-select-option');

    if (inputHidden && triggerText && container) {
        inputHidden.value = especie;
        triggerText.innerText = texto;
        
        // Marcar la opción como seleccionada
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === especie) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        
        container.classList.remove('active');
        previewLoteCode(); // Actualizar preview
    }
}

// Cerrar desplegables al hacer clic fuera del select
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-container').forEach(el => {
        el.classList.remove('active');
    });
});

// ==========================================
// GESTIÓN DEL CATÁLOGO DE ESPECIES (CRUD)
// ==========================================

function iniciarNuevaEspecie() {
    cancelarEdicionEspecie();
    openModal('especie');
}

function cancelarEdicionEspecie() {
    editingEspecieId = null;
    
    const form = document.getElementById('form-especie');
    if (form) form.reset();
    
    const inputCodigo = document.getElementById('especie-codigo');
    if (inputCodigo) {
        inputCodigo.disabled = false;
        inputCodigo.title = "";
    }
    
    const modalTitle = document.getElementById('modal-especie-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fa-solid fa-circle-plus" style="color: var(--color-client);"></i>
            Registrar Especie de Ganado
        `;
    }
    
    const submitText = document.getElementById('text-submit-especie');
    if (submitText) {
        submitText.innerText = 'Registrar Especie';
    }
}

function saveEspecie(event) {
    event.preventDefault();
    const nombre = document.getElementById('especie-nombre').value.trim();
    const codigo = document.getElementById('especie-codigo').value.trim().toUpperCase();
    const icono = document.getElementById('especie-icono').value.trim();
    
    if (codigo.length !== 2) {
        showToast('El código de especie debe tener exactamente 2 letras.', 'error');
        return;
    }
    
    // Validaciones de unicidad (excepto para sí mismo si edita)
    if (especies.some(e => e.codigo === codigo && e.id !== editingEspecieId)) {
        showToast('El código de especie ya está asignado a otra especie.', 'error');
        return;
    }
    if (especies.some(e => e.nombre.toLowerCase() === nombre.toLowerCase() && e.id !== editingEspecieId)) {
        showToast('El nombre de especie ya existe en el catálogo.', 'error');
        return;
    }
    
    if (editingEspecieId !== null) {
        // Modo Edición
        const idx = especies.findIndex(e => e.id === editingEspecieId);
        if (idx !== -1) {
            const antiguoCodigo = especies[idx].codigo;
            especies[idx].nombre = nombre;
            especies[idx].codigo = codigo;
            especies[idx].icono = icono;
            
            // Actualizar recepciones que usaban el antiguo código
            recepciones.forEach(r => {
                if (r.especie === antiguoCodigo) {
                    r.especie = codigo;
                    // Actualizar el lote_codigo si corresponde
                    const ganaderoCod = r.lote_codigo.substring(0, 2);
                    const diaJuliano = r.lote_codigo.substring(4);
                    r.lote_codigo = `${ganaderoCod}${codigo}${diaJuliano}`;
                }
            });
            
            localStorage.setItem('recepciones', JSON.stringify(recepciones));
            localStorage.setItem('especies', JSON.stringify(especies));
            showToast('Especie actualizada correctamente.', 'success');
            closeModal('especie');
        }
    } else {
        // Modo Nuevo
        const nuevaEspecie = {
            id: 'e-' + Date.now(),
            nombre,
            codigo,
            icono,
            activo: true
        };
        especies.push(nuevaEspecie);
        localStorage.setItem('especies', JSON.stringify(especies));
        showToast('Especie registrada correctamente.', 'success');
        closeModal('especie');
    }
    
    renderAll();
}

function editEspecie(id) {
    const especie = especies.find(e => e.id === id);
    if (!especie) return;
    
    editingEspecieId = id;
    
    document.getElementById('especie-nombre').value = especie.nombre;
    
    const inputCodigo = document.getElementById('especie-codigo');
    inputCodigo.value = especie.codigo;
    
    document.getElementById('especie-icono').value = especie.icono;
    
    const modalTitle = document.getElementById('modal-especie-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fa-solid fa-pen-to-square" style="color: var(--color-client);"></i>
            Editar Especie de Ganado
        `;
    }
    
    const submitText = document.getElementById('text-submit-especie');
    if (submitText) {
        submitText.innerText = 'Guardar Cambios';
    }
    
    // Proteger integridad
    const tieneLotes = recepciones.some(r => r.especie === especie.codigo);
    if (tieneLotes) {
        inputCodigo.disabled = true;
        inputCodigo.title = "No se puede editar el código porque hay lotes de esta especie en el historial.";
    } else {
        inputCodigo.disabled = false;
        inputCodigo.title = "";
    }
    
    openModal('especie');
}

async function deleteEspecie(id) {
    const especie = especies.find(e => e.id === id);
    if (!especie) return;
    
    // Verificar trazabilidad
    const tieneLotes = recepciones.some(r => r.especie === especie.codigo);
    if (tieneLotes) {
        showToast('No se puede eliminar la especie: existen registros de ingresos asociados en el historial.', 'error');
        return;
    }
    
    const confirmado = await customConfirm(`¿Está seguro de eliminar la especie "${especie.nombre}"? Esta acción no se puede deshacer.`);
    if (confirmado) {
        if (editingEspecieId === id) {
            cancelarEdicionEspecie();
        }
        especies = especies.filter(e => e.id !== id);
        localStorage.setItem('especies', JSON.stringify(especies));
        renderAll();
        showToast('Especie eliminada correctamente.', 'success');
    }
}

// ==========================================
// GESTIÓN DEL CATÁLOGO DE MÉTODOS DE PAGO (CRUD)
// ==========================================

function iniciarNuevoPago() {
    cancelarEdicionPago();
    openModal('pago');
}

function cancelarEdicionPago() {
    editingPagoId = null;
    
    const form = document.getElementById('form-pago');
    if (form) form.reset();
    
    // Reset custom select
    const inputTipo = document.getElementById('pago-tipo');
    if (inputTipo) inputTipo.value = '';
    const txtTipo = document.getElementById('custom-select-pago-tipo-text');
    if (txtTipo) txtTipo.innerText = 'Elige un tipo de pago...';
    document.querySelectorAll('#custom-select-pago-tipo-options .custom-select-option').forEach(el => el.classList.remove('selected'));
    
    const modalTitle = document.getElementById('modal-pago-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fa-solid fa-circle-plus" style="color: var(--color-client);"></i>
            Registrar Método de Pago
        `;
    }
    
    const submitText = document.getElementById('text-submit-pago');
    if (submitText) {
        submitText.innerText = 'Registrar Método';
    }
}

function savePago(event) {
    event.preventDefault();
    const nombre = document.getElementById('pago-nombre').value.trim();
    const tipo = document.getElementById('pago-tipo').value;
    const detalle = document.getElementById('pago-detalle').value.trim();
    
    if (!tipo) {
        showToast('Debe seleccionar un tipo de pago.', 'error');
        return;
    }
    
    // Validaciones de unicidad (excepto para sí mismo si edita)
    if (metodosPago.some(m => m.nombre.toLowerCase() === nombre.toLowerCase() && m.id !== editingPagoId)) {
        showToast('El nombre de método de pago ya existe en el catálogo.', 'error');
        return;
    }
    
    if (editingPagoId !== null) {
        // Modo Edición
        const idx = metodosPago.findIndex(m => m.id === editingPagoId);
        if (idx !== -1) {
            metodosPago[idx].nombre = nombre;
            metodosPago[idx].tipo = tipo;
            metodosPago[idx].detalle = detalle;
            
            localStorage.setItem('metodosPago', JSON.stringify(metodosPago));
            showToast('Método de pago actualizado correctamente.', 'success');
            closeModal('pago');
        }
    } else {
        // Modo Nuevo
        const nuevoPago = {
            id: 'mp-' + Date.now(),
            nombre,
            tipo,
            detalle: detalle || 'Sin detalles adicionales',
            activo: true
        };
        metodosPago.push(nuevoPago);
        localStorage.setItem('metodosPago', JSON.stringify(metodosPago));
        showToast('Método de pago registrado correctamente.', 'success');
        closeModal('pago');
    }
    
    renderAll();
}

function editPago(id) {
    const pago = metodosPago.find(m => m.id === id);
    if (!pago) return;
    
    editingPagoId = id;
    
    document.getElementById('pago-nombre').value = pago.nombre;
    document.getElementById('pago-detalle').value = pago.detalle === 'Sin detalles adicionales' ? '' : pago.detalle;
    
    // Set custom select
    let tipoText = pago.tipo;
    if (pago.tipo === 'Transferencia') tipoText = 'Transferencia Bancaria';
    else if (pago.tipo === 'Tarjeta') tipoText = 'Tarjeta de Crédito/Débito';
    else if (pago.tipo === 'Yape/Plin') tipoText = 'Yape / Plin / Billetera Digital';
    
    selectPagoTipoOption(pago.tipo, tipoText);
    
    const modalTitle = document.getElementById('modal-pago-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fa-solid fa-pen-to-square" style="color: var(--color-client);"></i>
            Editar Método de Pago
        `;
    }
    
    const submitText = document.getElementById('text-submit-pago');
    if (submitText) {
        submitText.innerText = 'Guardar Cambios';
    }
    
    openModal('pago');
}

async function deletePago(id) {
    const pago = metodosPago.find(m => m.id === id);
    if (!pago) return;
    
    const confirmado = await customConfirm(`¿Está seguro de eliminar el método de pago "${pago.nombre}"? Esta acción no se puede deshacer.`);
    if (confirmado) {
        if (editingPagoId === id) {
            cancelarEdicionPago();
        }
        metodosPago = metodosPago.filter(m => m.id !== id);
        localStorage.setItem('metodosPago', JSON.stringify(metodosPago));
        renderAll();
        showToast('Método de pago eliminado correctamente.', 'success');
    }
}

// ==========================================
// GESTIÓN DE CAJA GENERAL Y COBROS
// ==========================================

function aperturarCaja(event) {
    event.preventDefault();
    const trabajadorId = document.getElementById('caja-trabajador-id').value;
    const monto = parseFloat(document.getElementById('caja-monto-apertura').value);
    
    if (!trabajadorId) {
        showToast('Debe seleccionar un encargado para el turno.', 'error');
        return;
    }
    
    const trab = trabajadores.find(t => t.id === trabajadorId);
    if (!trab) {
        showToast('El encargado seleccionado no es válido.', 'error');
        return;
    }
    
    if (isNaN(monto) || monto < 0) {
        showToast('Monto de apertura no válido.', 'error');
        return;
    }
    
    const nuevaCaja = {
        id: 'caja-' + Date.now(),
        fechaApertura: new Date().toISOString(),
        fechaCierre: null,
        montoApertura: monto,
        montoCierre: null,
        montoReal: null,
        diferencia: null,
        observacionArqueo: null,
        estado: 'Abierta',
        trabajadorId: trab.id,
        trabajadorNombre: trab.nombre,
        movimientos: []
    };
    
    cajas.push(nuevaCaja);
    localStorage.setItem('cajas', JSON.stringify(cajas));
    showToast('Caja general aperturada con éxito.', 'success');
    
    // Limpiar formulario y selector
    document.getElementById('form-apertura-caja').reset();
    document.getElementById('caja-trabajador-id').value = '';
    document.getElementById('custom-select-trabajador-text').innerText = 'Elige un trabajador...';
    document.querySelectorAll('#custom-select-trabajador-options .custom-select-option').forEach(el => el.classList.remove('selected'));
    
    renderAll();
}

function cerrarCaja() {
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    if (!cajaActiva) return;
    
    const ingresos = cajaActiva.movimientos.filter(m => m.tipo === 'Ingreso').reduce((acc, curr) => acc + curr.monto, 0);
    const egresos = cajaActiva.movimientos.filter(m => m.tipo === 'Egreso').reduce((acc, curr) => acc + curr.monto, 0);
    const saldoCalculado = cajaActiva.montoApertura + ingresos - egresos;
    
    // Cargar datos en el modal de arqueo
    document.getElementById('arqueo-txt-apertura').innerText = `S/. ${cajaActiva.montoApertura.toFixed(2)}`;
    document.getElementById('arqueo-txt-ingresos').innerText = `+ S/. ${ingresos.toFixed(2)}`;
    document.getElementById('arqueo-txt-egresos').innerText = `- S/. ${egresos.toFixed(2)}`;
    document.getElementById('arqueo-txt-teorico').innerText = `S/. ${saldoCalculado.toFixed(2)}`;
    
    // Reset inputs
    document.getElementById('arqueo-monto-real').value = '';
    document.getElementById('arqueo-observaciones').value = '';
    
    const statusBox = document.getElementById('arqueo-status-box');
    if (statusBox) {
        statusBox.innerText = 'Ingrese el monto físico para calcular el cuadre';
        statusBox.className = 'arqueo-cuadrado'; // Reset a estilo neutral
    }
    
    openModal('arqueo');
}

function registrarMovimientoExtra(event) {
    event.preventDefault();
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    if (!cajaActiva) {
        showToast('Debe aperturar la caja antes de registrar movimientos.', 'error');
        return;
    }
    
    const tipo = document.getElementById('mov-tipo').value;
    const monto = parseFloat(document.getElementById('mov-monto').value);
    const concepto = document.getElementById('mov-concepto').value.trim();
    
    if (isNaN(monto) || monto <= 0) {
        showToast('Monto del movimiento no válido.', 'error');
        return;
    }
    
    const nuevoMov = {
        id: 'mov-' + Date.now(),
        fecha: new Date().toISOString(),
        tipo: tipo,
        monto: monto,
        concepto: concepto,
        metodoPagoId: 'mp-1', // Efectivo Caja Chica por defecto
        referencia: 'Manual'
    };
    
    cajaActiva.movimientos.push(nuevoMov);
    localStorage.setItem('cajas', JSON.stringify(cajas));
    showToast('Movimiento extraordinario registrado con éxito.', 'success');
    document.getElementById('form-movimiento-extra').reset();
    selectMovTipoOption('Egreso', 'Egreso (Gasto / Salida)');
    renderAll();
}

function iniciarCobro(recepcionId) {
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    if (!cajaActiva) {
        showToast('Debe aperturar la caja general antes de poder procesar cobros.', 'error');
        return;
    }
    
    const r = recepciones.find(rec => rec.id === recepcionId);
    if (!r) return;
    
    document.getElementById('cobrar-recepcion-id').value = r.id;
    document.getElementById('cobrar-txt-lote').innerText = r.lote_codigo;
    document.getElementById('cobrar-txt-ganadero').innerText = r.ganadero_nombre;
    
    const especieObj = especies.find(e => e.codigo === r.especie);
    const especieNombre = especieObj ? especieObj.nombre : r.especie;
    document.getElementById('cobrar-txt-especie').innerText = especieNombre;
    document.getElementById('cobrar-txt-cabezas').innerText = r.cantidad;
    
    // Tarifas sugeridas
    let tarifaSugerida = 15.00;
    if (r.especie === 'VA') tarifaSugerida = 25.00;
    else if (r.especie === 'PO') tarifaSugerida = 15.00;
    else if (r.especie === 'OV' || r.especie === 'CA') tarifaSugerida = 10.00;
    
    document.getElementById('cobrar-tarifa-cabeza').value = tarifaSugerida;
    
    // Reset inputs
    document.getElementById('cobrar-pago-metodo').value = '';
    document.getElementById('custom-select-cobro-pago-text').innerText = 'Elige un método de pago...';
    document.querySelectorAll('#custom-select-cobro-pago-options .custom-select-option').forEach(el => el.classList.remove('selected'));
    document.getElementById('cobrar-observaciones').value = '';
    
    calcularTotalCobro();
    openModal('cobrar');
}

function calcularTotalCobro() {
    const cabezas = parseInt(document.getElementById('cobrar-txt-cabezas').innerText);
    const tarifa = parseFloat(document.getElementById('cobrar-tarifa-cabeza').value);
    const total = cabezas * (isNaN(tarifa) ? 0 : tarifa);
    document.getElementById('cobrar-monto-total').value = total.toFixed(2);
}

function selectCobroPagoOption(metodoId, texto, event) {
    if (event) event.stopPropagation();
    const inputHidden = document.getElementById('cobrar-pago-metodo');
    const triggerText = document.getElementById('custom-select-cobro-pago-text');
    const container = document.getElementById('custom-select-cobro-pago-container');
    const options = document.querySelectorAll('#custom-select-cobro-pago-options .custom-select-option');
    
    if (inputHidden && triggerText && container) {
        inputHidden.value = metodoId;
        triggerText.innerText = texto;
        
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === metodoId) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        container.classList.remove('active');
    }
}

function procesarCobro(event) {
    event.preventDefault();
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    if (!cajaActiva) {
        showToast('La caja general se encuentra cerrada. Abra la caja antes de cobrar.', 'error');
        return;
    }
    
    const recepcionId = document.getElementById('cobrar-recepcion-id').value;
    const metodoId = document.getElementById('cobrar-pago-metodo').value;
    const total = parseFloat(document.getElementById('cobrar-monto-total').value);
    const obs = document.getElementById('cobrar-observaciones').value.trim();
    
    if (!metodoId) {
        showToast('Debe seleccionar un método de pago.', 'error');
        return;
    }
    
    const rIdx = recepciones.findIndex(rec => rec.id === recepcionId);
    if (rIdx !== -1) {
        const rec = recepciones[rIdx];
        const concepto = `Cobro Faenamiento ${rec.lote_codigo} (${rec.cantidad} cab.) - ${rec.ganadero_nombre}`;
        
        const nuevoMov = {
            id: 'mov-' + Date.now(),
            fecha: new Date().toISOString(),
            tipo: 'Ingreso',
            monto: total,
            concepto: concepto,
            metodoPagoId: metodoId,
            referencia: rec.lote_codigo
        };
        
        cajaActiva.movimientos.push(nuevoMov);
        
        rec.estadoCobro = 'Cobrado';
        rec.cobroMovimientoId = nuevoMov.id;
        
        localStorage.setItem('cajas', JSON.stringify(cajas));
        localStorage.setItem('recepciones', JSON.stringify(recepciones));
        
        showToast(`Servicio del lote ${rec.lote_codigo} cobrado con éxito.`, 'success');
        closeModal('cobrar');
        renderAll();
    }
}

// ==========================================
// VALIDACIÓN DE DOCUMENTOS (DNI/RUC) VÍA API PERÚ
// ==========================================

const API_TOKEN = '76ca7246c8a8c464fd551b6555e780791a69ff89acb8887558d65b23f05ab81b';

// Cambiar visualización del campo del documento según el tipo de radio button
function onChangeTipoDocumento() {
    const radioSelected = document.querySelector('input[name="tipo-documento"]:checked');
    if (!radioSelected) return;

    const tipoDoc = radioSelected.value;
    const inputRuc = document.getElementById('ganadero-ruc');
    const labelRuc = document.getElementById('label-ganadero-ruc');
    
    if (inputRuc && labelRuc) {
        if (tipoDoc === 'DNI') {
            labelRuc.innerText = 'Número de DNI';
            inputRuc.placeholder = 'Ej. 70654321';
            inputRuc.maxLength = 8;
        } else {
            labelRuc.innerText = 'Número de RUC';
            inputRuc.placeholder = 'Ej. 20601234567';
            inputRuc.maxLength = 11;
        }
    }
}

// Consultar DNI o RUC a apiperu.dev
async function consultarDocumentoAPI(tipo, numero) {
    const endpoint = tipo === 'DNI' ? 'https://apiperu.dev/api/dni' : 'https://apiperu.dev/api/ruc';
    const bodyData = tipo === 'DNI' ? { dni: numero } : { ruc: numero };
    
    showToast(`Buscando ${tipo} en base SUNAT/Reniec...`, 'warning');
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify(bodyData)
        });
        
        if (!response.ok) {
            throw new Error(`Servicio respondió con código: ${response.status}`);
        }
        
        const resJson = await response.json();
        
        if (resJson.success && resJson.data) {
            const data = resJson.data;
            let nombreResultado = '';
            
            if (tipo === 'DNI') {
                nombreResultado = data.nombre_completo || `${data.nombres} ${data.apellido_paterno} ${data.apellido_materno}`;
            } else {
                nombreResultado = data.nombre_o_razon_social;
            }
            
            if (nombreResultado) {
                document.getElementById('ganadero-nombre').value = nombreResultado;
                showToast(`${tipo} validado y cargado con éxito.`, 'success');
                
                // Disparar autogeneración de código si estamos en creación
                if (editingGanaderoId === null) {
                    const inputCodigo = document.getElementById('ganadero-codigo');
                    if (inputCodigo) {
                        inputCodigo.value = generarCodigoGanadero(nombreResultado);
                    }
                }
            } else {
                showToast(`No se obtuvieron nombres para el ${tipo} ${numero}.`, 'warning');
            }
        } else {
            showToast(resJson.message || `No se pudo obtener información del ${tipo}.`, 'warning');
        }
    } catch (error) {
        console.error('Error al validar documento:', error);
        showToast('Error de conexión con el servicio de validación. Ingrese los datos manualmente.', 'error');
    }
}

// Configurar evento input para buscar automáticamente DNI (8 dígitos) o RUC (11 dígitos)
function setupValidacionDocumento() {
    const inputRuc = document.getElementById('ganadero-ruc');
    
    if (inputRuc) {
        inputRuc.addEventListener('input', () => {
            const radioSelected = document.querySelector('input[name="tipo-documento"]:checked');
            if (!radioSelected) return;

            const tipoDoc = radioSelected.value;
            // Solo permitir números en el campo
            let valor = inputRuc.value.replace(/\D/g, '');
            inputRuc.value = valor;
            
            if (tipoDoc === 'DNI' && valor.length === 8) {
                consultarDocumentoAPI('DNI', valor);
            } else if (tipoDoc === 'RUC' && valor.length === 11) {
                consultarDocumentoAPI('RUC', valor);
            }
        });
    }
}

// Iniciar creación de un nuevo ganadero (limpiar formulario)
function iniciarNuevoGanadero() {
    cancelarEdicion(); // Esto limpia inputs y restablece editingGanaderoId a null
    
    // Asegurar que tipo de documento se restablece por defecto a RUC
    const radioRuc = document.querySelector('input[name="tipo-documento"][value="RUC"]');
    if (radioRuc) {
        radioRuc.checked = true;
        onChangeTipoDocumento();
    }
    
    openModal('ganadero');
}

// Iniciar creación de un nuevo ingreso de ganado (limpiar formulario y custom selects)
function iniciarNuevoIngreso() {
    const form = document.getElementById('form-recepcion');
    if (form) form.reset();
    
    // Restablecer Custom Selects
    const inputGanadero = document.getElementById('recepcion-ganadero');
    const textGanadero = document.getElementById('custom-select-ganadero-text');
    if (inputGanadero) inputGanadero.value = '';
    if (textGanadero) textGanadero.innerText = 'Elige un ganadero...';
    document.querySelectorAll('#custom-select-ganadero-options .custom-select-option').forEach(el => el.classList.remove('selected'));
    
    const inputEspecie = document.getElementById('recepcion-especie');
    const textEspecie = document.getElementById('custom-select-especie-text');
    if (inputEspecie) inputEspecie.value = '';
    if (textEspecie) textEspecie.innerText = 'Elige una especie...';
    document.querySelectorAll('#custom-select-especie-options .custom-select-option').forEach(el => el.classList.remove('selected'));
    
    const previewLote = document.getElementById('lote-preview-code');
    if (previewLote) previewLote.innerText = '--';
    
    openModal('recepcion');
}

// ==========================================
// GESTIÓN DE PERSONAL / TRABAJADORES (CRUD)
// ==========================================

function iniciarNuevoTrabajador() {
    cancelarEdicionTrabajador();
    openModal('trabajador');
}

function cancelarEdicionTrabajador() {
    editingTrabajadorId = null;
    const form = document.getElementById('form-trabajador');
    if (form) form.reset();

    // Reset custom select
    const inputRol = document.getElementById('trabajador-rol');
    if (inputRol) inputRol.value = '';
    const txtRol = document.getElementById('custom-select-trabajador-rol-text');
    if (txtRol) txtRol.innerText = 'Elige un cargo...';
    document.querySelectorAll('#custom-select-trabajador-rol-options .custom-select-option').forEach(el => el.classList.remove('selected'));

    const modalTitle = document.getElementById('modal-trabajador-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fa-solid fa-user-plus" style="color: var(--color-client);"></i>
            Registrar Trabajador
        `;
    }

    const submitBtn = document.getElementById('text-submit-trabajador');
    if (submitBtn) {
        submitBtn.innerText = 'Registrar Trabajador';
    }
}

function saveTrabajador(event) {
    event.preventDefault();
    const nombre = document.getElementById('trabajador-nombre').value.trim();
    const rol = document.getElementById('trabajador-rol').value;
    const whatsapp = document.getElementById('trabajador-whatsapp').value.trim();

    if (!rol) {
        showToast('Debe seleccionar un cargo para el trabajador.', 'error');
        return;
    }

    if (!nombre || !whatsapp) {
        showToast('Complete todos los campos del trabajador.', 'error');
        return;
    }

    // Validar unicidad de nombre (excepto para sí mismo)
    if (trabajadores.some(t => t.nombre.toLowerCase() === nombre.toLowerCase() && t.id !== editingTrabajadorId)) {
        showToast('Ya existe un trabajador registrado con ese nombre.', 'error');
        return;
    }

    if (editingTrabajadorId !== null) {
        // Editar
        const idx = trabajadores.findIndex(t => t.id === editingTrabajadorId);
        if (idx !== -1) {
            trabajadores[idx].nombre = nombre;
            trabajadores[idx].rol = rol;
            trabajadores[idx].whatsapp = whatsapp;
            localStorage.setItem('trabajadores', JSON.stringify(trabajadores));
            showToast('Datos del trabajador actualizados.', 'success');
            closeModal('trabajador');
        }
    } else {
        // Crear
        const nuevo = {
            id: 't-' + Date.now(),
            nombre,
            rol,
            whatsapp,
            activo: true
        };
        trabajadores.push(nuevo);
        localStorage.setItem('trabajadores', JSON.stringify(trabajadores));
        showToast('Trabajador registrado exitosamente.', 'success');
        closeModal('trabajador');
    }

    renderAll();
}

function editTrabajador(id) {
    const trab = trabajadores.find(t => t.id === id);
    if (!trab) return;

    editingTrabajadorId = id;
    document.getElementById('trabajador-nombre').value = trab.nombre;
    document.getElementById('trabajador-whatsapp').value = trab.whatsapp;

    // Set custom select
    let rolText = trab.rol;
    if (trab.rol === 'Cajero') rolText = 'Cajero(a)';
    else if (trab.rol === 'Operador') rolText = 'Operador de Turno';
    else if (trab.rol === 'Supervisor') rolText = 'Supervisor de Planta';
    
    selectTrabajadorRolOption(trab.rol, rolText);

    const modalTitle = document.getElementById('modal-trabajador-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fa-solid fa-pen-to-square" style="color: var(--color-client);"></i>
            Editar Trabajador
        `;
    }

    const submitBtn = document.getElementById('text-submit-trabajador');
    if (submitBtn) {
        submitBtn.innerText = 'Guardar Cambios';
    }

    openModal('trabajador');
}

async function deleteTrabajador(id) {
    const trab = trabajadores.find(t => t.id === id);
    if (!trab) return;

    // Verificar si tiene cajas registradas
    const tieneCajas = cajas.some(c => c.trabajadorId === id);
    if (tieneCajas) {
        const desactivar = await customConfirm(`No se puede eliminar físicamente a "${trab.nombre}" porque cuenta con turnos de caja registrados.\n¿Desea desactivar su cuenta para que no figure en nuevas aperturas de caja?`);
        if (desactivar) {
            trab.activo = false;
            localStorage.setItem('trabajadores', JSON.stringify(trabajadores));
            showToast('Trabajador desactivado correctamente.', 'success');
            renderAll();
        }
        return;
    }

    const confirmado = await customConfirm(`¿Está seguro de eliminar al trabajador "${trab.nombre}"? Esta acción no se puede deshacer.`);
    if (confirmado) {
        if (editingTrabajadorId === id) {
            cancelarEdicionTrabajador();
        }
        trabajadores = trabajadores.filter(t => t.id !== id);
        localStorage.setItem('trabajadores', JSON.stringify(trabajadores));
        showToast('Trabajador eliminado correctamente.', 'success');
        renderAll();
    }
}

function filterTrabajadores() {
    const query = document.getElementById('search-trabajadores').value.toLowerCase();
    const rows = document.querySelectorAll('#table-trabajadores-body tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function selectTrabajadorAperturaOption(id, nombre, event) {
    if (event) event.stopPropagation();
    const inputHidden = document.getElementById('caja-trabajador-id');
    const triggerText = document.getElementById('custom-select-trabajador-text');
    const container = document.getElementById('custom-select-trabajador-container');
    const options = document.querySelectorAll('#custom-select-trabajador-options .custom-select-option');

    if (inputHidden && triggerText && container) {
        inputHidden.value = id;
        triggerText.innerText = nombre;

        options.forEach(opt => {
            if (opt.getAttribute('data-value') === id) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });

        container.classList.remove('active');
    }
}

// ==========================================
// LÓGICA DE ARQUEO E INTERACCIÓN
// ==========================================

function calcularDiferenciaArqueo() {
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    if (!cajaActiva) return;

    const ingresos = cajaActiva.movimientos.filter(m => m.tipo === 'Ingreso').reduce((acc, curr) => acc + curr.monto, 0);
    const egresos = cajaActiva.movimientos.filter(m => m.tipo === 'Egreso').reduce((acc, curr) => acc + curr.monto, 0);
    const saldoTeorico = cajaActiva.montoApertura + ingresos - egresos;

    const realVal = parseFloat(document.getElementById('arqueo-monto-real').value);
    const statusBox = document.getElementById('arqueo-status-box');

    if (!statusBox) return;

    if (isNaN(realVal)) {
        statusBox.innerText = 'Ingrese el monto físico para calcular el cuadre';
        statusBox.className = 'arqueo-cuadrado';
        return;
    }

    const diferencia = realVal - saldoTeorico;

    if (Math.abs(diferencia) < 0.01) {
        statusBox.innerText = 'Caja Cuadrada (S/. 0.00 de diferencia)';
        statusBox.className = 'arqueo-cuadrado';
    } else if (diferencia < 0) {
        statusBox.innerText = `Faltante en Caja (S/. ${diferencia.toFixed(2)} de diferencia)`;
        statusBox.className = 'arqueo-faltante';
    } else {
        statusBox.innerText = `Sobrante en Caja (S/. +${diferencia.toFixed(2)} de diferencia)`;
        statusBox.className = 'arqueo-sobrante';
    }
}

function procesarCierreConArqueo(event) {
    event.preventDefault();
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    if (!cajaActiva) return;

    const realVal = parseFloat(document.getElementById('arqueo-monto-real').value);
    const obs = document.getElementById('arqueo-observaciones').value.trim();

    if (isNaN(realVal) || realVal < 0) {
        showToast('Ingrese un monto físico válido.', 'error');
        return;
    }

    const ingresos = cajaActiva.movimientos.filter(m => m.tipo === 'Ingreso').reduce((acc, curr) => acc + curr.monto, 0);
    const egresos = cajaActiva.movimientos.filter(m => m.tipo === 'Egreso').reduce((acc, curr) => acc + curr.monto, 0);
    const saldoTeorico = cajaActiva.montoApertura + ingresos - egresos;
    
    const diferenciaCalculada = realVal - saldoTeorico;

    cajaActiva.estado = 'Cerrada';
    cajaActiva.fechaCierre = new Date().toISOString();
    cajaActiva.montoCierre = saldoTeorico;
    cajaActiva.montoReal = realVal;
    cajaActiva.diferencia = diferenciaCalculada;
    cajaActiva.observacionArqueo = obs;

    localStorage.setItem('cajas', JSON.stringify(cajas));
    showToast('Caja cerrada con éxito. Turno liquidado con arqueo.', 'success');
    closeModal('arqueo');
    renderAll();
}

function selectMovTipoOption(value, text, event) {
    if (event) event.stopPropagation();
    const inputHidden = document.getElementById('mov-tipo');
    const triggerText = document.getElementById('custom-select-mov-tipo-text');
    const container = document.getElementById('custom-select-mov-tipo-container');
    const options = document.querySelectorAll('#custom-select-mov-tipo-options .custom-select-option');
    
    if (inputHidden && triggerText && container) {
        inputHidden.value = value;
        triggerText.innerText = text;
        
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === value) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        container.classList.remove('active');
    }
}

function selectTrabajadorRolOption(value, text, event) {
    if (event) event.stopPropagation();
    const inputHidden = document.getElementById('trabajador-rol');
    const triggerText = document.getElementById('custom-select-trabajador-rol-text');
    const container = document.getElementById('custom-select-trabajador-rol-container');
    const options = document.querySelectorAll('#custom-select-trabajador-rol-options .custom-select-option');
    
    if (inputHidden && triggerText && container) {
        inputHidden.value = value;
        triggerText.innerText = text;
        
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === value) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        container.classList.remove('active');
    }
}

function selectPagoTipoOption(value, text, event) {
    if (event) event.stopPropagation();
    const inputHidden = document.getElementById('pago-tipo');
    const triggerText = document.getElementById('custom-select-pago-tipo-text');
    const container = document.getElementById('custom-select-pago-tipo-container');
    const options = document.querySelectorAll('#custom-select-pago-tipo-options .custom-select-option');
    
    if (inputHidden && triggerText && container) {
        inputHidden.value = value;
        triggerText.innerText = text;
        
        options.forEach(opt => {
            if (opt.getAttribute('data-value') === value) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        container.classList.remove('active');
    }
}

// Cargar la aplicación al iniciar la ventana
window.onload = () => {
    initDataPrueba();
    renderAll();
    setupCodigoAutogenerado();
    setupValidacionDocumento();
};

