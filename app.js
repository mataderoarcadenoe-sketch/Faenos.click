/* C:\Users\Administrador\Desktop\Faenos.click\app.js */

// Estructuras de datos iniciales en localStorage
let ganaderos = JSON.parse(localStorage.getItem('ganaderos')) || [];
let recepciones = JSON.parse(localStorage.getItem('recepciones')) || [];

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
                estado: 'Pendiente Inspección'
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
                estado: 'Pendiente Inspección'
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

    const titleText = tabName === 'ganaderos' ? 'Gestión de Ganaderos' : 'Ingreso de Ganado (Recepción)';
    document.getElementById('header-title-text').innerText = titleText;

    renderAll();
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

// Guardar Ganadero
function saveGanadero(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('ganadero-nombre').value.trim();
    const ruc = document.getElementById('ganadero-ruc').value.trim();
    const whatsapp = document.getElementById('ganadero-whatsapp').value.trim();
    const codigo = document.getElementById('ganadero-codigo').value.trim().toUpperCase();

    // Validaciones
    if (ganaderos.some(g => g.codigo === codigo)) {
        showToast('El código de proveedor ya está asignado.', 'error');
        return;
    }
    if (ganaderos.some(g => g.ruc === ruc)) {
        showToast('Ya existe un ganadero registrado con este RUC.', 'error');
        return;
    }
    if (codigo.length !== 2) {
        showToast('El código de proveedor debe tener exactamente 2 letras.', 'error');
        return;
    }

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
    
    document.getElementById('form-ganadero').reset();
    renderAll();
    showToast('Ganadero registrado exitosamente.', 'success');
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

    // Validar si el lote ya existe para evitar duplicidades
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
        estado: 'Pendiente Inspección'
    };

    recepciones.push(nuevoIngreso);
    localStorage.setItem('recepciones', JSON.stringify(recepciones));

    document.getElementById('form-recepcion').reset();
    document.getElementById('lote-preview-code').innerText = '--';
    
    renderAll();
    showToast(`Ingreso registrado con Lote: ${codigoLote}`, 'success');
}

// Eliminar Ganadero
async function deleteGanadero(id) {
    const confirmado = await customConfirm('¿Está seguro de eliminar este ganadero? La acción es permanente.');
    if (confirmado) {
        // Validar si tiene recepciones asociadas para mantener la integridad de los datos
        if (recepciones.some(r => r.ganadero_id === id)) {
            showToast('No se puede eliminar: tiene lotes e ingresos asociados.', 'error');
            return;
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
                <button onclick="deleteGanadero('${g.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px;" title="Eliminar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbodyGanaderos.appendChild(tr);
    });

    // 2. Dropdown de Ganaderos
    const selectGanadero = document.getElementById('recepcion-ganadero');
    if (selectGanadero) {
        selectGanadero.innerHTML = '<option value="" disabled selected>Elige un ganadero...</option>';
        ganaderos.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.innerText = `${g.nombre} (${g.codigo})`;
            selectGanadero.appendChild(opt);
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
        
        let especieLabel = '';
        switch(r.especie) {
            case 'VA': especieLabel = '🐄 Vacuno'; break;
            case 'PO': especieLabel = '🐖 Porcino'; break;
            case 'OV': especieLabel = '🐑 Ovino'; break;
            case 'CA': especieLabel = '🐐 Caprino'; break;
            default: especieLabel = r.especie;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="lote-tag" style="border-color: var(--color-client); color: #ea580c; background: rgba(234, 88, 12, 0.05);">${r.lote_codigo}</span></td>
            <td><strong>${r.ganadero_nombre}</strong></td>
            <td>${especieLabel}</td>
            <td style="font-weight: 600;">${r.cantidad}</td>
            <td>${r.guia_transito}</td>
            <td style="font-size: 12px; color: var(--text-secondary);">${fechaLegible}</td>
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

    const gSelect = document.getElementById('recepcion-ganadero');
    if (gSelect) {
        gSelect.removeEventListener('change', previewLoteCode);
        gSelect.addEventListener('change', previewLoteCode);
    }
}

// Cargar la aplicación al iniciar la ventana
window.onload = () => {
    initDataPrueba();
    renderAll();
};
