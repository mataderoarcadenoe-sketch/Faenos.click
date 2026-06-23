import React, { useState, useEffect } from 'react';

function Despachos({ data, activeModal, setActiveModal, onRefresh, confirm }) {
  const { despachos = [], recepciones = [], pesajes = [] } = data;

  const [localSubTab, setLocalSubTab] = useState('salidas'); // 'salidas' o 'transportes'
  const [editingId, setEditingId] = useState(null);

  // Formulario Despacho + Transporte State
  const [formData, setFormData] = useState({
    loteCodigo: '',
    cliente: '',
    guiaRemision: '',
    cantidadCarcasas: '',
    pesoTotal: '',
    temperaturaCarne: '',
    observaciones: '',
    responsable: 'Carlos Ruiz Rojas',
    fechaInput: '',
    fechaProduccion: '',
    fechaVencimiento: '',
    placaVehiculo: '',
    conductor: '',
    licencia: '',
    temperaturaFurgon: '',
    higieneFurgon: 'Conforme',
    hermeticidad: 'Sí',
    fumigacion: 'Sí',
    apilamientoAdecuado: 'Sí'
  });

  // Stock disponible para el lote seleccionado
  const [stockDisponible, setStockDisponible] = useState(0);

  // Filtrar lotes que tienen carcasas faenadas para despachar
  const lotesParaDespacho = recepciones.filter(r => r.estado === 'Inspeccionado');

  // Calcular stock disponible para el lote seleccionado
  const calcularStockDisponible = (loteCodigo, idEditar = null) => {
    const recepcion = recepciones.find(r => r.lote_codigo === loteCodigo);
    if (!recepcion) return 0;
    
    const pesajesLote = pesajes.filter(p => p.recepcion_id === recepcion.id).length;
    const totalCarcasas = pesajesLote > 0 ? pesajesLote : recepcion.cantidad;
    
    const despachado = despachos
      .filter(d => d.loteCodigo === loteCodigo && d.id !== idEditar)
      .reduce((sum, d) => sum + parseInt(d.cantidadCarcasas || 0), 0);
        
    return Math.max(0, totalCarcasas - despachado);
  };

  // Actualizar stock disponible cuando cambia el lote en el formulario
  useEffect(() => {
    if (formData.loteCodigo) {
      const stock = calcularStockDisponible(formData.loteCodigo, editingId);
      setStockDisponible(stock);
    } else {
      setStockDisponible(0);
    }
  }, [formData.loteCodigo, editingId]);

  // Rellenar fecha actual por defecto en el formulario
  useEffect(() => {
    if (activeModal === 'despacho' && !editingId) {
      const now = new Date();
      // Formato para datetime-local: YYYY-MM-DDTHH:mm
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const todayDate = now.toISOString().slice(0, 10);
      
      // Fecha de vencimiento sugerida: 7 días después
      const vencDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      setFormData({
        loteCodigo: lotesParaDespacho.length > 0 ? lotesParaDespacho[0].lote_codigo : '',
        cliente: '',
        guiaRemision: '',
        cantidadCarcasas: '',
        pesoTotal: '',
        temperaturaCarne: '',
        observaciones: '',
        responsable: 'Carlos Ruiz Rojas',
        fechaInput: localDateTime,
        fechaProduccion: todayDate,
        fechaVencimiento: vencDate,
        placaVehiculo: '',
        conductor: '',
        licencia: '',
        temperaturaFurgon: '',
        higieneFurgon: 'Conforme',
        hermeticidad: 'Sí',
        fumigacion: 'Sí',
        apilamientoAdecuado: 'Sí'
      });
    }
  }, [activeModal, editingId, recepciones]);

  // Guardar Despacho
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { 
      loteCodigo, cliente, guiaRemision, cantidadCarcasas, pesoTotal, 
      temperaturaCarne, observaciones, responsable, fechaInput, 
      fechaProduccion, fechaVencimiento, placaVehiculo, conductor, 
      licencia, temperaturaFurgon, higieneFurgon, hermeticidad, 
      fumigacion, apilamientoAdecuado 
    } = formData;

    if (!loteCodigo) {
      alert('Por favor, selecciona un lote de origen.');
      return;
    }

    const stock = calcularStockDisponible(loteCodigo, editingId);
    const cant = parseInt(cantidadCarcasas);
    if (cant > stock) {
      alert(`Error: Stock insuficiente. Lote ${loteCodigo} solo posee ${stock} carcasas disponibles.`);
      return;
    }

    const tempCarneFloat = parseFloat(temperaturaCarne);
    if (tempCarneFloat > 7.0) {
      alert(`⚠️ LÍMITE DE TEMPERATURA EXCEDIDO: La carne de despacho está a ${tempCarneFloat.toFixed(1)} °C (> 7.0 °C). Se registrará una desviación HACCP.`);
    }

    const payload = {
      nuevoDespacho: {
        id: editingId || 'desp-' + Date.now(),
        fecha: new Date(fechaInput).toISOString(),
        loteCodigo,
        cliente,
        guiaRemision,
        cantidadCarcasas: cant,
        pesoTotal: parseFloat(pesoTotal),
        temperaturaCarne: tempCarneFloat,
        observaciones,
        responsable,
        fechaProduccion,
        fechaVencimiento
      },
      nuevoTransporte: {
        id: 'trans-' + Date.now(),
        placaVehiculo,
        conductor,
        licencia,
        higieneFurgon,
        temperaturaFurgon: parseFloat(temperaturaFurgon),
        hermeticidad: hermeticidad === 'Sí',
        observaciones: `Registro de transporte asociado a la guía ${guiaRemision}`,
        fumigacion: fumigacion === 'Sí',
        apilamientoAdecuado: apilamientoAdecuado === 'Sí'
      }
    };

    try {
      const url = editingId ? `/api/despachos/${editingId}` : '/api/despachos';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar el despacho');
      }

      alert(editingId ? 'Despacho y transporte modificados correctamente.' : 'Despacho y transporte de furgón registrados correctamente.');
      setActiveModal(null);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (d) => {
    setEditingId(d.id);
    
    // Obtener fecha del input en formato local
    const dateObj = new Date(d.fecha);
    const localDateTime = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    const t = d.transporte || {};

    setFormData({
      loteCodigo: d.loteCodigo,
      cliente: d.cliente,
      guiaRemision: d.guiaRemision,
      cantidadCarcasas: d.cantidadCarcasas,
      pesoTotal: d.pesoTotal,
      temperaturaCarne: d.temperaturaCarne,
      observaciones: d.observaciones || '',
      responsable: d.responsable,
      fechaInput: localDateTime,
      fechaProduccion: d.fechaProduccion ? d.fechaProduccion.slice(0, 10) : '',
      fechaVencimiento: d.fechaVencimiento ? d.fechaVencimiento.slice(0, 10) : '',
      placaVehiculo: t.placaVehiculo || '',
      conductor: t.conductor || '',
      licencia: t.licencia || '',
      temperaturaFurgon: t.temperaturaFurgon || '',
      higieneFurgon: t.higieneFurgon || 'Conforme',
      hermeticidad: t.hermeticidad ? 'Sí' : 'No',
      fumigacion: t.fumigacion ? 'Sí' : 'No',
      apilamientoAdecuado: t.apilamientoAdecuado ? 'Sí' : 'No'
    });
    setActiveModal('despacho');
  };

  const handleDelete = async (id) => {
    const confirmado = await confirm('¿Está seguro de eliminar este registro de despacho? Se liberará el stock correspondiente del lote.');
    if (confirmado) {
      try {
        const response = await fetch(`/api/despachos/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar el despacho');
        }

        alert('Despacho eliminado correctamente.');
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <section id="tab-despachos" className="content-section" style={{ display: 'block' }}>
      
      {/* SECCIÓN INTERNA NAV */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', background: '#ffffff', borderRadius: '12px', padding: '6px', gap: '8px' }}>
        <button 
          onClick={() => setLocalSubTab('salidas')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            border: 'none', 
            borderRadius: '8px', 
            background: localSubTab === 'salidas' ? 'var(--color-admin)' : 'transparent', 
            color: localSubTab === 'salidas' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-dolly"></i>
          <span>Control Despachos</span>
        </button>
        <button 
          onClick={() => setLocalSubTab('transportes')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            border: 'none', 
            borderRadius: '8px', 
            background: localSubTab === 'transportes' ? 'var(--color-admin)' : 'transparent', 
            color: localSubTab === 'transportes' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-truck"></i>
          <span>Control Transportes</span>
        </button>
      </div>

      {/* SUB-SECCIÓN: SALIDAS / KARDEX */}
      {localSubTab === 'salidas' && (
        <div id="despachos-subtab-salidas">
          <div className="card table-container" style={{ borderRadius: '12px', padding: window.innerWidth <= 767 ? '16px' : '20px', marginTop: 0 }}>
            <div className="table-header-row" style={{ marginBottom: '16px' }}>
              <h3 className="card-title" style={{ marginBottom: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-export" style={{ color: 'var(--color-client)' }}></i>
                Kardex de Salida de Producto Terminado (CD-BPM-CPT-002)
              </h3>
            </div>
            
            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Lote Origen</th>
                    <th>Cliente / Destino</th>
                    <th>N° Guía Remisión</th>
                    <th>Fecha Prod.</th>
                    <th>Fecha Venc.</th>
                    <th>Cantidad</th>
                    <th>Peso Total (kg)</th>
                    <th>Temp. Carne</th>
                    <th>Responsable</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...despachos].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map((d) => {
                    const fFormat = d.fecha ? new Date(d.fecha).toLocaleString('es-PE', { hour12: false }) : '--';
                    const fProd = d.fechaProduccion ? new Date(d.fechaProduccion).toLocaleDateString() : '--';
                    const fVenc = d.fechaVencimiento ? new Date(d.fechaVencimiento).toLocaleDateString() : '--';
                    
                    return (
                      <tr key={d.id}>
                        <td data-label="Fecha y Hora" style={{ fontSize: '11.5px' }}>{fFormat}</td>
                        <td data-label="Lote Origen">
                          <span className="lote-tag" style={{ background: 'rgba(234, 88, 12, 0.05)', color: '#ea580c', borderColor: 'var(--color-client)' }}>
                            {d.loteCodigo}
                          </span>
                        </td>
                        <td data-label="Cliente / Destino"><strong>{d.cliente}</strong></td>
                        <td data-label="N° Guía Remisión"><span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{d.guiaRemision}</span></td>
                        <td data-label="Fecha Prod.">{fProd}</td>
                        <td data-label="Fecha Venc.">{fVenc}</td>
                        <td data-label="Cantidad" style={{ fontWeight: 600 }}>{d.cantidadCarcasas} unidades</td>
                        <td data-label="Peso Total (kg)" style={{ fontWeight: 700 }}>{parseFloat(d.pesoTotal).toFixed(2)} kg</td>
                        <td data-label="Temp. Carne" style={{ fontWeight: 700, color: parseFloat(d.temperaturaCarne) <= 7.0 ? 'var(--color-ops)' : '#ef4444' }}>
                          {parseFloat(d.temperaturaCarne).toFixed(1)} °C
                        </td>
                        <td data-label="Responsable" style={{ fontSize: '12px' }}>{d.responsable}</td>
                        <td data-label="Acciones" style={{ gap: '8px' }}>
                          <button 
                            onClick={() => handleEdit(d)} 
                            style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }} 
                            title="Editar"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button 
                            onClick={() => handleDelete(d.id)} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }} 
                            title="Eliminar"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {despachos.length === 0 && (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '36px' }}>
                        No se registran despachos de producto terminado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECCIÓN: TRANSPORTES */}
      {localSubTab === 'transportes' && (
        <div id="despachos-subtab-transportes">
          <div className="card table-container" style={{ borderRadius: '12px', padding: window.innerWidth <= 767 ? '16px' : '20px', marginTop: 0 }}>
            <div className="table-header-row" style={{ marginBottom: '16px' }}>
              <h3 className="card-title" style={{ marginBottom: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-truck-ramp-box" style={{ color: 'var(--color-client)' }}></i>
                Control de Higiene y Temperatura de Vehículos (CD-BPM-CPT-003)
              </h3>
            </div>
            
            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Lote Relacionado</th>
                    <th>Placa Vehículo</th>
                    <th>Conductor / Licencia</th>
                    <th>Higiene Furgón</th>
                    <th>Temp. Furgón</th>
                    <th>Hermeticidad</th>
                    <th>Fumigación</th>
                    <th>Apilamiento</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {despachos.map((d) => {
                    const t = d.transporte || {};
                    
                    return (
                      <tr key={d.id}>
                        <td data-label="Lote Relacionado">
                          <span className="lote-tag" style={{ background: 'rgba(234, 88, 12, 0.05)', color: '#ea580c', borderColor: 'var(--color-client)' }}>
                            {d.loteCodigo}
                          </span>
                        </td>
                        <td data-label="Placa Vehículo">
                          <span style={{ display: 'inline-block', background: '#fef08a', border: '1px solid #eab308', color: '#1e293b', fontFamily: 'monospace', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', letterSpacing: '0.05em' }}>
                            {t.placaVehiculo || '--'}
                          </span>
                        </td>
                        <td data-label="Conductor / Licencia">
                          <div><strong>{t.conductor || '--'}</strong></div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Lic: {t.licencia || '--'}</span>
                        </td>
                        <td data-label="Higiene Furgón">
                          {t.higieneFurgon === 'Conforme' ? (
                            <span className="badge badge-success"><i className="fa-solid fa-circle-check"></i> Conforme</span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)' }}><i className="fa-solid fa-circle-xmark"></i> No Conforme</span>
                          )}
                        </td>
                        <td data-label="Temp. Furgón" style={{ fontWeight: 700, color: 'var(--color-ops)', fontFamily: 'monospace' }}>
                          {t.temperaturaFurgon !== undefined ? `${parseFloat(t.temperaturaFurgon).toFixed(1)} °C` : '--'}
                        </td>
                        <td data-label="Hermeticidad">{t.hermeticidad ? 'Sí (Conforme)' : 'No'}</td>
                        <td data-label="Fumigación">{t.fumigacion ? 'Sí (Conforme)' : 'No'}</td>
                        <td data-label="Apilamiento">{t.apilamientoAdecuado ? 'Sí (Conforme)' : 'No'}</td>
                        <td data-label="Observaciones" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{t.observaciones || 'Sin observaciones'}</td>
                      </tr>
                    );
                  })}
                  {despachos.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '36px' }}>
                        No se registran transportes controlados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR SALIDA / DESPACHO */}
      {activeModal === 'despacho' && (
        <div id="modal-despacho" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '650px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-dolly" style={{ color: 'var(--color-client)' }}></i>
              {editingId ? 'Editar Despacho' : 'Registrar Salida / Despacho de Lote'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 767 ? '1fr 1fr' : '1fr', gap: '20px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                {/* Datos de Despacho */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-client)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-file-invoice-dollar"></i> Datos de Despacho
                  </h4>
                  
                  <div className="form-group">
                    <label className="form-label">Lote de Faenado</label>
                    <select 
                      className="form-control"
                      value={formData.loteCodigo}
                      onChange={(e) => setFormData({ ...formData, loteCodigo: e.target.value })}
                      disabled={!!editingId}
                      required
                    >
                      <option value="" disabled>Selecciona un lote...</option>
                      {lotesParaDespacho.map(l => (
                        <option key={l.id} value={l.lote_codigo}>{l.lote_codigo} - {l.ganadero_nombre}</option>
                      ))}
                    </select>
                    {formData.loteCodigo && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                        Stock disponible en cámara: {stockDisponible} carcasas
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cliente / Destino</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej. Carnicería Doris" 
                      value={formData.cliente}
                      onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Guía de Remisión</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej. GR-001-00251" 
                      value={formData.guiaRemision}
                      onChange={(e) => setFormData({ ...formData, guiaRemision: e.target.value })}
                      required 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Carcasas</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Cant." 
                        min="1" 
                        max={stockDisponible}
                        value={formData.cantidadCarcasas}
                        onChange={(e) => setFormData({ ...formData, cantidadCarcasas: e.target.value })}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Peso Total (kg)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Peso" 
                        step="0.01" 
                        min="1" 
                        value={formData.pesoTotal}
                        onChange={(e) => setFormData({ ...formData, pesoTotal: e.target.value })}
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temp. Carne (°C)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ej. 4.2" 
                      step="0.1" 
                      value={formData.temperaturaCarne}
                      onChange={(e) => setFormData({ ...formData, temperaturaCarne: e.target.value })}
                      required 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Fecha de Prod.</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={formData.fechaProduccion}
                        onChange={(e) => setFormData({ ...formData, fechaProduccion: e.target.value })}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha de Venc.</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={formData.fechaVencimiento}
                        onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                        required 
                      />
                    </div>
                  </div>
                </div>

                {/* Datos de Furgón / Transporte */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ops)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-truck"></i> Datos de Furgón / Transporte
                  </h4>
                  
                  <div className="form-group">
                    <label className="form-label">Placa de Vehículo</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej. A3F-820" 
                      value={formData.placaVehiculo}
                      onChange={(e) => setFormData({ ...formData, placaVehiculo: e.target.value.toUpperCase() })}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Conductor</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej. Pedro Mendoza" 
                      value={formData.conductor}
                      onChange={(e) => setFormData({ ...formData, conductor: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Licencia Conductor</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej. Q12345678" 
                      value={formData.licencia}
                      onChange={(e) => setFormData({ ...formData, licencia: e.target.value.toUpperCase() })}
                      required 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Temp. Furgón (°C)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="Ej. 3.0" 
                        step="0.1" 
                        value={formData.temperaturaFurgon}
                        onChange={(e) => setFormData({ ...formData, temperaturaFurgon: e.target.value })}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Higiene Furgón</label>
                      <select 
                        className="form-control"
                        value={formData.higieneFurgon}
                        onChange={(e) => setFormData({ ...formData, higieneFurgon: e.target.value })}
                        required
                      >
                        <option value="Conforme">Conforme</option>
                        <option value="No Conforme">No Conforme</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hermeticidad</label>
                    <select 
                      className="form-control"
                      value={formData.hermeticidad}
                      onChange={(e) => setFormData({ ...formData, hermeticidad: e.target.value })}
                      required
                    >
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Fumigación</label>
                      <select 
                        className="form-control"
                        value={formData.fumigacion}
                        onChange={(e) => setFormData({ ...formData, fumigacion: e.target.value })}
                        required
                      >
                        <option value="Sí">Sí (Conforme)</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Apilado/Colgado</label>
                      <select 
                        className="form-control"
                        value={formData.apilamientoAdecuado}
                        onChange={(e) => setFormData({ ...formData, apilamientoAdecuado: e.target.value })}
                        required
                      >
                        <option value="Sí">Sí (Conforme)</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones generales</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Detalles o anotaciones del despacho..." 
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Responsable (Firma)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Carlos Ruiz Rojas" 
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha y Hora de Carga</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={formData.fechaInput}
                    onChange={(e) => setFormData({ ...formData, fechaInput: e.target.value })}
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '20px', width: '100%', background: 'linear-gradient(135deg, var(--color-client), #ea580c)', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>{editingId ? 'Guardar Cambios' : 'Registrar Despacho'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Despachos;
