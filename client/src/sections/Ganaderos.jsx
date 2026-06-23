import React, { useState, useEffect } from 'react';

function Ganaderos({ data, activeModal, setActiveModal, onRefresh }) {
  const { ganaderos = [] } = data;

  // Estados locales para búsqueda y edición
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Estado local para los campos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    tipoDocumento: 'RUC',
    ruc: '',
    whatsapp: '',
    codigo: ''
  });

  // Generar código de ganadero (2 letras basadas en el nombre)
  const generarCodigoGanadero = (nombre) => {
    if (!nombre) return '';
    const palabras = nombre.trim().toUpperCase().split(/\s+/);
    let codigo = '';
    if (palabras.length >= 2) {
      codigo = palabras[0][0] + palabras[1][0];
    } else if (palabras[0].length >= 2) {
      codigo = palabras[0].substring(0, 2);
    } else {
      codigo = palabras[0][0] + 'X';
    }
    // Asegurar 2 letras
    return codigo.replace(/[^A-Z]/g, 'X').substring(0, 2);
  };

  // Autogenerar código cuando cambia el nombre y no estamos editando
  useEffect(() => {
    if (!editingId && activeModal === 'ganadero') {
      const codigoSugerido = generarCodigoGanadero(formData.nombre);
      setFormData(prev => ({ ...prev, codigo: codigoSugerido }));
    }
  }, [formData.nombre, editingId, activeModal]);

  // Al abrir el modal para agregar, limpiar campos
  useEffect(() => {
    if (activeModal === 'ganadero' && !editingId) {
      setFormData({
        nombre: '',
        tipoDocumento: 'RUC',
        ruc: '',
        whatsapp: '',
        codigo: ''
      });
    }
  }, [activeModal, editingId]);

  // Filtrado de ganaderos según la búsqueda
  const filteredGanaderos = ganaderos.filter(g => {
    const query = searchQuery.toLowerCase();
    return (
      g.nombre.toLowerCase().includes(query) ||
      g.codigo.toLowerCase().includes(query) ||
      g.ruc.toLowerCase().includes(query)
    );
  });

  // Cálculos estadísticos
  const totalGanaderos = ganaderos.length;
  const ganaderosActivos = ganaderos.filter(g => g.activo !== false).length;
  const ultimoCodigo = ganaderos.length > 0 ? ganaderos[ganaderos.length - 1].codigo : '--';

  // Manejar el submit del formulario (Guardar o Editar)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      id: editingId || 'G' + Date.now(),
      nombre: formData.nombre,
      ruc: formData.ruc,
      whatsapp: formData.whatsapp,
      codigo: formData.codigo.toUpperCase()
    };

    try {
      const url = editingId ? `/api/ganaderos/${editingId}` : '/api/ganaderos';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar el ganadero');
      }

      alert(editingId ? 'Ganadero actualizado con éxito' : 'Ganadero registrado con éxito');
      setActiveModal(null);
      setEditingId(null);
      onRefresh(); // Refrescar los datos globales
    } catch (err) {
      alert(err.message);
    }
  };

  // Abrir modal en modo edición
  const handleEdit = (g) => {
    setEditingId(g.id);
    setFormData({
      nombre: g.nombre,
      tipoDocumento: g.ruc.length === 11 ? 'RUC' : 'DNI',
      ruc: g.ruc,
      whatsapp: g.whatsapp,
      codigo: g.codigo
    });
    setActiveModal('ganadero');
  };

  // Eliminar ganadero
  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este ganadero?')) return;

    try {
      const response = await fetch(`/api/ganaderos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el ganadero');
      }

      alert('Ganadero eliminado correctamente');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section id="tab-ganaderos" className="content-section" style={{ display: 'block' }}>
      
      {/* Estadísticas de Ganaderos */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Ganaderos</div>
          <div className="stat-value">{totalGanaderos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ganaderos Activos</div>
          <div className="stat-value">{ganaderosActivos}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Último Código Asignado</div>
          <div className="stat-value">{ultimoCodigo}</div>
        </div>
      </div>

      {/* Tabla de Ganaderos */}
      <div className="table-container">
        <div className="table-header-row" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Buscar ganadero..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="table-responsive-wrapper">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Razón Social</th>
                <th>RUC / Identidad</th>
                <th>WhatsApp</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredGanaderos.map(g => (
                <tr key={g.id}>
                  <td><span className="lote-tag">{g.codigo}</span></td>
                  <td><strong>{g.nombre}</strong></td>
                  <td>{g.ruc}</td>
                  <td>
                    <i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: '6px' }}></i>
                    {g.whatsapp}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleEdit(g)} 
                      style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }} 
                      title="Editar"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button 
                      onClick={() => handleDelete(g.id)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }} 
                      title="Eliminar"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredGanaderos.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No se encontraron ganaderos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Flotante: Registro/Edición */}
      {activeModal === 'ganadero' && (
        <div id="modal-ganadero" className="form-modal-overlay active">
          <div className="form-modal-card">
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2 className="card-title">
              <i className={`fa-solid ${editingId ? 'fa-user-pen' : 'fa-user-plus'}`} style={{ color: 'var(--color-client)' }}></i>
              {editingId ? 'Editar Ganadero' : 'Registrar Ganadero'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Razón Social o Nombres</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Agroindustria Atlántica" 
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Tipo de Documento</label>
                <div style={{ display: 'flex', gap: '24px', padding: '6px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500' }}>
                    <input 
                      type="radio" 
                      name="tipo-documento" 
                      value="RUC" 
                      checked={formData.tipoDocumento === 'RUC'} 
                      onChange={() => setFormData({ ...formData, tipoDocumento: 'RUC' })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-admin)' }} 
                    /> RUC
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '500' }}>
                    <input 
                      type="radio" 
                      name="tipo-documento" 
                      value="DNI" 
                      checked={formData.tipoDocumento === 'DNI'} 
                      onChange={() => setFormData({ ...formData, tipoDocumento: 'DNI' })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-admin)' }} 
                    /> DNI
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Número de {formData.tipoDocumento}</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={formData.tipoDocumento === 'RUC' ? 'Ej. 20601234567' : 'Ej. 45678901'} 
                  maxLength={formData.tipoDocumento === 'RUC' ? 11 : 8}
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value.replace(/[^0-9]/g, '') })}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Celular / WhatsApp (Alertas)</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="Ej. 987654321" 
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Código de Proveedor (2 letras)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. AA" 
                  maxLength={2} 
                  style={{ textTransform: 'uppercase' }} 
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                  required 
                />
                <small style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Se autogenera según el nombre de forma única (editable si es necesario).
                </small>
              </div>
              
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: '0' }}>
                  <i className="fa-solid fa-check"></i> 
                  <span>{editingId ? 'Guardar Cambios' : 'Registrar Ganadero'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Ganaderos;
