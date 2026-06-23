import React, { useState, useEffect } from 'react';

function Configuraciones({ data, activeModal, setActiveModal, onRefresh, activeSubTab, confirm }) {
  const { 
    especies = [], 
    metodosPago = [], 
    roles = [], 
    tiposPago = [], 
    recepciones = [], 
    trabajadores = [] 
  } = data;

  const [subTab, setSubTab] = useState(activeSubTab || 'animales');
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizar subpestaña con la barra lateral
  useEffect(() => {
    if (activeSubTab) {
      // Mapeo de subpestañas del sidebar a estados locales
      if (activeSubTab === 'animales' || activeSubTab === 'pagos' || activeSubTab === 'roles' || activeSubTab === 'tipos-pago') {
        setSubTab(activeSubTab);
      }
    }
  }, [activeSubTab]);

  // Limpiar búsqueda al cambiar de pestaña
  useEffect(() => {
    setSearchQuery('');
  }, [subTab]);

  // Estados de edición
  const [editingEspecieId, setEditingEspecieId] = useState(null);
  const [editingPagoId, setEditingPagoId] = useState(null);
  const [editingRolId, setEditingRolId] = useState(null);
  const [editingTipoPagoId, setEditingTipoPagoId] = useState(null);

  // Cargando local
  const [loadingAction, setLoadingAction] = useState(false);

  // Formulario Especie
  const [especieForm, setEspecieForm] = useState({
    nombre: '',
    codigo: '',
    icono: ''
  });

  // Formulario Método de Pago
  const [pagoForm, setPagoForm] = useState({
    nombre: '',
    tipo: '',
    detalle: ''
  });

  // Formulario Cargo / Rol
  const [rolForm, setRolForm] = useState({
    nombre: '',
    activo: true
  });

  // Formulario Tipo de Pago
  const [tipoPagoForm, setTipoPagoForm] = useState({
    nombre: '',
    activo: true
  });

  // Inicializar formularios en modo creación
  useEffect(() => {
    if (activeModal === 'config-animales' && !editingEspecieId) {
      setEspecieForm({ nombre: '', codigo: '', icono: '' });
    } else if (activeModal === 'config-pagos' && !editingPagoId) {
      setPagoForm({ nombre: '', tipo: tiposPago[0]?.nombre || '', detalle: '' });
    } else if (activeModal === 'config-roles' && !editingRolId) {
      setRolForm({ nombre: '', activo: true });
    } else if (activeModal === 'config-tipos-pago' && !editingTipoPagoId) {
      setTipoPagoForm({ nombre: '', activo: true });
    }
  }, [activeModal, editingEspecieId, editingPagoId, editingRolId, editingTipoPagoId, tiposPago]);

  // --- FILTRADOS ---
  const filteredEspecies = especies.filter(e => {
    const q = searchQuery.toLowerCase();
    return e.nombre.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q);
  });

  const filteredMetodos = metodosPago.filter(m => {
    const q = searchQuery.toLowerCase();
    return m.nombre.toLowerCase().includes(q) || m.tipo.toLowerCase().includes(q) || (m.detalle && m.detalle.toLowerCase().includes(q));
  });

  const filteredRoles = roles.filter(r => {
    const q = searchQuery.toLowerCase();
    return r.nombre.toLowerCase().includes(q);
  });

  const filteredTiposPago = tiposPago.filter(tp => {
    const q = searchQuery.toLowerCase();
    return tp.nombre.toLowerCase().includes(q);
  });

  // --- COMPORTAMIENTO EDIT ---

  const handleEditEspecie = (e) => {
    setEditingEspecieId(e.id);
    setEspecieForm({
      nombre: e.nombre,
      codigo: e.codigo,
      icono: e.icono
    });
    setActiveModal('config-animales');
  };

  const handleEditPago = (p) => {
    setEditingPagoId(p.id);
    setPagoForm({
      nombre: p.nombre,
      tipo: p.tipo,
      detalle: p.detalle === 'Sin detalles adicionales' ? '' : p.detalle
    });
    setActiveModal('config-pagos');
  };

  const handleEditRol = (r) => {
    setEditingRolId(r.id);
    setRolForm({
      nombre: r.nombre,
      activo: !!r.activo
    });
    setActiveModal('config-roles');
  };

  const handleEditTipoPago = (tp) => {
    setEditingTipoPagoId(tp.id);
    setTipoPagoForm({
      nombre: tp.nombre,
      activo: !!tp.activo
    });
    setActiveModal('config-tipos-pago');
  };

  // --- ACCIONES SUBMIT ---

  const handleEspecieSubmit = async (e) => {
    e.preventDefault();
    const nombre = especieForm.nombre.trim();
    const codigo = especieForm.codigo.trim().toUpperCase();
    const icono = especieForm.icono.trim();

    if (codigo.length !== 2) {
      alert('El código de especie debe tener exactamente 2 letras.');
      return;
    }

    if (especies.some(item => item.codigo === codigo && item.id !== editingEspecieId)) {
      alert('El código de especie ya está asignado a otra especie.');
      return;
    }

    if (especies.some(item => item.nombre.toLowerCase() === nombre.toLowerCase() && item.id !== editingEspecieId)) {
      alert('El nombre de especie ya existe en el catálogo.');
      return;
    }

    setLoadingAction(true);
    const payload = {
      id: editingEspecieId || 'e-' + Date.now(),
      nombre,
      codigo,
      icono,
      activo: true
    };

    try {
      const url = editingEspecieId ? `/api/especies/${editingEspecieId}` : '/api/especies';
      const method = editingEspecieId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar especie');
      }

      alert(editingEspecieId ? 'Especie actualizada correctamente.' : 'Especie registrada correctamente.');
      setActiveModal(null);
      setEditingEspecieId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePagoSubmit = async (e) => {
    e.preventDefault();
    const nombre = pagoForm.nombre.trim();
    const tipo = pagoForm.tipo;
    const detalle = pagoForm.detalle.trim();

    if (!tipo) {
      alert('Debe seleccionar un tipo de pago.');
      return;
    }

    if (metodosPago.some(m => m.nombre.toLowerCase() === nombre.toLowerCase() && m.id !== editingPagoId)) {
      alert('El nombre de método de pago ya existe en el catálogo.');
      return;
    }

    setLoadingAction(true);
    const payload = {
      id: editingPagoId || 'mp-' + Date.now(),
      nombre,
      tipo,
      detalle: detalle || 'Sin detalles adicionales',
      activo: true
    };

    try {
      const url = editingPagoId ? `/api/metodos-pago/${editingPagoId}` : '/api/metodos-pago';
      const method = editingPagoId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar método de pago');
      }

      alert(editingPagoId ? 'Método de pago actualizado correctamente.' : 'Método de pago registrado correctamente.');
      setActiveModal(null);
      setEditingPagoId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRolSubmit = async (e) => {
    e.preventDefault();
    const nombre = rolForm.nombre.trim();
    const activo = rolForm.activo;

    if (nombre.length === 0) {
      alert('El nombre del cargo no puede estar vacío.');
      return;
    }

    const duplicado = roles.some(r => r.nombre.toLowerCase() === nombre.toLowerCase() && r.id !== editingRolId);
    if (duplicado) {
      alert('Ya existe un cargo con ese nombre.');
      return;
    }

    // Si pasa de activo a inactivo, validar que no esté en uso
    if (editingRolId && !activo) {
      const rolActual = roles.find(r => r.id === editingRolId);
      if (rolActual && rolActual.activo) {
        const enUso = trabajadores.some(t => t.rol.toLowerCase() === rolActual.nombre.toLowerCase());
        if (enUso) {
          alert('No se puede desactivar este cargo porque está asignado a trabajadores activos.');
          return;
        }
      }
    }

    setLoadingAction(true);
    const payload = {
      id: editingRolId || 'rol-' + Date.now(),
      nombre,
      activo
    };

    try {
      const url = editingRolId ? `/api/roles/${editingRolId}` : '/api/roles';
      const method = editingRolId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar rol');
      }

      alert(editingRolId ? 'Cargo actualizado con éxito.' : 'Cargo registrado con éxito.');
      setActiveModal(null);
      setEditingRolId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleTipoPagoSubmit = async (e) => {
    e.preventDefault();
    const nombre = tipoPagoForm.nombre.trim();
    const activo = tipoPagoForm.activo;

    if (tiposPago.some(tp => tp.nombre.toLowerCase() === nombre.toLowerCase() && tp.id !== editingTipoPagoId)) {
      alert('El nombre de tipo de pago ya existe en el catálogo.');
      return;
    }

    setLoadingAction(true);
    const payload = {
      id: editingTipoPagoId || 'tp-' + Date.now(),
      nombre,
      activo
    };

    try {
      const url = editingTipoPagoId ? `/api/tipos-pago/${editingTipoPagoId}` : '/api/tipos-pago';
      const method = editingTipoPagoId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar tipo de pago');
      }

      alert(editingTipoPagoId ? 'Tipo de pago actualizado correctamente.' : 'Tipo de pago registrado correctamente.');
      setActiveModal(null);
      setEditingTipoPagoId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // --- ELIMINACIONES ---

  const handleDeleteEspecie = async (id, nombre, codigo) => {
    const tieneLotes = recepciones.some(r => r.especie === codigo);
    if (tieneLotes) {
      alert('No se puede eliminar la especie: existen registros de ingresos asociados en el historial.');
      return;
    }

    const confirmado = await confirm(`¿Está seguro de eliminar la especie "${nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
      const response = await fetch(`/api/especies/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar especie');
      alert('Especie eliminada correctamente.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePago = async (id, nombre) => {
    const confirmado = await confirm(`¿Está seguro de eliminar el método de pago "${nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
      const response = await fetch(`/api/metodos-pago/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar método de pago');
      alert('Método de pago eliminado correctamente.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRol = async (id, nombre) => {
    const enUso = trabajadores.some(t => t.rol.toLowerCase() === nombre.toLowerCase());
    if (enUso) {
      alert('No se puede eliminar este cargo porque está asignado a trabajadores. Considere inhabilitarlo.');
      return;
    }

    const confirmado = await confirm(`¿Está seguro de eliminar el cargo "${nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
      const response = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar cargo/rol');
      alert('Cargo eliminado correctamente.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTipoPago = async (id, nombre) => {
    const estaUsado = metodosPago.some(mp => mp.tipo === id || mp.tipo === nombre);
    if (estaUsado) {
      alert('No se puede eliminar este tipo de pago porque está en uso por uno o más métodos de pago.');
      return;
    }

    if (id.startsWith('tp-') && parseInt(id.split('-')[1]) <= 6) {
      alert('No se pueden eliminar los tipos de pago predeterminados del sistema.');
      return;
    }

    const confirmado = await confirm(`¿Está seguro de eliminar el tipo de pago "${nombre}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    try {
      const response = await fetch(`/api/tipos-pago/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar tipo de pago');
      alert('Tipo de pago eliminado correctamente.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="content-section" style={{ display: 'block' }}>
      
      {/* Selector de subpestañas */}
      <div className="segmented-control-container" style={{
        display: 'flex',
        background: '#f1f5f9',
        borderRadius: '10px',
        padding: '4px',
        marginBottom: '20px',
        maxWidth: '650px',
        width: '100%',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setSubTab('animales')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            border: 'none',
            borderRadius: '8px',
            background: subTab === 'animales' ? 'white' : 'transparent',
            color: subTab === 'animales' ? 'var(--color-client)' : 'var(--text-secondary)',
            fontWeight: subTab === 'animales' ? '600' : '500',
            fontSize: '13px',
            boxShadow: subTab === 'animales' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            minHeight: '40px'
          }}
        >
          <i className="fa-solid fa-cow"></i>
          <span>Especies</span>
        </button>
        <button
          onClick={() => setSubTab('pagos')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            border: 'none',
            borderRadius: '8px',
            background: subTab === 'pagos' ? 'white' : 'transparent',
            color: subTab === 'pagos' ? 'var(--color-client)' : 'var(--text-secondary)',
            fontWeight: subTab === 'pagos' ? '600' : '500',
            fontSize: '13px',
            boxShadow: subTab === 'pagos' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            minHeight: '40px'
          }}
        >
          <i className="fa-solid fa-credit-card"></i>
          <span>Métodos de Pago</span>
        </button>
        <button
          onClick={() => setSubTab('roles')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            border: 'none',
            borderRadius: '8px',
            background: subTab === 'roles' ? 'white' : 'transparent',
            color: subTab === 'roles' ? 'var(--color-client)' : 'var(--text-secondary)',
            fontWeight: subTab === 'roles' ? '600' : '500',
            fontSize: '13px',
            boxShadow: subTab === 'roles' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            minHeight: '40px'
          }}
        >
          <i className="fa-solid fa-user-tag"></i>
          <span>Cargo / Rol</span>
        </button>
        <button
          onClick={() => setSubTab('tipos-pago')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            border: 'none',
            borderRadius: '8px',
            background: subTab === 'tipos-pago' ? 'white' : 'transparent',
            color: subTab === 'tipos-pago' ? 'var(--color-client)' : 'var(--text-secondary)',
            fontWeight: subTab === 'tipos-pago' ? '600' : '500',
            fontSize: '13px',
            boxShadow: subTab === 'tipos-pago' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            minHeight: '40px'
          }}
        >
          <i className="fa-solid fa-money-check-dollar"></i>
          <span>Tipos de Pago</span>
        </button>
      </div>

      {/* --- ESPECIES --- */}
      {subTab === 'animales' && (
        <div className="table-container">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Buscar especie..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className="btn-primary btn-flex"
              style={{ margin: 0, minHeight: '40px', padding: '8px 16px', background: 'linear-gradient(135deg, var(--color-client), #c2410c)' }}
              onClick={() => {
                setEditingEspecieId(null);
                setActiveModal('config-animales');
              }}
            >
              <i className="fa-solid fa-plus"></i>
              <span>Nueva Especie</span>
            </button>
          </div>

          <div className="table-responsive-wrapper">
            <table className="table-responsive-cards">
              <thead>
                <tr>
                  <th>Icono</th>
                  <th>Especie</th>
                  <th>Código Lote (2 letras)</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEspecies.map(e => (
                  <tr key={e.id}>
                    <td data-label="Icono" style={{ fontSize: '24px' }}>{e.icono}</td>
                    <td data-label="Especie"><strong>{e.nombre}</strong></td>
                    <td data-label="Código Lote"><span className="lote-tag">{e.codigo}</span></td>
                    <td data-label="Estado">
                      {e.activo !== false ? (
                        <span className="badge-conforme" style={{ fontSize: '11px' }}>Activo</span>
                      ) : (
                        <span className="badge-inactivo" style={{ fontSize: '11px', background: '#e2e8f0', color: '#64748b' }}>Inactivo</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      <button
                        onClick={() => handleEditEspecie(e)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }}
                        title="Editar"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteEspecie(e.id, e.nombre, e.codigo)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
                        title="Eliminar"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEspecies.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                      No se encontraron especies registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MÉTODOS DE PAGO --- */}
      {subTab === 'pagos' && (
        <div className="table-container">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Buscar método..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className="btn-primary btn-flex"
              style={{ margin: 0, minHeight: '40px', padding: '8px 16px', background: 'linear-gradient(135deg, var(--color-client), #c2410c)' }}
              onClick={() => {
                setEditingPagoId(null);
                setActiveModal('config-pagos');
              }}
            >
              <i className="fa-solid fa-plus"></i>
              <span>Nuevo Método</span>
            </button>
          </div>

          <div className="table-responsive-wrapper">
            <table className="table-responsive-cards">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Detalle / Cuenta</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetodos.map(p => (
                  <tr key={p.id}>
                    <td data-label="Nombre"><strong>{p.nombre}</strong></td>
                    <td data-label="Tipo"><span className="lote-tag" style={{ background: '#f0fdf4', color: '#166534' }}>{p.tipo}</span></td>
                    <td data-label="Detalle / Cuenta"><small>{p.detalle || 'Sin detalles'}</small></td>
                    <td data-label="Estado">
                      {p.activo !== false ? (
                        <span className="badge-conforme" style={{ fontSize: '11px' }}>Activo</span>
                      ) : (
                        <span className="badge-inactivo" style={{ fontSize: '11px', background: '#e2e8f0', color: '#64748b' }}>Inactivo</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      <button
                        onClick={() => handleEditPago(p)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }}
                        title="Editar"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDeletePago(p.id, p.nombre)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
                        title="Eliminar"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMetodos.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                      No se encontraron métodos de pago registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CARGOS / ROLES --- */}
      {subTab === 'roles' && (
        <div className="table-container">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Buscar cargo..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className="btn-primary btn-flex"
              style={{ margin: 0, minHeight: '40px', padding: '8px 16px', background: 'linear-gradient(135deg, var(--color-client), #c2410c)' }}
              onClick={() => {
                setEditingRolId(null);
                setActiveModal('config-roles');
              }}
            >
              <i className="fa-solid fa-plus"></i>
              <span>Nuevo Cargo</span>
            </button>
          </div>

          <div className="table-responsive-wrapper">
            <table className="table-responsive-cards">
              <thead>
                <tr>
                  <th>Nombre del Cargo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map(r => (
                  <tr key={r.id}>
                    <td data-label="Nombre del Cargo"><strong>{r.nombre}</strong></td>
                    <td data-label="Estado">
                      {r.activo ? (
                        <span className="badge-conforme" style={{ fontSize: '11px' }}>Activo</span>
                      ) : (
                        <span className="badge-inactivo" style={{ fontSize: '11px', background: '#e2e8f0', color: '#64748b' }}>Inactivo</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      <button
                        onClick={() => handleEditRol(r)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }}
                        title="Editar"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteRol(r.id, r.nombre)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
                        title="Eliminar"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRoles.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                      No se encontraron cargos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TIPOS DE PAGO --- */}
      {subTab === 'tipos-pago' && (
        <div className="table-container">
          <div className="table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Buscar tipo..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className="btn-primary btn-flex"
              style={{ margin: 0, minHeight: '40px', padding: '8px 16px', background: 'linear-gradient(135deg, var(--color-client), #c2410c)' }}
              onClick={() => {
                setEditingTipoPagoId(null);
                setActiveModal('config-tipos-pago');
              }}
            >
              <i className="fa-solid fa-plus"></i>
              <span>Nuevo Tipo</span>
            </button>
          </div>

          <div className="table-responsive-wrapper">
            <table className="table-responsive-cards">
              <thead>
                <tr>
                  <th>Nombre del Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTiposPago.map(tp => (
                  <tr key={tp.id}>
                    <td data-label="Nombre del Tipo"><strong>{tp.nombre}</strong></td>
                    <td data-label="Estado">
                      {tp.activo ? (
                        <span className="badge-conforme" style={{ fontSize: '11px' }}>Activo</span>
                      ) : (
                        <span className="badge-inactivo" style={{ fontSize: '11px', background: '#e2e8f0', color: '#64748b' }}>Inactivo</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      <button
                        onClick={() => handleEditTipoPago(tp)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }}
                        title="Editar"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteTipoPago(tp.id, tp.nombre)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
                        title="Eliminar"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTiposPago.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                      No se encontraron tipos de pago registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: ESPECIES --- */}
      {activeModal === 'config-animales' && (
        <div className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '420px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingEspecieId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-cow" style={{ color: 'var(--color-client)', marginRight: '8px' }}></i>
              {editingEspecieId ? 'Editar Especie de Ganado' : 'Registrar Especie de Ganado'}
            </h2>
            <form onSubmit={handleEspecieSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre de la Especie</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Equino"
                  value={especieForm.nombre}
                  onChange={(e) => setEspecieForm({ ...especieForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Código de Especie (2 letras)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. EQ"
                  maxLength={2}
                  style={{ textTransform: 'uppercase' }}
                  value={especieForm.codigo}
                  onChange={(e) => setEspecieForm({ ...especieForm, codigo: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                  disabled={editingEspecieId && recepciones.some(r => r.especie === especieForm.codigo)}
                  title={editingEspecieId && recepciones.some(r => r.especie === especieForm.codigo) ? "No se puede editar el código porque hay lotes de esta especie en el historial." : ""}
                  required
                />
                <small style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Código identificador único para componer el Lote Juliano.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Emoji / Icono Representativo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. 🐴"
                  maxLength={2}
                  value={especieForm.icono}
                  onChange={(e) => setEspecieForm({ ...especieForm, icono: e.target.value })}
                  required
                />
                <small style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Pega un emoji representativo del animal.
                </small>
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
                    <span>{editingEspecieId ? 'Guardar Cambios' : 'Registrar Especie'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: MÉTODOS DE PAGO --- */}
      {activeModal === 'config-pagos' && (
        <div className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '440px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingPagoId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-client)', marginRight: '8px' }}></i>
              {editingPagoId ? 'Editar Método de Pago' : 'Registrar Método de Pago'}
            </h2>
            <form onSubmit={handlePagoSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre del Método</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. BCP Transferencia"
                  value={pagoForm.nombre}
                  onChange={(e) => setPagoForm({ ...pagoForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Pago</label>
                <select
                  className="form-control"
                  style={{ height: '44px' }}
                  value={pagoForm.tipo}
                  onChange={(e) => setPagoForm({ ...pagoForm, tipo: e.target.value })}
                  required
                >
                  <option value="" disabled>Elige un tipo de pago...</option>
                  {tiposPago.map(tp => (
                    <option key={tp.id} value={tp.nombre}>{tp.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Detalle / Cuenta Bancaria (Opcional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. N° Cuenta: 191-12345678-0-90"
                  value={pagoForm.detalle}
                  onChange={(e) => setPagoForm({ ...pagoForm, detalle: e.target.value })}
                />
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
                    <span>{editingPagoId ? 'Guardar Cambios' : 'Registrar Método'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: CARGOS / ROLES --- */}
      {activeModal === 'config-roles' && (
        <div className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '400px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingRolId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-user-tag" style={{ color: 'var(--color-client)', marginRight: '8px' }}></i>
              {editingRolId ? 'Editar Cargo / Rol' : 'Registrar Cargo / Rol'}
            </h2>
            <form onSubmit={handleRolSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre del Cargo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Asistente de Pesaje"
                  value={rolForm.nombre}
                  onChange={(e) => setRolForm({ ...rolForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estado del Cargo</label>
                <select
                  className="form-control"
                  style={{ height: '44px' }}
                  value={rolForm.activo ? 'Activo' : 'Inactivo'}
                  onChange={(e) => setRolForm({ ...rolForm, activo: e.target.value === 'Activo' })}
                  required
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
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
                    <span>{editingRolId ? 'Guardar Cambios' : 'Registrar Cargo'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- FORM MODAL: TIPOS DE PAGO --- */}
      {activeModal === 'config-tipos-pago' && (
        <div className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '400px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingTipoPagoId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-money-check-dollar" style={{ color: 'var(--color-client)', marginRight: '8px' }}></i>
              {editingTipoPagoId ? 'Editar Tipo de Pago' : 'Registrar Tipo de Pago'}
            </h2>
            <form onSubmit={handleTipoPagoSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre del Tipo de Pago</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Efectivo, Tarjeta, etc."
                  value={tipoPagoForm.nombre}
                  onChange={(e) => setTipoPagoForm({ ...tipoPagoForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estado</label>
                <select
                  className="form-control"
                  style={{ height: '44px' }}
                  value={tipoPagoForm.activo ? 'Activo' : 'Inactivo'}
                  onChange={(e) => setTipoPagoForm({ ...tipoPagoForm, activo: e.target.value === 'Activo' })}
                  required
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
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
                    <span>{editingTipoPagoId ? 'Guardar Cambios' : 'Registrar Tipo'}</span>
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

export default Configuraciones;
