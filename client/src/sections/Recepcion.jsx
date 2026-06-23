import React, { useState, useEffect } from 'react';

function Recepcion({ data, activeModal, setActiveModal, onRefresh, confirm }) {
  const { recepciones = [], ganaderos = [], especies = [], metodosPago = [], cajas = [], tiposPago = [] } = data;

  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para el modal de Registro
  const [formData, setFormData] = useState({
    ganaderoId: '',
    especie: '',
    cantidad: '',
    guia: '',
    establo: '',
    observaciones: ''
  });

  // Estado para el modal de Cobro
  const [cobrarData, setCobrarData] = useState({
    reception: null,
    tarifa: 15.00,
    metodoPagoId: '',
    observaciones: ''
  });

  const getJulianDay = (date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    return String(day).padStart(3, '0');
  };

  const currentJulianDay = getJulianDay(new Date());

  // Limpiar campos de registro al abrir
  useEffect(() => {
    if (activeModal === 'recepcion') {
      setFormData({
        ganaderoId: ganaderos.length > 0 ? ganaderos[0].id : '',
        especie: especies.length > 0 ? especies[0].codigo : '',
        cantidad: '',
        guia: '',
        establo: '',
        observaciones: ''
      });
    }
  }, [activeModal, ganaderos, especies]);

  // Generar el código de lote preview en tiempo real
  const selectedGanadero = ganaderos.find(g => g.id === formData.ganaderoId);
  const selectedEspecie = especies.find(e => e.codigo === formData.especie);
  const lotePreviewCode = selectedGanadero && selectedEspecie 
    ? `${selectedGanadero.codigo.toUpperCase()}${selectedEspecie.codigo.toUpperCase()}${currentJulianDay}`
    : '--';

  // Filtrado de recepciones
  const filteredRecepciones = recepciones.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      r.lote_codigo.toLowerCase().includes(query) ||
      r.ganadero_nombre.toLowerCase().includes(query)
    );
  });

  // Métricas
  const hoyStr = new Date().toDateString();
  const ingresosHoy = recepciones.filter(r => new Date(r.fecha).toDateString() === hoyStr).length;
  const totalCabezas = recepciones.reduce((acc, curr) => acc + curr.cantidad, 0);

  // Guardar Ingreso de Lote
  const handleSaveIngreso = async (e) => {
    e.preventDefault();

    if (!formData.ganaderoId || !formData.especie || !formData.cantidad || !formData.guia || !formData.establo) {
      alert('Por favor, complete todos los campos obligatorios.');
      return;
    }

    const ganadero = ganaderos.find(g => g.id === formData.ganaderoId);
    if (!ganadero) return;

    const codigoLote = ganadero.codigo.toUpperCase() + formData.especie.toUpperCase() + currentJulianDay;

    if (recepciones.some(r => r.lote_codigo === codigoLote)) {
      alert(`El lote ${codigoLote} ya registra ingresos hoy.`);
    }

    const nuevoIngreso = {
      id: 'r-' + Date.now(),
      lote_codigo: codigoLote,
      ganadero_id: formData.ganaderoId,
      ganadero_nombre: ganadero.nombre,
      especie: formData.especie,
      cantidad: parseInt(formData.cantidad),
      guia_transito: formData.guia,
      registro_establo: formData.establo,
      fecha: new Date().toISOString(),
      observaciones: formData.observaciones || 'Sin observaciones adicionales.',
      estado: 'Pendiente Inspección',
      estadoCobro: 'Pendiente'
    };

    try {
      const response = await fetch('/api/recepciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoIngreso)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al registrar ingreso');
      }

      alert('Ingreso de ganado registrado con éxito');
      setActiveModal(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Dictaminar Lote (Liberar para pesaje)
  const handleDictaminar = async (r) => {
    const confirmado = await confirm(`¿Está seguro de dictaminar el lote "${r.lote_codigo}" como "Inspeccionado"? Esto liberará el lote para el pesaje en manga.`);
    if (confirmado) {
      try {
        const response = await fetch(`/api/recepciones/${r.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'Inspeccionado' })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al dictaminar lote');
        }

        alert('Lote dictaminado e inspeccionado con éxito.');
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Abrir modal de cobro
  const handleIniciarCobro = (r) => {
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    if (!cajaActiva) {
      alert('Debe aperturar la caja general antes de poder procesar cobros.');
      return;
    }

    let tarifaSugerida = 15.00;
    if (r.especie === 'VA') tarifaSugerida = 25.00;
    else if (r.especie === 'PO') tarifaSugerida = 15.00;
    else if (r.especie === 'OV' || r.especie === 'CA') tarifaSugerida = 10.00;

    setCobrarData({
      reception: r,
      tarifa: tarifaSugerida,
      metodoPagoId: metodosPago.length > 0 ? metodosPago[0].id : '',
      observaciones: ''
    });
    setActiveModal('cobrar');
  };

  // Procesar el cobro
  const handleProcesarCobro = async (e) => {
    e.preventDefault();
    const cajaActiva = cajas.find(c => c.estado === 'Abierta');
    if (!cajaActiva) {
      alert('La caja general se encuentra cerrada. Abra la caja antes de cobrar.');
      return;
    }

    const { reception, tarifa, metodoPagoId, observaciones } = cobrarData;
    if (!reception || !metodoPagoId) return;

    const mp = metodosPago.find(m => m.id === metodoPagoId);
    if (!mp) return;

    // Verificar si el método de pago es Crédito
    const esCredito = mp.tipo === 'tp-2' || mp.tipo === 'tp-5' || mp.tipo === 'Crédito' || 
      (tiposPago.find(t => t.id === mp.tipo) && tiposPago.find(t => t.id === mp.tipo).nombre === 'Crédito');

    const total = parseFloat(tarifa) * reception.cantidad;
    
    let concepto = esCredito
      ? `Cobro Faenamiento ${reception.lote_codigo} (${reception.cantidad} cab.) - ${reception.ganadero_nombre} (Al Crédito)`
      : `Cobro Faenamiento ${reception.lote_codigo} (${reception.cantidad} cab.) - ${reception.ganadero_nombre}`;

    const nuevoMov = {
      id: 'mov-' + Date.now(),
      fecha: new Date().toISOString(),
      tipo: 'Ingreso',
      monto: total,
      concepto: concepto,
      metodoPagoId: metodoPagoId,
      referencia: reception.lote_codigo
    };

    let nuevaDeuda = null;
    if (esCredito) {
      nuevaDeuda = {
        id: 'deuda-' + Date.now(),
        recepcionId: reception.id,
        lote_codigo: reception.lote_codigo,
        ganadero_id: reception.ganadero_id,
        ganadero_nombre: reception.ganadero_nombre,
        monto_total: total,
        monto_abonado: 0.00,
        saldo: total,
        fecha: new Date().toISOString(),
        estado: 'Pendiente'
      };
    }

    try {
      const response = await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recepcionId: reception.id,
          metodoId: metodoPagoId,
          total,
          obs: observaciones,
          esCredito,
          nuevaDeuda,
          nuevoMov
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el cobro');
      }

      alert(esCredito 
        ? `Servicio del lote ${reception.lote_codigo} registrado al crédito con éxito.`
        : `Servicio del lote ${reception.lote_codigo} cobrado exitosamente.`
      );
      setActiveModal(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Helper para obtener etiqueta de especie
  const getEspecieLabel = (especieCod) => {
    const e = especies.find(esp => esp.codigo === especieCod);
    return e ? `${e.icono} ${e.nombre}` : especieCod;
  };

  return (
    <section id="tab-recepcion" className="content-section" style={{ display: 'block' }}>
      
      {/* Estadísticas de Ingreso */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Ingresos de Hoy</div>
          <div className="stat-value">{ingresosHoy}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Cabezas Ingresadas</div>
          <div className="stat-value">{totalCabezas}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Día Juliano Actual</div>
          <div className="stat-value">{currentJulianDay}</div>
        </div>
      </div>

      {/* Tabla de Ingresos */}
      <div className="table-container">
        <div className="table-header-row" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div className="search-box" style={{ maxWidth: '320px', width: '100%', margin: '0' }}>
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Buscar por lote o ganadero..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="table-responsive-wrapper">
          <table className="table-responsive-cards">
            <thead>
              <tr>
                <th>Lote (Juliano)</th>
                <th>Ganadero</th>
                <th>Especie</th>
                <th>Cabezas</th>
                <th>N° Guía SENASA</th>
                <th>Establo Origen</th>
                <th>Fecha y Hora</th>
                <th>Cobro</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredRecepciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(r => {
                const fechaLegible = new Date(r.fecha).toLocaleString('es-PE', { 
                  day: '2-digit', month: '2-digit', year: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                });

                return (
                  <tr key={r.id}>
                    <td data-label="Lote (Juliano)">
                      <span className="lote-tag" style={{ borderColor: 'var(--color-client)', color: '#ea580c', background: 'rgba(234, 88, 12, 0.05)' }}>
                        {r.lote_codigo}
                      </span>
                    </td>
                    <td data-label="Ganadero"><strong>{r.ganadero_nombre}</strong></td>
                    <td data-label="Especie">{getEspecieLabel(r.especie)}</td>
                    <td data-label="Cabezas" style={{ fontWeight: 600 }}>{r.cantidad}</td>
                    <td data-label="N° Guía SENASA">{r.guia_transito}</td>
                    <td data-label="Establo Origen">
                      <span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-secondary)', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '11px' }}>
                        {r.registro_establo || 'N/A'}
                      </span>
                    </td>
                    <td data-label="Fecha y Hora" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fechaLegible}</td>
                    <td data-label="Cobro">
                      {r.estadoCobro === 'Cobrado' && (
                        <span className="badge badge-success" style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--color-ops)', border: '1px solid rgba(5, 150, 105, 0.15)' }}>
                          <i className="fa-solid fa-circle-check"></i> Cobrado
                        </span>
                      )}
                      {r.estadoCobro === 'A Crédito' && (
                        <span className="badge" style={{ background: 'rgba(234, 88, 12, 0.08)', color: '#ea580c', border: '1px solid rgba(234, 88, 12, 0.15)', padding: '4px 8px', fontSize: '11px', fontWeight: 600 }}>
                          <i className="fa-solid fa-receipt"></i> Al Crédito
                        </span>
                      )}
                      {r.estadoCobro !== 'Cobrado' && r.estadoCobro !== 'A Crédito' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          <span className="badge badge-pending" style={{ padding: '2px 6px', fontSize: '10px' }}>Pendiente</span>
                          <button 
                            onClick={() => handleIniciarCobro(r)} 
                            className="btn-primary" 
                            style={{ width: 'auto', padding: '4px 8px', fontSize: '11px', marginTop: 0, background: 'linear-gradient(135deg, var(--color-ops), #047857)', boxShadow: 'none' }}
                          >
                            <i className="fa-solid fa-file-invoice-dollar"></i> Cobrar
                          </button>
                        </div>
                      )}
                    </td>
                    <td data-label="Estado">
                      {r.estado === 'Pendiente Inspección' ? (
                        <span className="badge badge-pending">{r.estado}</span>
                      ) : (
                        <span className="badge badge-success">{r.estado}</span>
                      )}
                    </td>
                    <td data-label="Acción">
                      {r.estado === 'Pendiente Inspección' ? (
                        <button 
                          onClick={() => handleDictaminar(r)} 
                          className="btn-primary" 
                          style={{ width: 'auto', padding: '4px 8px', fontSize: '11px', marginTop: 0, background: 'linear-gradient(135deg, var(--color-admin), #ea580c)', boxShadow: 'none' }}
                        >
                          <i className="fa-solid fa-file-medical"></i> Dictaminar
                        </button>
                      ) : (
                        <span className="badge badge-success" style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--color-ops)', border: '1px solid rgba(5, 150, 105, 0.15)' }}>
                          <i className="fa-solid fa-check"></i> Listo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRecepciones.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No se encontraron ingresos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Flotante: Registro de Ingreso */}
      {activeModal === 'recepcion' && (
        <div id="modal-recepcion" className="form-modal-overlay active">
          <div className="form-modal-card">
            <button className="btn-modal-close" onClick={() => setActiveModal(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2 className="card-title">
              <i className="fa-solid fa-circle-plus" style={{ color: 'var(--color-ops)' }}></i>
              Registrar Ingreso de Ganado
            </h2>
            
            <form onSubmit={handleSaveIngreso}>
              <div className="form-group">
                <label className="form-label">Seleccionar Ganadero</label>
                <select 
                  className="form-control"
                  value={formData.ganaderoId}
                  onChange={(e) => setFormData({ ...formData, ganaderoId: e.target.value })}
                  required
                >
                  {ganaderos.map(g => (
                    <option key={g.id} value={g.id}>{g.nombre} ({g.codigo})</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Tipo de Ganado (Especie)</label>
                <select 
                  className="form-control"
                  value={formData.especie}
                  onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
                  required
                >
                  {especies.map(e => (
                    <option key={e.id} value={e.codigo}>{e.icono} {e.nombre} ({e.codigo})</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Cantidad de Cabezas</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Ej. 15" 
                  min="1" 
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">N° Guía de Tránsito (SENASA)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. GT-0023456" 
                  value={formData.guia}
                  onChange={(e) => setFormData({ ...formData, guia: e.target.value })}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">N° Registro del Establo (SENASA)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. EST-PE-10294" 
                  value={formData.establo}
                  onChange={(e) => setFormData({ ...formData, establo: e.target.value })}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Observaciones Ante-Mortem</label>
                <textarea 
                  className="form-control" 
                  placeholder="Ej. Animales sin síntomas de enfermedad clínica visible." 
                  rows="3"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                ></textarea>
              </div>
              
              {/* Preview del Lote Juliano generado en tiempo real */}
              <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <span className="form-label" style={{ marginBottom: '4px' }}>Código de Lote a Generar (Juliano):</span>
                <span id="lote-preview-code" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 700, color: 'var(--color-client)' }}>
                  {lotePreviewCode}
                </span>
              </div>
              
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: 'linear-gradient(135deg, var(--color-ops), #047857)', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.2)' }}>
                  <i className="fa-solid fa-truck-ramp-box"></i> Guardar Lote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Flotante: Cobrar Servicio */}
      {activeModal === 'cobrar' && cobrarData.reception && (
        <div id="modal-cobrar" className="form-modal-overlay active">
          <div className="form-modal-card">
            <button className="btn-modal-close" onClick={() => setActiveModal(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2 className="card-title" style={{ color: 'var(--color-ops)' }}>
              <i className="fa-solid fa-file-invoice-dollar" style={{ color: 'var(--color-ops)' }}></i>
              Cobrar Servicio de Faenamiento
            </h2>
            
            <form onSubmit={handleProcesarCobro}>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>Lote:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{cobrarData.reception.lote_codigo}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>Ganadero:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{cobrarData.reception.ganadero_nombre}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>Especie:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{getEspecieLabel(cobrarData.reception.especie)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>Cantidad Cabezas:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{cobrarData.reception.cantidad}</strong>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tarifa por Cabeza (S/.)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Ej. 15.00" 
                  min="0" 
                  step="0.50" 
                  value={cobrarData.tarifa}
                  onChange={(e) => setCobrarData({ ...cobrarData, tarifa: parseFloat(e.target.value) || 0 })}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Monto Total a Cobrar (S/.)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="0.00" 
                  value={(cobrarData.tarifa * cobrarData.reception.cantidad).toFixed(2)}
                  readOnly 
                  style={{ background: '#e2e8f0', fontWeight: 700, color: '#0f172a' }} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                <select 
                  className="form-control"
                  value={cobrarData.metodoPagoId}
                  onChange={(e) => setCobrarData({ ...cobrarData, metodoPagoId: e.target.value })}
                  required
                >
                  {metodosPago.map(mp => (
                    <option key={mp.id} value={mp.id}>{mp.nombre} ({mp.tipo})</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Observaciones / Operación (Opcional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Trans. N° 4589254" 
                  value={cobrarData.observaciones}
                  onChange={(e) => setCobrarData({ ...cobrarData, observaciones: e.target.value })}
                />
              </div>
              
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: 'linear-gradient(135deg, var(--color-ops), #047857)', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.25)' }}>
                  <i className="fa-solid fa-check"></i> <span>Confirmar Cobro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Recepcion;
