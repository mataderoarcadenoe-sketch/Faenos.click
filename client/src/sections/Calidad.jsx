import React from 'react';

function Calidad({ data, activeModal, setActiveModal, onRefresh, activeSubTab }) {
  return (
    <section className="content-section" style={{ display: 'block' }}>
      <h3>Calidad (HACCP) - Subpestaña: {activeSubTab} (Migración en curso...)</h3>
      <p>Esta sección se está migrando a React para mejorar su rendimiento móvil.</p>
    </section>
  );
}

export default Calidad;
