import React, { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import SectionHeader from './components/SectionHeader';

// Lazy loading de las pestañas para reducir el peso de carga inicial
const Ganaderos = lazy(() => import('./sections/Ganaderos'));
const Trabajadores = lazy(() => import('./sections/Trabajadores'));
const Recepcion = lazy(() => import('./sections/Recepcion'));
const Pesajes = lazy(() => import('./sections/Pesajes'));
const Trazabilidad = lazy(() => import('./sections/Trazabilidad'));
const Caja = lazy(() => import('./sections/Caja'));
const CuentasCobrar = lazy(() => import('./sections/CuentasCobrar'));
const Despachos = lazy(() => import('./sections/Despachos'));
const Calidad = lazy(() => import('./sections/Calidad'));
const Visitas = lazy(() => import('./sections/Visitas'));
const Configuraciones = lazy(() => import('./sections/Configuraciones'));

function App() {
  // Navegación
  const [activeTab, setActiveTab] = useState('ganaderos');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [mobileActive, setMobileActive] = useState(false);

  // Modales
  const [activeModal, setActiveModal] = useState(null);

  // Estado de los datos de la app
  const [data, setData] = useState({
    ganaderos: [],
    recepciones: [],
    especies: [],
    metodosPago: [],
    cajas: [],
    trabajadores: [],
    roles: [],
    tiposPago: [],
    deudas: [],
    abonos: [],
    pesajes: [],
    camaras: [],
    temperaturas: [],
    productosNoConformes: [],
    despachos: [],
    controlCloro: [],
    registrosHigiene: [],
    visitas: [],
    capacitaciones: []
  });

  const [loading, setLoading] = useState(true);

  // Cargar datos desde la API Express
  const loadData = async () => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Error al obtener datos del servidor');
      const serverData = await response.json();
      
      setData({
        ganaderos: serverData.ganaderos || [],
        recepciones: serverData.recepciones || [],
        especies: serverData.especies || [],
        metodosPago: serverData.metodosPago || [],
        cajas: serverData.cajas || [],
        trabajadores: serverData.trabajadores || [],
        roles: serverData.roles || [],
        tiposPago: serverData.tiposPago || [],
        deudas: serverData.deudas || [],
        abonos: serverData.abonos || [],
        pesajes: serverData.pesajes || [],
        camaras: serverData.camaras || [],
        temperaturas: serverData.temperaturas || [],
        productosNoConformes: serverData.productosNoConformes || [],
        despachos: serverData.despachos || [],
        controlCloro: serverData.controlCloro || [],
        registrosHigiene: serverData.registrosHigiene || [],
        visitas: serverData.visitas || [],
        capacitaciones: serverData.capacitaciones || []
      });
    } catch (err) {
      console.error(err);
      alert('Error al conectar con el servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Manejar clics de los botones de acción rápida en el header
  const handleHeaderAction = (actionId) => {
    switch (actionId) {
      case 'ganaderos':
        setActiveModal('ganadero');
        break;
      case 'trabajadores':
        setActiveModal('trabajador');
        break;
      case 'recepcion':
        setActiveModal('recepcion');
        break;
      case 'caja-egreso':
        setActiveModal('caja-egreso');
        break;
      case 'caja-cerrar':
        setActiveModal('caja-cerrar');
        break;
      case 'despacho':
        setActiveModal('despacho');
        break;
      case 'cloro':
        setActiveModal('cloro');
        break;
      case 'higiene':
        setActiveModal('higiene');
        break;
      case 'visita':
        setActiveModal('visita');
        break;
      case 'capacitacion':
        setActiveModal('capacitacion');
        break;
      case 'config-animales':
        setActiveModal('config-animales');
        break;
      case 'config-pagos':
        setActiveModal('config-pagos');
        break;
      case 'config-roles':
        setActiveModal('config-roles');
        break;
      case 'config-tipos-pago':
        setActiveModal('config-tipos-pago');
        break;
      default:
        console.warn('Acción no mapeada:', actionId);
    }
  };

  // Renderizar la sección activa
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="loading-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '24px', marginRight: '8px', color: 'var(--color-admin)' }}></i>
          Conectando al servidor...
        </div>
      );
    }

    const commonProps = {
      data,
      activeModal,
      setActiveModal,
      onRefresh: loadData
    };

    switch (activeTab) {
      case 'ganaderos':
        return <Ganaderos {...commonProps} />;
      case 'trabajadores':
        return <Trabajadores {...commonProps} />;
      case 'recepcion':
        return <Recepcion {...commonProps} />;
      case 'pesajes':
        return <Pesajes {...commonProps} />;
      case 'trazabilidad':
        return <Trazabilidad {...commonProps} />;
      case 'caja':
        return <Caja {...commonProps} activeSubTab={activeSubTab} />;
      case 'cuentas-cobrar':
        return <CuentasCobrar {...commonProps} />;
      case 'despachos':
        return <Despachos {...commonProps} activeSubTab={activeSubTab} />;
      case 'calidad':
        return <Calidad {...commonProps} activeSubTab={activeSubTab} />;
      case 'visitas':
        return <Visitas {...commonProps} activeSubTab={activeSubTab} />;
      case 'configuraciones':
        return <Configuraciones {...commonProps} activeSubTab={activeSubTab} />;
      default:
        return <Ganaderos {...commonProps} />;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeSubTab={activeSubTab} 
        setActiveSubTab={setActiveSubTab}
        mobileActive={mobileActive}
        setMobileActive={setMobileActive}
      />
      <main className="main-content">
        <Topbar />
        <SectionHeader 
          activeTab={activeTab} 
          activeSubTab={activeSubTab} 
          setMobileActive={setMobileActive}
          onAction={handleHeaderAction}
        />
        <Suspense fallback={
          <div className="loading-container" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '24px', marginRight: '8px', color: 'var(--color-admin)' }}></i>
            Cargando módulo...
          </div>
        }>
          {renderTabContent()}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
