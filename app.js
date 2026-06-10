/* C:\Users\Administrador\Desktop\Faenos.click\app.js */

// Estructuras de datos iniciales en localStorage
let ganaderos = JSON.parse(localStorage.getItem('ganaderos')) || [];
let recepciones = JSON.parse(localStorage.getItem('recepciones')) || [];

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
        // Generar algunas fechas pasadas y presentes
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
    // Desactivar todas las pestañas y elementos del menú
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Activar la pestaña y el item de menú correspondiente
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Buscar el item del nav usando onclick de manera simplificada
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('onclick').includes(tabName)) {
            item.classList.add('active');
        }
    });

    // Cambiar el título del header
    const titleText = tabName === 'ganaderos' ? 'Gestión de Ganaderos' : 'Ingreso de Ganado (Recepción)';
    document.getElementById('header-title-text').innerText = titleText;

    // Recargar datos e interfaces en cada cambio
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
        alert('❌ Error: El código de proveedor ya está asignado.');
        return;
    }
    if (ganaderos.some(g => g.ruc === ruc)) {
        alert('❌ Error: Ya existe un ganadero registrado con este RUC.');
        return;
    }
    if (codigo.length !== 2) {
        alert('❌ Error: El código de proveedor debe ser exactamente de 2 letras.');
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
    alert('✅ Ganadero registrado exitosamente.');
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
        alert('❌ Error: Por favor complete los campos obligatorios.');
        return;
    }

    const ganadero = ganaderos.find(g => g.id === ganaderoId);
    if (!ganadero) return;

    const codigoLote = ganadero.codigo.toUpperCase() + especie + getJulianDay(new Date());

    // Validar si el lote ya existe para evitar duplicidades
    if (recepciones.some(r => r.lote_codigo === codigoLote)) {
        alert(`⚠️ Atención: Ya se registró un lote '${codigoLote}' el día de hoy para este ganadero. Se añadirá como un nuevo ingreso bajo el mismo identificador.`);
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
    alert(`✅ Ingreso registrado exitosamente. LOTE: ${codigoLote}`);
}

// Eliminar Ganadero
function deleteGanadero(id) {
    if (confirm('¿Está seguro de eliminar este ganadero?')) {
        // Validar si tiene recepciones asociadas para mantener la integridad de los datos
        if (recepciones.some(r => r.ganadero_id === id)) {
            alert('❌ No se puede eliminar este ganadero porque tiene ingresos asociados. Se mantendrá activo para conservar la trazabilidad.');
            return;
        }

        ganaderos = ganaderos.filter(g => g.id !== id);
        localStorage.setItem('ganaderos', JSON.stringify(ganaderos));
        renderAll();
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
    // 1. Renderizar Ganaderos en la Tabla
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

    // 2. Renderizar Dropdown de Ganaderos en el formulario de Recepción
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

    // 3. Renderizar Recepciones en la Tabla
    const tbodyRecepciones = document.getElementById('table-recepciones-body');
    tbodyRecepciones.innerHTML = '';

    // Ordenar recepciones: más recientes primero
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
            <td><span class="lote-tag" style="border-color: var(--color-client); color: #fdba74;">${r.lote_codigo}</span></td>
            <td><strong>${r.ganadero_nombre}</strong></td>
            <td>${especieLabel}</td>
            <td style="font-weight: 600;">${r.cantidad}</td>
            <td>${r.guia_transito}</td>
            <td style="font-size: 12px; color: var(--text-secondary);">${fechaLegible}</td>
            <td><span class="badge badge-pending">${r.estado}</span></td>
        `;
        tbodyRecepciones.appendChild(tr);
    });

    // 4. Actualizar Métricas e Hitos Estadísticos
    // Sección Ganaderos
    document.getElementById('stat-total-ganaderos').innerText = ganaderos.length;
    document.getElementById('stat-ganaderos-activos').innerText = ganaderos.filter(g => g.activo).length;
    document.getElementById('stat-ultimo-codigo').innerText = ganaderos.length > 0 ? ganaderos[ganaderos.length - 1].codigo : '--';

    // Sección Recepciones
    const hoyStr = new Date().toDateString();
    const ingresosHoy = recepciones.filter(r => new Date(r.fecha).toDateString() === hoyStr);
    
    document.getElementById('stat-ingresos-hoy').innerText = ingresosHoy.length;
    document.getElementById('stat-total-cabezas').innerText = recepciones.reduce((acc, curr) => acc + curr.cantidad, 0);
    document.getElementById('stat-dia-juliano').innerText = getJulianDay(new Date());

    // Añadir listener para actualizar preview de lote cuando se cambie el ganadero en el formulario de recepción
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
