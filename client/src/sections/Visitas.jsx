import React, { useState, useEffect } from 'react';

function Visitas({ data, activeModal, setActiveModal, onRefresh, activeSubTab, confirm }) {
  const { visitas = [], capacitaciones = [], trabajadores = [] } = data;

  const [subTab, setSubTab] = useState(activeSubTab || 'control-visitas');
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizar subpestaña cuando cambie en la barra lateral
  useEffect(() => {
    if (activeSubTab) {
      setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  // Limpiar búsqueda al cambiar de pestaña
  useEffect(() => {
    setSearchQuery('');
  }, [subTab]);

  // Estados de edición
  const [editingVisitaId, setEditingVisitaId] = useState(null);
  const [editingCapacitacionId, setEditingCapacitacionId] = useState(null);

  // Estados de carga local
  const [loadingAction, setLoadingAction] = useState(false);

  // Formulario de Visita
  const [visitaForm, setVisitaForm] = useState({
    fecha: '',
    visitanteNombre: '',
    visitanteDni: '',
    institucion: '',
    horaIngreso: '',
    horaSalida: '',
    sintomasSalud: false,
    eppEntregado: '',
    responsable: ''
  });

  // Formulario de Capacitación
  const [capForm, setCapForm] = useState({
    fecha: '',
    tema: '',
    ponente: '',
    duracionHoras: '',
    asistentesIds: [], // Array de ids de trabajadores seleccionados
    observaciones: ''
  });

  // Inicializar formularios cuando se abre/cierra el modal
  useEffect(() => {
    if (activeModal === 'visita') {
      if (!editingVisitaId) {
        // Modo creación
        const hoy = new Date();
        const fechaISO = hoy.toISOString().split('T')[0];
        const horaISO = hoy.toTimeString().split(' ')[0].substring(0, 5);
        setVisitaForm({
          fecha: fechaISO,
          visitanteNombre: '',
          visitanteDni: '',
          institucion: '',
          horaIngreso: horaISO,
          horaSalida: '',
          sintomasSalud: false,
          eppEntregado: 'Cofia, mascarilla, guardapolvo, botas',
          responsable: 'Admin Doris'
        });
      }
    } else if (activeModal === 'capacitacion') {
      if (!editingCapacitacionId) {
        // Modo creación
        const hoy = new Date();
        setCapForm({
          fecha: hoy.toISOString().split('T')[0],
          tema: '',
          ponente: '',
          duracionHoras: '',
          asistentesIds: [],
          observaciones: ''
        });
      }
    }
  }, [activeModal, editingVisitaId, editingCapacitacionId]);

  // --- CÁLCULOS Y ESTADÍSTICAS ---
  
  // Visitas
  const totalVisitas = visitas.length;
  const visitasActivas = visitas.filter(v => !v.horaSalida).length;
  const visitasAlerta = visitas.filter(v => v.sintomasSalud).length;

  // Capacitaciones
  const totalCapacitaciones = capacitaciones.length;
  const totalHorasCap = capacitaciones.reduce((acc, c) => acc + parseFloat(c.duracionHoras || 0), 0);
  const totalAsistencias = capacitaciones.reduce((acc, c) => {
    const ids = c.asistentesIds ? c.asistentesIds.split(',').filter(x => x.length > 0) : [];
    return acc + ids.length;
  }, 0);

  // --- FILTRADO ---
  const filteredVisitas = visitas.filter(v => {
    const q = searchQuery.toLowerCase();
    return (
      v.visitanteNombre.toLowerCase().includes(q) ||
      v.visitanteDni.toLowerCase().includes(q) ||
      v.institucion.toLowerCase().includes(q) ||
      v.responsable.toLowerCase().includes(q)
    );
  });

  const filteredCapacitaciones = capacitaciones.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.tema.toLowerCase().includes(q) ||
      c.ponente.toLowerCase().includes(q) ||
      (c.observaciones && c.observaciones.toLowerCase().includes(q))
    );
  });

  // --- ACCIONES CRUD ---

  const handleEditVisita = (v) => {
    setEditingVisitaId(v.id);
    setVisitaForm({
      fecha: v.fecha ? new Date(v.fecha).toISOString().split('T')[0] : '',
      visitanteNombre: v.visitanteNombre,
      visitanteDni: v.visitanteDni,
      institucion: v.institucion,
      horaIngreso: v.horaIngreso.substring(0, 5),
      horaSalida: v.horaSalida ? v.horaSalida.substring(0, 5) : '',
      sintomasSalud: !!v.sintomasSalud,
      eppEntregado: v.eppEntregado || '',
      responsable: v.responsable || ''
    });
    setActiveModal('visita');
  };

  const handleEditCapacitacion = (c) => {
    setEditingCapacitacionId(c.id);
    const asistentesArr = c.asistentesIds ? c.asistentesIds.split(',').filter(x => x.length > 0) : [];
    setCapForm({
      fecha: c.fecha ? new Date(c.fecha).toISOString().split('T')[0] : '',
      tema: c.tema,
      ponente: c.ponente,
      duracionHoras: c.duracionHoras,
      asistentesIds: asistentesArr,
      observaciones: c.observaciones || ''
    });
    setActiveModal('capacitacion');
  };

  const handleVisitaSubmit = async (e) => {
    e.preventDefault();
    setLoadingAction(true);

    const payload = {
      id: editingVisitaId || 'visita-' + Date.now(),
      fecha: visitaForm.fecha,
      visitante_nombre: visitaForm.visitanteNombre,
      visitante_dni: visitaForm.visitanteDni,
      institucion: visitaForm.institucion,
      hora_ingreso: visitaForm.horaIngreso,
      hora_caliente: visitaForm.horaSalida || null,
      sintomas_salud: visitaForm.sintomasSalud,
      epp_enteregado: visitaForm.eppEntregado, // compatibilidad legacy
      epp_entregado: visitaForm.eppEntregado,
      responsable: visitaForm.responsable
    };

    if (payload.sintomas_salud) {
      alert('⚠️ ALERTA DE SEGURIDAD: Visitante ha declarado sintomatología. Acceso restringido. Aplicar protocolo de bioseguridad.');
    }

    try {
      const url = editingVisitaId ? `/api/visitas/${editingVisitaId}` : '/api/visitas';
      const method = editingVisitaId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la visita');
      }

      alert(editingVisitaId ? 'Registro de visita actualizado correctamente.' : 'Ingreso de visitante registrado correctamente.');
      setActiveModal(null);
      setEditingVisitaId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCapSubmit = async (e) => {
    e.preventDefault();
    if (capForm.asistentesIds.length === 0) {
      alert('Por favor, seleccione al menos un trabajador asistente.');
      return;
    }
    setLoadingAction(true);

    const payload = {
      id: editingCapacitacionId || 'capa-' + Date.now(),
      fecha: capForm.fecha,
      tema: capForm.tema,
      ponente: capForm.ponente,
      duracion_horas: parseFloat(capForm.duracionHoras),
      asistentes_ids: capForm.asistentesIds.join(','),
      observaciones: capForm.observaciones
    };

    try {
      const url = editingCapacitacionId ? `/api/capacitaciones/${editingCapacitacionId}` : '/api/capacitaciones';
      const method = editingCapacitacionId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la capacitación');
      }

      alert(editingCapacitacionId ? 'Registro de capacitación actualizado correctamente.' : 'Capacitación registrada correctamente.');
      setActiveModal(null);
      setEditingCapacitacionId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteVisita = async (id, nombre) => {
    const confirmado = await confirm(`¿Está seguro de eliminar el registro de visita de "${nombre}"?`);
    if (!confirmado) return;

    try {
      const response = await fetch(`/api/visitas/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar la visita');
      alert('Registro de visita eliminado correctamente.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCapacitacion = async (id, tema) => {
    const confirmado = await confirm(`¿Está seguro de eliminar la capacitación sobre "${tema}"?`);
    if (!confirmado) return;

    try {
      const response = await fetch(`/api/capacitaciones/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar la capacitación');
      alert('Registro de capacitación eliminado correctamente.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleAsistente = (id) => {
    setCapForm(prev => {
      const exists = prev.asistentesIds.includes(id);
      const newIds = exists 
        ? prev.asistentesIds.filter(x => x !== id)
        : [...prev.asistentesIds, id];
      return { ...prev, asistentesIds: newIds };
    });
  };

  return (
    <section className="content-section" style={{ display: 'block' }}>
      
      {/* Selector de pestañas segmentado táctil móvil/escritorio */}
      <div className="segmented-control-container" style={{
        display: 'flex',
        background: '#f1f5f9',
        borderRadius: '10px',
        padding: '4px',
        marginBottom: '20px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
      }}>
        <button
          onClick={() => setSubTab('control-visitas')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            border: 'none',
            borderRadius: '8px',
            background: subTab === 'control-visitas' ? 'white' : 'transparent',
            color: subTab === 'control-visitas' ? 'var(--color-client)' : 'var(--text-secondary)',
            fontWeight: subTab === 'control-visitas' ? '600' : '500',
            fontSize: '13.5px',
            boxShadow: subTab === 'control-visitas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: '40px'
          }}
        >
          <i className="fa-solid fa-user-shield"></i>
          <span>Control Visitas</span>
        </button>
        <button
          onClick={() => setSubTab('capacitaciones')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            border: 'none',
            borderRadius: '8px',
            background: subTab === 'capacitaciones' ? 'white' : 'transparent',
            color: subTab === 'capacitaciones' ? 'var(--color-client)' : 'var(--text-secondary)',
            fontWeight: subTab === 'capacitaciones' ? '600' : '500',
            fontSize: '13.5px',
            boxShadow: subTab === 'capacitaciones' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: '40px'
          }}
        >
          <i className="fa-solid fa-graduation-cap"></i>
          <span>Capacitaciones</span>
        </button>
      </div>

      {subTab === 'control-visitas' ? (
        <>
          {/* Tarjetas estadísticas de visitas */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Visitas</div>
              <div className="stat-value">{totalVisitas}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">En Planta</div>
              <div className="stat-value" style={{ color: '#ea580c' }}>{visitasActivas}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Alertas de Salud</div>
              <div className="stat-value" style={{ color: visitasAlerta > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                {visitasAlerta}
              </div>
            </div>
          </div>

          {/* Tabla de Visitas */}
          <div className="table-container">
            <div className="table-header-row" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Buscar por visitante, DNI, motivo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Visitante</th>
                    <th>Identidad / Motivo</th>
                    <th>Ingreso</th>
                    <th>Salida</th>
                    <th>Salud</th>
                    <th>EPP Entregado</th>
                    <th>Autoriza</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitas.map(v => {
                    const fechaFormat = new Date(v.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    return (
                      <tr key={v.id}>
                        <td data-label="Fecha">{fechaFormat}</td>
                        <td data-label="Visitante"><strong>{v.visitanteNombre}</strong></td>
                        <td data-label="Identidad / Motivo">
                          DNI: {v.visitanteDni} <br />
                          <small style={{ color: 'var(--text-secondary)' }}>{v.institucion}</small>
                        </td>
                        <td data-label="Ingreso">
                          <span className="lote-tag" style={{ background: '#f0fdf4', color: '#166534' }}>
                            {v.horaIngreso ? v.horaIngreso.substring(0, 5) : '--:--'}
                          </span>
                        </td>
                        <td data-label="Salida">
                          {v.horaSalida ? (
                            <span className="lote-tag" style={{ background: '#fef2f2', color: '#991b1b' }}>
                              {v.horaSalida.substring(0, 5)}
                            </span>
                          ) : (
                            <span style={{ color: '#ea580c', fontStyle: 'italic', fontWeight: '500' }}>En Planta</span>
                          )}
                        </td>
                        <td data-label="Salid">
                          {v.sintomasSalud ? (
                            <span className="badge-alerta-pcc" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <i className="fa-solid fa-biohazard"></i> Alerta Síntomas
                            </span>
                          ) : (
                            <span className="badge-conforme" style={{ fontSize: '11px' }}>Salud Conforme</span>
                          )}
                        </td>
                        <td data-label="EPP Entregado"><small>{v.eppEntregado || 'Ninguno'}</small></td>
                        <td data-label="Autoriza">{v.responsable}</td>
                        <td data-label="Acciones">
                          <button
                            onClick={() => handleEditVisita(v)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }}
                            title="Editar / Registrar Salida"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteVisita(v.id, v.visitanteNombre)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
                            title="Eliminar"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVisitas.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                        No se registran visitas a la planta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Tarjetas estadísticas de capacitaciones */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Capacitaciones</div>
              <div className="stat-value">{totalCapacitaciones}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Horas Acumuladas</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>{totalHorasCap.toFixed(1)} h</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Asistencias Totales</div>
              <div className="stat-value" style={{ color: '#9d174d' }}>{totalAsistencias}</div>
            </div>
          </div>

          {/* Tabla de Capacitaciones */}
          <div className="table-container">
            <div className="table-header-row" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Buscar por tema, ponente..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tema de Capacitación</th>
                    <th>Ponente / Expositor</th>
                    <th>Duración (Horas)</th>
                    <th>Asistentes (N°)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCapacitaciones.map(c => {
                    const fechaLegible = new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const countAsistentes = c.asistentesIds ? c.asistentesIds.split(',').filter(x => x.length > 0).length : 0;
                    return (
                      <tr key={c.id}>
                        <td data-label="Fecha">{fechaLegible}</td>
                        <td data-label="Tema de Capacitación">
                          <strong>{c.tema}</strong> <br />
                          <small style={{ color: 'var(--text-secondary)' }}>{c.observaciones || ''}</small>
                        </td>
                        <td data-label="Ponente">{c.ponente}</td>
                        <td data-label="Duración">{parseFloat(c.duracionHoras).toFixed(1)} hrs</td>
                        <td data-label="Asistentes">
                          <span className="lote-tag" style={{ background: '#fdf2f8', color: '#9d174d', border: '1px solid #fbcfe8', fontWeight: 'bold' }}>
                            {countAsistentes} Asistentes
                          </span>
                        </td>
                        <td data-label="Acciones">
                          <button
                            onClick={() => handleEditCapacitacion(c)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }}
                            title="Editar"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteCapacitacion(c.id, c.tema)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
                            title="Eliminar"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCapacitaciones.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                        No se registran capacitaciones del personal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* --- FORM MODAL: REGISTRO DE VISITA --- */}
      {activeModal === 'visita' && (
        <div className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingVisitaId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-user-shield" style={{ color: 'var(--color-client)', marginRight: '8px' }}></i>
              {editingVisitaId ? 'Modificar / Registrar Salida de Visita' : 'Registrar Ingreso de Visita'}
            </h2>
            <form onSubmit={handleVisitaSubmit} style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              <div className="form-group">
                <label className="form-label">Nombres y Apellidos del Visitante</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Sofía Lara Ruiz"
                  value={visitaForm.visitanteNombre}
                  onChange={(e) => setVisitaForm({ ...visitaForm, visitanteNombre: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">DNI / Identidad</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="DNI"
                    value={visitaForm.visitanteDni}
                    onChange={(e) => setVisitaForm({ ...visitaForm, visitanteDni: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Empresa / Motivo</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. SENASA / Mantenimiento"
                    value={visitaForm.institucion}
                    onChange={(e) => setVisitaForm({ ...visitaForm, institucion: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Hora Ingreso</label>
                  <input
                    type="time"
                    className="form-control"
                    value={visitaForm.horaIngreso}
                    onChange={(e) => setVisitaForm({ ...visitaForm, horaIngreso: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora Salida (Opcional)</label>
                  <input
                    type="time"
                    className="form-control"
                    value={visitaForm.horaSalida}
                    onChange={(e) => setVisitaForm({ ...visitaForm, horaSalida: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Declaración de Síntomas de Salud (Tos, fiebre, diarrea)</label>
                <select
                  className="form-control"
                  style={{ height: '44px' }}
                  value={visitaForm.sintomasSalud ? 'Sí' : 'No'}
                  onChange={(e) => setVisitaForm({ ...visitaForm, sintomasSalud: e.target.value === 'Sí' })}
                  required
                >
                  <option value="No">No (Salud Conforme)</option>
                  <option value="Sí">Sí (Acceso Restringido - Alerta)</option>
                </select>
                {visitaForm.sintomasSalud && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '6px',
                    color: '#991b1b',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    Se activará alerta de bioseguridad en el registro.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">EPP Entregado (Separados por coma)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Cofia, mascarilla, guardapolvo, botas"
                  value={visitaForm.eppEntregado}
                  onChange={(e) => setVisitaForm({ ...visitaForm, eppEntregado: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Fecha de Visita</label>
                  <input
                    type="date"
                    className="form-control"
                    value={visitaForm.fecha}
                    onChange={(e) => setVisitaForm({ ...visitaForm, fecha: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Autoriza / Responsable</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Carlos Ruiz Rojas"
                    value={visitaForm.responsable}
                    onChange={(e) => setVisitaForm({ ...visitaForm, responsable: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingAction}
                className="btn-primary btn-flex"
                style={{ marginTop: '24px', width: '100%', minHeight: '44px' }}
              >
                {loadingAction ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    <span>{editingVisitaId ? 'Guardar Cambios' : 'Registrar Visita'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: REGISTRO DE CAPACITACIÓN --- */}
      {activeModal === 'capacitacion' && (
        <div className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingCapacitacionId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-graduation-cap" style={{ color: 'var(--color-client)', marginRight: '8px' }}></i>
              {editingCapacitacionId ? 'Modificar Capacitación de Personal' : 'Registrar Capacitación de Higiene'}
            </h2>
            <form onSubmit={handleCapSubmit} style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              <div className="form-group">
                <label className="form-label">Tema / Contenido de Capacitación</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Higiene Personal y BPM en Faenado"
                  value={capForm.tema}
                  onChange={(e) => setCapForm({ ...capForm, tema: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Ponente / Expositor</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Dra. Elena Ramos"
                    value={capForm.ponente}
                    onChange={(e) => setCapForm({ ...capForm, ponente: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duración (Hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="form-control"
                    placeholder="2.0"
                    value={capForm.duracionHoras}
                    onChange={(e) => setCapForm({ ...capForm, duracionHoras: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Seleccionar Trabajadores Asistentes</span>
                  <small style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                    {capForm.asistentesIds.length} seleccionados
                  </small>
                </label>
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {trabajadores.map(t => {
                    const isChecked = capForm.asistentesIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleAsistente(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: isChecked ? '#eff6ff' : 'white',
                          border: `1px solid ${isChecked ? '#bfdbfe' : '#e2e8f0'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Manejado por el click del div
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: 'var(--color-admin)'
                          }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: isChecked ? '600' : '400', color: 'var(--text-primary)' }}>
                          {t.nombre} <small style={{ color: 'var(--text-secondary)' }}>({t.cargo})</small>
                        </span>
                      </div>
                    );
                  })}
                  {trabajadores.length === 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px' }}>
                      No hay trabajadores registrados en el sistema.
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones generales</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Evaluación teórica satisfactoria."
                  value={capForm.observaciones}
                  onChange={(e) => setCapForm({ ...capForm, observaciones: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-control"
                    value={capForm.fecha}
                    onChange={(e) => setCapForm({ ...capForm, fecha: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingAction}
                className="btn-primary btn-flex"
                style={{ marginTop: '24px', width: '100%', minHeight: '44px' }}
              >
                {loadingAction ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    <span>{editingCapacitacionId ? 'Guardar Cambios' : 'Registrar Capacitación'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Visitas;
