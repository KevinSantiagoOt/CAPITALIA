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
    <div>
      <h1>Bienvenido, {nombre}</h1>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  )
}

export default Dashboard