import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api/axios";

    interface Prestamo {
    id: string
    montoCapital: string
    estado: string
    fechaFinPlazo: string
    deudor: { nombre: string }
  } 

    interface prestamoVencido{
      id: string
      nombreDeudor: string
      fechaVencimiento: string
      montoInteres: string
    }

const Dashboard = () => {
  const navigate = useNavigate();
  const nombre = localStorage.getItem("nombre");
  const mes = new Date().toLocaleString("es-CO", { month: "long" });

  const [stats, setStats] = useState({
    capitalPrestado: 0,
    interesesMes: 0,
    enMora: 0,
    deudores: 0,
    prestamosActivos: 0,
    interesesEsteMes: 0
  });

  // Almacenar los intereses del mes actual
  const [stats3, setStats3] = useState({
    interesesEsteMes: 0,
  });

  //Buscar si existe el deudor por cedula
  const [deudorExiste, setDeudorExiste] = useState({
    existe: false,
    nombre: "",
    cedula: "",
    id: "",
  });

  // Almacenar los datos de las cuotas vencidas
  const [cuotasVencidas, setCuotasVencidas] = useState<prestamoVencido[]>([])

  const [cedula, setCedula] = useState("");

  //Modal de cuotas en mora
  const [modalAbierto, setModalAbierto] = useState(false);

  //Modal de Nuevo Prestamo
  const [modalAbiertoNuevoPrestamo, setModalNuevoPrestamo] = useState(false);

  //estado de busqueda
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  // Datos para crear un nuevo deudor
  const [nuevoDeudor, setNuevoDeudor] = useState({
    nombreNewDeudor: "",
    telefono: "",
    direccion: "",
    id: "",
  });

  // Obtener prestamos activos 
    const [mostrarPrestamosActivos, setPrestamosActivos] = useState<Prestamo[]>([])
  
  useEffect(() => {
    const cargarStats = async () => {
      const usuarioId = localStorage.getItem("usuarioId");

  // Obtener prestamos del usuario para calcular capital prestado
      const res = await api.get(`/prestamosactivos/usuario/${usuarioId}`);
      const prestamos = res.data;
      const capital = prestamos.reduce(
        (acc: number, prestamo: { montoCapital: string }) =>
          acc + Number(prestamo.montoCapital),
        0,
      )
      setStats((prev) => ({ ...prev, capitalPrestado: capital }));
      setPrestamosActivos(prestamos);

      // ------------- Obtener deudores del usuario para contar cantidad ------------------------//
      const res2 = await api.get(`/alldeudores/${usuarioId}`);
      const deudores = res2.data;
      setStats((prev) => ({ ...prev, deudores: deudores.length }));

      // ------------------------Obtener intereses del mes----------------------------//
      const res4 = await api.get(`/cuotas/prestamo/${usuarioId}/vencenpronto`);
      const interesesEsteMes = res4.data;
      const totalIntereses = interesesEsteMes.reduce(
        (acc: number, cuota: { montoInteres: string }) =>
          acc + Number(cuota.montoInteres),
        0,
      );
      setStats3((prev) => ({ ...prev, interesesEsteMes: totalIntereses }));

      // --------------------------Obtener total en mora-------------------------------------//
      const res5 = await api.get(`/cuotas/prestamo/${usuarioId}/vencidas`);
      const dtVencidas = res5.data;
      const totalVencidas = dtVencidas.reduce(
        (acc: number, cuota: { montoInteres: string }) =>
          acc + Number(cuota.montoInteres),
        0,
      );
      const datosVencidas = dtVencidas.map((cuota: { id: string; prestamo: { deudor: {nombre: string}}; fechaVencimiento: string; montoInteres: string }) => ({
        id: cuota.id,
        nombreDeudor: cuota.prestamo.deudor.nombre,
        fechaVencimiento: cuota.fechaVencimiento,
        montoInteres: cuota.montoInteres,
      }));
      setStats((prev) => ({ ...prev, enMora: totalVencidas }));
      setCuotasVencidas(datosVencidas)
    };

    cargarStats();
  }, []);

  // ----------------------------------Función para cerrar sesión y limpiar los datos de login-------------------------//
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("nombre");
    localStorage.removeItem("usuarioId");
    navigate("/");
  };

  // ----------------------------------Función para abrir y cerrar el modal de cuotas en mora-------------------------//
  const toggleModal = () => {
    setModalAbierto(!modalAbierto);
  };

  // ----------------------------------Función para abrir y cerrar el modal de Nuevo Prestamo-------------------------//
  const modalNuevoPrestamo = () => {
    setModalNuevoPrestamo(!modalAbiertoNuevoPrestamo);
  };

  // ----------------------------------Función para buscar deudor por cedula-------------------------//
  const buscarDeudor = async () => {
    try {
      const res = await api.get(`/deudores/cedula/${cedula}`);
      const result = res.data;
      const datos = result.nombre || result.cedula;
      setDeudorExiste(
        datos
          ? {
              existe: true,
              nombre: result.nombre,
              cedula: result.cedula,
              id: result.id,
            }
          : { existe: false, nombre: "", cedula: "", id: "" },
      );
    } catch {
      setDeudorExiste({ existe: false, nombre: "", cedula: "", id: "" });
      setBusquedaRealizada(true);
    }
  };

  const newDeudor = async () => {
    const usuarioId = localStorage.getItem("usuarioId");
    const res = await api.post("/deudores", {
      nombre: nuevoDeudor.nombreNewDeudor,
      cedula,
      telefono: nuevoDeudor.telefono,
      direccion: nuevoDeudor.direccion,
      usuarioId,
    });
    setDeudorExiste({
      existe: true,
      nombre: nuevoDeudor.nombreNewDeudor,
      cedula: cedula,
      id: res.data.id,
    });
  };

  const cerrarModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCedula("");
    setBusquedaRealizada(false);
    setDeudorExiste({ existe: false, nombre: "", cedula: "", id: "" });
    setNuevoDeudor({
      nombreNewDeudor: "",
      telefono: "",
      direccion: "",
      id: "",
    });
    modalNuevoPrestamo();
  };  

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
      {/* -------------------------------------------------------------- PANEL DERECHO -------------------------------------------------- */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#f8fafc",
          padding: "2rem",
          overflowY: "auto",
          fontFamily: "sans-serif",
        }}
      >
        {/*------------------------ Título------------------------ */}
        <div
          style={{
            marginBottom: "1.5rem",
            justifyContent: "space-between",
            display: "flex",
            alignItems: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "500",
              color: "#1a202c",
              margin: 0,
            }}
          >
            Principal
          </h2>
          <p
            style={{ fontSize: "13px", color: "#6b7280", margin: "4px 0 0 0" }}
          >
            Resumen general de Cartera
          </p>
          {/*------------------------ Boton y Accion de crear un nuevo prestamo---------------- */}
          <button
            onClick={modalNuevoPrestamo}
            style={{
              backgroundColor: "#1e3a5f",
              color: "white",
              padding: "9px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Nuevo préstamo
          </button>
        </div>

        {/*------------------------------ CONTENEDORES DE ESTADISTICAS -------------------- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            marginBottom: "1.5rem",
            fontFamily: "sans-serif",
          }}
        >
          {/*------------------- Capital Prestado ------------------- */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "1rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "0 0 6px 0",
              }}
            >
              Capital prestado activo
            </p>
            <p
              style={{
                fontSize: "22px",
                fontWeight: "500",
                color: "#111827",
                margin: 0,
              }}
            >
              ${stats.capitalPrestado?.toLocaleString() || "0"}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "4px 0 0 0",
              }}
            >
              {stats.prestamosActivos?.toLocaleString() || "0"} préstamos
              activos
            </p>
          </div>

          {/*------------------- Intereses del mes ------------------- */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "1rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "0 0 6px 0",
              }}
            >
              Intereses del mes de {mes.charAt(0).toUpperCase() + mes.slice(1)}
            </p>
            <p
              style={{
                fontSize: "22px",
                fontWeight: "500",
                color: "#111827",
                margin: 0,
              }}
            >
              ${stats3.interesesEsteMes?.toLocaleString() || "0"}
            </p>
          </div>

          {/*------------------- En mora ------------------- */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "1rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "0 0 6px 0",
              }}
            >
              En mora
            </p>
            <p
              style={{
                fontSize: "22px",
                fontWeight: "500",
                color: "#c53030",
                margin: 0,
              }}
            >
              ${stats.enMora?.toLocaleString() || "0"}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                margin: "-6px",
              }}
            >
          {/*------------------- Boton de ver mas en Mora ------------------- */}
              <button
                onClick={toggleModal}
                disabled={stats.enMora === 0}
                style={{
                  opacity: stats.enMora === 0 ? 0.4 : 1,
                  cursor: stats.enMora === 0 ? "not-allowed" : "pointer",
                  backgroundColor: "transparent",
                  color: "#c53030",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "500",
                  border: "1px solid #c53030",
                  marginTop: "8px",
                }}
              >
                Ver más
              </button>
            </div>
          </div>

          {/* --------------------- Deudores ------------------------------- */}
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
              {stats.deudores?.toLocaleString() || "0"}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "4px 0 0 0",
              }}
            >
              deudores nuevos este mes
            </p>
          </div>
        </div>

        {/*------------------- Mostrar Modal (Ver mas) sobre cuotas en mora ------------------- */}
        {modalAbierto && (
          <div
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 1,
              width: "100%",
              height: "100%",
              position: "fixed",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: "sans-serif",
            }}
          >
            <div
              style={{
                margin: "10rem",
                padding: "1rem",
                width: "40%",
                minWidth: "10%",
                maxWidth: "40%",
                borderRadius: "1rem",
                backgroundColor: "#1e3a5f",
                overflowY: "auto",
                maxHeight: "700px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "500",
                  padding: "1rem",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Información de Cuotas en Mora
              </div>

              <div
                style={{
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "400",
                  padding: "1rem",
                }}
              >
                {cuotasVencidas.map((prestamoVencido) => (
                    <div
                      key={prestamoVencido.id}
                      style={{
                        marginBottom: "1rem",
                        padding: "0.5rem",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <p>
                        <strong>Deudor:</strong> {prestamoVencido.nombreDeudor}
                      </p>
                      <p>
                        <strong>Fecha de vencimiento:</strong>{" "}
                        {new Date(prestamoVencido.fechaVencimiento).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Monto de interés:</strong> $
                        {prestamoVencido.montoInteres?.toLocaleString() || "0"}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  padding: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                {/*-------------------- Boton de cerrar Modal en Mora ---------------------- */}
                <button
                  onClick={toggleModal}
                  style={{
                    border: "1px solid transparent",
                    cursor: "pointer",
                    borderRadius: "8px",
                    backgroundColor: "transparent",
                    borderColor: "white",
                    color: "white",
                    marginTop: "8px",
                    padding: "6px 12px",
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/*---------------------- Modal para crear un nuevo préstamo ---------------------- */}
        {modalAbiertoNuevoPrestamo && (
          <div
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 1,
              width: "100%",
              height: "100%",
              position: "fixed",
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: "sans-serif",
            }}
          >
            <div
              style={{
                padding: "1rem",
                width: "40%",
                borderRadius: "1rem",
                backgroundColor: "#1e3a5f",
                overflowY: "auto",
                maxHeight: "700px",
                minHeight: "400px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: "white",
                  fontSize: "20px",
                  padding: "1rem",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Crear Nuevo Préstamo
              </div>

              <div
                style={{
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "400",
                  padding: "1rem",
                  alignItems: "center",
                  flexDirection: "column",
                }}
              >
                <label
                  style={{
                    fontSize: "20px",
                    color: "white",
                    fontFamily: "sans-serif",
                    flexDirection: "column",
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  Ingrese los siguientes datos del Deudor
                </label>

                {/*------------------------ Celda de cedula en agregar prestamo -------------------- */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "40px",
                  }}
                >
                  <input
                    type="Number"
                    placeholder="Cédula"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    style={{
                      width: "30%",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "14px",
                    }}
                  />
                  {/*------------------------ Boton de buscar Deudor con la cedula -------------------- */}
                  {!busquedaRealizada && (
                    <div
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <button
                        onClick={buscarDeudor}
                        style={{
                          backgroundColor: "transparent",
                          color: "white",
                          padding: "9px 6px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          cursor: "pointer",
                          borderColor: "white",
                          marginBottom: "1rem",
                        }}
                      >
                        Buscar Deudor
                      </button>
                    </div>
                  )}
                  <div />
                  {/*------------------------ Mostrar celdas de Nuevo Deudor -------------------- */}
                  {busquedaRealizada && !deudorExiste.existe && (
                    <div
                      style={{
                        color: "white",
                        fontSize: "20px",
                        fontWeight: "400",
                        padding: "1rem",
                        flexDirection: "column",
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        marginBottom: "1rem",
                      }}
                    >
                      <h4>Nuevo Deudor</h4>
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={nuevoDeudor.nombreNewDeudor}
                        onChange={(e) =>
                          setNuevoDeudor({
                            ...nuevoDeudor,
                            nombreNewDeudor: e.target.value,
                          })
                        }
                        style={{
                          width: "80%",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          fontSize: "14px",
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Teléfono"
                        value={nuevoDeudor.telefono}
                        onChange={(e) =>
                          setNuevoDeudor({
                            ...nuevoDeudor,
                            telefono: e.target.value,
                          })
                        }
                        style={{
                          width: "80%",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          fontSize: "14px",
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Dirección"
                        value={nuevoDeudor.direccion}
                        onChange={(e) =>
                          setNuevoDeudor({
                            ...nuevoDeudor,
                            direccion: e.target.value,
                          })
                        }
                        style={{
                          width: "80%",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  padding: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                {/*------------------------ Boton de cerrar Model Nuevo Prestamo -------------------- */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cerrarModal(e);
                    modalNuevoPrestamo();
                  }}
                  style={{
                    border: "1px solid transparent",
                    cursor: "pointer",
                    borderRadius: "8px",
                    backgroundColor: "transparent",
                    borderColor: "white",
                    color: "white",
                    marginTop: "8px",
                    padding: "6px 12px",
                  }}
                  type="button"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/*------------------------- Mostrar tabla de prestamos activos ---------------------------- */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Deudor
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Monto
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Estado
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Fecha límite de pago
              </th>
            </tr>
          </thead>
          <tbody>
            {mostrarPrestamosActivos.map((prestamo) => (
                <tr
                  key={prestamo.id}
                  style={{ borderBottom: "1px solid #e5e7eb" }}
                >
                  <td style={{ padding: "12px" }}>{prestamo.deudor.nombre}</td>
                  <td style={{ padding: "12px" }}>
                    ${prestamo.montoCapital?.toLocaleString() || "0"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {prestamo.estado.charAt(0).toUpperCase() +
                      prestamo.estado.slice(1)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {new Date(prestamo.fechaFinPlazo).toLocaleDateString()}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
