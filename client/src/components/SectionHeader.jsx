import React from 'react';

function SectionHeader({ activeTab, activeSubTab, setMobileActive, onAction }) {
  // Configuración de títulos, iconos y acciones por pestaña
  const sectionsConfig = {
    ganaderos: {
      title: 'Gestión de Ganaderos',
      icon: 'fa-users',
      actions: [{ id: 'ganaderos', text: 'Nuevo Ganadero', icon: 'fa-plus' }]
    },
    trabajadores: {
      title: 'Gestión de Trabajadores',
      icon: 'fa-users-gear',
      actions: [{ id: 'trabajadores', text: 'Nuevo Trabajador', icon: 'fa-plus' }]
    },
    recepcion: {
      title: 'Ingreso de Ganado',
      icon: 'fa-truck-ramp-box',
      actions: [{ 
        id: 'recepcion', 
        text: 'Nuevo Lote', 
        icon: 'fa-plus',
        style: { background: 'linear-gradient(135deg, var(--color-ops), #047857)', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }
      }]
    },
    pesajes: {
      title: 'Pesaje en Manga',
      icon: 'fa-weight-scale',
      actions: []
    },
    trazabilidad: {
      title: 'Trazabilidad Lote',
      icon: 'fa-route',
      actions: []
    },
    caja: {
      title: 'Caja General',
      icon: 'fa-cash-register',
      actions: activeSubTab === 'turno' ? [
        { 
          id: 'caja-egreso', 
          text: 'Registrar Egreso', 
          icon: 'fa-plus',
          style: { background: 'linear-gradient(135deg, var(--color-client), #c2410c)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }
        },
        { 
          id: 'caja-cerrar', 
          text: 'Cerrar Caja', 
          icon: 'fa-lock',
          style: { background: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)' }
        }
      ] : []
    },
    'cuentas-cobrar': {
      title: 'Cuentas por Cobrar',
      icon: 'fa-receipt',
      actions: []
    },
    despachos: {
      title: 'Despacho y Salidas',
      icon: 'fa-dolly',
      actions: activeSubTab === 'salidas' ? [{ 
        id: 'despacho', 
        text: 'Registrar Despacho', 
        icon: 'fa-plus',
        style: { background: 'linear-gradient(135deg, var(--color-client), #c2410c)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }
      }] : []
    },
    calidad: {
      title: 'Calidad (HACCP)',
      icon: 'fa-shield-halved',
      actions: (() => {
        if (activeSubTab === 'cloro') {
          return [{
            id: 'cloro',
            text: 'Registrar Cloro',
            icon: 'fa-plus',
            style: { background: 'linear-gradient(135deg, var(--color-client), #c2410c)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }
          }];
        }
        if (activeSubTab === 'higiene-poes') {
          return [{
            id: 'higiene',
            text: 'Registrar Higiene',
            icon: 'fa-plus',
            style: { background: 'linear-gradient(135deg, var(--color-client), #c2410c)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }
          }];
        }
        return [];
      })()
    },
    visitas: {
      title: 'Seguridad y BPM',
      icon: 'fa-user-shield',
      actions: (() => {
        if (activeSubTab === 'control-visitas') {
          return [{
            id: 'visita',
            text: 'Registrar Visita',
            icon: 'fa-plus',
            style: { background: 'linear-gradient(135deg, var(--color-client), #c2410c)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }
          }];
        }
        if (activeSubTab === 'capacitaciones') {
          return [{
            id: 'capacitacion',
            text: 'Registrar Capacitación',
            icon: 'fa-plus',
            style: { background: 'linear-gradient(135deg, var(--color-client), #c2410c)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' }
          }];
        }
        return [];
      })()
    },
    configuraciones: {
      title: 'Configuraciones',
      icon: 'fa-sliders',
      actions: (() => {
        const actionBaseStyle = { background: 'linear-gradient(135deg, var(--color-client), #c2410c)', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)' };
        switch(activeSubTab) {
          case 'animales':
            return [{ id: 'config-animales', text: 'Nueva Especie', icon: 'fa-plus', style: actionBaseStyle }];
          case 'pagos':
            return [{ id: 'config-pagos', text: 'Nuevo Método', icon: 'fa-plus', style: actionBaseStyle }];
          case 'roles':
            return [{ id: 'config-roles', text: 'Nuevo Cargo/Rol', icon: 'fa-plus', style: actionBaseStyle }];
          case 'tipos-pago':
            return [{ id: 'config-tipos-pago', text: 'Nuevo Tipo Pago', icon: 'fa-plus', style: actionBaseStyle }];
          default:
            return [];
        }
      })()
    }
  };

  const currentConfig = sectionsConfig[activeTab] || { title: 'Dashboard', icon: 'fa-gauge', actions: [] };

  return (
    <header className="section-header">
      <div className="section-header-left">
        {/* Botón Hamburguesa Móvil */}
        <button 
          id="btn-sidebar-toggle" 
          className="btn-sidebar-toggle" 
          onClick={() => setMobileActive(true)}
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="section-title-wrapper">
          <i id="section-icon" className={`fa-solid ${currentConfig.icon} section-header-icon`}></i>
          <h2 className="section-title" id="section-title-text">{currentConfig.title}</h2>
        </div>
      </div>
      
      <div className="section-header-right">
        <div className="header-actions-wrapper">
          {currentConfig.actions.map((act) => (
            <button
              key={act.id}
              className="btn-header-action btn-primary"
              style={act.style}
              onClick={() => onAction && onAction(act.id)}
            >
              <i className={`fa-solid ${act.icon}`}></i> {act.text}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export default SectionHeader;
