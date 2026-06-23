import React, { useState } from 'react';

function Sidebar({ activeTab, setActiveTab, activeSubTab, setActiveSubTab, mobileActive, setMobileActive }) {
  // Estado para la barra lateral expandida en escritorio
  const [expanded, setExpanded] = useState(false);

  const handleTabClick = (tabName, subTabName = null) => {
    setActiveTab(tabName);
    if (subTabName) {
      setActiveSubTab(subTabName);
    }
    // Cerrar sidebar en móviles tras cambiar de pestaña
    setMobileActive(false);
  };

  const toggleExpanded = (e) => {
    // En móviles/tablets (<= 991px) no usamos la lógica de colapsado/expandido de escritorio
    if (window.innerWidth <= 991) return;
    setExpanded(!expanded);
    e.stopPropagation();
  };

  // Helper para verificar si la sección tiene submenú activo
  const isLiActive = (tabName) => {
    return activeTab === tabName;
  };

  return (
    <>
      {/* Overlay del Sidebar en móvil */}
      <div 
        id="sidebar-overlay" 
        className={`sidebar-overlay ${mobileActive ? 'active' : ''}`} 
        onClick={() => setMobileActive(false)}
      ></div>

      {/* Barra Lateral (Sidebar) */}
      <aside 
        className={`sidebar ${expanded ? 'expanded' : ''} ${mobileActive ? 'mobile-active' : ''}`} 
        id="dashboard-sidebar"
        onClick={toggleExpanded}
      >
        <div className="brand-section">
          <div className="brand-icon">F</div>
          <div className="brand-name">Faenos.click</div>
          {/* Botón de cerrar sidebar en móvil */}
          <button className="btn-sidebar-close" onClick={(e) => {
            e.stopPropagation();
            setMobileActive(false);
          }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <nav onClick={(e) => e.stopPropagation()}>
          <ul className="nav-menu">
            <li className={isLiActive('ganaderos') ? 'active-li' : ''}>
              <a className={`nav-item ${activeTab === 'ganaderos' ? 'active' : ''}`} onClick={() => handleTabClick('ganaderos')}>
                <i className="fa-solid fa-users"></i>
                <span>Ganaderos</span>
              </a>
            </li>
            
            <li className={isLiActive('trabajadores') ? 'active-li' : ''}>
              <a className={`nav-item ${activeTab === 'trabajadores' ? 'active' : ''}`} onClick={() => handleTabClick('trabajadores')}>
                <i className="fa-solid fa-users-gear"></i>
                <span>Trabajadores</span>
              </a>
            </li>

            <li className={isLiActive('recepcion') ? 'active-li' : ''}>
              <a className={`nav-item ${activeTab === 'recepcion' ? 'active' : ''}`} onClick={() => handleTabClick('recepcion')}>
                <i className="fa-solid fa-truck-ramp-box"></i>
                <span>Ingreso de Ganado</span>
              </a>
            </li>

            <li className={isLiActive('pesajes') ? 'active-li' : ''}>
              <a className={`nav-item ${activeTab === 'pesajes' ? 'active' : ''}`} onClick={() => handleTabClick('pesajes')}>
                <i className="fa-solid fa-weight-scale"></i>
                <span>Pesaje en Manga</span>
              </a>
            </li>

            <li className={isLiActive('trazabilidad') ? 'active-li' : ''}>
              <a className={`nav-item ${activeTab === 'trazabilidad' ? 'active' : ''}`} onClick={() => handleTabClick('trazabilidad')}>
                <i className="fa-solid fa-route"></i>
                <span>Trazabilidad Lote</span>
              </a>
            </li>

            <li className={`has-submenu ${isLiActive('caja') ? 'active-li' : ''}`}>
              <a className={`nav-item ${activeTab === 'caja' ? 'active' : ''}`} onClick={() => handleTabClick('caja', 'turno')}>
                <i className="fa-solid fa-cash-register"></i>
                <span>Caja General</span>
                <i className="fa-solid fa-chevron-down submenu-arrow"></i>
              </a>
              <ul className="submenu">
                <li>
                  <a className={`submenu-item caja-nav-item ${activeTab === 'caja' && activeSubTab === 'turno' ? 'active' : ''}`} onClick={() => handleTabClick('caja', 'turno')}>
                    <span>Turno Activo</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item caja-nav-item ${activeTab === 'caja' && activeSubTab === 'historial' ? 'active' : ''}`} onClick={() => handleTabClick('caja', 'historial')}>
                    <span>Historial</span>
                  </a>
                </li>
              </ul>
            </li>

            <li className={isLiActive('cuentas-cobrar') ? 'active-li' : ''}>
              <a className={`nav-item ${activeTab === 'cuentas-cobrar' ? 'active' : ''}`} onClick={() => handleTabClick('cuentas-cobrar')}>
                <i className="fa-solid fa-receipt"></i>
                <span>Cuentas por Cobrar</span>
              </a>
            </li>

            <li className={`has-submenu ${isLiActive('despachos') ? 'active-li' : ''}`}>
              <a className={`nav-item ${activeTab === 'despachos' ? 'active' : ''}`} onClick={() => handleTabClick('despachos', 'salidas')}>
                <i className="fa-solid fa-dolly"></i>
                <span>Despacho y Salidas</span>
                <i className="fa-solid fa-chevron-down submenu-arrow"></i>
              </a>
              <ul className="submenu">
                <li>
                  <a className={`submenu-item despachos-nav-item ${activeTab === 'despachos' && activeSubTab === 'salidas' ? 'active' : ''}`} onClick={() => handleTabClick('despachos', 'salidas')}>
                    <span>Control Despachos</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item despachos-nav-item ${activeTab === 'despachos' && activeSubTab === 'transportes' ? 'active' : ''}`} onClick={() => handleTabClick('despachos', 'transportes')}>
                    <span>Control Transportes</span>
                  </a>
                </li>
              </ul>
            </li>

            <li className={`has-submenu ${isLiActive('calidad') ? 'active-li' : ''}`}>
              <a className={`nav-item ${activeTab === 'calidad' ? 'active' : ''}`} onClick={() => handleTabClick('calidad', 'camaras')}>
                <i className="fa-solid fa-shield-halved"></i>
                <span>Calidad (HACCP)</span>
                <i className="fa-solid fa-chevron-down submenu-arrow"></i>
              </a>
              <ul className="submenu">
                <li>
                  <a className={`submenu-item calidad-nav-item ${activeTab === 'calidad' && activeSubTab === 'camaras' ? 'active' : ''}`} onClick={() => handleTabClick('calidad', 'camaras')}>
                    <span>Cámaras Frías</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item calidad-nav-item ${activeTab === 'calidad' && activeSubTab === 'no-conformes' ? 'active' : ''}`} onClick={() => handleTabClick('calidad', 'no-conformes')}>
                    <span>No Conformidades</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item calidad-nav-item ${activeTab === 'calidad' && activeSubTab === 'cloro' ? 'active' : ''}`} onClick={() => handleTabClick('calidad', 'cloro')}>
                    <span>Control de Agua</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item calidad-nav-item ${activeTab === 'calidad' && activeSubTab === 'higiene-poes' ? 'active' : ''}`} onClick={() => handleTabClick('calidad', 'higiene-poes')}>
                    <span>Higiene (POES)</span>
                  </a>
                </li>
              </ul>
            </li>

            <li className={`has-submenu ${isLiActive('visitas') ? 'active-li' : ''}`}>
              <a className={`nav-item ${activeTab === 'visitas' ? 'active' : ''}`} onClick={() => handleTabClick('visitas', 'control-visitas')}>
                <i className="fa-solid fa-user-shield"></i>
                <span>Seguridad y BPM</span>
                <i className="fa-solid fa-chevron-down submenu-arrow"></i>
              </a>
              <ul className="submenu">
                <li>
                  <a className={`submenu-item visitas-nav-item ${activeTab === 'visitas' && activeSubTab === 'control-visitas' ? 'active' : ''}`} onClick={() => handleTabClick('visitas', 'control-visitas')}>
                    <span>Control Visitas</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item visitas-nav-item ${activeTab === 'visitas' && activeSubTab === 'capacitaciones' ? 'active' : ''}`} onClick={() => handleTabClick('visitas', 'capacitaciones')}>
                    <span>Capacitaciones</span>
                  </a>
                </li>
              </ul>
            </li>

            <li className={`has-submenu ${isLiActive('configuraciones') ? 'active-li' : ''}`}>
              <a className={`nav-item ${activeTab === 'configuraciones' ? 'active' : ''}`} onClick={() => handleTabClick('configuraciones', 'animales')}>
                <i className="fa-solid fa-sliders"></i>
                <span>Configuraciones</span>
                <i className="fa-solid fa-chevron-down submenu-arrow"></i>
              </a>
              <ul className="submenu">
                <li>
                  <a className={`submenu-item config-nav-item ${activeTab === 'configuraciones' && activeSubTab === 'animales' ? 'active' : ''}`} onClick={() => handleTabClick('configuraciones', 'animales')}>
                    <span>Especies</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item config-nav-item ${activeTab === 'configuraciones' && activeSubTab === 'pagos' ? 'active' : ''}`} onClick={() => handleTabClick('configuraciones', 'pagos')}>
                    <span>Métodos de Pago</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item config-nav-item ${activeTab === 'configuraciones' && activeSubTab === 'roles' ? 'active' : ''}`} onClick={() => handleTabClick('configuraciones', 'roles')}>
                    <span>Cargo / Rol</span>
                  </a>
                </li>
                <li>
                  <a className={`submenu-item config-nav-item ${activeTab === 'configuraciones' && activeSubTab === 'tipos-pago' ? 'active' : ''}`} onClick={() => handleTabClick('configuraciones', 'tipos-pago')}>
                    <span>Tipos de Pago</span>
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-avatar">AD</div>
          <div className="user-info">
            <span className="user-name">Admin Doris</span>
            <span className="user-role">Control de Calidad</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
