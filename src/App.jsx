import React, { useState, useEffect } from "react";
import "./App.css";
import { listaPalabras } from "./data/palabras";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, remove } from "firebase/database";

// CONFIGURACIÓN DE TU FIREBASE
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

export default function App() {
  // ESTADOS DE NAVEGACIÓN Y FLUJO
  const [modo, setModo] = useState("inicio"); // inicio, local, online
  const [etapa, setEtapa] = useState("configuracion"); // configuracion, unirse, invitacion, lobby, revelar, partida
  
  // DATOS DE USUARIO Y SALA
  const [nombre, setNombre] = useState("");
  const [salaId, setSalaId] = useState("");
  const [esHost, setEsHost] = useState(false);
  const [revelado, setRevelado] = useState(false);

  // CONFIGURACIÓN DE LA PARTIDA
  const [numJugadores, setNumJugadores] = useState(5);
  const [numImpostores, setNumImpostores] = useState(1);
  const [conPista, setConPista] = useState(true);

  // ESTADOS DE JUEGO (DATOS DINÁMICOS)
  const [jugadoresLista, setJugadoresLista] = useState([]);
  const [miRol, setMiRol] = useState(null);
  const [palabraRonda, setPalabraRonda] = useState("");
  const [jugadorActualLocal, setJugadorActualLocal] = useState(0);

  // 1. LÓGICA DE DETECCIÓN DE LINK (URL PARAMETERS)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaParam = params.get("sala");
    if (salaParam) {
      setSalaId(salaParam.toUpperCase());
      setModo("online");
      setEtapa("invitacion");
    }
  }, []);

  // 2. ESCUCHADOR DE FIREBASE PARA MODO ONLINE
  useEffect(() => {
    if (modo === "online" && salaId && etapa !== "invitacion") {
      const salaRef = ref(db, 'salas/' + salaId.toUpperCase());
      const unsubscribe = onValue(salaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEtapa(data.etapa);
          setPalabraRonda(data.palabraRonda || "");
          setNumJugadores(data.config?.numJugadores || 5);
          setNumImpostores(data.config?.numImpostores || 1);
          
          const lista = data.jugadores ? Object.values(data.jugadores) : [];
          setJugadoresLista(lista);
          
          const yo = lista.find(p => p.nombre === nombre.toUpperCase());
          if (yo) setMiRol(yo);
        } else {
          // Si el host borra la sala, todos vuelven al inicio
          if (etapa !== "configuracion" && etapa !== "unirse") {
            volverAlInicio();
          }
        }
      });
      return () => unsubscribe();
    }
  }, [modo, salaId, nombre, etapa]);

  // --- ACCIONES GENERALES ---
  const volverAlInicio = () => {
    setModo("inicio");
    setEtapa("configuracion");
    setSalaId("");
    setEsHost(false);
    setRevelado(false);
    setJugadorActualLocal(0);
    window.history.replaceState({}, document.title, "/");
  };

  const copiarLink = () => {
    const link = `${window.location.origin}?sala=${salaId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert("¡Link copiado correctamente!");
    });
  };

  // --- LÓGICA MODO LOCAL (UN SOLO DISPOSITIVO) ---
  const iniciarJuegoLocal = () => {
    if (numJugadores < 3) return alert("Mínimo 3 jugadores");
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

  // --- LÓGICA MODO ONLINE ---
  const crearSalaOnline = () => {
    if (!nombre) return alert("Por favor, ingresa tu nombre");
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSalaId(id);
    setEsHost(true);
    set(ref(db, 'salas/' + id), {
      etapa: "lobby",
      config: { numJugadores, numImpostores, conPista },
      jugadores: { [nombre.toUpperCase()]: { nombre: nombre.toUpperCase(), vivo: true, host: true } }
    });
  };

  const unirseSalaManual = () => {
    if (!nombre || !salaId) return alert("Faltan datos");
    setEtapa("lobby"); // Pasamos al lobby para empezar a escuchar los datos de esa sala
  };

  const aceptarInvitacion = () => {
    if (!nombre) return alert("Ingresa tu nombre para entrar");
    update(ref(db, `salas/${salaId}/jugadores/${nombre.toUpperCase()}`), {
      nombre: nombre.toUpperCase(),
      vivo: true,
      host: false
    }).then(() => {
      setEtapa("lobby");
    });
  };

  const iniciarPartidaOnline = () => {
    if (jugadoresLista.length < 3) return alert("Faltan jugadores para iniciar");
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

  const terminarYBorrarSala = () => {
    if (window.confirm("¿Seguro que quieres terminar? Se reiniciará para todos.")) {
      if (modo === "online") {
        remove(ref(db, 'salas/' + salaId));
      }
      volverAlInicio();
    }
  };

  return (
    <div className="main-card">
      {/* BOTÓN VOLVER (Disponible en configuración y lobby) */}
      {modo !== "inicio" && etapa !== "partida" && (
        <button className="btn-back" onClick={volverAlInicio}>← VOLVER AL MENÚ</button>
      )}

      {/* 1. MENÚ PRINCIPAL */}
      {modo === "inicio" && (
        <>
          <h1 className="title-glow">IMPOSTOR</h1>
          <div className="button-group">
            <button className="btn-modern" onClick={() => setModo("local")}>JUEGO ÚNICO</button>
            <button className="btn-modern" onClick={() => setModo("online")}>JUEGO ONLINE</button>
          </div>
        </>
      )}

      {/* 2. CONFIGURACIÓN (LOCAL O CREAR ONLINE) */}
      {modo !== "inicio" && etapa === "configuracion" && (
        <>
          <h2>{modo === "online" ? "CREAR SALA ONLINE" : "CONFIGURAR PARTIDA"}</h2>
          {modo === "online" && (
            <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          )}
          <div className="input-group">
            <label>JUGADORES</label>
            <input type="number" className="input-box" value={numJugadores} onChange={e => setNumJugadores(e.target.value)} />
          </div>
          <div className="input-group">
            <label>IMPOSTORES</label>
            <input type="number" className="input-box" value={numImpostores} onChange={e => setNumImpostores(e.target.value)} />
          </div>
          <label className="checkbox-container">
            <input type="checkbox" checked={conPista} onChange={() => setConPista(!conPista)} />
            <span>Pistas para impostores</span>
          </label>
          <button className="btn-modern btn-start" onClick={modo === "online" ? crearSalaOnline : iniciarJuegoLocal}>
            {modo === "online" ? "GENERAR SALA Y LINK" : "EMPEZAR"}
          </button>
          {modo === "online" && (
            <button className="btn-back" style={{marginTop: '15px'}} onClick={() => setEtapa("unirse")}>Ya tengo un código</button>
          )}
        </>
      )}

      {/* 3. PANTALLA DE UNIRSE (MANUAL) */}
      {modo === "online" && etapa === "unirse" && (
        <>
          <h2>UNIRSE A SALA</h2>
          <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          <input className="input-box" placeholder="CÓDIGO (Ej: AX42)" value={salaId} onChange={e => setSalaId(e.target.value.toUpperCase())} />
          <button className="btn-modern" onClick={aceptarInvitacion}>ENTRAR A LA SALA</button>
        </>
      )}

      {/* 4. PANTALLA DE INVITACIÓN (POR LINK) */}
      {modo === "online" && etapa === "invitacion" && (
        <>
          <h2>INVITACIÓN RECIBIDA</h2>
          <div className="sala-badge">SALA: {salaId}</div>
          <p>Introduce tu nombre para unirte:</p>
          <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          <button className="btn-modern btn-start" onClick={aceptarInvitacion}>ACEPTAR Y ENTRAR</button>
        </>
      )}

      {/* 5. LOBBY DE ESPERA (ONLINE) */}
      {modo === "online" && etapa === "lobby" && (
        <>
          <div className="sala-header">
            <h2 style={{color: 'var(--modern-blue)'}}>SALA: {salaId}</h2>
            <button className="btn-copy" onClick={copiarLink}>🔗 COPIAR LINK</button>
          </div>
          <p className="status-text">Jugadores en sala: {jugadoresLista.length}</p>
          <div className="lives-grid">
            {jugadoresLista.map((p, i) => (
              <div key={i} className="player-item">❤️ {p.nombre}</div>
            ))}
          </div>
          {esHost ? (
            <button className="btn-modern btn-start" onClick={iniciarPartidaOnline}>EMPEZAR JUEGO</button>
          ) : (
            <div className="waiting-container">
              <p className="animate-pulse">Esperando que el anfitrión inicie...</p>
            </div>
          )}
        </>
      )}

      {/* 6. REVELAR PALABRA / ROL */}
      {etapa === "revelar" && (
        <div className="reveal-box">
          <h2 className="reveal-title">
            {modo === "local" ? jugadoresLista[jugadorActualLocal]?.nombre : "TU ROL"}
          </h2>
          {!revelado ? (
            <button className="btn-modern" onClick={() => setRevelado(true)}>VER MI ROL</button>
          ) : (
            <div className="revealed-content">
              { (modo === "local" ? jugadoresLista[jugadorActualLocal].tipo : miRol?.tipo) === "impostor" ? (
                <>
                  <span className="text-impostor">IMPOSTOR</span>
                  <p className="pista-text">Pista: {modo === "local" ? jugadoresLista[jugadorActualLocal].pista : miRol?.pista}</p>
                </>
              ) : (
                <>
                  <p className="label-rol">TU PALABRA ES:</p>
                  <span className="text-palabra">{palabraRonda}</span>
                </>
              )}
              <button className="btn-modern" style={{marginTop: '30px'}} onClick={() => {
                setRevelado(false);
                if (modo === "local") {
                  if (jugadorActualLocal + 1 < numJugadores) setJugadorActualLocal(jugadorActualLocal + 1);
                  else setEtapa("partida");
                } else {
                  setEtapa("partida");
                }
              }}>
                {modo === "local" && jugadorActualLocal + 1 < numJugadores ? "SIGUIENTE JUGADOR" : "LISTO PARA JUGAR"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 7. PARTIDA (ELIMINACIÓN) */}
      {etapa === "partida" && (
        <>
          <h1 className="arena-title">LA ARENA</h1>
          <div className="lives-grid">
            {jugadoresLista.map((p, idx) => (
              <div 
                key={idx} 
                className={`player-item ${!p.vivo ? 'dead' : ''}`} 
                onClick={() => {
                  if (modo === "local") {
                    const copia = [...jugadoresLista];
                    copia[idx].vivo = !copia[idx].vivo;
                    setJugadoresLista(copia);
                  } else if (esHost) {
                    update(ref(db, `salas/${salaId}/jugadores/${p.nombre}`), { vivo: !p.vivo });
                  }
                }}
              >
                <span className="heart-icon">{p.vivo ? "❤️" : "🖤"}</span>
                <p className="player-name">{p.nombre}</p>
              </div>
            ))}
          </div>
          {(modo === "local" || esHost) && (
            <div className="admin-actions">
              <button className="btn-modern btn-danger" onClick={terminarYBorrarSala}>TERMINAR Y NUEVA PARTIDA</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}