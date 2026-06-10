/* C:\Users\Administrador\Desktop\Faenos.click\app.js */

// Estructuras de datos iniciales en localStorage
let ganaderos = JSON.parse(localStorage.getItem('ganaderos')) || [];
let recepciones = JSON.parse(localStorage.getItem('recepciones')) || [];
let editingGanaderoId = null; // Estado de edición global

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

    // Si salimos de ganaderos, cancelamos la edición activa por seguridad
    if (tabName !== 'ganaderos' && editingGanaderoId !== null) {
        cancelarEdicion();
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
    document.getElementById('ganadero-ruc').value = ganadero.ruc;
    document.getElementById('ganadero-whatsapp').value = ganadero.whatsapp;
    
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
        estado: 'Pendiente Inspección'
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

// Cargar la aplicación al iniciar la ventana
window.onload = () => {
    initDataPrueba();
    renderAll();
    setupCodigoAutogenerado();
};
