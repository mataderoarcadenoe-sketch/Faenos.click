import React, { useState, useEffect } from 'react';

function Trabajadores({ data, activeModal, setActiveModal, onRefresh, confirm }) {
  const { trabajadores = [], roles = [] } = data;

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    rol: '',
    whatsapp: ''
  });

  // Limpiar campos al abrir para registrar nuevo
  useEffect(() => {
    if (activeModal === 'trabajador' && !editingId) {
      setFormData({
        nombre: '',
        rol: roles.length > 0 ? roles[0].nombre : '',
        whatsapp: ''
      });
    }
  }, [activeModal, editingId, roles]);

  const filteredTrabajadores = trabajadores.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      t.nombre.toLowerCase().includes(query) ||
      t.rol.toLowerCase().includes(query) ||
      (t.whatsapp && t.whatsapp.toLowerCase().includes(query))
    );
  });

  // Métricas
  const totalTrabajadores = trabajadores.length;
  const activosTrabajadores = trabajadores.filter(t => t.activo).length;
  const cajerosEncargados = trabajadores.filter(t => t.activo && (t.rol === 'Cajero' || t.rol === 'Administrador')).length;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.rol) {
      alert('Debe seleccionar un cargo para el trabajador.');
      return;
    }

    // Validar unicidad de nombre (excepto para sí mismo)
    if (trabajadores.some(t => t.nombre.toLowerCase() === formData.nombre.toLowerCase() && t.id !== editingId)) {
      alert('Ya existe un trabajador registrado con ese nombre.');
      return;
    }

    const payload = {
      nombre: formData.nombre.trim(),
      rol: formData.rol,
      whatsapp: formData.whatsapp.trim(),
      activo: true
    };

    try {
      const url = editingId ? `/api/trabajadores/${editingId}` : '/api/trabajadores';
      const method = editingId ? 'PUT' : 'POST';

      if (!editingId) {
        payload.id = 't-' + Date.now();
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar trabajador');
      }

      alert(editingId ? 'Trabajador actualizado con éxito' : 'Trabajador registrado con éxito');
      setActiveModal(null);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setFormData({
      nombre: t.nombre,
      rol: t.rol,
      whatsapp: t.whatsapp || ''
    });
    setActiveModal('trabajador');
  };

  const handleDelete = async (id) => {
    const trab = trabajadores.find(t => t.id === id);
    if (!trab) return;

    // Verificar si tiene turnos de caja registrados
    const tieneCajas = data.cajas && data.cajas.some(c => c.encargadoId === id || c.encargado_id === id);
    
    if (tieneCajas) {
      const desactivar = await confirm(`No se puede eliminar físicamente a "${trab.nombre}" porque cuenta con turnos de caja registrados. ¿Desea desactivar su cuenta para que no figure en nuevas aperturas de caja?`);
      if (desactivar) {
        try {
          const response = await fetch(`/api/trabajadores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: trab.nombre,
              rol: trab.rol,
              whatsapp: trab.whatsapp,
              activo: false
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al desactivar el trabajador');
          }

          alert('Trabajador desactivado correctamente.');
          onRefresh();
        } catch (err) {
          alert(err.message);
        }
      }
      return;
    }

    const confirmado = await confirm(`¿Está seguro de eliminar al trabajador "${trab.nombre}"? Esta acción no se puede deshacer.`);
    if (confirmado) {
      try {
        const response = await fetch(`/api/trabajadores/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar el trabajador');
        }

        alert('Trabajador eliminado correctamente.');
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <section id="tab-trabajadores" className="content-section" style={{ display: 'block' }}>
      
      {/* Métricas Trabajadores */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Personal</div>
          <div className="stat-value">{totalTrabajadores}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Personal Activo</div>
          <div className="stat-value" style={{ color: 'var(--color-ops)' }}>{activosTrabajadores}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cajeros / Encargados</div>
          <div className="stat-value" style={{ color: 'var(--color-admin)' }}>{cajerosEncargados}</div>
        </div>
      </div>

      {/* Tabla de Trabajadores */}
      <div className="table-container">
        <div className="table-header-row" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Buscar trabajador..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="table-responsive-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombres y Apellidos</th>
                <th>Cargo / Rol</th>
                <th>WhatsApp</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrabajadores.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.nombre}</strong></td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(79, 70, 229, 0.08)', color: 'var(--color-admin)', border: '1px solid rgba(79, 70, 229, 0.15)', fontWeight: '600' }}>
                      {t.rol}
                    </span>
                  </td>
                  <td>
                    <i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: '6px' }}></i>
                    {t.whatsapp}
                  </td>
                  <td>
                    {t.activo ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.08)', color: '#64748b', border: '1px solid rgba(100, 116, 139, 0.15)' }}>Inactivo</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleEdit(t)} 
                      style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }} 
                      title="Editar"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }} 
                      title="Eliminar"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTrabajadores.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No se encontraron trabajadores registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Flotante: Registro/Edición */}
      {activeModal === 'trabajador' && (
        <div id="modal-trabajador" className="form-modal-overlay active">
          <div className="form-modal-card">
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2 className="card-title">
              <i className={`fa-solid ${editingId ? 'fa-user-pen' : 'fa-user-plus'}`} style={{ color: 'var(--color-client)' }}></i>
              {editingId ? 'Editar Trabajador' : 'Registrar Trabajador'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombres y Apellidos</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Ana Torres Prado" 
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Cargo / Rol</label>
                <select 
                  className="form-control"
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  required
                >
                  <option value="" disabled>Elige un cargo...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.nombre}>{r.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Celular / WhatsApp</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="Ej. +51 912345678" 
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  required 
                />
              </div>
              
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: '0' }}>
                  <i className="fa-solid fa-check"></i> 
                  <span>{editingId ? 'Guardar Cambios' : 'Registrar Trabajador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Trabajadores;
