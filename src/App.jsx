import React, { useState, useEffect } from "react";
import "./App.css";
import { listaPalabras } from "./data/palabras";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, remove } from "firebase/database";

// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBQEI6qDBQKH8Afk-ZrvD8xLknqFBTJmUk",
  authDomain: "juego-del-impostor-d01a5.firebaseapp.com",
  databaseURL: "https://juego-del-impostor-d01a5-default-rtdb.firebaseio.com",
  projectId: "juego-del-impostor-d01a5",
  storageBucket: "juego-del-impostor-d01a5.firebasestorage.app",
  messagingSenderId: "539030415074",
  appId: "1:539030415074:web:4314338b2902fa18d0a0bb",
  measurementId: "G-RS5DL2455P"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function App() {
  // --- Estados de Navegación ---
  const [modo, setModo] = useState("inicio"); 
  const [etapa, setEtapa] = useState("configuracion"); 
  
  // --- Datos de Usuario y Sala ---
  const [nombre, setNombre] = useState("");
  const [salaId, setSalaId] = useState("");
  const [esHost, setEsHost] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const [verRecordatorio, setVerRecordatorio] = useState(false);

  // --- Configuración de la Partida ---
  const [numJugadores, setNumJugadores] = useState(5);
  const [numImpostores, setNumImpostores] = useState(1);
  const [conPista, setConPista] = useState(true);

  // --- Estados Dinámicos de Juego ---
  const [jugadoresLista, setJugadoresLista] = useState([]);
  const [miRol, setMiRol] = useState(null);
  const [palabraRonda, setPalabraRonda] = useState("");
  const [jugadorActualLocal, setJugadorActualLocal] = useState(0);

  // ------------------------------------------
  // 1. EFECTO: DETECTAR INVITACIÓN POR URL
  // ------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaParam = params.get("sala");
    if (salaParam) {
      setSalaId(salaParam.toUpperCase());
      setModo("online");
      setEtapa("invitacion");
    }
  }, []);

  // ------------------------------------------
  // 2. EFECTO: ESCUCHA EN TIEMPO REAL (FIREBASE)
  // ------------------------------------------
  useEffect(() => {
    if (modo === "online" && salaId && etapa !== "invitacion") {
      const salaRef = ref(db, 'salas/' + salaId.toUpperCase());
      
      const unsubscribe = onValue(salaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // La etapa de Firebase es la VERDAD ABSOLUTA para evitar bucles
          setEtapa(data.etapa); 
          setPalabraRonda(data.palabraRonda || "");
          setNumJugadores(data.config?.numJugadores || 5);
          setNumImpostores(data.config?.numImpostores || 1);
          
          const lista = data.jugadores ? Object.values(data.jugadores) : [];
          setJugadoresLista(lista);
          
          // Buscar mi rol dentro de la lista actualizada
          const yo = lista.find(p => p.nombre === nombre.toUpperCase());
          if (yo) setMiRol(yo);
        } else {
          // Si el Host cierra la sala, todos fuera
          if (etapa !== "configuracion" && etapa !== "unirse") {
            volverAlInicio();
          }
        }
      });
      return () => unsubscribe();
    }
  }, [modo, salaId, nombre]); 

  // ------------------------------------------
  // FUNCIONES DE CONTROL
  // ------------------------------------------
  const volverAlInicio = () => {
    setModo("inicio");
    setEtapa("configuracion");
    setSalaId("");
    setEsHost(false);
    setRevelado(false);
    setVerRecordatorio(false);
    setJugadorActualLocal(0);
    window.history.replaceState({}, document.title, "/");
  };

  const copiarLink = () => {
    const link = `${window.location.origin}?sala=${salaId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert("¡Enlace de invitación copiado!");
    });
  };

  // --- Lógica Modo Local ---
  const iniciarJuegoLocal = () => {
    if (numJugadores < 3) return alert("Se necesitan al menos 3 jugadores");
    const item = listaPalabras[Math.floor(Math.random() * listaPalabras.length)];
    setPalabraRonda(item.palabra);
    
    let rolesTemp = Array(Number(numJugadores)).fill(null).map((_, i) => ({
      nombre: `JUGADOR ${i + 1}`, tipo: "jugador", vivo: true
    }));
    
    let indices = [...Array(Number(numJugadores)).keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numImpostores; i++) {
      rolesTemp[indices[i]] = { 
        nombre: `JUGADOR ${indices[i] + 1}`, 
        tipo: "impostor", 
        pista: conPista ? item.pistas[0] : null, 
        vivo: true 
      };
    }
    setJugadoresLista(rolesTemp);
    setEtapa("revelar");
    setJugadorActualLocal(0);
  };

  // --- Lógica Modo Online ---
  const crearSalaOnline = () => {
    if (!nombre) return alert("Por favor, introduce tu nombre primero");
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSalaId(id);
    setEsHost(true);
    set(ref(db, 'salas/' + id), {
      etapa: "lobby",
      config: { numJugadores, numImpostores, conPista },
      jugadores: { [nombre.toUpperCase()]: { nombre: nombre.toUpperCase(), vivo: true, host: true } }
    });
  };

  const aceptarInvitacion = () => {
    if (!nombre) return alert("Debes poner un nombre para entrar");
    update(ref(db, `salas/${salaId}/jugadores/${nombre.toUpperCase()}`), {
      nombre: nombre.toUpperCase(), vivo: true, host: false
    }).then(() => {
      setEtapa("lobby");
    });
  };

  const iniciarPartidaOnline = () => {
    if (jugadoresLista.length < 3) return alert("Mínimo 3 jugadores para empezar");
    const item = listaPalabras[Math.floor(Math.random() * listaPalabras.length)];
    const updates = {};
    let baraja = [...jugadoresLista].sort(() => Math.random() - 0.5);
    
    jugadoresLista.forEach((p) => {
      const esImp = baraja.slice(0, numImpostores).some(imp => imp.nombre === p.nombre);
      updates[`salas/${salaId}/jugadores/${p.nombre}/tipo`] = esImp ? "impostor" : "jugador";
      updates[`salas/${salaId}/jugadores/${p.nombre}/pista`] = (esImp && conPista) ? item.pistas[0] : null;
      updates[`salas/${salaId}/jugadores/${p.nombre}/vivo`] = true;
    });

    updates[`salas/${salaId}/etapa`] = "revelar";
    updates[`salas/${salaId}/palabraRonda`] = item.palabra;
    update(ref(db), updates);
  };

  const irALaArenaOnline = () => {
    // ESTA FUNCIÓN ES LA QUE SINCRONIZA A TODOS A LA VEZ
    update(ref(db, `salas/${salaId}`), { etapa: "partida" });
  };

  const terminarYBorrarSala = () => {
    if (window.confirm("¿Quieres terminar el juego? Se cerrará la sala para todos.")) {
      if (modo === "online") remove(ref(db, 'salas/' + salaId));
      volverAlInicio();
    }
  };

  // ------------------------------------------
  // RENDERIZADO DE INTERFAZ
  // ------------------------------------------
  return (
    <div className="main-card">
      {/* Botón Salir */}
      {modo !== "inicio" && etapa !== "partida" && (
        <button className="btn-back" onClick={volverAlInicio}>← SALIR AL MENÚ</button>
      )}

      {/* Pantalla 1: Inicio */}
      {modo === "inicio" && (
        <>
          <h1 className="title-glow">IMPOSTOR</h1>
          <div className="button-group">
            <button className="btn-modern" onClick={() => setModo("local")}>JUEGO ÚNICO</button>
            <button className="btn-modern" onClick={() => setModo("online")}>JUEGO ONLINE</button>
          </div>
        </>
      )}

      {/* Pantalla 2: Configuración */}
      {modo !== "inicio" && etapa === "configuracion" && (
        <div className="setup-container">
          <h2>{modo === "online" ? "CREAR NUEVA SALA" : "MODO LOCAL"}</h2>
          {modo === "online" && (
            <input className="input-box" placeholder="TU NOMBRE" maxLength={12} onChange={e => setNombre(e.target.value.toUpperCase())} />
          )}
          <div className="input-group">
            <label>N° DE JUGADORES</label>
            <input type="number" className="input-box" value={numJugadores} onChange={e => setNumJugadores(e.target.value)} />
          </div>
          <div className="input-group">
            <label>N° DE IMPOSTORES</label>
            <input type="number" className="input-box" value={numImpostores} onChange={e => setNumImpostores(e.target.value)} />
          </div>
          <button className="btn-modern btn-start" onClick={modo === "online" ? crearSalaOnline : iniciarJuegoLocal}>
            {modo === "online" ? "GENERAR CÓDIGO" : "EMPEZAR PARTIDA"}
          </button>
          {modo === "online" && (
            <button className="btn-back" style={{marginTop: '15px'}} onClick={() => setEtapa("unirse")}>Unirme con código</button>
          )}
        </div>
      )}

      {/* Pantalla 3: Invitación por Link */}
      {modo === "online" && etapa === "invitacion" && (
        <div className="setup-container">
          <h2>INVITACIÓN RECIBIDA</h2>
          <div className="sala-badge">SALA ACTUAL: {salaId}</div>
          <p>Escribe tu nombre para entrar al lobby:</p>
          <input className="input-box" placeholder="TU NOMBRE" maxLength={12} onChange={e => setNombre(e.target.value.toUpperCase())} />
          <button className="btn-modern btn-start" onClick={aceptarInvitacion}>ACEPTAR INVITACIÓN</button>
        </div>
      )}

      {/* Pantalla 4: Unirse Manual */}
      {modo === "online" && etapa === "unirse" && (
        <div className="setup-container">
          <h2>UNIRSE A SALA</h2>
          <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          <input className="input-box" placeholder="CÓDIGO DE SALA" value={salaId} onChange={e => setSalaId(e.target.value.toUpperCase())} />
          <button className="btn-modern" onClick={aceptarInvitacion}>ENTRAR A LA SALA</button>
        </div>
      )}

      {/* Pantalla 5: Lobby */}
      {modo === "online" && etapa === "lobby" && (
        <div className="lobby-container">
          <div className="sala-header">
            <h2 style={{color: 'var(--modern-blue)'}}>CÓDIGO: {salaId}</h2>
            <button className="btn-copy" onClick={copiarLink}>🔗 COPIAR LINK</button>
          </div>
          <p className="status-text">Esperando jugadores ({jugadoresLista.length})</p>
          <div className="lives-grid">
            {jugadoresLista.map((p, i) => (
              <div key={i} className="player-item pulse-item">❤️ {p.nombre}</div>
            ))}
          </div>
          {esHost ? (
            <button className="btn-modern btn-start" onClick={iniciarPartidaOnline}>INICIAR REVELACIÓN</button>
          ) : (
            <p className="animate-pulse" style={{fontWeight:'bold', color:'var(--modern-red)'}}>El anfitrión iniciará pronto...</p>
          )}
        </div>
      )}

      {/* Pantalla 6: Revelar Palabra */}
      {etapa === "revelar" && (
        <div className="reveal-box">
          <h2 className="reveal-title">
            {modo === "local" ? jugadoresLista[jugadorActualLocal]?.nombre : "TU ROL SECRETO"}
          </h2>
          {!revelado ? (
            <button className="btn-modern" onClick={() => setRevelado(true)}>REVELAR AHORA</button>
          ) : (
            <div className="revealed-content">
              { (modo === "local" ? jugadoresLista[jugadorActualLocal].tipo : miRol?.tipo) === "impostor" ? (
                <div className="role-card">
                  <span className="text-impostor">IMPOSTOR</span>
                  {conPista && <p className="pista-text">Tu Pista: {modo === "local" ? jugadoresLista[jugadorActualLocal].pista : miRol?.pista}</p>}
                </div>
              ) : (
                <div className="role-card">
                  <p className="label-rol">TU PALABRA ES:</p>
                  <span className="text-palabra">{palabraRonda}</span>
                </div>
              )}
              <button className="btn-modern" style={{marginTop: '30px'}} onClick={() => {
                setRevelado(false);
                if (modo === "local") {
                  if (jugadorActualLocal + 1 < numJugadores) setJugadorActualLocal(jugadorActualLocal + 1);
                  else setEtapa("partida");
                } else {
                  if (esHost) irALaArenaOnline(); // Sincroniza a todos
                }
              }}>
                {modo === "local" && jugadorActualLocal + 1 < numJugadores ? "SIGUIENTE JUGADOR" : (esHost ? "IR A LA ARENA" : "ESPERANDO AL HOST...")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pantalla 7: La Arena (Corazones) */}
      {etapa === "partida" && (
        <div className="arena-container">
          <h1 className="arena-title">LA ARENA</h1>
          <div className="lives-grid">
            {jugadoresLista.map((p, idx) => (
              <div key={idx} className={`player-item ${!p.vivo ? 'dead' : ''}`} 
                onClick={() => {
                  if (modo === "local") {
                    const copia = [...jugadoresLista];
                    copia[idx].vivo = !copia[idx].vivo;
                    setJugadoresLista(copia);
                  } else if (esHost) {
                    update(ref(db, `salas/${salaId}/jugadores/${p.nombre}`), { vivo: !p.vivo });
                  }
                }}>
                <span className="heart-icon">{p.vivo ? "❤️" : "🖤"}</span>
                <p className="player-name">{p.nombre}</p>
              </div>
            ))}
          </div>
          
          <div className="game-footer">
            {/* Función de Recordatorio */}
            <div className="recordatorio-section">
              <button className="btn-copy" onClick={() => setVerRecordatorio(!verRecordatorio)}>
                {verRecordatorio ? "🙈 OCULTAR ROL" : "👁️ RECORDAR MI PALABRA"}
              </button>
              {verRecordatorio && (
                <div className="recordatorio-popup">
                  <p>Tu rol: <strong className={miRol?.tipo === "impostor" ? "text-impostor" : "text-palabra"}>
                    {miRol?.tipo === "impostor" ? "IMPOSTOR" : palabraRonda}
                  </strong></p>
                </div>
              )}
            </div>

            {(modo === "local" || esHost) && (
              <button className="btn-modern btn-danger" style={{marginTop:'20px'}} onClick={terminarYBorrarSala}>TERMINAR JUEGO</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}