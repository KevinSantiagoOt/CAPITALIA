import { useNavigate } from "react-router-dom";


const Debtors = () => {
  const navigate = useNavigate();
  const nombre = localStorage.getItem("nombre");

{/* ACCION DE CERRRAR SESION Y LIMPIAR DATOS */}
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("nombre");
    localStorage.removeItem("usuarioId");
    navigate("/");
  };

{/* INTERFAZ GRAFICA DE DEUDORES */}
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* ------------------------------------------------------------ PANEL IZQUIERDO --------------------------------------------------------*/}
      <div
        style={{
          width: "220px",
          flexShrink: 0,
          backgroundColor: "#1e3a5f",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                minWidth: "36px",
                backgroundColor: "#f59e0b",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "900",
                color: "#1e3a5f",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              C$
            </div>
            <span
              style={{
                color: "white",
                fontSize: "18px",
                fontWeight: "500",
                marginRight: "50px",
              }}
            >
              Capitalia
            </span>
          </div>
        </div>

        {/* ----------------------------- Botones de navegacion izquierdos ------------------------------*/}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            marginTop: "1rem",
          }}
        >
          <button
          onClick={() => navigate('/dashboard')}
            style={{
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
            }}
          >
            Principal
          </button>
          <button
            onClick={() => navigate('/debtors')}
            style={{
              width: "100%",
              backgroundColor: "transparent",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
            }}
          >
            Deudores
          </button>
          <button
            style={{
              width: "100%",
              backgroundColor: "transparent",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
            }}
          >
            Préstamos
          </button>
          <button
            style={{
              width: "100%",
              backgroundColor: "transparent",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
            }}
          >
            Cuotas
          </button>
          <button
            style={{
              width: "100%",
              backgroundColor: "transparent",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
            }}
          >
            Documentos
          </button>
        </div>

        {/* ----------------------------- Botones de Administrador y Cerrar Sesion ------------------------------ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            style={{
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
              fontFamily: "sans-serif",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: "500" }}>
                {nombre}
              </span>
              <span style={{ fontSize: "11px", color: "#93b4d4" }}>
                Administrador
              </span>
            </div>
          </button>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              backgroundColor: "transparent",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
              fontFamily: "sans-serif",
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ PANEL CENTRAL --------------------------------------------------------*/}
      <div style={{ 
          flex : 1,
          backgroundColor: "#f8fafc",
          padding : "2rem",
          overflowY : "auto",
          fontFamily : "sans-serif"
        }}>

        {/* --------- TITULO ---------- */}
      <div style={{ 
            marginBottom : "1.5rem",
            justifyContent : "space-between",
            display : "flex",
            alignItems : "center",
            fontFamily : "sans-serif"
          }}> 

        <h2 style={{
            fontSize: "20px",
            fontWeight: "500",
            color: "#1a202c",
            margin: 0,
          }}>
          Deudores
        </h2>

        <p style={{
            fontSize: "13px",
            color: "#6b7280", 
            margin: "4px 0 0 0",
          }}>
          Resumen General de Deudores Registrados
        </p>

      </div>
        {/*---------- CONTENEDORES DE ESTADISTICAS -------------- */}
        <div
          style={{
            display : "grid",
            gridTemplateColumns : "repeat(4, 1fr)",
            gap : "12px",
            marginBottom : "1.5rem",
            fontFamily : "sans-serif",
          }}
        >
        <div
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "1rem",
              border: "1px solid #e5e7eb",
              fontFamily: "sans-serif",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "0 0 6px 0",
              }}
            >
              Deudores
            </p>
            <p
              style={{
                fontSize: "22px",
                fontWeight: "500",
                color: "#111827",
                margin: 0,
              }}
            >
              {  }
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "4px 0 0 0",
              }}
            >
              Total deudores Registrados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Debtors;
