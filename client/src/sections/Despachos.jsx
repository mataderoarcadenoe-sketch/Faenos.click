import React from 'react';

function Despachos({ data, activeModal, setActiveModal, onRefresh, activeSubTab }) {
  return (
    <section className="content-section" style={{ display: 'block' }}>
      <h3>Despacho y Salidas - {activeSubTab === 'salidas' ? 'Control Despachos' : 'Control Transportes'} (Migración en curso...)</h3>
      <p>Esta sección se está migrando a React para mejorar su rendimiento móvil.</p>
    </section>
  );
}

export default Despachos;
