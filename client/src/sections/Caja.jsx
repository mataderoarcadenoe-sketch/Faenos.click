import React, { useState, useEffect } from 'react';

function Caja({ data, activeModal, setActiveModal, onRefresh, confirm }) {
  const { cajas = [], trabajadores = [], metodosPago = [], tiposPago = [] } = data;

  const [localSubTab, setLocalSubTab] = useState('turno'); // 'turno' o 'historial'
  
  // Formulario Apertura
  const [aperturaData, setAperturaData] = useState({
    trabajadorId: '',
    montoApertura: '0.00'
  });

  // Formulario Movimiento Extraordinario
  const [movimientoData, setMovimientoData] = useState({
    tipo: 'Egreso',
    monto: '',
    concepto: ''
  });

  // Formulario Arqueo / Cierre
  const [arqueoMontoReal, setArqueoMontoReal] = useState('');
  const [arqueoObservaciones, setArqueoObservaciones] = useState('');

  const cajaActiva = cajas.find(c => c.estado === 'Abierta');

  // Inicializar trabajador en formulario de apertura
  useEffect(() => {
    const activeWorkers = trabajadores.filter(t => t.activo);
    if (activeWorkers.length > 0 && !aperturaData.trabajadorId) {
      setAperturaData(prev => ({ ...prev, trabajadorId: activeWorkers[0].id }));
    }
  }, [trabajadores, aperturaData.trabajadorId]);

  // Helper para verificar si un método de pago es en efectivo
  const esMovimientoEfectivo = (mov) => {
    if (!mov.metodoPagoId) return false;
    const mp = metodosPago.find(item => item.id === mov.metodoPagoId);
    if (!mp) return false;
    if (mp.tipo === 'Efectivo' || mp.tipo === 'tp-1') return true;
    const tp = tiposPago.find(item => item.id === mp.tipo || item.nombre === mp.tipo);
    if (tp && (tp.nombre === 'Efectivo' || tp.id === 'tp-1')) {
      return true;
    }
    return false;
  };

  // Calcular métricas de la caja activa
  let cajaMetrics = {
    montoApertura: 0,
    ingresosEfectivo: 0,
    egresosEfectivo: 0,
    otrosIngresos: 0,
    saldoTeoricoFisico: 0
  };

  if (cajaActiva) {
    const movs = cajaActiva.movimientos || [];
    const ingresosEfectivo = movs.filter(m => m.tipo === 'Ingreso' && esMovimientoEfectivo(m)).reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);
    const egresosEfectivo = movs.filter(m => m.tipo === 'Egreso' && esMovimientoEfectivo(m)).reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);
    const otrosIngresos = movs.filter(m => m.tipo === 'Ingreso' && !esMovimientoEfectivo(m)).reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);
    const saldoTeoricoFisico = parseFloat(cajaActiva.montoApertura || 0) + ingresosEfectivo - egresosEfectivo;

    cajaMetrics = {
      montoApertura: parseFloat(cajaActiva.montoApertura || 0),
      ingresosEfectivo,
      egresosEfectivo,
      otrosIngresos,
      saldoTeoricoFisico
    };
  }

  // Aperturar Caja
  const handleAperturarCaja = async (e) => {
    e.preventDefault();
    const { trabajadorId, montoApertura } = aperturaData;
    const monto = parseFloat(montoApertura);

    if (!trabajadorId) {
      alert('Debe seleccionar un encargado para el turno.');
      return;
    }

    const trab = trabajadores.find(t => t.id === trabajadorId);
    if (!trab) return;

    if (isNaN(monto) || monto < 0) {
      alert('Monto de apertura no válido.');
      return;
    }

    const nuevaCaja = {
      id: 'caja-' + Date.now(),
      fechaApertura: new Date().toISOString(),
      fechaCierre: null,
      montoApertura: monto,
      montoCierre: null,
      montoReal: null,
      diferencia: null,
      observacionArqueo: null,
      estado: 'Abierta',
      encargadoId: trab.id,
      encargadoNombre: trab.nombre,
      movimientos: []
    };

    try {
      const response = await fetch('/api/cajas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaCaja)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al aperturar caja');
      }

      alert('Caja general aperturada con éxito.');
      setAperturaData({
        trabajadorId: trabajadores.filter(t => t.activo)[0]?.id || '',
        montoApertura: '0.00'
      });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Guardar movimiento extraordinario
  const handleSaveMovimiento = async (e) => {
    e.preventDefault();
    if (!cajaActiva) {
      alert('Debe aperturar la caja antes de registrar movimientos.');
      return;
    }

    const monto = parseFloat(movimientoData.monto);
    if (isNaN(monto) || monto <= 0) {
      alert('Monto del movimiento no válido.');
      return;
    }

    const nuevoMov = {
      id: 'mov-' + Date.now(),
      fecha: new Date().toISOString(),
      tipo: movimientoData.tipo,
      monto: monto,
      concepto: movimientoData.concepto.trim(),
      metodoPagoId: 'mp-1', // Efectivo Caja Chica por defecto
      referencia: 'Manual'
    };

    try {
      const response = await fetch(`/api/cajas/${cajaActiva.id}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoMov)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar el movimiento');
      }

      alert('Movimiento extraordinario registrado con éxito.');
      setMovimientoData({ tipo: 'Egreso', monto: '', concepto: '' });
      setActiveModal(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Procesar cierre con arqueo
  const handleProcesarCierre = async (e) => {
    e.preventDefault();
    if (!cajaActiva) return;

    const realVal = parseFloat(arqueoMontoReal);
    if (isNaN(realVal) || realVal < 0) {
      alert('Ingrese un monto físico válido.');
      return;
    }

    const diferenciaCalculada = realVal - cajaMetrics.saldoTeoricoFisico;

    try {
      const response = await fetch(`/api/cajas/${cajaActiva.id}/cerrar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saldoFisicoReal: realVal,
          diferencia: diferenciaCalculada,
          estado: 'Cerrada',
          fechaCierre: new Date().toISOString(),
          observaciones: arqueoObservaciones
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cerrar caja');
      }

      alert('Caja cerrada con éxito. Turno liquidado con arqueo.');
      setArqueoMontoReal('');
      setArqueoObservaciones('');
      setActiveModal(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Calcular diferencia en tiempo real para el arqueo
  const realValParsed = parseFloat(arqueoMontoReal);
  const diffArqueo = !isNaN(realValParsed) ? (realValParsed - cajaMetrics.saldoTeoricoFisico) : null;
  let arqueoBoxClass = 'arqueo-cuadrado';
  let arqueoBoxText = 'Ingrese el monto físico para calcular el cuadre';
  if (diffArqueo !== null) {
    if (Math.abs(diffArqueo) < 0.01) {
      arqueoBoxClass = 'arqueo-cuadrado';
      arqueoBoxText = 'CAJA CUADRADA CON ÉXITO';
    } else if (diffArqueo > 0) {
      arqueoBoxClass = 'arqueo-sobrante';
      arqueoBoxText = `SOBRANTE DETECTADO: + S/. ${diffArqueo.toFixed(2)}`;
    } else {
      arqueoBoxClass = 'arqueo-faltante';
      arqueoBoxText = `FALTANTE DETECTADO: - S/. ${Math.abs(diffArqueo).toFixed(2)}`;
    }
  }

  // Filtrar cajas cerradas para el historial
  const cajasHistorial = cajas.filter(c => c.estado === 'Cerrada');

  return (
    <section id="tab-caja" className="content-section" style={{ display: 'block' }}>
      
      {/* MENÚ DE SECCIONES INTERNO (FLEXIBLE RESPONSIVO) */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', background: '#ffffff', borderRadius: '12px', padding: '6px', gap: '8px' }}>
        <button 
          onClick={() => setLocalSubTab('turno')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            border: 'none', 
            borderRadius: '8px', 
            background: localSubTab === 'turno' ? 'var(--color-admin)' : 'transparent', 
            color: localSubTab === 'turno' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'var(--transition-fast)'
          }}
        >
          <i className="fa-solid fa-wallet"></i>
          <span>Turno Activo</span>
        </button>
        <button 
          onClick={() => setLocalSubTab('historial')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            border: 'none', 
            borderRadius: '8px', 
            background: localSubTab === 'historial' ? 'var(--color-admin)' : 'transparent', 
            color: localSubTab === 'historial' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'var(--transition-fast)'
          }}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          <span>Historial de Cajas</span>
        </button>
      </div>

      {/* SUB-SECCIÓN: TURNO ACTIVO */}
      {localSubTab === 'turno' && (
        <div id="caja-subtab-turno">
          {!cajaActiva ? (
            /* ESTADO: CAJA CERRADA (Apertura de Caja) */
            <div className="dashboard-grid" style={{ gridTemplateColumns: window.innerWidth > 991 ? '420px 1fr' : '1fr', gap: '32px' }}>
              {/* Formulario de Apertura */}
              <div className="card" style={{ padding: window.innerWidth <= 767 ? '20px' : '32px', borderRadius: '16px' }}>
                <h3 className="card-title" style={{ color: 'var(--color-ops)', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-lock" style={{ color: 'var(--color-ops)' }}></i>
                  Apertura de Caja General
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                  Para iniciar el registro de transacciones, cobros y pesajes de hoy, debe aperturar el turno de caja estableciendo un saldo inicial en efectivo.
                </p>
                
                <form onSubmit={handleAperturarCaja}>
                  <div className="form-group">
                    <label className="form-label">Seleccionar Encargado (Cajero)</label>
                    <select 
                      className="form-control"
                      value={aperturaData.trabajadorId}
                      onChange={(e) => setAperturaData({ ...aperturaData, trabajadorId: e.target.value })}
                      required
                    >
                      <option value="" disabled>Elige un trabajador...</option>
                      {trabajadores.filter(t => t.activo).map(t => (
                        <option key={t.id} value={t.id}>{t.nombre} ({t.rol})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto de Apertura (S/.)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="Ej. 150.00" 
                      min="0" 
                      step="0.10" 
                      value={aperturaData.montoApertura} 
                      onChange={(e) => setAperturaData({ ...aperturaData, montoApertura: e.target.value })}
                      required 
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px', background: 'linear-gradient(135deg, var(--color-ops), #047857)', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.25)', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-lock-open"></i> Aperturar Caja
                  </button>
                </form>
              </div>
              
              {/* Panel Informativo */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: window.innerWidth <= 767 ? '20px' : '32px', borderRadius: '16px' }}>
                <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Control de Caja y Liquidación Diaria
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
                  La caja general registra todos los ingresos financieros por concepto de faenamiento y servicios de pesaje del camal. Una vez abierta, el operador del sistema podrá registrar cobros y gastos menores de forma centralizada.
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-shield-halved" style={{ color: 'var(--color-ops)' }}></i>Trazabilidad Completa
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-file-invoice-dollar" style={{ color: 'var(--color-ops)' }}></i>Balances sin descuadres
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ESTADO: CAJA ABIERTA (Resumen, Movimientos, Cierre) */
            <div className="dashboard-grid" style={{ gridTemplateColumns: window.innerWidth > 991 ? '340px 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* Columna Izquierda: Resumen de Caja */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Tarjeta Resumen de Turno */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 className="card-title" style={{ fontSize: '15px', fontWeight: 600, marginBottom: 0, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-wallet" style={{ color: 'var(--color-ops)' }}></i>
                      Resumen de Turno
                    </h4>
                    <span className="badge badge-success" style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--color-ops)', border: '1px solid rgba(5, 150, 105, 0.15)', display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 10px', fontSize: '11px', borderRadius: '20px', fontWeight: 600 }}>
                      <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--color-ops)', borderRadius: '50%' }}></span>
                      Abierta
                    </span>
                  </div>

                  {/* Encargado */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '20px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(79, 70, 229, 0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-admin)' }}>
                        <i className="fa-solid fa-user-tie" style={{ fontSize: '14px' }}></i>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cajero Encargado</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{cajaActiva.encargadoNombre}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detalles de saldos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-coins" style={{ color: '#94a3b8', width: '14px' }}></i> Monto Apertura:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>S/. {cajaMetrics.montoApertura.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-arrow-down" style={{ color: 'var(--color-ops)', width: '14px' }}></i> Ingresos Efectivo:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-ops)' }}>+ S/. {cajaMetrics.ingresosEfectivo.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-arrow-up" style={{ color: '#ef4444', width: '14px' }}></i> Egresos Efectivo:</span>
                      <span style={{ fontWeight: 600, color: '#ef4444' }}>- S/. {cajaMetrics.egresosEfectivo.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-building-columns" style={{ color: 'var(--color-client)', width: '14px' }}></i> Créditos / Bancos:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-client)' }}>+ S/. {cajaMetrics.otrosIngresos.toFixed(2)}</span>
                    </div>
                    
                    <div style={{ background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.04), rgba(52, 211, 153, 0.04))', border: '1px solid rgba(5, 150, 105, 0.1)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Efectivo Físico Teórico</span>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: '#047857', fontFamily: "'Outfit', sans-serif" }}>S/. {cajaMetrics.saldoTeoricoFisico.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Acciones Rápidas (Aparecen debajo en la tarjeta del sidebar para móviles también) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button 
                      onClick={() => setActiveModal('caja-egreso')} 
                      className="btn-primary" 
                      style={{ background: 'linear-gradient(135deg, var(--color-client), #c2410c)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: 0 }}
                    >
                      <i className="fa-solid fa-plus"></i> Registrar Movimiento
                    </button>
                    <button 
                      onClick={() => setActiveModal('caja-cerrar')} 
                      className="btn-primary" 
                      style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: 0 }}
                    >
                      <i className="fa-solid fa-lock"></i> Arqueo y Cerrar Caja
                    </button>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Movimientos del Turno Activo */}
              <div className="card table-container" style={{ margin: 0, display: 'flex', flexDirection: 'column', padding: 0, borderRadius: '16px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)', border: '1px solid var(--border-color)', background: '#ffffff' }}>
                <div className="table-header-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '15px', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-list-check" style={{ color: 'var(--color-admin)' }}></i>
                    Movimientos de la Caja Activa
                  </h3>
                </div>
                <div className="table-responsive-wrapper" style={{ flex: 1, minHeight: '380px', padding: '12px 20px' }}>
                  <table className="table-responsive-cards" style={{ display: 'table' }}>
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Concepto / Referencia</th>
                        <th>Método</th>
                        <th>Tipo</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cajaActiva.movimientos || []).map((m) => {
                        const horaFormat = m.fecha ? new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--';
                        const mp = metodosPago.find(item => item.id === m.metodoPagoId);
                        const metodoLabel = mp ? mp.nombre : 'Efectivo';
                        
                        return (
                          <tr key={m.id}>
                            <td data-label="Hora" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{horaFormat}</td>
                            <td data-label="Concepto / Referencia">
                              <div><strong>{m.concepto}</strong></div>
                              {m.referencia && <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>Ref: {m.referencia}</span>}
                            </td>
                            <td data-label="Método">
                              <span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-secondary)', border: '1px solid #e2e8f0' }}>{metodoLabel}</span>
                            </td>
                            <td data-label="Tipo">
                              {m.tipo === 'Ingreso' ? (
                                <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--color-ops)', border: '1px solid rgba(5, 150, 105, 0.15)', fontWeight: 600 }}>+ Ingreso</span>
                              ) : (
                                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)', fontWeight: 600 }}>- Egreso</span>
                              )}
                            </td>
                            <td data-label="Monto" style={{ textAlign: 'right', fontWeight: 700, color: m.tipo === 'Ingreso' ? 'var(--color-ops)' : '#ef4444' }}>
                              S/. {parseFloat(m.monto).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                      {(cajaActiva.movimientos || []).length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                            No se registran movimientos en este turno aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-SECCIÓN: HISTORIAL DE CAJAS */}
      {localSubTab === 'historial' && (
        <div id="caja-subtab-historial">
          <div className="table-container" style={{ marginTop: 0, borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div className="table-header-row" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--text-secondary)' }}></i>
                Historial de Cajas Cerradas (Liquidaciones Anteriores)
              </h3>
            </div>
            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Apertura</th>
                    <th>Cierre</th>
                    <th>Encargado</th>
                    <th>Monto Inicial</th>
                    <th>Saldo Teórico</th>
                    <th>Efectivo Real</th>
                    <th>Diferencia (Arqueo)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cajasHistorial.sort((a,b) => new Date(b.fechaApertura) - new Date(a.fechaApertura)).map((c) => {
                    const fApertura = new Date(c.fechaApertura).toLocaleString('es-PE', { hour12: false });
                    const fCierre = c.fechaCierre ? new Date(c.fechaCierre).toLocaleString('es-PE', { hour12: false }) : '--';
                    const inicial = parseFloat(c.montoApertura || 0);
                    const realVal = parseFloat(c.montoReal || 0);
                    const dif = parseFloat(c.diferencia || 0);
                    
                    // Cálculo teórico de saldo
                    const movs = c.movimientos || [];
                    const ing = movs.filter(m => m.tipo === 'Ingreso' && esMovimientoEfectivo(m)).reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);
                    const egr = movs.filter(m => m.tipo === 'Egreso' && esMovimientoEfectivo(m)).reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);
                    const teorico = inicial + ing - egr;

                    return (
                      <tr key={c.id}>
                        <td data-label="Apertura" style={{ fontSize: '11.5px' }}>{fApertura}</td>
                        <td data-label="Cierre" style={{ fontSize: '11.5px' }}>{fCierre}</td>
                        <td data-label="Encargado"><strong>{c.encargadoNombre}</strong></td>
                        <td data-label="Monto Inicial">S/. {inicial.toFixed(2)}</td>
                        <td data-label="Saldo Teórico" style={{ fontWeight: 600 }}>S/. {teorico.toFixed(2)}</td>
                        <td data-label="Efectivo Real" style={{ fontWeight: 700 }}>S/. {realVal.toFixed(2)}</td>
                        <td data-label="Diferencia (Arqueo)">
                          {Math.abs(dif) < 0.01 ? (
                            <span style={{ color: 'var(--color-ops)', fontWeight: 700 }}>S/. 0.00 (Cuadrada)</span>
                          ) : dif > 0 ? (
                            <span style={{ color: 'var(--color-ops)', fontWeight: 700 }}>+ S/. {dif.toFixed(2)} (Sobrante)</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>- S/. {Math.abs(dif).toFixed(2)} (Faltante)</span>
                          )}
                        </td>
                        <td data-label="Estado">
                          <span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-secondary)', border: '1px solid #e2e8f0', fontWeight: 600 }}>{c.estado}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {cajasHistorial.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No se registran turnos de caja cerrados en el historial.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMIENTO EXTRAORDINARIO (INGRESO / EGRESO) */}
      {activeModal === 'caja-egreso' && cajaActiva && (
        <div id="modal-movimiento" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '400px' }}>
            <button className="btn-modal-close" onClick={() => setActiveModal(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-circle-dollar-to-slot" style={{ color: 'var(--color-client)' }}></i>
              Movimiento Extraordinario
            </h2>
            
            <form onSubmit={handleSaveMovimiento}>
              <div className="form-group">
                <label className="form-label">Tipo de Movimiento</label>
                <select 
                  className="form-control"
                  value={movimientoData.tipo}
                  onChange={(e) => setMovimientoData({ ...movimientoData, tipo: e.target.value })}
                  required
                >
                  <option value="Egreso">Egreso (Gasto / Salida)</option>
                  <option value="Ingreso">Ingreso (Entrada Extra)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto (S/.)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Ej. 25.00" 
                  min="0.10" 
                  step="0.10" 
                  value={movimientoData.monto}
                  onChange={(e) => setMovimientoData({ ...movimientoData, monto: e.target.value })}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Concepto / Motivo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Artículos de limpieza" 
                  value={movimientoData.concepto}
                  onChange={(e) => setMovimientoData({ ...movimientoData, concepto: e.target.value })}
                  required 
                />
              </div>
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: 'linear-gradient(135deg, var(--color-client), #c2410c)', boxShadow: '0 4px 15px rgba(234, 88, 12, 0.25)' }}>
                  <i className="fa-solid fa-check"></i> Registrar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ARQUEO DE CAJA Y CIERRE */}
      {activeModal === 'caja-cerrar' && cajaActiva && (
        <div id="modal-arqueo" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '480px' }}>
            <button className="btn-modal-close" onClick={() => setActiveModal(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2 className="card-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-calculator" style={{ color: '#ef4444' }}></i>
              Arqueo y Cierre de Caja
            </h2>
            
            <form onSubmit={handleProcesarCierre}>
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Monto Inicial:
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>S/. {cajaMetrics.montoApertura.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Ingresos (+):
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ops)', marginTop: '4px' }}>+ S/. {cajaMetrics.ingresosEfectivo.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Egresos (-):
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>- S/. {cajaMetrics.egresosEfectivo.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Saldo Teórico:
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-admin)', marginTop: '4px' }}>S/. {cajaMetrics.saldoTeoricoFisico.toFixed(2)}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Efectivo Físico en Caja (Contado) (S/.)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', height: '44px', borderColor: 'var(--color-admin)' }} 
                  placeholder="0.00" 
                  min="0" 
                  step="0.10" 
                  value={arqueoMontoReal}
                  onChange={(e) => setArqueoMontoReal(e.target.value)}
                  required 
                />
              </div>
              
              {/* Visualización interactiva del cuadre en tiempo real */}
              <div className={arqueoBoxClass} style={{ padding: '10px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px', fontWeight: 700, fontSize: '13px', border: '1px solid var(--border-color)' }}>
                {arqueoBoxText}
              </div>
              
              <div className="form-group">
                <label className="form-label">Observaciones del Arqueo (Opcional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Faltante por entrega de sencillo" 
                  value={arqueoObservaciones}
                  onChange={(e) => setArqueoObservaciones(e.target.value)}
                />
              </div>
              
              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: '#ef4444', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)', width: '100%' }}>
                  <i className="fa-solid fa-lock"></i> Liquidar y Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Caja;
