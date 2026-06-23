import React from 'react';

function Visitas({ data, activeModal, setActiveModal, onRefresh, activeSubTab }) {
  return (
    <section className="content-section" style={{ display: 'block' }}>
      <h3>Seguridad y BPM - Subpestaña: {activeSubTab} (Migración en curso...)</h3>
      <p>Esta sección se está migrando a React para mejorar su rendimiento móvil.</p>
    </section>
  );
}

export default Visitas;
