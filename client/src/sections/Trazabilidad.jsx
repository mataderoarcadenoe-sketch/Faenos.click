import React, { useState } from 'react';

function Trazabilidad({ data }) {
  const { 
    recepciones = [], 
    ganaderos = [], 
    especies = [], 
    pesajes = [], 
    camaras = [], 
    temperaturas = [], 
    productosNoConformes = [], 
    despachos = [] 
  } = data;

  const [selectedLoteCodigo, setSelectedLoteCodigo] = useState('');
  const [showPesajesDetail, setShowPesajesDetail] = useState(false);

  // Buscar lote seleccionado
  const recepcion = recepciones.find(r => r.lote_codigo === selectedLoteCodigo);

  // Generar lista de lotes para el selector
  const lotesDisponibles = [...recepciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const getEspecieLabel = (especieCod) => {
    const e = especies.find(esp => esp.codigo === especieCod);
    return e ? `${e.icono} ${e.nombre}` : especieCod;
  };

  // Cálculos para la consulta si existe el lote
  let trazabilidadData = null;
  if (recepcion) {
    const ganadero = ganaderos.find(g => g.id === recepcion.ganadero_id);
    const ganaderoRuc = ganadero ? ganadero.ruc : 'N/A';
    const ganaderoCodigo = ganadero ? ganadero.codigo : '--';

    const esInspeccionado = recepcion.estado === 'Inspeccionado';
    const dictamenTexto = esInspeccionado 
      ? 'Lote Apto para Faenado. Inspección ante-mortem concluida con éxito sin observaciones sanitarias.' 
      : 'Lote en espera de inspección sanitaria ante-mortem. Dictamen médico pendiente.';
    const dictamenResponsable = esInspeccionado 
      ? 'Dr. Alfonso Cárdenas (Médico Veterinario Inspector)' 
      : 'Médico Veterinario Pendiente';

    // Pesajes y Manga
    const pesajesLote = pesajes.filter(p => p.recepcion_id === recepcion.id);
    const totalCabezas = parseInt(recepcion.cantidad) || 0;
    const cabezasPesadas = pesajesLote.length;
    const totalPeso = pesajesLote.reduce((acc, p) => acc + parseFloat(p.peso_pie_kg || 0), 0);
    const promedioPeso = cabezasPesadas > 0 ? (totalPeso / cabezasPesadas) : 0;

    // Cámara Frigorífica (HACCP)
    let camaraAsignada = '--';
    let tempCamaraLabel = '--';
    let desvCamaraBadge = null;

    // Relacionar cámara con la especie
    const camara = camaras.find(c => 
      c.nombre.toLowerCase().includes(recepcion.especie.toLowerCase()) || 
      (recepcion.especie === 'GV' && c.nombre.toLowerCase().includes('vacuno')) || 
      (recepcion.especie === 'GP' && c.nombre.toLowerCase().includes('porcino'))
    );

    if (camara) {
      camaraAsignada = camara.nombre;
      const tempsCamara = temperaturas.filter(t => t.camaraId === camara.id);
      if (tempsCamara.length > 0) {
        const tempPromedio = tempsCamara.reduce((sum, t) => sum + parseFloat(t.temperatura), 0) / tempsCamara.length;
        tempCamaraLabel = `${tempPromedio.toFixed(1)} °C`;
        const huboDesv = tempsCamara.some(t => t.desviacion === true);
        desvCamaraBadge = huboDesv ? (
          <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <i className="fa-solid fa-triangle-exclamation"></i> Desviación HACCP Registrada
          </span>
        ) : (
          <span style={{ color: 'var(--color-ops)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <i className="fa-solid fa-circle-check"></i> Monitoreo Térmico Conforme
          </span>
        );
      } else {
        desvCamaraBadge = <span style={{ color: 'var(--text-secondary)' }}>Sin registros recientes</span>;
      }
    } else {
      desvCamaraBadge = <span style={{ color: 'var(--text-secondary)' }}>Sin cámara asignada</span>;
    }

    // No Conformidades (PNC)
    const pncs = productosNoConformes.filter(p => p.loteCodigo === selectedLoteCodigo);

    // Despacho y Transporte
    const desp = despachos.find(d => d.loteCodigo === selectedLoteCodigo);

    // Estado global
    let estadoGlobalBadge = '';
    if (desp) {
      estadoGlobalBadge = (
        <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--color-ops)', border: '1px solid rgba(5, 150, 105, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', borderRadius: '20px', fontWeight: 700 }}>
          <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-ops)', borderRadius: '50%' }}></span>Despachado
        </span>
      );
    } else if (cabezasPesadas > 0) {
      estadoGlobalBadge = (
        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', borderRadius: '20px', fontWeight: 700 }}>
          <span style={{ width: '6px', height: '6px', backgroundColor: '#2563eb', borderRadius: '50%' }}></span>En Cámara Fría
        </span>
      );
    } else if (esInspeccionado) {
      estadoGlobalBadge = (
        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', borderRadius: '20px', fontWeight: 700 }}>
          <span style={{ width: '6px', height: '6px', backgroundColor: '#d97706', borderRadius: '50%' }}></span>Apto Faena
        </span>
      );
    } else {
      estadoGlobalBadge = (
        <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.08)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', borderRadius: '20px', fontWeight: 700 }}>
          <span style={{ width: '6px', height: '6px', backgroundColor: '#475569', borderRadius: '50%' }}></span>Ingresado
        </span>
      );
    }

    trazabilidadData = {
      recepcion,
      ganaderoRuc,
      ganaderoCodigo,
      esInspeccionado,
      dictamenTexto,
      dictamenResponsable,
      pesajesLote,
      totalCabezas,
      cabezasPesadas,
      totalPeso,
      promedioPeso,
      camaraAsignada,
      tempCamaraLabel,
      desvCamaraBadge,
      pncs,
      desp,
      estadoGlobalBadge
    };
  }

  return (
    <section className="content-section" style={{ display: 'block' }}>
      <div className="table-container" style={{ borderRadius: '12px', padding: window.innerWidth <= 767 ? '16px' : '24px' }}>
        
        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              <i className="fa-solid fa-route" style={{ color: 'var(--color-admin)', marginRight: '8px' }}></i>
              Consulta de Trazabilidad por Lote
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Sistema de Rastreabilidad Integral "From Farm to Fork" (Art. 3.2)
            </p>
          </div>
        </div>

        {/* Buscador de Lote Premium */}
        <div style={{ 
          background: 'linear-gradient(to right, #ffffff, #f8fafc)', 
          padding: window.innerWidth <= 767 ? '16px' : '24px', 
          borderRadius: '16px', 
          border: '1px solid var(--border-color)', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.01)', 
          marginBottom: '28px', 
          display: 'flex', 
          gap: '24px', 
          alignItems: 'center', 
          flexWrap: 'wrap' 
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            background: 'rgba(79, 70, 229, 0.08)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'var(--color-admin)', 
            fontSize: '20px', 
            flexShrink: 0 
          }}>
            <i className="fa-solid fa-magnifying-glass-location"></i>
          </div>
          <div style={{ flex: '1', minWidth: '220px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', fontFamily: "'Outfit', sans-serif" }}>
              Rastreador de Origen y Calidad
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Selecciona el lote oficial para consultar el historial de ingreso, inspección ante-mortem, pesajes, HACCP y despacho.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', minWidth: window.innerWidth <= 767 ? '100%' : '340px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
              <label className="form-label" style={{ marginBottom: '6px', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Código del Lote Oficial
              </label>
              <select 
                className="form-control" 
                value={selectedLoteCodigo} 
                onChange={(e) => setSelectedLoteCodigo(e.target.value)}
                style={{ height: '40px' }}
              >
                <option value="">Selecciona un lote...</option>
                {lotesDisponibles.map(l => (
                  <option key={l.id} value={l.lote_codigo}>
                    {l.lote_codigo} - {l.ganadero_nombre} ({new Date(l.fecha).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contenedor del Resultado */}
        {trazabilidadData ? (
          <div id="trazabilidad-resultado">
            
            {/* Ficha Resumen Rápido (KPIs) */}
            <div style={{ 
              background: '#ffffff', 
              border: '1px solid var(--border-color)', 
              borderRadius: '16px', 
              padding: '20px 24px', 
              marginBottom: '28px', 
              boxShadow: '0 4px 16px rgba(0,0,0,0.005)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-client)', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>
                    Ficha de Rastreabilidad
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}>
                      Lote: {trazabilidadData.recepcion.lote_codigo}
                    </h3>
                    {trazabilidadData.estadoGlobalBadge}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: '#f8fafc', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', fontWeight: 500 }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: 'var(--color-ops)', marginRight: '4px' }}></i> Certificado Oficial de Calidad
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* KPI 1: Ganadero */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', background: 'rgba(79, 70, 229, 0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-admin)', fontSize: '15px', flexShrink: 0 }}>
                    <i className="fa-solid fa-address-card"></i>
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '1px' }}>Productor / Ganadero</span>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {trazabilidadData.recepcion.ganadero_nombre}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>RUC: {trazabilidadData.ganaderoRuc}</span>
                  </div>
                </div>

                {/* KPI 2: Especie */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', background: 'rgba(5, 150, 105, 0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ops)', fontSize: '15px', flexShrink: 0 }}>
                    <i className="fa-solid fa-cow"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '1px' }}>Especie y Volumen</span>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', fontFamily: "'Outfit', sans-serif" }}>
                      {getEspecieLabel(trazabilidadData.recepcion.especie)}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{trazabilidadData.totalCabezas} cabezas de ganado</span>
                  </div>
                </div>

                {/* KPI 3: Guía Tránsito */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', background: 'rgba(234, 88, 12, 0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-client)', fontSize: '15px', flexShrink: 0 }}>
                    <i className="fa-solid fa-file-shield"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '1px' }}>Tránsito Sanitario</span>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', fontFamily: "'Outfit', sans-serif" }}>Guía SENASA</strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{trazabilidadData.recepcion.guia_transito}</span>
                  </div>
                </div>

                {/* KPI 4: Rendimiento */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', background: 'rgba(59, 130, 246, 0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '15px', flexShrink: 0 }}>
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '1px' }}>Rendimiento Planta</span>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', fontFamily: "'Outfit', sans-serif" }}>
                      {trazabilidadData.cabezasPesadas} faenadas
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {trazabilidadData.totalPeso > 0 ? `${trazabilidadData.totalPeso.toFixed(1)} kg carne` : 'En espera de pesajes'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TIMELINE DE TRAZABILIDAD */}
            <div className="trace-timeline">
              <style>{`
                .trace-timeline {
                  position: relative;
                  padding-left: 36px;
                  margin-top: 16px;
                }
                .trace-timeline::before {
                  content: '';
                  position: absolute;
                  left: 11px;
                  top: 8px;
                  bottom: 8px;
                  width: 2px;
                  background: #e2e8f0;
                }
                .trace-step {
                  position: relative;
                  margin-bottom: 36px;
                }
                .trace-step:last-child {
                  margin-bottom: 0;
                }
                .trace-node {
                  position: absolute;
                  left: -36px;
                  top: 4px;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  background: white;
                  border: 2px solid #cbd5e1;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 10px;
                  color: #64748b;
                  transition: all 0.3s ease;
                  z-index: 2;
                  box-shadow: 0 0 0 4px white;
                }
                .trace-step.completed .trace-node {
                  border-color: var(--color-ops);
                  background: var(--color-ops);
                  color: white;
                }
                .trace-step.active-step .trace-node {
                  border-color: var(--color-client);
                  background: var(--color-client);
                  color: white;
                  box-shadow: 0 0 0 4px white, 0 0 0 8px rgba(234, 88, 12, 0.15);
                }
                .trace-content {
                  background: white;
                  border: 1px solid var(--border-color);
                  border-radius: 12px;
                  padding: 20px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.005);
                  transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .trace-content:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 20px rgba(0,0,0,0.02);
                }
                .trace-title {
                  font-size: 14.5px;
                  font-weight: 700;
                  color: var(--text-primary);
                  margin: 0 0 14px 0;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  border-bottom: 1px solid #f8fafc;
                  padding-bottom: 8px;
                  font-family: 'Outfit', sans-serif;
                  flex-wrap: wrap;
                  gap: 8px;
                }
                .trace-time {
                  font-size: 11px;
                  color: var(--text-secondary);
                  font-weight: 500;
                  background: #f1f5f9;
                  padding: 3px 8px;
                  border-radius: 12px;
                }
              `}</style>

              {/* PASO 1: RECEPCION */}
              <div className="trace-step completed">
                <div className="trace-node"><i className="fa-solid fa-truck"></i></div>
                <div className="trace-content">
                  <div className="trace-title">
                    <span>1. Recepción e Ingreso del Ganado (Hacia Atrás)</span>
                    <span className="trace-time">
                      {new Date(trazabilidadData.recepcion.fecha).toLocaleString('es-PE', { hour12: false })}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 16px' }}>
                    <div><strong>Ganadero:</strong> {trazabilidadData.recepcion.ganadero_nombre}</div>
                    <div><strong>RUC Proveedor:</strong> {trazabilidadData.ganaderoRuc}</div>
                    <div><strong>Código Proveedor:</strong> {trazabilidadData.ganaderoCodigo}</div>
                    <div><strong>Especie de ganado:</strong> {getEspecieLabel(trazabilidadData.recepcion.especie)}</div>
                    <div><strong>Cantidad ingresada:</strong> {trazabilidadData.totalCabezas} cabezas</div>
                    <div><strong>Registro Establo Origen:</strong> {trazabilidadData.recepcion.registro_establo || 'Establo no codificado'}</div>
                    
                    <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                      <div style={{ background: 'rgba(79, 70, 229, 0.03)', border: '1px solid rgba(79, 70, 229, 0.1)', padding: '10px 14px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-file-circle-check" style={{ color: 'var(--color-admin)', fontSize: '18px' }}></i>
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Guía de Tránsito SENASA</span>
                          <strong style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{trazabilidadData.recepcion.guia_transito}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', borderLeft: '3px solid #cbd5e1', color: 'var(--text-secondary)', fontSize: '11.5px', fontStyle: 'italic', lineHeight: '1.4' }}>
                      <strong>Observaciones del lote:</strong> "{trazabilidadData.recepcion.observaciones || 'Lote descargado y estabulado en corrales sin incidencias registradas.'}"
                    </div>
                  </div>
                </div>
              </div>

              {/* PASO 2: INSPECCION */}
              <div className={`trace-step ${trazabilidadData.esInspeccionado ? 'completed' : 'active-step'}`}>
                <div className="trace-node"><i className="fa-solid fa-user-doctor"></i></div>
                <div className="trace-content">
                  <div className="trace-title">
                    <span>2. Inspección Veterinaria Ante-Mortem (IS-001)</span>
                    <span className="trace-time">{trazabilidadData.esInspeccionado ? 'Aprobado' : 'Pendiente'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <strong>Dictamen Sanitario:</strong>
                      {trazabilidadData.esInspeccionado ? (
                        <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.08)', color: 'var(--color-ops)', border: '1px solid rgba(5, 150, 105, 0.15)', padding: '6px 14px', fontSize: '11px', fontWeight: 700, borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                          <i className="fa-solid fa-circle-check"></i> Apto para Faena
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.15)', padding: '6px 14px', fontSize: '11px', fontWeight: 700, borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                          <i className="fa-solid fa-clock"></i> Dictamen Pendiente
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{trazabilidadData.dictamenTexto}</p>
                    
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <div style={{ width: '32px', height: '32px', background: 'rgba(5, 150, 105, 0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ops)', fontSize: '13px', border: '1px dashed rgba(5,150,105,0.3)' }}>
                        <i className="fa-solid fa-stamp"></i>
                      </div>
                      <div>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Médico Veterinario Inspector</span>
                        <strong style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>{trazabilidadData.dictamenResponsable}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASO 3: FAENADO Y PESOS */}
              <div className={`trace-step ${trazabilidadData.cabezasPesadas > 0 ? 'completed' : (trazabilidadData.esInspeccionado ? 'active-step' : '')}`}>
                <div className="trace-node"><i className="fa-solid fa-weight-scale"></i></div>
                <div className="trace-content">
                  <div className="trace-title">
                    <span>3. Pesaje en Manga y Rendimiento de Carcasa (CPT-001)</span>
                    <span className="trace-time">
                      {trazabilidadData.cabezasPesadas > 0 ? `${trazabilidadData.cabezasPesadas} cabezas pesadas` : 'Pendiente'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Ingresadas</span>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{trazabilidadData.totalCabezas} cabezas</strong>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Faenadas</span>
                        <strong style={{ fontSize: '14px', color: 'var(--color-ops)', fontFamily: 'monospace' }}>{trazabilidadData.cabezasPesadas} cabezas</strong>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Peso Total Caliente</span>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{trazabilidadData.totalPeso.toFixed(1)} kg</strong>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Rendimiento Prom.</span>
                        <strong style={{ fontSize: '14px', color: 'var(--color-client)', fontFamily: 'monospace' }}>{trazabilidadData.promedioPeso.toFixed(1)} kg</strong>
                      </div>
                    </div>

                    {/* Acordeón de Pesas individuales */}
                    {trazabilidadData.cabezasPesadas > 0 ? (
                      <div style={{ marginTop: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                        <div 
                          onClick={() => setShowPesajesDetail(!showPesajesDetail)} 
                          style={{ background: '#f8fafc', padding: '10px 14px', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none', borderBottom: showPesajesDetail ? '1px solid var(--border-color)' : 'none' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-list-check" style={{ color: 'var(--color-ops)' }}></i> 
                            Detalle de Pesas individuales por Cabezas ({trazabilidadData.cabezasPesadas})
                          </span>
                          <i className={`fa-solid fa-chevron-down`} style={{ fontSize: '10px', transition: 'transform 0.2s ease', transform: showPesajesDetail ? 'rotate(180deg)' : 'none' }}></i>
                        </div>
                        {showPesajesDetail && (
                          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            <table className="table-responsive-cards" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                  <th style={{ padding: '6px 8px', textAlign: 'center', width: '50px' }}>N°</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Orejera</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Peso en Manga</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Fecha/Hora Pesaje</th>
                                </tr>
                              </thead>
                              <tbody>
                                {trazabilidadData.pesajesLote.map((p, idx) => (
                                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td data-label="N°" style={{ padding: '6px 8px', color: 'var(--text-secondary)', textAlign: 'center' }}>#{idx + 1}</td>
                                    <td data-label="Orejera" style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>{p.correlativo_orejera}</td>
                                    <td data-label="Peso en Manga" style={{ padding: '6px 8px', fontWeight: 700, color: 'var(--color-admin)', textAlign: 'center' }}>{parseFloat(p.peso_pie_kg).toFixed(2)} kg</td>
                                    <td data-label="Fecha/Hora Pesaje" style={{ padding: '6px 8px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                      {p.fecha ? new Date(p.fecha).toLocaleString('es-PE', { hour12: false }) : '--'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(100, 116, 139, 0.02)', border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', textAlign: 'center', marginTop: '10px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No se registran pesajes individuales en manga de faena aún.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PASO 4: CAMARAS */}
              <div className={`trace-step ${trazabilidadData.cabezasPesadas > 0 ? 'completed' : ''}`}>
                <div className="trace-node"><i className="fa-solid fa-snowflake"></i></div>
                <div className="trace-content">
                  <div className="trace-title">
                    <span>4. Conservación y Maduración en Cámaras Frías (PCC N°1)</span>
                    <span className="trace-time">{trazabilidadData.cabezasPesadas > 0 ? 'Monitoreo Activo' : 'Pendiente'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                      
                      {/* Termostato Digital Simulado */}
                      {trazabilidadData.cabezasPesadas > 0 ? (
                        <div style={{ 
                          background: 'rgba(59, 130, 246, 0.05)', 
                          border: '1px solid #bfdbfe', 
                          padding: '10px 16px', 
                          borderRadius: '12px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          minWidth: '140px' 
                        }}>
                          <i className="fa-solid fa-thermometer" style={{ color: '#2563eb', fontSize: '24px' }}></i>
                          <div>
                            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Temperatura Media</span>
                            <strong style={{ fontSize: '18px', color: '#2563eb', fontFamily: 'monospace' }}>{trazabilidadData.tempCamaraLabel}</strong>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', padding: '10px 16px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '12px', minWidth: '140px' }}>
                          <i className="fa-solid fa-thermometer" style={{ color: 'var(--text-secondary)', fontSize: '24px' }}></i>
                          <div>
                            <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Temperatura Media</span>
                            <strong style={{ fontSize: '18px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>-- °C</strong>
                          </div>
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: '0 0 2px 0' }}><strong>Cámara Asignada:</strong> {trazabilidadData.camaraAsignada}</p>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}><strong>Control PCC N°1:</strong> {trazabilidadData.desvCamaraBadge}</div>
                      </div>
                    </div>

                    <h5 style={{ fontSize: '10.5px', fontWeight: 700, margin: '16px 0 6px 0', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-shield-virus"></i> Aseguramiento de Calidad - No Conformidades
                    </h5>
                    
                    {trazabilidadData.pncs.length > 0 ? (
                      trazabilidadData.pncs.map(p => (
                        <div key={p.id} style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', borderLeft: '4px solid #ef4444', padding: '12px', borderRadius: '8px', marginTop: '8px', fontSize: '11.5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 700, color: '#b91c1c' }}>
                            <span><i className="fa-solid fa-triangle-exclamation"></i> Desviación Reg: {p.id}</span>
                            <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#b91c1c' }}>{p.estado}</span>
                          </div>
                          <p style={{ margin: '0 0 6px 0', color: '#7f1d1d' }}><strong>Detalle del Hallazgo:</strong> {p.detalles}</p>
                          <p style={{ margin: 0, color: 'var(--color-ops)', fontWeight: 600 }}><strong>Acción Correctiva:</strong> {p.accionCorrectiva || 'No especificada'}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{ background: 'rgba(5, 150, 105, 0.03)', border: '1px solid rgba(5, 150, 105, 0.1)', padding: '10px 14px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-ops)', fontSize: '11px', fontWeight: 600, marginTop: '8px' }}>
                        <i className="fa-solid fa-shield-check" style={{ fontSize: '14px' }}></i> Límites Críticos Conformes. Ninguna no conformidad reportada.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PASO 5: DESPACHO */}
              <div className={`trace-step ${trazabilidadData.desp ? 'completed' : (trazabilidadData.cabezasPesadas > 0 ? 'active-step' : '')}`}>
                <div className="trace-node"><i className="fa-solid fa-dolly"></i></div>
                <div className="trace-content">
                  <div className="trace-title">
                    <span>5. Despacho y Transporte del Lote (Hacia Adelante)</span>
                    <span className="trace-time">{trazabilidadData.desp ? 'Despachado' : 'Almacenado'}</span>
                  </div>
                  
                  {trazabilidadData.desp ? (
                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                        <div><strong>Destino / Cliente:</strong> {trazabilidadData.desp.cliente}</div>
                        <div><strong>Guía de Remisión:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{trazabilidadData.desp.guiaRemision}</span></div>
                        <div><strong>Carcasas despachadas:</strong> {trazabilidadData.desp.cantidadCarcasas} unidades</div>
                        <div><strong>Peso Total Despachado:</strong> {parseFloat(trazabilidadData.desp.pesoTotal).toFixed(2)} kg</div>
                        <div><strong>Temp. Carne al cargar:</strong> <strong style={{ color: 'var(--color-ops)' }}>{parseFloat(trazabilidadData.desp.temperaturaCarne).toFixed(1)} °C</strong></div>
                        <div><strong>Fecha de Producción:</strong> {trazabilidadData.desp.fechaProduccion ? new Date(trazabilidadData.desp.fechaProduccion).toLocaleDateString('es-PE') : '--'}</div>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid var(--color-client)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <span><strong>Fecha de Vencimiento:</strong> {trazabilidadData.desp.fechaVencimiento ? new Date(trazabilidadData.desp.fechaVencimiento).toLocaleDateString('es-PE') : '--'} (Control de Vida Útil)</span>
                        <span style={{ background: 'rgba(234,88,12,0.08)', color: 'var(--color-client)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '10px' }}>Art. 4.1 HACCP</span>
                      </div>

                      <h5 style={{ fontSize: '11px', fontWeight: 700, margin: '16px 0 6px 0', color: 'var(--color-client)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-clipboard-check"></i> Checklist del Vehículo de Transporte (CPT-003)
                      </h5>
                      
                      {trazabilidadData.desp.transporte ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '10px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '11.5px' }}>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>HIGIENE FURGÓN</span>
                            <strong>
                              {trazabilidadData.desp.transporte.higieneFurgon === 'Conforme' ? (
                                <><i className="fa-solid fa-circle-check" style={{ color: 'var(--color-ops)', marginRight: '6px' }}></i> Conforme</>
                              ) : (
                                <><i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', marginRight: '6px' }}></i> No Conforme</>
                              )}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>HERMETICIDAD</span>
                            <strong>
                              {trazabilidadData.desp.transporte.hermeticidad ? (
                                <><i className="fa-solid fa-circle-check" style={{ color: 'var(--color-ops)', marginRight: '6px' }}></i> Conforme</>
                              ) : (
                                <><i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', marginRight: '6px' }}></i> No Conforme</>
                              )}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>CERT. FUMIGACIÓN</span>
                            <strong>
                              {trazabilidadData.desp.transporte.fumigacion ? (
                                <><i className="fa-solid fa-circle-check" style={{ color: 'var(--color-ops)', marginRight: '6px' }}></i> Conforme</>
                              ) : (
                                <><i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', marginRight: '6px' }}></i> No Conforme</>
                              )}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>APILAMIENTO / COLGADO</span>
                            <strong>
                              {trazabilidadData.desp.transporte.apilamientoAdecuado ? (
                                <><i className="fa-solid fa-circle-check" style={{ color: 'var(--color-ops)', marginRight: '6px' }}></i> Conforme</>
                              ) : (
                                <><i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', marginRight: '6px' }}></i> No Conforme</>
                              )}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>TEMP. FURGÓN (SALA)</span>
                            <strong style={{ color: 'var(--color-ops)', fontFamily: 'monospace' }}>
                              {trazabilidadData.desp.transporte.temperaturaFurgon.toFixed(1)} °C
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>PLACA VEHÍCULO</span>
                            <span style={{ display: 'inline-block', background: '#fef08a', border: '1px solid #eab308', color: '#1e293b', fontFamily: 'monospace', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.05em', marginTop: '1px', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.1)' }}>
                              {trazabilidadData.desp.transporte.placaVehiculo}
                            </span>
                          </div>
                          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '8px', margin: '4px 0 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <span><strong>Conductor:</strong> {trazabilidadData.desp.transporte.conductor}</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Licencia N°: {trazabilidadData.desp.transporte.licencia}</span>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '6px' }}>
                          No se ha registrado control de transporte para este despacho.
                        </p>
                      )}
                      
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '14px', textAlign: 'right', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                        <strong>Responsable de despacho (Autorización):</strong> {trazabilidadData.desp.responsable}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(234, 88, 12, 0.03)', border: '1px dashed rgba(234, 88, 12, 0.2)', padding: '16px', borderRadius: '10px', fontSize: '12px', color: 'var(--color-client)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fa-solid fa-circle-info" style={{ fontSize: '18px' }}></i>
                      <div>
                        <strong>Lote no despachado aún.</strong> El producto se encuentra actualmente almacenado en conservación en frío en las cámaras frigoríficas.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Mensaje de bienvenida inicial */
          <div style={{ textAlign: 'center', padding: '50px 24px', background: '#ffffff', border: '1px dashed var(--border-color)', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.005)' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              background: 'rgba(79, 70, 229, 0.06)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--color-admin)', 
              fontSize: '28px', 
              margin: '0 auto 20px auto' 
            }}>
              <i className="fa-solid fa-route"></i>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontFamily: "'Outfit', sans-serif" }}>
              Rastreador de Trazabilidad Activo
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 32px auto', lineHeight: '1.5' }}>
              Selecciona un código de lote en el buscador superior para reconstruir y auditar la cadena de suministro en tiempo real.
            </p>
            
            {/* Guía de Pasos Visual */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ flex: '1', minWidth: '130px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <i className="fa-solid fa-truck" style={{ color: 'var(--color-ops)', fontSize: '20px', marginBottom: '8px' }}></i>
                <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>1. Ingreso</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>SENASA y Ganadero</div>
              </div>
              <div style={{ flex: '1', minWidth: '130px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <i className="fa-solid fa-user-doctor" style={{ color: 'var(--color-admin)', fontSize: '20px', marginBottom: '8px' }}></i>
                <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>2. Sanidad</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Inspección Veterinaria</div>
              </div>
              <div style={{ flex: '1', minWidth: '130px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <i className="fa-solid fa-weight-scale" style={{ color: 'var(--color-client)', fontSize: '20px', marginBottom: '8px' }}></i>
                <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>3. Pesaje</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Rendimiento en Manga</div>
              </div>
              <div style={{ flex: '1', minWidth: '130px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <i className="fa-solid fa-snowflake" style={{ color: '#3b82f6', fontSize: '20px', marginBottom: '8px' }}></i>
                <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>4. HACCP</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Cámaras de Frío</div>
              </div>
              <div style={{ flex: '1', minWidth: '130px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <i className="fa-solid fa-dolly" style={{ color: '#8b5cf6', fontSize: '20px', marginBottom: '8px' }}></i>
                <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>5. Despacho</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Transporte y Destino</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

export default Trazabilidad;
