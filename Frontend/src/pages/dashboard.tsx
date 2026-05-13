import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const navigate = useNavigate()
  const nombre = localStorage.getItem('nombre')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('nombre')
    navigate('/')
  }

return (
  <div style={{ display: 'flex', height: '100vh' }}>

                                      {/* -------------------- PANEL IZQUIERDO --------------------------------*/}
    <div style={{ width: '220px',flexShrink: 0,backgroundColor: '#1e3a5f', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2.5rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', minWidth: '36px', backgroundColor: '#f59e0b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#1e3a5f', fontSize: '18px', flexShrink: 0 }}>C$</div>
          <span style={{ color: 'white', fontSize: '18px', fontWeight: '500', fontFamily: 'sans-serif', marginRight: '50px' }}>Capitalia</span>
        </div>
      </div>
    
{/* Botones de navegacion izquierdos */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2rem' }}>
      <button style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.12)', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'sans-serif' }}>
        Principal
    </button>
    <button style={{ width: '100%', backgroundColor: 'transparent', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'sans-serif' }}>
        Deudores
    </button>
    <button style={{ width: '100%', backgroundColor: 'transparent', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'sans-serif' }}>
        Préstamos
    </button>
    <button style={{ width: '100%', backgroundColor: 'transparent', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'sans-serif' }}>
        Cuotas
    </button>
    <button style={{ width: '100%', backgroundColor: 'transparent', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'sans-serif' }}>
        Documentos
    </button>
    </div>
{/*Botones de Administrador y Cerrar Sesion*/}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <button style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.12)', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '13px', fontWeight: '500' }}>{nombre}</span>
        <span style={{ fontSize: '11px', color: '#93b4d4' }}>Administrador</span>
      </div>
    </button>
      <button onClick={handleLogout}
      style={{ width: '100%', backgroundColor: 'transparent', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'sans-serif' }}>
        Cerrar sesión
      </button>
    </div>
    </div>

                                      {/* ------------------------ PANEL DERECHO ----------------------------- */}
    <div style={{ width: '95%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 2rem' }}>
        <h2 style={{ fontSize: '50px', fontWeight: '500', color: '#1a202c', marginBottom: '4px', fontFamily: 'sans-serif' }}>Principal</h2>
      </div>
    </div>

  </div>
)
}

export default Dashboard