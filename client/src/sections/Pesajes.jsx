import React, { useState, useEffect, useRef } from 'react';

function Pesajes({ data, activeModal, setActiveModal, onRefresh, confirm }) {
  const { recepciones = [], pesajes = [] } = data;

  const [selectedLoteId, setSelectedLoteId] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Estados para simulación de balanza y formulario
  const [simulatedWeight, setSimulatedWeight] = useState('0.00');
  const [indicatorState, setIndicatorState] = useState('ESTABLE');
  const [isSimulating, setIsSimulating] = useState(false);
  const [formData, setFormData] = useState({
    peso: '',
    orejera: ''
  });

  const simInterval = useRef(null);

  // Obtener lotes activos (Pendiente Inspección o Inspeccionado)
  const lotesActivos = recepciones.filter(r => r.estado === 'Pendiente Inspección' || r.estado === 'Inspeccionado');

  const activeLote = recepciones.find(r => r.id === selectedLoteId);
  const pesajesLote = pesajes.filter(p => p.recepcion_id === selectedLoteId);

  // Limpiar estados al cambiar de lote
  useEffect(() => {
    cancelarEdicion();
    setSimulatedWeight('0.00');
    setIndicatorState('ESTABLE');
  }, [selectedLoteId]);

  // Cálculos estadísticos
  const totalCabezas = activeLote ? (parseInt(activeLote.cantidad) || 0) : 0;
  const cabezasPesadas = pesajesLote.length;
  const totalPeso = pesajesLote.reduce((acc, p) => acc + parseFloat(p.peso_pie_kg || 0), 0);
  const promedioPeso = cabezasPesadas > 0 ? (totalPeso / cabezasPesadas) : 0;
  const avancePorcentaje = totalCabezas > 0 ? Math.min(Math.round((cabezasPesadas / totalCabezas) * 100), 100) : 0;

  const pesos = pesajesLote.map(p => parseFloat(p.peso_pie_kg || 0));
  const pesoMin = pesos.length > 0 ? Math.min(...pesos) : 0;
  const pesoMax = pesos.length > 0 ? Math.max(...pesos) : 0;
  const restantes = Math.max(0, totalCabezas - cabezasPesadas);

  // Simulación de Balanza
  const simularPesoBalanza = () => {
    if (!selectedLoteId || !activeLote) {
      alert('Seleccione un lote antes de simular.');
      return;
    }
    if (isSimulating) return;

    setIsSimulating(true);
    setIndicatorState('INESTABLE');

    let pesoMin = 200.00;
    let pesoMax = 450.00;
    if (activeLote.especie === 'PO') {
      pesoMin = 80.00;
      pesoMax = 130.00;
    } else if (activeLote.especie === 'OV' || activeLote.especie === 'CA') {
      pesoMin = 30.00;
      pesoMax = 65.00;
    }

    const pesoFinal = (Math.random() * (pesoMax - pesoMin) + pesoMin).toFixed(2);
    
    let ticks = 0;
    if (simInterval.current) clearInterval(simInterval.current);

    simInterval.current = setInterval(() => {
      const pesoTemp = (Math.random() * (pesoMax - pesoMin) + pesoMin).toFixed(2);
      setSimulatedWeight(pesoTemp);
      ticks++;
      
      if (ticks > 8) {
        clearInterval(simInterval.current);
        setSimulatedWeight(pesoFinal);
        setIndicatorState('ESTABLE');
        setIsSimulating(false);
        setFormData(prev => ({ ...prev, peso: pesoFinal }));
      }
    }, 60);
  };

  useEffect(() => {
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, []);

  // Autogenerar código de orejera correlativo
  const autogenerarOrejera = () => {
    if (!selectedLoteId) {
      alert('Seleccione un lote primero.');
      return;
    }

    if (pesajesLote.length > 0) {
      // Ordenar por fecha para encontrar la última
      const pesajesOrdenados = [...pesajesLote].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      const ultimaOrejera = pesajesOrdenados[pesajesOrdenados.length - 1].correlativo_orejera;
      
      const match = ultimaOrejera.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const numberStr = match[2];
        const nextNumber = parseInt(numberStr) + 1;
        const paddedNumber = String(nextNumber).padStart(numberStr.length, '0');
        setFormData(prev => ({ ...prev, orejera: prefix + paddedNumber }));
      } else {
        setFormData(prev => ({ ...prev, orejera: ultimaOrejera + '-1' }));
      }
    } else {
      setFormData(prev => ({ ...prev, orejera: 'OR-1001' }));
    }
  };

  // Guardar pesaje
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLoteId) {
      alert('Seleccione un lote antes de registrar.');
      return;
    }

    const peso = parseFloat(formData.peso);
    const orejera = formData.orejera.trim().toUpperCase();

    if (isNaN(peso) || peso <= 0) {
      alert('Ingrese un peso válido.');
      return;
    }
    if (!orejera) {
      alert('Ingrese un código de orejera válido.');
      return;
    }

    // Verificar si se excede el límite declarado
    if (editingId === null) {
      if (pesajesLote.length >= totalCabezas) {
        const continuar = await confirm(`El lote ya tiene registradas todas las cabezas declaradas (${totalCabezas}). ¿Desea registrar un animal adicional?`);
        if (!continuar) return;
      }
    }

    const payload = {
      id: editingId || 'p-' + Date.now(),
      recepcion_id: selectedLoteId,
      correlativo_orejera: orejera,
      peso_pie_kg: peso
    };

    try {
      const url = editingId ? `/api/pesajes/${editingId}` : '/api/pesajes';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar el pesaje');
      }

      alert(editingId ? 'Pesaje modificado con éxito.' : 'Pesaje registrado con éxito.');
      cancelarEdicion();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      peso: p.peso_pie_kg,
      orejera: p.correlativo_orejera
    });
    setSimulatedWeight(parseFloat(p.peso_pie_kg).toFixed(2));
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setFormData({ peso: '', orejera: '' });
  };

  const handleDelete = async (id, orejera) => {
    const confirmado = await confirm(`¿Está seguro de eliminar el pesaje del animal con orejera "${orejera}"? Esta acción no se puede deshacer.`);
    if (confirmado) {
      try {
        const response = await fetch(`/api/pesajes/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar el pesaje');
        }

        alert('Pesaje eliminado correctamente.');
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <section id="tab-pesajes" className="content-section" style={{ display: 'block' }}>
      
      {/* CABECERA DE CONTROL DE LOTE */}
      <div className="card control-lote-header" style={{ padding: '24px', marginBottom: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 991 ? '320px 1fr' : '1fr', gap: '32px', alignItems: 'center' }}>
          
          {/* Selector de lote */}
          <div>
            <h4 className="card-title" style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <i className="fa-solid fa-layer-group" style={{ color: 'var(--color-ops)' }}></i> Seleccionar Lote Activo
            </h4>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select 
                className="form-control"
                value={selectedLoteId}
                onChange={(e) => setSelectedLoteId(e.target.value)}
              >
                <option value="">Selecciona un lote...</option>
                {lotesActivos.map(l => (
                  <option key={l.id} value={l.id}>{l.lote_codigo} - {l.ganadero_nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Panel de Datos del Lote (cuando está seleccionado) */}
          {selectedLoteId && activeLote ? (
            <div id="pesaje-resumen-lote" style={{ display: 'block' }}>
              <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 991 ? '1.2fr 1fr' : '1fr', gap: '24px' }}>
                {/* KPIs del Lote */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div className="kpi-mini-card">
                    <span className="kpi-label">Ganadero</span>
                    <span className="kpi-value">{activeLote.ganadero_nombre}</span>
                  </div>
                  <div className="kpi-mini-card">
                    <span className="kpi-label">Especie</span>
                    <span className="kpi-value">{activeLote.especie}</span>
                  </div>
                  <div className="kpi-mini-card">
                    <span className="kpi-label">Total Animales</span>
                    <span className="kpi-value">{totalCabezas} cabezas</span>
                  </div>
                  <div className="kpi-mini-card highlight">
                    <span className="kpi-label">Pesados</span>
                    <span className="kpi-value" style={{ color: 'var(--color-ops)' }}>{cabezasPesadas} cabezas</span>
                  </div>
                </div>

                {/* Progreso y Promedios */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: window.innerWidth > 991 ? '1px solid var(--border-color)' : 'none', paddingLeft: window.innerWidth > 991 ? '24px' : '0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <span className="kpi-label">Peso Promedio</span>
                      <span className="kpi-value-large">{promedioPeso.toFixed(2)} kg</span>
                    </div>
                    <div>
                      <span className="kpi-label">Peso Total Lote</span>
                      <span className="kpi-value-large" style={{ color: 'var(--color-admin)' }}>{totalPeso.toFixed(2)} kg</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContext: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', justifyContent: 'space-between' }}>
                      <span>PROGRESO DE PESAJE</span>
                      <span>{avancePorcentaje}%</span>
                    </div>
                    <div className="progress-bar-container" style={{ height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                      <div className="progress-bar-fill" style={{ width: `${avancePorcentaje}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div id="pesaje-header-placeholder" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <i className="fa-solid fa-circle-info" style={{ color: 'var(--color-admin)', marginRight: '6px' }}></i>
              Seleccione un lote activo de la lista para inicializar la estación de pesaje y cargar sus datos.
            </div>
          )}
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL: ESTACIÓN Y REGISTROS */}
      {selectedLoteId && activeLote ? (
        <div className="dashboard-grid" style={{ gridTemplateColumns: window.innerWidth > 991 ? '380px 1fr' : '1fr', gap: '24px' }}>
          
          {/* Columna Izquierda: Consola de Captura de Peso */}
          <div id="pesaje-captura-card" className="card console-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="card-title" style={{ fontSize: '15px', marginBottom: 0 }}>
                <i className="fa-solid fa-weight-scale" style={{ color: 'var(--color-client)' }}></i>
                Estación de Pesaje
              </h4>
              <span className="badge-status-online" id="balanza-status"><i className="fa-solid fa-circle"></i> CONECTADA</span>
            </div>

            {/* Balanza Display Virtual Premium */}
            <div className="modern-balanza-wrapper">
              <div className="modern-balanza-screen">
                <div className="screen-label">PESO NETO</div>
                <div className="screen-main-display">
                  <span className="glow-digits">{simulatedWeight}</span>
                  <span className="screen-unit">KG</span>
                </div>
                <div className="screen-footer">
                  <span>{indicatorState}</span>
                  <span className="zero-indicator">▶0◀</span>
                </div>
              </div>
              
              <button 
                type="button" 
                className="btn-simulate-balanza" 
                onClick={simularPesoBalanza}
                disabled={isSimulating}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i> Simular Captura de Balanza
              </button>
            </div>

            {/* Formulario de Registro */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Input de Peso */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Confirmar Peso Capturado (Kg)
                </label>
                <div style={{ position: 'relative' }}>
                  <i className="fa-solid fa-weight-hanging" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}></i>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0.00" 
                    min="5" 
                    max="3000" 
                    step="0.01" 
                    value={formData.peso}
                    onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                    style={{ paddingLeft: '40px', fontSize: '16px', fontWeight: 700, height: '44px' }} 
                    required 
                  />
                </div>
              </div>

              {/* Código de Orejera */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                  Código de Orejera (RFID / Metal)
                </label>
                <div style={{ position: 'relative' }}>
                  <i className="fa-solid fa-tag" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}></i>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. OR-1025" 
                    value={formData.orejera}
                    onChange={(e) => setFormData({ ...formData, orejera: e.target.value })}
                    style={{ paddingLeft: '40px', paddingRight: '70px', fontSize: '14px', fontWeight: 600, height: '44px', textTransform: 'uppercase' }} 
                    required 
                  />
                  <button 
                    type="button" 
                    className="btn-quick-tag" 
                    onClick={autogenerarOrejera} 
                    title="Generar correlativo sugerido" 
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 700, transition: 'var(--transition-fast)' }}
                  >
                    <i className="fa-solid fa-wand-magic-sparkles"></i> Auto
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-register-weight" style={{ width: '100%' }}>
                <i className="fa-solid fa-plus"></i> 
                <span>{editingId ? 'Guardar Cambios' : 'Registrar Pesada'}</span>
              </button>
              
              {editingId && (
                <button 
                  type="button" 
                  className="btn-cancel-weight" 
                  onClick={cancelarEdicion}
                  style={{ width: '100%', display: 'block', background: '#64748b', border: 'none', padding: '12px', borderRadius: '10px', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar Edición
                </button>
              )}
            </form>
          </div>

          {/* Columna Derecha: Tabla de Animales Pesados */}
          <div id="table-pesajes-ganado-container" className="table-container" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px' }}>
            <div className="table-header-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', flexDirection: window.innerWidth > 991 ? 'row' : 'column', gap: '16px' }}>
              <div>
                <h3 className="card-title" style={{ marginBottom: '4px', fontSize: '15px', fontWeight: 700 }}>
                  <i className="fa-solid fa-list-ol" style={{ color: 'var(--color-ops)', marginRight: '8px' }}></i>
                  Historial de Pesaje Individual en Pie
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Secuencia de animales pesados en esta sesión.</p>
              </div>
              
              {/* Session Stats summary */}
              <div className="session-stats-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="session-stat-item">
                  <span className="stat-lbl" style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Mínimo</span>
                  <span className="stat-val" style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>{pesoMin.toFixed(2)} kg</span>
                </div>
                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
                <div className="session-stat-item">
                  <span className="stat-lbl" style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Máximo</span>
                  <span className="stat-val" style={{ fontSize: '13px', fontWeight: 700, color: '#e11d48' }}>{pesoMax.toFixed(2)} kg</span>
                </div>
                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
                <div className="session-stat-item">
                  <span className="stat-lbl" style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Restantes</span>
                  <span className="stat-val" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>{restantes} cabezas</span>
                </div>
              </div>
            </div>
            
            <div className="table-responsive-wrapper" style={{ flex: 1, minHeight: '400px', background: '#ffffff' }}>
              <table className="table-responsive-cards" style={{ display: 'table' }}>
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>N° Animal</th>
                    <th>Orejera</th>
                    <th>Peso en Pie</th>
                    <th>Fecha y Hora</th>
                    <th style={{ width: '120px', textAlign: 'right', paddingRight: '24px' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pesajesLote].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map((p, index) => {
                    const fechaFormat = p.fecha ? new Date(p.fecha).toLocaleString('es-PE', { hour12: false }) : '--';

                    return (
                      <tr key={p.id}>
                        <td data-label="N° Animal"><span className="lote-tag" style={{ background: '#f1f5f9', color: '#475569' }}>#{index + 1}</span></td>
                        <td data-label="Orejera"><strong>{p.correlativo_orejera}</strong></td>
                        <td data-label="Peso en Pie" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{parseFloat(p.peso_pie_kg).toFixed(2)} kg</td>
                        <td data-label="Fecha y Hora">{fechaFormat}</td>
                        <td data-label="Acción" style={{ textAlign: 'right', paddingRight: '24px' }}>
                          <button 
                            onClick={() => handleEdit(p)} 
                            style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px', marginRight: '12px' }} 
                            title="Editar"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id, p.correlativo_orejera)} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }} 
                            title="Eliminar"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {pesajesLote.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-weight-scale" style={{ fontSize: '24px', color: 'var(--border-color)', marginBottom: '8px', display: 'block' }}></i>
                        No se han registrado pesadas para este lote todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div id="pesajes-default-message" className="card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '480px', width: '100%' }}>
          <div className="pulse-icon-container">
            <i className="fa-solid fa-weight-scale" style={{ fontSize: '56px', color: 'var(--color-client)' }}></i>
          </div>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Estación de Pesaje Inactiva</h3>
          <p style={{ fontSize: '14px', maxWidth: '400px', lineHeight: 1.6, marginBottom: '24px' }}>Seleccione un lote en el panel superior para activar la consola de pesaje digital y visualizar los registros individuales.</p>
        </div>
      )}
    </section>
  );
}

export default Pesajes;
