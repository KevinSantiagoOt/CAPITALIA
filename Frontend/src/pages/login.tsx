import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('nombre', res.data.nombre)
      localStorage.setItem('usuarioId', res.data.id)
      navigate('/dashboard')
    } catch {
      setError('Credenciales inválidas')
    }
  }

return (
  <div style={{ display: 'flex', height: '100vh' }}>

                                      {/* -------------------- PANEL IZQUIERDO --------------------------------*/}
    <div style={{ width: '45%', backgroundColor: '#1e3a5f', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '7.5rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#f59e0b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#1e3a5f' }}>$</div>
          <span style={{ color: 'white', fontSize: '50px', fontWeight: '500', fontFamily: 'sans-serif' }}>Capitalia</span>
        </div>
        <p style={{ color: '#93b4d4', fontSize: '25px', marginTop: '1rem', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
          Gestión inteligente de préstamos e intereses para tu negocio financiero.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'sans-serif' }}>
        {['Deudores y Préstamos', 'Cuotas y Pagos', 'Letras y Contratos'].map((item, i) => (
          <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 50px' }}>
            <p style={{ color: '#93b4d4', fontSize: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{['Control total', 'Seguimiento', 'Documentos'][i]}</p>
            <p style={{ color: 'white', fontWeight: '500' }}>{item}</p>
          </div>
        ))}
      </div>
    </div>

                                      {/* ------------------------ PANEL DERECHO ----------------------------- */}
    <div style={{ width: '55%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 2rem' }}>
        <h2 style={{ fontSize: '50px', fontWeight: '500', color: '#1a202c', marginBottom: '4px', fontFamily: 'sans-serif' }}>Bienvenido</h2>
        <p style={{ fontSize: '25px', color: '#718096', marginBottom: '2rem', fontFamily: 'sans-serif' }}>Ingresa tus credenciales</p>

        {error && (
          <div style={{ backgroundColor: '#fff5f5', color: '#c53030', fontSize: '17px', padding: '12px 16px', borderRadius: '8px', marginBottom: '1rem', fontFamily: 'sans-serif' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '20px', color: '#4a5568', marginBottom: '6px', fontFamily: 'sans-serif' }}>Correo electrónico</label>
            <input type="email" placeholder="ejemplo@correo.com" value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '20px', color: '#4a5568', marginBottom: '6px', fontFamily: 'sans-serif' }}>Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }} />
          </div>
          <button type="submit"
            style={{ marginLeft: '50px', width: '75%', backgroundColor: '#1e3a5f', color: 'white', padding: '11px', borderRadius: '100px', fontSize: '15px', fontWeight: '500', border: 'none', cursor: 'pointer', marginTop: '0.5rem', fontFamily: 'sans-serif' }}>
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>

  </div>
)
}

export default Login