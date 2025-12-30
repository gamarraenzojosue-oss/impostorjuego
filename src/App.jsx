import React, { useState, useEffect } from "react";
import "./App.css";
import { listaPalabras } from "./data/palabras";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, remove } from "firebase/database";

// CONFIGURACIÓN DE FIREBASE
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
  const [modo, setModo] = useState("inicio"); 
  const [etapa, setEtapa] = useState("configuracion"); 
  const [nombre, setNombre] = useState("");
  const [salaId, setSalaId] = useState("");
  const [esHost, setEsHost] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const [verRecordatorio, setVerRecordatorio] = useState(false);

  const [numJugadores, setNumJugadores] = useState(5);
  const [numImpostores, setNumImpostores] = useState(1);
  const [conPista, setConPista] = useState(true);

  const [jugadoresLista, setJugadoresLista] = useState([]);
  const [miRol, setMiRol] = useState(null);
  const [palabraRonda, setPalabraRonda] = useState("");
  const [jugadorActualLocal, setJugadorActualLocal] = useState(0);

  // 1. Detectar sala por URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaParam = params.get("sala");
    if (salaParam) {
      setSalaId(salaParam.toUpperCase());
      setModo("online");
      setEtapa("invitacion");
    }
  }, []);

  // 2. ESCUCHA ACTIVA DE FIREBASE (Corregida para invitados)
  useEffect(() => {
    // Si estamos en modo online y TENEMOS un salaId, escuchamos SIEMPRE
    if (modo === "online" && salaId) {
      const salaRef = ref(db, 'salas/' + salaId.toUpperCase());
      
      const unsubscribe = onValue(salaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Sincronización forzada de datos
          setEtapa(data.etapa); 
          setPalabraRonda(data.palabraRonda || "");
          
          const lista = data.jugadores ? Object.values(data.jugadores) : [];
          setJugadoresLista(lista);
          
          // Actualizar mi rol constantemente
          const yo = lista.find(p => p.nombre === nombre.toUpperCase());
          if (yo) setMiRol(yo);
        } else {
          // Si la sala desaparece y no estamos configurando, resetear
          if (etapa !== "configuracion" && etapa !== "unirse" && etapa !== "invitacion") {
            volverAlInicio();
          }
        }
      });
      return () => unsubscribe();
    }
  }, [modo, salaId, nombre]); 

  const volverAlInicio = () => {
    setModo("inicio");
    setEtapa("configuracion");
    setSalaId("");
    setEsHost(false);
    setRevelado(false);
    setVerRecordatorio(false);
    window.history.replaceState({}, document.title, "/");
  };

  const copiarLink = () => {
    const link = `${window.location.origin}?sala=${salaId}`;
    navigator.clipboard.writeText(link).then(() => alert("¡Link copiado!"));
  };

  const crearSalaOnline = () => {
    if (!nombre) return alert("Pon tu nombre");
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSalaId(id);
    setEsHost(true);
    // El Host crea la sala y entra al lobby
    set(ref(db, 'salas/' + id), {
      etapa: "lobby",
      config: { numJugadores, numImpostores, conPista },
      jugadores: { [nombre.toUpperCase()]: { nombre: nombre.toUpperCase(), vivo: true, host: true } }
    }).then(() => setEtapa("lobby"));
  };

  const aceptarInvitacion = () => {
    if (!nombre || !salaId) return alert("Faltan datos");
    // Al actualizar, el useEffect de arriba detectará el cambio y los meterá al lobby automáticamente
    update(ref(db, `salas/${salaId.toUpperCase()}/jugadores/${nombre.toUpperCase()}`), {
      nombre: nombre.toUpperCase(), vivo: true, host: false
    }).then(() => {
      setEtapa("lobby");
    });
  };

  const iniciarPartidaOnline = () => {
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
    update(ref(db, `salas/${salaId}`), { etapa: "partida" });
  };

  return (
    <div className="main-card">
      {modo !== "inicio" && etapa !== "partida" && (
        <button className="btn-back" onClick={volverAlInicio}>← SALIR</button>
      )}

      {modo === "inicio" && (
        <>
          <h1 className="title-glow">IMPOSTOR</h1>
          <div className="button-group">
            <button className="btn-modern" onClick={() => setModo("local")}>MODO LOCAL</button>
            <button className="btn-modern" onClick={() => setModo("online")}>MODO ONLINE</button>
          </div>
        </>
      )}

      {(etapa === "configuracion" || etapa === "invitacion" || etapa === "unirse") && modo === "online" && (
        <div className="setup-container">
          <h2>{etapa === "invitacion" ? "SALA ENCONTRADA" : "CONFIGURAR"}</h2>
          <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          {etapa === "unirse" && <input className="input-box" placeholder="CÓDIGO" value={salaId} onChange={e => setSalaId(e.target.value.toUpperCase())} />}
          
          {etapa === "configuracion" && (
            <>
              <label>JUGADORES</label>
              <input type="number" className="input-box" value={numJugadores} onChange={e => setNumJugadores(e.target.value)} />
              <label>IMPOSTORES</label>
              <input type="number" className="input-box" value={numImpostores} onChange={e => setNumImpostores(e.target.value)} />
            </>
          )}

          <button className="btn-modern btn-start" onClick={etapa === "configuracion" ? crearSalaOnline : aceptarInvitacion}>
            {etapa === "configuracion" ? "CREAR SALA" : "ENTRAR A JUGAR"}
          </button>
        </div>
      )}

      {etapa === "lobby" && (
        <div className="lobby-container">
          <h2>SALA: {salaId}</h2>
          <button className="btn-copy" onClick={copiarLink}>🔗 COPIAR LINK</button>
          <p>Jugadores en sala: {jugadoresLista.length}</p>
          <div className="lives-grid">
            {jugadoresLista.map((p, i) => (
              <div key={i} className="player-item">❤️ {p.nombre}</div>
            ))}
          </div>
          {esHost ? (
            <button className="btn-modern btn-start" onClick={iniciarPartidaOnline}>EMPEZAR JUEGO</button>
          ) : (
            <p className="animate-pulse">Esperando al anfitrión...</p>
          )}
        </div>
      )}

      {etapa === "revelar" && (
        <div className="reveal-box">
          <h2>{miRol?.nombre || nombre}</h2>
          {!revelado ? (
            <button className="btn-modern" onClick={() => setRevelado(true)}>VER MI ROL</button>
          ) : (
            <div>
              {miRol?.tipo === "impostor" ? (
                <span className="text-impostor">IMPOSTOR</span>
              ) : (
                <span className="text-palabra">{palabraRonda}</span>
              )}
              <div style={{marginTop:'20px'}}>
                {esHost ? (
                  <button className="btn-modern" onClick={irALaArenaOnline}>IR A LA ARENA</button>
                ) : (
                  <p className="animate-pulse">Esperando al host para ir a la arena...</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {etapa === "partida" && (
        <div className="arena-container">
          <div className="lives-grid">
            {jugadoresLista.map((p, idx) => (
              <div key={idx} className={`player-item ${!p.vivo ? 'dead' : ''}`} 
                onClick={() => esHost && update(ref(db, `salas/${salaId}/jugadores/${p.nombre}`), { vivo: !p.vivo })}>
                <span>{p.vivo ? "❤️" : "🖤"}</span><p>{p.nombre}</p>
              </div>
            ))}
          </div>
          <button className="btn-copy" onClick={() => setVerRecordatorio(!verRecordatorio)}>👁️ RECORDAR MI ROL</button>
          {verRecordatorio && <p>Eres: <strong>{miRol?.tipo === "impostor" ? "IMPOSTOR" : palabraRonda}</strong></p>}
          {esHost && <button className="btn-modern btn-danger" onClick={() => remove(ref(db, 'salas/' + salaId))}>REINICIAR TODO</button>}
        </div>
      )}
    </div>
  );
}