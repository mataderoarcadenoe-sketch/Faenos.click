import React, { useState, useEffect, useRef } from 'react';

function Calidad({ data, activeModal, setActiveModal, onRefresh, confirm }) {
  const { 
    camaras = [], 
    temperaturas = [], 
    productosNoConformes = [], 
    controlCloro = [], 
    registrosHigiene = [], 
    recepciones = [] 
  } = data;

  const [localSubTab, setLocalSubTab] = useState('camaras'); // 'camaras', 'no-conformes', 'cloro', 'higiene-poes'
  const [editingId, setEditingId] = useState(null);

  // SIMULACIÓN DE TEMPERATURAS EN TIEMPO REAL (IoT)
  const [liveTemps, setLiveTemps] = useState({});
  const intervalRef = useRef(null);

  useEffect(() => {
    // Inicializar temperaturas live basadas en la última lectura o valor por defecto
    const initialTemps = {};
    camaras.forEach(c => {
      const tempsCamara = temperaturas.filter(t => t.camaraId === c.id);
      if (tempsCamara.length > 0) {
        initialTemps[c.id] = parseFloat(tempsCamara[tempsCamara.length - 1].temperatura);
      } else {
        initialTemps[c.id] = (parseFloat(c.temperaturaMin) + parseFloat(c.temperaturaMax)) / 2;
      }
    });
    setLiveTemps(initialTemps);

    // Intervalo de simulación cada 5 segundos
    intervalRef.current = setInterval(() => {
      setLiveTemps(prev => {
        const next = { ...prev };
        camaras.forEach(c => {
          let curr = next[c.id];
          if (curr === undefined) {
            curr = (parseFloat(c.temperaturaMin) + parseFloat(c.temperaturaMax)) / 2;
          }
          
          // 2% de probabilidad de tener una alerta/desviación
          if (Math.random() < 0.02) {
            next[c.id] = parseFloat(c.temperaturaMax) + 1.20; 
          } else {
            // Oscilación natural
            const delta = (Math.random() - 0.5) * 0.4;
            let tempNueva = curr + delta;
            if (tempNueva > 6) tempNueva -= 0.8;
            if (tempNueva < -2) tempNueva += 0.8;
            next[c.id] = parseFloat(tempNueva.toFixed(2));
          }
        });
        return next;
      });
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [camaras, temperaturas]);

  // Formulario Cámara
  const [camaraForm, setCamaraForm] = useState({
    nombre: '',
    temperaturaMin: '0.00',
    temperaturaMax: '4.00'
  });

  // Formulario Lectura Temperatura Manual
  const [tempManualForm, setTempManualForm] = useState({
    camaraId: '',
    temperatura: '',
    responsable: 'Admin Doris'
  });

  // Formulario PNC
  const [pncForm, setPncForm] = useState({
    loteCodigo: '',
    origenFase: 'Cámara de Frío',
    detalles: '',
    accionCorrectiva: '',
    responsable: 'Admin Doris',
    estado: 'Abierto'
  });

  // Formulario Cloro
  const [cloroForm, setCloroForm] = useState({
    fecha: '',
    hora: '',
    punto_muestreo: 'Sala de Faena',
    cloro_residual: '',
    observaciones: '',
    responsable: 'Admin Doris'
  });

  // Formulario Higiene POES
  const [higieneForm, setHigieneForm] = useState({
    tipoElemento: 'Equipos',
    nombreItem: '',
    frecuencia: 'Diario',
    limpiezaEstado: 'Conforme',
    desinfectanteUsado: 'Cloro residual',
    concentracionPpm: '200',
    responsable: 'Admin Doris'
  });

  // Efectos de inicialización al abrir modales
  useEffect(() => {
    if (activeModal === 'config-animales' || activeModal === 'camara') { // Modal Nueva Cámara
      setCamaraForm({ nombre: '', temperaturaMin: '0.00', temperaturaMax: '4.00' });
    } else if (activeModal === 'lectura-temp') {
      setTempManualForm({
        camaraId: camaras.length > 0 ? camaras[0].id : '',
        temperatura: '',
        responsable: 'Admin Doris'
      });
    } else if (activeModal === 'cloro') {
      const now = new Date();
      setCloroForm({
        fecha: now.toISOString().slice(0, 10),
        hora: now.toLocaleTimeString('es-PE', { hour12: false }).slice(0, 5),
        punto_muestreo: 'Sala de Faena',
        cloro_residual: '',
        observaciones: '',
        responsable: 'Admin Doris'
      });
    } else if (activeModal === 'higiene') {
      setHigieneForm({
        tipoElemento: 'Equipos',
        nombreItem: '',
        frecuencia: 'Diario',
        limpiezaEstado: 'Conforme',
        desinfectanteUsado: 'Cloro residual',
        concentracionPpm: '200',
        responsable: 'Admin Doris'
      });
    }
  }, [activeModal, camaras]);

  // Guardar Cámara
  const handleSaveCamara = async (e) => {
    e.preventDefault();
    const payload = {
      id: 'camara-' + Date.now(),
      nombre: camaraForm.nombre.trim(),
      temperaturaMin: parseFloat(camaraForm.temperaturaMin),
      temperaturaMax: parseFloat(camaraForm.temperaturaMax)
    };

    try {
      const response = await fetch('/api/camaras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la cámara');
      }
      alert('Cámara frigorífica registrada correctamente.');
      setActiveModal(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Guardar Lectura de Temperatura Manual
  const handleSaveTempManual = async (e) => {
    e.preventDefault();
    const cam = camaras.find(c => c.id === tempManualForm.camaraId);
    if (!cam) return;

    const temp = parseFloat(tempManualForm.temperatura);
    const desviacion = temp < parseFloat(cam.temperaturaMin) || temp > parseFloat(cam.temperaturaMax);

    if (desviacion) {
      alert(`⚠️ LÍMITE CRÍTICO EXCEDIDO: Cámara "${cam.nombre}" a ${temp.toFixed(2)} °C.`);
    }

    const payload = {
      id: 'temp-' + Date.now(),
      fecha: new Date().toISOString(),
      camaraId: tempManualForm.camaraId,
      camaraNombre: cam.nombre,
      temperatura: temp,
      desviacion,
      responsable: tempManualForm.responsable
    };

    try {
      const response = await fetch('/api/temperaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar temperatura');
      }
      alert('Medición de temperatura registrada correctamente.');
      setActiveModal(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Guardar PNC (Producto No Conforme)
  const handleSavePnc = async (e) => {
    e.preventDefault();
    const payload = {
      id: editingId || 'pnc-' + Date.now(),
      fecha: new Date().toISOString(),
      loteCodigo: pncForm.loteCodigo,
      origenFase: pncForm.origenFase,
      detalles: pncForm.detalles,
      accionCorrectiva: pncForm.accionCorrectiva,
      responsable: pncForm.responsable,
      estado: pncForm.estado
    };

    try {
      const url = editingId ? `/api/pnc/${editingId}` : '/api/pnc';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar PNC');
      }
      alert('Producto No Conforme registrado/modificado correctamente.');
      setActiveModal(null);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Iniciar edición de PNC
  const handleEditPnc = (p) => {
    setEditingId(p.id);
    setPncForm({
      loteCodigo: p.loteCodigo,
      origenFase: p.origenFase,
      detalles: p.detalles,
      accionCorrectiva: p.accionCorrectiva || '',
      responsable: p.responsable,
      estado: p.estado
    });
    setActiveModal('pnc');
  };

  // Guardar Cloro Residual
  const handleSaveCloro = async (e) => {
    e.preventDefault();
    const cloro = parseFloat(cloroForm.cloro_residual);
    const desviacion = cloro < 0.5 || cloro > 1.5;

    if (desviacion) {
      alert(`⚠️ CONTROL DE CLORO EXCEDIDO: Valor de ${cloro.toFixed(2)} ppm fuera del rango seguro (0.5 a 1.5 ppm).`);
    }

    const payload = {
      id: editingId || 'cloro-' + Date.now(),
      fecha: cloroForm.fecha,
      hora: cloroForm.hora,
      punto_muestreo: cloroForm.punto_muestreo,
      cloro_residual: cloro,
      desviacion,
      observaciones: cloroForm.observaciones,
      responsable: cloroForm.responsable
    };

    try {
      const url = editingId ? `/api/control-cloro/${editingId}` : '/api/control-cloro';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar cloro');
      }
      alert('Medición de cloro registrada correctamente.');
      setActiveModal(null);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditCloro = (c) => {
    setEditingId(c.id);
    setCloroForm({
      fecha: c.fecha.slice(0, 10),
      hora: c.hora,
      punto_muestreo: c.punto_muestreo,
      cloro_residual: c.cloro_residual,
      observaciones: c.observaciones || '',
      responsable: c.responsable
    });
    setActiveModal('cloro');
  };

  // Guardar Higiene POES
  const handleSaveHigiene = async (e) => {
    e.preventDefault();
    const payload = {
      id: editingId || 'higiene-' + Date.now(),
      fecha: new Date().toISOString(),
      tipoElemento: higieneForm.tipoElemento,
      nombreItem: higieneForm.nombreItem,
      frecuencia: higieneForm.frecuencia,
      limpiezaEstado: higieneForm.limpiezaEstado,
      desinfectanteUsado: higieneForm.desinfectanteUsado,
      concentracionPpm: parseFloat(higieneForm.concentracionPpm || 0),
      responsable: higieneForm.responsable
    };

    try {
      const url = editingId ? `/api/higiene/${editingId}` : '/api/higiene';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar higiene');
      }
      alert('Verificación de higiene POES guardada correctamente.');
      setActiveModal(null);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditHigiene = (h) => {
    setEditingId(h.id);
    setHigieneForm({
      tipoElemento: h.tipoElemento,
      nombreItem: h.nombreItem,
      frecuencia: h.frecuencia,
      limpiezaEstado: h.limpiezaEstado,
      desinfectanteUsado: h.desinfectanteUsado || '',
      concentracionPpm: h.concentracionPpm || '',
      responsable: h.responsable
    });
    setActiveModal('higiene');
  };

  // Borrar registros genéricos
  const handleDeleteItem = async (endpoint, id) => {
    const confirmado = await confirm('¿Está seguro de eliminar esta medición/registro de calidad?');
    if (confirmado) {
      try {
        const response = await fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al eliminar');
        }
        alert('Registro eliminado correctamente.');
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <section id="tab-calidad" className="content-section" style={{ display: 'block' }}>
      
      {/* MENÚ SUBTABS INTERNO */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', background: '#ffffff', borderRadius: '12px', padding: '6px', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'camaras', label: 'Cámaras Frías', icon: 'fa-temperature-half' },
          { id: 'no-conformes', label: 'No Conformidades', icon: 'fa-triangle-exclamation' },
          { id: 'cloro', label: 'Control de Agua', icon: 'fa-faucet-drip' },
          { id: 'higiene-poes', label: 'Higiene (POES)', icon: 'fa-soap' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setLocalSubTab(tab.id)}
            style={{ 
              flex: 1, 
              minWidth: '130px',
              padding: '12px', 
              border: 'none', 
              borderRadius: '8px', 
              background: localSubTab === tab.id ? 'var(--color-admin)' : 'transparent', 
              color: localSubTab === tab.id ? 'white' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'var(--transition-fast)'
            }}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SUBPESTAÑA 1: CÁMARAS FRIGORÍFICAS */}
      {localSubTab === 'camaras' && (
        <div id="calidad-subtab-camaras">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 className="card-title" style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-temperature-half" style={{ color: 'var(--color-client)' }}></i>
              Monitoreo Continuo de Cámaras Frigoríficas (PCC N° 1)
            </h3>
            <div style={{ display: 'flex', gap: '10px', width: window.innerWidth <= 767 ? '100%' : 'auto' }}>
              <button 
                onClick={() => setActiveModal('lectura-temp')} 
                className="btn-secondary" 
                style={{ flex: 1, padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
              >
                <i className="fa-solid fa-plus"></i> Manual
              </button>
              <button 
                onClick={() => setActiveModal('camara')} 
                className="btn-primary" 
                style={{ flex: 1, padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, var(--color-client), #ea580c)', marginTop: 0, justifyContent: 'center' }}
              >
                <i className="fa-solid fa-plus"></i> Cámara
              </button>
            </div>
          </div>
          
          {/* Grid de Cámaras Frías */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
            {camaras.map(c => {
              const tempValue = liveTemps[c.id] !== undefined ? liveTemps[c.id] : 0;
              const isDesviado = tempValue < parseFloat(c.temperaturaMin) || tempValue > parseFloat(c.temperaturaMax);
              const tempColor = isDesviado ? '#ef4444' : '#2563eb';
              const tempBg = isDesviado ? 'rgba(239, 68, 68, 0.05)' : 'rgba(59, 130, 246, 0.05)';
              
              return (
                <div key={c.id} className="card" style={{ padding: '20px', border: `1px solid ${isDesviado ? '#fca5a5' : 'var(--border-color)'}`, borderRadius: '16px', background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <strong>{c.nombre}</strong>
                    {isDesviado ? (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)', fontSize: '10.5px' }}>⚠️ Alerta HACCP</span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--color-ops)', border: '1px solid rgba(5, 150, 105, 0.15)', fontSize: '10.5px' }}>Conforme</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: tempBg, padding: '12px', borderRadius: '12px', border: `1px solid ${isDesviado ? '#fecaca' : '#bfdbfe'}`, marginBottom: '14px' }}>
                    <i className="fa-solid fa-snowflake" style={{ color: tempColor, fontSize: '24px' }}></i>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Temperatura actual</span>
                      <strong style={{ fontSize: '20px', color: tempColor, fontFamily: 'monospace', display: 'block' }}>{tempValue.toFixed(2)} °C</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div>Límites seguros: {parseFloat(c.temperaturaMin).toFixed(1)} °C a {parseFloat(c.temperaturaMax).toFixed(1)} °C</div>
                    <div style={{ marginTop: '4px' }}>Control Crítico: PCC N° 1 (Almacenamiento)</div>
                  </div>
                </div>
              );
            })}
            {camaras.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No se registran cámaras de frío configuradas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBPESTAÑA 2: PRODUCTOS NO CONFORMES */}
      {localSubTab === 'no-conformes' && (
        <div id="calidad-subtab-no-conformes">
          <div className="card table-container" style={{ borderRadius: '12px', padding: window.innerWidth <= 767 ? '16px' : '20px', marginTop: 0 }}>
            <div className="table-header-row" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }}></i>
                Registro de Productos No Conformes (Formatos PNC-001)
              </h3>
              <button 
                onClick={() => {
                  setEditingId(null);
                  setPncForm({
                    loteCodigo: recepciones.length > 0 ? recepciones[0].lote_codigo : '',
                    origenFase: 'Cámara de Frío',
                    detalles: '',
                    accionCorrectiva: '',
                    responsable: 'Admin Doris',
                    estado: 'Abierto'
                  });
                  setActiveModal('pnc');
                }} 
                className="btn-primary" 
                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: '#ef4444', marginTop: 0, width: window.innerWidth <= 767 ? '100%' : 'auto', justifyContent: 'center' }}
              >
                <i className="fa-solid fa-plus"></i> Registrar No Conformidad
              </button>
            </div>
            
            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Fecha Detección</th>
                    <th>Lote Afectado</th>
                    <th>Origen / Fase</th>
                    <th>Detalles de Desviación</th>
                    <th>Acción Correctiva</th>
                    <th>Responsable</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...productosNoConformes].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map(p => (
                    <tr key={p.id}>
                      <td data-label="Fecha Detección" style={{ fontSize: '11.5px' }}>{new Date(p.fecha).toLocaleString()}</td>
                      <td data-label="Lote Afectado">
                        <span className="lote-tag" style={{ background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', borderColor: '#fca5a5' }}>
                          {p.loteCodigo}
                        </span>
                      </td>
                      <td data-label="Origen / Fase"><strong>{p.origenFase}</strong></td>
                      <td data-label="Detalles de Desviación" style={{ fontSize: '12px' }}>{p.detalles}</td>
                      <td data-label="Acción Correctiva" style={{ fontSize: '12px', color: 'var(--color-ops)' }}>{p.accionCorrectiva || '--'}</td>
                      <td data-label="Responsable">{p.responsable}</td>
                      <td data-label="Estado">
                        {p.estado === 'Cerrado' ? (
                          <span className="badge badge-success">Cerrado</span>
                        ) : (
                          <span className="badge badge-pending">Abierto</span>
                        )}
                      </td>
                      <td data-label="Acciones" style={{ gap: '8px' }}>
                        <button 
                          onClick={() => handleEditPnc(p)} 
                          style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px' }} 
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteItem('pnc', p.id)} 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }} 
                          title="Eliminar"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {productosNoConformes.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '36px' }}>
                        No se registran no conformidades reportadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBPESTAÑA 3: CONTROL DE CLORO RESIDUAL */}
      {localSubTab === 'cloro' && (
        <div id="calidad-subtab-cloro">
          <div className="card table-container" style={{ borderRadius: '12px', padding: window.innerWidth <= 767 ? '16px' : '20px', marginTop: 0 }}>
            <div className="table-header-row" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-faucet-drip" style={{ color: 'var(--color-client)' }}></i>
                Registro Diario de Cloro Residual en Agua Potable (CD-POES-CA-001)
              </h3>
              <button 
                onClick={() => {
                  setEditingId(null);
                  setActiveModal('cloro');
                }} 
                className="btn-primary" 
                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-client)', marginTop: 0, width: window.innerWidth <= 767 ? '100%' : 'auto', justifyContent: 'center' }}
              >
                <i className="fa-solid fa-plus"></i> Registrar Medición
              </button>
            </div>
            
            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Punto de Muestreo</th>
                    <th>Cloro Residual (ppm)</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                    <th>Responsable</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...controlCloro].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map(c => (
                    <tr key={c.id}>
                      <td data-label="Fecha">{new Date(c.fecha + 'T00:00:00').toLocaleDateString()}</td>
                      <td data-label="Hora" style={{ fontFamily: 'monospace' }}>{c.hora}</td>
                      <td data-label="Punto de Muestreo"><strong>{c.punto_muestreo}</strong></td>
                      <td data-label="Cloro Residual (ppm)" style={{ fontWeight: 700, color: c.desviacion ? '#ef4444' : 'var(--color-ops)' }}>
                        {parseFloat(c.cloro_residual).toFixed(2)} ppm
                      </td>
                      <td data-label="Estado">
                        {c.desviacion ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)' }}>⚠️ Desviado</span>
                        ) : (
                          <span className="badge badge-success">Seguro</span>
                        )}
                      </td>
                      <td data-label="Observaciones" style={{ fontSize: '12px' }}>{c.observaciones || 'Conforme'}</td>
                      <td data-label="Responsable">{c.responsable}</td>
                      <td data-label="Acciones" style={{ gap: '8px' }}>
                        <button 
                          onClick={() => handleEditCloro(c)} 
                          style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px' }} 
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteItem('control-cloro', c.id)} 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }} 
                          title="Eliminar"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {controlCloro.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '36px' }}>
                        No se registran mediciones de cloro residual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBPESTAÑA 4: HIGIENE Y POES */}
      {localSubTab === 'higiene-poes' && (
        <div id="calidad-subtab-higiene-poes">
          <div className="card table-container" style={{ borderRadius: '12px', padding: window.innerWidth <= 767 ? '16px' : '20px', marginTop: 0 }}>
            <div className="table-header-row" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-soap" style={{ color: 'var(--color-ops)' }}></i>
                Bitácora de Higiene y Saneamiento POES (Formatos LDISHV-001)
              </h3>
              <button 
                onClick={() => {
                  setEditingId(null);
                  setActiveModal('higiene');
                }} 
                className="btn-primary" 
                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-ops)', marginTop: 0, width: window.innerWidth <= 767 ? '100%' : 'auto', justifyContent: 'center' }}
              >
                <i className="fa-solid fa-plus"></i> Registrar Higiene
              </button>
            </div>
            
            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Tipo Elemento</th>
                    <th>Nombre Ítem</th>
                    <th>Frecuencia</th>
                    <th>Estado Limpieza</th>
                    <th>Desinfectante</th>
                    <th>Concentración (ppm)</th>
                    <th>Responsable</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...registrosHigiene].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map(h => (
                    <tr key={h.id}>
                      <td data-label="Fecha y Hora" style={{ fontSize: '11.5px' }}>{new Date(h.fecha).toLocaleString()}</td>
                      <td data-label="Tipo Elemento"><strong>{h.tipoElemento}</strong></td>
                      <td data-label="Nombre Ítem">{h.nombreItem}</td>
                      <td data-label="Frecuencia"><span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-secondary)', border: '1px solid #e2e8f0' }}>{h.frecuencia}</span></td>
                      <td data-label="Estado Limpieza">
                        {h.limpiezaEstado === 'Conforme' ? (
                          <span className="badge badge-success"><i className="fa-solid fa-circle-check"></i> Conforme</span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)' }}><i className="fa-solid fa-circle-xmark"></i> Sucio</span>
                        )}
                      </td>
                      <td data-label="Desinfectante">{h.desinfectanteUsado || '--'}</td>
                      <td data-label="Concentración (ppm)" style={{ fontFamily: 'monospace' }}>{h.concentracionPpm ? `${h.concentracionPpm} ppm` : '--'}</td>
                      <td data-label="Responsable">{h.responsable}</td>
                      <td data-label="Acciones" style={{ gap: '8px' }}>
                        <button 
                          onClick={() => handleEditHigiene(h)} 
                          style={{ background: 'none', border: 'none', color: 'var(--color-admin)', cursor: 'pointer', fontSize: '15px' }} 
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteItem('higiene', h.id)} 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }} 
                          title="Eliminar"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {registrosHigiene.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '36px' }}>
                        No se registran inspecciones POES de higiene.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA CÁMARA */}
      {activeModal === 'camara' && (
        <div id="modal-camara" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '450px' }}>
            <button className="btn-modal-close" onClick={() => setActiveModal(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">Nueva Cámara Frigorífica</h2>
            <form onSubmit={handleSaveCamara}>
              <div className="form-group">
                <label className="form-label">Nombre de la Cámara</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Cámara de Vacunos 02" 
                  value={camaraForm.nombre}
                  onChange={(e) => setCamaraForm({ ...camaraForm, nombre: e.target.value })}
                  required 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Temp. Mínima (°C)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0.00" 
                    step="0.5" 
                    value={camaraForm.temperaturaMin}
                    onChange={(e) => setCamaraForm({ ...camaraForm, temperaturaMin: e.target.value })}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Temp. Máxima (°C)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="4.00" 
                    step="0.5" 
                    value={camaraForm.temperaturaMax}
                    onChange={(e) => setCamaraForm({ ...camaraForm, temperaturaMax: e.target.value })}
                    required 
                  />
                </div>
              </div>
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: 'linear-gradient(135deg, var(--color-client), #ea580c)' }}>
                  <i className="fa-solid fa-check"></i> Registrar Cámara
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LECTURA TEMP MANUAL */}
      {activeModal === 'lectura-temp' && (
        <div id="modal-lectura-temp" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '400px' }}>
            <button className="btn-modal-close" onClick={() => setActiveModal(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">Registrar Lectura Manual</h2>
            <form onSubmit={handleSaveTempManual}>
              <div className="form-group">
                <label className="form-label">Seleccionar Cámara</label>
                <select 
                  className="form-control"
                  value={tempManualForm.camaraId}
                  onChange={(e) => setTempManualForm({ ...tempManualForm, camaraId: e.target.value })}
                  required
                >
                  {camaras.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Temperatura Medida (°C)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Ej. 3.5" 
                  step="0.01" 
                  value={tempManualForm.temperatura}
                  onChange={(e) => setTempManualForm({ ...tempManualForm, temperatura: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Responsable del Registro</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={tempManualForm.responsable}
                  onChange={(e) => setTempManualForm({ ...tempManualForm, responsable: e.target.value })}
                  required 
                />
              </div>
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: 'linear-gradient(135deg, var(--color-client), #ea580c)' }}>
                  <i className="fa-solid fa-check"></i> Registrar Medición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PNC */}
      {activeModal === 'pnc' && (
        <div id="modal-pnc" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '500px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title" style={{ color: '#ef4444' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }}></i>
              {editingId ? 'Editar No Conformidad' : 'Registrar Producto No Conforme'}
            </h2>
            <form onSubmit={handleSavePnc}>
              <div className="form-group">
                <label className="form-label">Lote Afectado</label>
                <select 
                  className="form-control"
                  value={pncForm.loteCodigo}
                  onChange={(e) => setPncForm({ ...pncForm, loteCodigo: e.target.value })}
                  required
                >
                  <option value="" disabled>Selecciona el lote...</option>
                  {recepciones.map(r => (
                    <option key={r.id} value={r.lote_codigo}>{r.lote_codigo} - {r.ganadero_nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Origen / Fase de Detección</label>
                <select 
                  className="form-control"
                  value={pncForm.origenFase}
                  onChange={(e) => setPncForm({ ...pncForm, origenFase: e.target.value })}
                  required
                >
                  <option value="Cámara de Frío">Cámara de Frío</option>
                  <option value="Manga de Faena">Manga de Faena</option>
                  <option value="Despacho">Despacho</option>
                  <option value="Corrales">Corrales</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Detalles de la Desviación</label>
                <textarea 
                  className="form-control" 
                  placeholder="Describa el hallazgo o la no conformidad (temperatura alta, contaminación, etc.)..." 
                  rows="3"
                  value={pncForm.detalles}
                  onChange={(e) => setPncForm({ ...pncForm, detalles: e.target.value })}
                  required
                ></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Acción Correctiva Aplicada (Opcional)</label>
                <textarea 
                  className="form-control" 
                  placeholder="Acción tomada para solucionar la desviación..." 
                  rows="2"
                  value={pncForm.accionCorrectiva}
                  onChange={(e) => setPncForm({ ...pncForm, accionCorrectiva: e.target.value })}
                ></textarea>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Estado de la Desviación</label>
                  <select 
                    className="form-control"
                    value={pncForm.estado}
                    onChange={(e) => setPncForm({ ...pncForm, estado: e.target.value })}
                    required
                  >
                    <option value="Abierto">Abierto (Pendiente Acción)</option>
                    <option value="Cerrado">Cerrado (Acción Correctiva Conforme)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Responsable QA</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={pncForm.responsable}
                    onChange={(e) => setPncForm({ ...pncForm, responsable: e.target.value })}
                    required 
                  />
                </div>
              </div>
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: '#ef4444', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)' }}>
                  <i className="fa-solid fa-check"></i> Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR CLORO */}
      {activeModal === 'cloro' && (
        <div id="modal-cloro" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '440px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-faucet-drip" style={{ color: 'var(--color-client)' }}></i>
              {editingId ? 'Editar Medición' : 'Registrar Medición de Cloro'}
            </h2>
            <form onSubmit={handleSaveCloro}>
              <div className="form-group">
                <label className="form-label">Punto de Muestreo</label>
                <select 
                  className="form-control"
                  value={cloroForm.punto_muestreo}
                  onChange={(e) => setCloroForm({ ...cloroForm, punto_muestreo: e.target.value })}
                  required
                >
                  <option value="Sala de Faena">Sala de Faena</option>
                  <option value="Corral 01">Corral 01</option>
                  <option value="Cámara de Vacunos">Cámara de Vacunos</option>
                  <option value="Servicios Higiénicos">Servicios Higiénicos</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cloro Residual (ppm - Rango Seguro: 0.5 - 1.5)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Ej. 1.2" 
                  step="0.01" 
                  min="0" 
                  max="5"
                  value={cloroForm.cloro_residual}
                  onChange={(e) => setCloroForm({ ...cloroForm, cloro_residual: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Observaciones</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Conforme / Ajustar dosificación..." 
                  value={cloroForm.observaciones}
                  onChange={(e) => setCloroForm({ ...cloroForm, observaciones: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={cloroForm.fecha}
                    onChange={(e) => setCloroForm({ ...cloroForm, fecha: e.target.value })}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={cloroForm.hora}
                    onChange={(e) => setCloroForm({ ...cloroForm, hora: e.target.value })}
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Responsable del Registro</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cloroForm.responsable}
                  onChange={(e) => setCloroForm({ ...cloroForm, responsable: e.target.value })}
                  required 
                />
              </div>
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: 'linear-gradient(135deg, var(--color-client), #ea580c)' }}>
                  <i className="fa-solid fa-check"></i> Guardar Medición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR HIGIENE POES */}
      {activeModal === 'higiene' && (
        <div id="modal-higiene" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '480px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setEditingId(null); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <h2 className="card-title">
              <i className="fa-solid fa-soap" style={{ color: 'var(--color-ops)' }}></i>
              {editingId ? 'Editar Verificación' : 'Registrar Verificación POES'}
            </h2>
            <form onSubmit={handleSaveHigiene}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Tipo de Elemento</label>
                  <select 
                    className="form-control"
                    value={higieneForm.tipoElemento}
                    onChange={(e) => setHigieneForm({ ...higieneForm, tipoElemento: e.target.value })}
                    required
                  >
                    <option value="Equipos">Equipos</option>
                    <option value="Instalaciones">Instalaciones</option>
                    <option value="Utensilios">Utensilios</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Frecuencia</label>
                  <select 
                    className="form-control"
                    value={higieneForm.frecuencia}
                    onChange={(e) => setHigieneForm({ ...higieneForm, frecuencia: e.target.value })}
                    required
                  >
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Interdiario">Interdiario</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del Ítem / Elemento</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Sierra cortadora de carcasas" 
                  value={higieneForm.nombreItem}
                  onChange={(e) => setHigieneForm({ ...higieneForm, nombreItem: e.target.value })}
                  required 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Inspección Higiene</label>
                  <select 
                    className="form-control"
                    value={higieneForm.limpiezaEstado}
                    onChange={(e) => setHigieneForm({ ...higieneForm, limpiezaEstado: e.target.value })}
                    required
                  >
                    <option value="Conforme">Conforme (Limpio)</option>
                    <option value="No Conforme">No Conforme (Sucio / Desviado)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Desinfectante Usado</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Ej. Cloro residual, Amonio cuaternario" 
                    value={higieneForm.desinfectanteUsado}
                    onChange={(e) => setHigieneForm({ ...higieneForm, desinfectanteUsado: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Concentración Desinfectante (ppm)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Ej. 200" 
                  value={higieneForm.concentracionPpm}
                  onChange={(e) => setHigieneForm({ ...higieneForm, concentracionPpm: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Inspector QA</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={higieneForm.responsable}
                  onChange={(e) => setHigieneForm({ ...higieneForm, responsable: e.target.value })}
                  required 
                />
              </div>
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: 'linear-gradient(135deg, var(--color-ops), #047857)' }}>
                  <i className="fa-solid fa-check"></i> Guardar Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Calidad;
