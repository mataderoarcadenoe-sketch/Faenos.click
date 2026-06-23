import React, { useState } from 'react';

function CuentasCobrar({ data, activeModal, setActiveModal, onRefresh, confirm }) {
  const { deudas = [], ganaderos = [], metodosPago = [], cajas = [], tiposPago = [] } = data;

  const [selectedGanaderoId, setSelectedGanaderoId] = useState(null);
  const [deudaEspecificaId, setDeudaEspecificaId] = useState('');
  
  // Abono Form State
  const [abonoData, setAbonoData] = useState({
    monto: '',
    metodoPagoId: '',
    observaciones: ''
  });

  const activeCaja = cajas.find(c => c.estado === 'Abierta');

  // Helper para verificar si un método de pago es "Crédito"
  const esMetodoCredito = (mp) => {
    if (!mp) return false;
    if (mp.tipo === 'tp-2' || mp.tipo === 'tp-5' || mp.tipo === 'Crédito') return true;
    const tp = tiposPago.find(t => t.id === mp.tipo || t.nombre === mp.tipo);
    if (tp && tp.nombre === 'Crédito') return true;
    return false;
  };

  // Métodos de pago disponibles para cobrar deudas (excluyendo Crédito)
  const metodosPagoCobro = metodosPago.filter(mp => !esMetodoCredito(mp));

  // Obtener el ganadero seleccionado
  const ganaderoSeleccionado = ganaderos.find(g => g.id === selectedGanaderoId);

  // Calcular Saldos Consolidados por Ganadero
  const saldosConsolidados = ganaderos.map(g => {
    const deudasGanadero = deudas.filter(d => d.ganadero_id === g.id);
    const creditosOtorgados = deudasGanadero.reduce((acc, d) => acc + parseFloat(d.monto_total || 0), 0);
    const totalAbonado = deudasGanadero.reduce((acc, d) => acc + parseFloat(d.monto_abonado || 0), 0);
    const saldoPendiente = deudasGanadero.reduce((acc, d) => acc + parseFloat(d.saldo || 0), 0);

    return {
      ganadero: g,
      creditosOtorgados,
      totalAbonado,
      saldoPendiente
    };
  }).filter(item => item.saldoPendiente > 0); // Mostrar solo deudores activos

  // Filtrar deudas del ganadero seleccionado
  const deudasGanaderoDetalle = deudas.filter(d => d.ganadero_id === selectedGanaderoId);

  // Iniciar registro de abono general para un ganadero
  const handleIniciarAbonoGeneral = (ganaderoId) => {
    if (!activeCaja) {
      alert('Debe aperturar la caja general antes de registrar movimientos o abonos.');
      return;
    }
    setSelectedGanaderoId(ganaderoId);
    setDeudaEspecificaId('');
    setAbonoData({
      monto: '',
      metodoPagoId: metodosPagoCobro.length > 0 ? metodosPagoCobro[0].id : '',
      observaciones: ''
    });
    setActiveModal('abono');
  };

  // Iniciar abono para una deuda específica
  const handleIniciarAbonoEspecifico = (deuda) => {
    if (!activeCaja) {
      alert('Debe aperturar la caja general antes de registrar movimientos o abonos.');
      return;
    }
    setSelectedGanaderoId(deuda.ganadero_id);
    setDeudaEspecificaId(deuda.id);
    setAbonoData({
      monto: parseFloat(deuda.saldo).toFixed(2),
      metodoPagoId: metodosPagoCobro.length > 0 ? metodosPagoCobro[0].id : '',
      observaciones: `Abono a lote ${deuda.lote_codigo}`
    });
    setActiveModal('abono');
  };

  // Procesar abono de deuda
  const handleProcesarAbono = async (e) => {
    e.preventDefault();
    if (!activeCaja) {
      alert('Debe aperturar la caja general antes de poder registrar abonos.');
      return;
    }

    const { monto, metodoPagoId, observaciones } = abonoData;
    const montoVal = parseFloat(monto);
    if (isNaN(montoVal) || montoVal <= 0) {
      alert('Ingrese un monto de abono válido.');
      return;
    }

    if (!metodoPagoId) {
      alert('Debe seleccionar un método de pago.');
      return;
    }

    const ganadero = ganaderos.find(g => g.id === selectedGanaderoId);
    if (!ganadero) return;

    const mpObj = metodosPago.find(m => m.id === metodoPagoId);
    if (!mpObj) return;

    // Verificar límites
    if (deudaEspecificaId) {
      const deuda = deudas.find(d => d.id === deudaEspecificaId);
      if (deuda && montoVal > parseFloat(deuda.saldo)) {
        alert(`El monto de abono (S/. ${montoVal.toFixed(2)}) supera el saldo pendiente de este lote (S/. ${parseFloat(deuda.saldo).toFixed(2)}).`);
        return;
      }
    } else {
      const saldoTotalPendiente = deudasGanaderoDetalle.reduce((acc, d) => acc + parseFloat(d.saldo || 0), 0);
      if (montoVal > saldoTotalPendiente) {
        alert(`El monto de abono (S/. ${montoVal.toFixed(2)}) supera la deuda total pendiente (S/. ${saldoTotalPendiente.toFixed(2)}).`);
        return;
      }
    }

    let restante = montoVal;
    const detallesAbono = [];
    const lotesAfectados = [];
    const deudasActualizadas = [];
    const recepcionesActualizadas = [];

    // Clonar las deudas y recepciones para realizar el desglose
    const deudasClonadas = JSON.parse(JSON.stringify(deudas));

    if (deudaEspecificaId) {
      const d = deudasClonadas.find(item => item.id === deudaEspecificaId);
      if (d) {
        const montoAmortizar = Math.min(parseFloat(d.saldo), restante);
        d.monto_abonado = parseFloat(d.monto_abonado) + montoAmortizar;
        d.saldo = parseFloat(d.monto_total) - d.monto_abonado;
        if (d.saldo < 0.01) {
          d.saldo = 0;
          d.estado = 'Cancelado';
        } else {
          d.estado = 'Parcial';
        }
        restante -= montoAmortizar;
        detallesAbono.push({ deudaId: d.id, monto: montoAmortizar });
        lotesAfectados.push(d.lote_codigo);
        deudasActualizadas.push(d);
      }
    } else {
      // Amortizar en deudas cronológicas del ganadero
      const deudasPendientes = deudasClonadas
        .filter(item => item.ganadero_id === selectedGanaderoId && parseFloat(item.saldo) > 0)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      for (let i = 0; i < deudasPendientes.length; i++) {
        if (restante <= 0) break;
        const d = deudasPendientes[i];
        const montoAmortizar = Math.min(parseFloat(d.saldo), restante);
        d.monto_abonado = parseFloat(d.monto_abonado) + montoAmortizar;
        d.saldo = parseFloat(d.monto_total) - d.monto_abonado;
        if (d.saldo < 0.01) {
          d.saldo = 0;
          d.estado = 'Cancelado';
        } else {
          d.estado = 'Parcial';
        }
        restante -= montoAmortizar;
        detallesAbono.push({ deudaId: d.id, monto: montoAmortizar });
        lotesAfectados.push(d.lote_codigo);
        deudasActualizadas.push(d);
      }
    }

    const refLotes = lotesAfectados.join(', ');
    const concepto = `Abono Deuda - ${ganadero.nombre} (Lotes: ${refLotes})`;

    const nuevoMov = {
      id: 'mov-' + Date.now(),
      fecha: new Date().toISOString(),
      tipo: 'Ingreso',
      monto: montoVal,
      concepto: concepto,
      metodoPagoId: metodoPagoId,
      referencia: refLotes
    };

    const nuevoAbono = {
      id: 'abono-' + Date.now(),
      ganadero_id: selectedGanaderoId,
      ganadero_nombre: ganadero.nombre,
      monto: montoVal,
      fecha: new Date().toISOString(),
      metodoPagoId: metodoPagoId,
      metodoPagoNombre: mpObj.nombre,
      observaciones,
      detalles: detallesAbono
    };

    try {
      const response = await fetch('/api/abonos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevoAbono,
          nuevoMov,
          deudasActualizadas,
          recepcionesActualizadas // El backend actualiza recepciones basado en deudasActualizadas
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar abono');
      }

      alert(`Abono de S/. ${montoVal.toFixed(2)} registrado con éxito.`);
      setActiveModal(null);
      setSelectedGanaderoId(null);
      setDeudaEspecificaId('');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Calcular deuda total de ganadero seleccionado para el modal
  const deudaTotalGanadero = selectedGanaderoId 
    ? deudas.filter(d => d.ganadero_id === selectedGanaderoId).reduce((acc, d) => acc + parseFloat(d.saldo || 0), 0)
    : 0;

  return (
    <section id="tab-cuentas-cobrar" className="content-section" style={{ display: 'block' }}>
      
      {/* VISTA 1: RESUMEN GENERAL POR GANADERO */}
      {!selectedGanaderoId && (
        <div id="cuentas-cobrar-resumen-panel" className="caja-view-panel active">
          <div className="card" style={{ padding: window.innerWidth <= 767 ? '16px' : '20px', borderRadius: '16px' }}>
            <div className="table-header-row" style={{ marginBottom: '16px' }}>
              <h3 className="card-title" style={{ marginBottom: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-users-viewfinder" style={{ color: 'var(--color-client)' }}></i>
                Saldos Deudores Consolidados
              </h3>
            </div>
            
            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Ganadero</th>
                    <th>WhatsApp / Teléfono</th>
                    <th>Créditos Otorgados</th>
                    <th>Total Abonado</th>
                    <th>Saldo Pendiente</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {saldosConsolidados.map(item => (
                    <tr key={item.ganadero.id}>
                      <td data-label="Ganadero"><strong>{item.ganadero.nombre}</strong></td>
                      <td data-label="WhatsApp / Teléfono">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-brands fa-whatsapp" style={{ color: '#25d366' }}></i>
                          {item.ganadero.whatsapp}
                        </span>
                      </td>
                      <td data-label="Créditos Otorgados">S/. {item.creditosOtorgados.toFixed(2)}</td>
                      <td data-label="Total Abonado" style={{ color: 'var(--color-ops)' }}>S/. {item.totalAbonado.toFixed(2)}</td>
                      <td data-label="Saldo Pendiente" style={{ fontWeight: 700, color: '#ef4444' }}>S/. {item.saldoPendiente.toFixed(2)}</td>
                      <td data-label="Acciones">
                        <div className="actions-flex-group">
                          <button 
                            onClick={() => setSelectedGanaderoId(item.ganadero.id)}
                            className="btn-primary"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', marginTop: 0, background: '#f8fafc', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
                          >
                            <i className="fa-solid fa-eye"></i> Detalle
                          </button>
                          <button 
                            onClick={() => handleIniciarAbonoGeneral(item.ganadero.id)}
                            className="btn-primary"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', marginTop: 0, background: 'linear-gradient(135deg, var(--color-ops), #047857)' }}
                          >
                            <i className="fa-solid fa-hand-holding-dollar"></i> Abonar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {saldosConsolidados.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-square-check" style={{ fontSize: '32px', color: 'var(--color-ops)', marginBottom: '8px', display: 'block' }}></i>
                        No existen saldos deudores pendientes en el sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: HISTORIAL DE CRÉDITOS DETALLADO POR GANADERO */}
      {selectedGanaderoId && ganaderoSeleccionado && (
        <div id="cuentas-cobrar-detalle-panel" className="caja-view-panel active">
          <div className="card" style={{ padding: window.innerWidth <= 767 ? '16px' : '20px', borderRadius: '16px' }}>
            <div className="table-header-row" style={{ marginBottom: '20px', alignSelf: 'center', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <h3 className="card-title" style={{ marginBottom: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-list-check" style={{ color: 'var(--color-client)' }}></i>
                Créditos de: {ganaderoSeleccionado.nombre}
              </h3>
              
              <button 
                onClick={() => setSelectedGanaderoId(null)}
                className="btn-primary" 
                style={{ width: 'auto', padding: '6px 14px', fontSize: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', boxShadow: 'none', marginTop: 0 }}
              >
                <i className="fa-solid fa-arrow-left"></i> Volver al Resumen
              </button>
            </div>
            
            <div className="table-responsive-wrapper">
              <table className="table-responsive-cards">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Lote</th>
                    <th>Total Servicio</th>
                    <th>Monto Abonado</th>
                    <th>Saldo Restante</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {deudasGanaderoDetalle.sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).map((d) => {
                    const fFormat = d.fecha ? new Date(d.fecha).toLocaleDateString() : '--';
                    
                    return (
                      <tr key={d.id}>
                        <td data-label="Fecha">{fFormat}</td>
                        <td data-label="Lote">
                          <span className="lote-tag" style={{ background: 'rgba(234, 88, 12, 0.05)', color: '#ea580c', borderColor: 'var(--color-client)' }}>
                            {d.lote_codigo}
                          </span>
                        </td>
                        <td data-label="Total Servicio">S/. {parseFloat(d.monto_total).toFixed(2)}</td>
                        <td data-label="Monto Abonado" style={{ color: 'var(--color-ops)' }}>S/. {parseFloat(d.monto_abonado).toFixed(2)}</td>
                        <td data-label="Saldo Restante" style={{ fontWeight: 700, color: parseFloat(d.saldo) > 0 ? '#ef4444' : 'var(--color-ops)' }}>
                          S/. {parseFloat(d.saldo).toFixed(2)}
                        </td>
                        <td data-label="Estado">
                          {d.estado === 'Cancelado' ? (
                            <span className="badge badge-success">Saldado</span>
                          ) : d.estado === 'Parcial' ? (
                            <span className="badge" style={{ background: 'rgba(234,88,12,0.08)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.15)' }}>Parcial</span>
                          ) : (
                            <span className="badge badge-pending">Pendiente</span>
                          )}
                        </td>
                        <td data-label="Acción">
                          {parseFloat(d.saldo) > 0 ? (
                            <button 
                              onClick={() => handleIniciarAbonoEspecifico(d)}
                              className="btn-primary" 
                              style={{ width: 'auto', padding: '4px 8px', fontSize: '11px', marginTop: 0, background: 'linear-gradient(135deg, var(--color-ops), #047857)' }}
                            >
                              <i className="fa-solid fa-dollar-sign"></i> Abonar Lote
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-ops)', fontWeight: 600, fontSize: '12px' }}>
                              <i className="fa-solid fa-circle-check"></i> Sin saldo
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {deudasGanaderoDetalle.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No se registran lotes al crédito para este ganadero.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ABONO */}
      {activeModal === 'abono' && ganaderoSeleccionado && (
        <div id="modal-abono" className="form-modal-overlay active">
          <div className="form-modal-card" style={{ maxWidth: '440px' }}>
            <button className="btn-modal-close" onClick={() => { setActiveModal(null); setSelectedGanaderoId(null); setDeudaEspecificaId(''); }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-circle-dollar-to-slot" style={{ color: 'var(--color-ops)' }}></i>
              Registrar Abono
            </h2>
            
            <form onSubmit={handleProcesarAbono}>
              <div style={{ background: 'rgba(14, 116, 144, 0.05)', border: '1px solid rgba(14, 116, 144, 0.1)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Ganadero: <strong style={{ color: 'var(--text-primary)' }}>{ganaderoSeleccionado.nombre}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Deuda Pendiente {deudaEspecificaId ? 'Lote:' : 'Total:'} <strong style={{ color: '#ef4444', fontSize: '15px' }}>
                    S/. {deudaEspecificaId ? parseFloat(deudas.find(d => d.id === deudaEspecificaId)?.saldo || 0).toFixed(2) : deudasGanaderoDetalle.reduce((acc, d) => acc + parseFloat(d.saldo || 0), 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Monto a Abonar (S/.)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center', borderColor: 'var(--color-ops)' }} 
                  placeholder="0.00" 
                  min="0.10" 
                  max={deudaEspecificaId ? parseFloat(deudas.find(d => d.id === deudaEspecificaId)?.saldo || 0) : deudasGanaderoDetalle.reduce((acc, d) => acc + parseFloat(d.saldo || 0), 0)}
                  step="0.10" 
                  value={abonoData.monto}
                  onChange={(e) => setAbonoData({ ...abonoData, monto: e.target.value })}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                <select 
                  className="form-control"
                  value={abonoData.metodoPagoId}
                  onChange={(e) => setAbonoData({ ...abonoData, metodoPagoId: e.target.value })}
                  required
                >
                  {metodosPagoCobro.map(mp => (
                    <option key={mp.id} value={mp.id}>{mp.nombre} ({mp.tipo})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Observaciones (Opcional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej. Pago parcial o saldo de deuda..." 
                  maxLength={150} 
                  value={abonoData.observaciones}
                  onChange={(e) => setAbonoData({ ...abonoData, observaciones: e.target.value })}
                />
              </div>

              <div className="modal-form-actions">
                <button type="submit" className="btn-primary btn-flex" style={{ marginTop: 0, background: 'linear-gradient(135deg, var(--color-ops), #047857)', boxShadow: '0 4px 15px rgba(5, 150, 105, 0.25)' }}>
                  <i className="fa-solid fa-check"></i> Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default CuentasCobrar;
