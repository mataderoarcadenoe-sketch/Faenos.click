import React from 'react';

function Caja({ data, activeModal, setActiveModal, onRefresh, activeSubTab }) {
  return (
    <section className="content-section" style={{ display: 'block' }}>
      <h3>Caja General - {activeSubTab === 'turno' ? 'Turno Activo' : 'Historial'} (Migración en curso...)</h3>
      <p>Esta sección se está migrando a React para mejorar su rendimiento móvil.</p>
    </section>
  );
}

export default Caja;
