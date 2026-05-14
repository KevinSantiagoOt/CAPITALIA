import { useNavigate } from 'react-router-dom'
import {useState, useEffect} from 'react'
import api from '../api/axios'

const Dashboard = () => {
  const navigate = useNavigate()
  const nombre = localStorage.getItem('nombre')

  const [stats, setStats] = useState({
    capitalPrestado: 0,
    interesesMes: 0,
    enMora: 0,
    deudores: 0
  })

  useEffect(() => {
    const cargarStats = async () => {
      const usuarioId = localStorage.getItem('usuarioId')
      const res = await api.get(`/prestamos/usuario/${usuarioId}`)
      const prestamos = res.data
      const capital = prestamos.reduce((acc: number, prestamo: { montoCapital: string }) => acc + Number(prestamo.montoCapital), 0)
      setStats({ capitalPrestado: capital, interesesMes: 0, enMora: 0, deudores: 0 })
    }
    cargarStats()
  }, [])    

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('nombre')
    localStorage.removeItem('usuarioId')
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '1rem' }}>
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
<div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '2rem', overflowY: 'auto' }}>
  
  {/* Título */}
  <div style={{ marginBottom: '1.5rem', justifyContent: 'space-between', display: 'flex', alignItems: 'center', fontFamily: 'sans-serif' }}>
    <h2 style={{ fontSize: '20px', fontWeight: '500', color: '#1a202c', margin: 0 }}>Principal</h2>
    <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>Resumen general de Cartera</p>
    <button style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '9px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
    + Nuevo préstamo
  </button>
  </div>

  {/* Estadisticas */}
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem', fontFamily: 'sans-serif' }}>
    
    {/* Capital Prestado */}
    <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1rem', border: '1px solid #e5e7eb' }}>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0' }}>Capital prestado</p>
      <p style={{ fontSize: '22px', fontWeight: '500', color: '#111827', margin: 0 }}>${stats.capitalPrestado?.toLocaleString() || '0'}</p>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>préstamos activos</p>
    </div>

    {/* Intereses del mes */}
    <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1rem', border: '1px solid #e5e7eb' }}>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0' }}>Intereses del mes</p>
      <p style={{ fontSize: '22px', fontWeight: '500', color: '#111827', margin: 0 }}>${stats.interesesMes?.toLocaleString() || '0'}</p>
    </div>

    {/* En mora */}
    <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1rem', border: '1px solid #e5e7eb' }}>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0' }}>En mora</p>
      <p style={{ fontSize: '22px', fontWeight: '500', color: '#c53030', margin: 0 }}>${stats.enMora?.toLocaleString() || '0'}</p>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}> =cantidad de prestamos</p>
    </div>

    {/* Deudores */}
    <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1rem', border: '1px solid #e5e7eb' }}>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0' }}>Deudores</p>
      <p style={{ fontSize: '22px', fontWeight: '500', color: '#111827', margin: 0 }}>{stats.deudores?.toLocaleString() || '0'}</p>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>deudores nuevos este mes</p>
    </div>
    </div>
</div>
</div>
)
}

export default Dashboard