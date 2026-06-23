import React from 'react';

function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="brand-badge">
          <span className="pulse-dot"></span>
          <span className="brand-badge-text">Faenos.click • Matadero Arcada de Noé</span>
        </div>
      </div>
      
      <div className="topbar-right">
        <button className="topbar-icon-btn" title="Refrescar" onClick={() => window.location.reload()}>
          <i className="fa-solid fa-rotate-right"></i>
        </button>
        <button className="topbar-icon-btn" title="Notificaciones" style={{ position: 'relative' }}>
          <i className="fa-solid fa-bell"></i>
          <span className="notification-dot"></span>
        </button>
        <div className="topbar-user">
          <div className="topbar-user-avatar">AD</div>
          <div className="topbar-user-info">
            <span className="topbar-username">Admin Doris</span>
            <span className="topbar-userrole">Administrador</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Topbar;
