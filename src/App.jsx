import React, { useState, useEffect } from "react";
import "./App.css";
import { listaPalabras } from "./data/palabras";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, remove } from "firebase/database";

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
  const [conectado, setConectado] = useState(false);

  const [numJugadores, setNumJugadores] = useState(5);
  const [numImpostores, setNumImpostores] = useState(1);
  const [conPista, setConPista] = useState(true);

  const [jugadoresLista, setJugadoresLista] = useState([]);
  const [miRol, setMiRol] = useState(null);
  const [palabraRonda, setPalabraRonda] = useState("");
  const [jugadorActualLocal, setJugadorActualLocal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const salaParam = params.get("sala");
    if (salaParam) {
      setSalaId(salaParam.toUpperCase());
      setModo("online");
      setEtapa("invitacion");
    }
  }, []);

  useEffect(() => {
    if (modo === "online" && salaId && conectado) {
      const salaRef = ref(db, 'salas/' + salaId.toUpperCase());
      const unsubscribe = onValue(salaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setEtapa(data.etapa); 
          setPalabraRonda(data.palabraRonda || "");
          setConPista(data.config?.conPista ?? true);
          const lista = data.jugadores ? Object.values(data.jugadores) : [];
          setJugadoresLista(lista);
          const yo = lista.find(p => p.nombre === nombre.toUpperCase());
          if (yo) setMiRol(yo);
        } else {
          if (conectado && etapa !== "configuracion") volverAlInicio();
        }
      });
      return () => unsubscribe();
    }
  }, [modo, salaId, conectado]);

  const volverAlInicio = () => {
    setModo("inicio");
    setEtapa("configuracion");
    setSalaId("");
    setEsHost(false);
    setConectado(false);
    setRevelado(false);
    setVerRecordatorio(false);
    setJugadorActualLocal(0);
    window.history.replaceState({}, document.title, "/");
  };

  const iniciarJuegoLocal = () => {
    const item = listaPalabras[Math.floor(Math.random() * listaPalabras.length)];
    setPalabraRonda(item.palabra);
    let roles = Array(Number(numJugadores)).fill(null).map((_, i) => ({
      nombre: `JUGADOR ${i + 1}`, tipo: "jugador", vivo: true
    }));
    let idxs = [...Array(Number(numJugadores)).keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numImpostores; i++) {
      roles[idxs[i]] = { 
        nombre: `JUGADOR ${idxs[i] + 1}`, 
        tipo: "impostor", 
        pista: conPista ? item.pistas[0] : null, 
        vivo: true 
      };
    }
    setJugadoresLista(roles);
    setEtapa("revelar");
  };

  const crearSalaOnline = () => {
    if (!nombre) return alert("Escribe tu nombre");
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSalaId(id);
    setEsHost(true);
    setConectado(true);
    set(ref(db, 'salas/' + id), {
      etapa: "lobby",
      config: { numJugadores, numImpostores, conPista },
      jugadores: { [nombre.toUpperCase()]: { nombre: nombre.toUpperCase(), vivo: true, host: true } }
    }).then(() => setEtapa("lobby"));
  };

  const unirseASalaOnline = () => {
    if (!nombre || !salaId) return alert("Faltan datos");
    update(ref(db, `salas/${salaId.toUpperCase()}/jugadores/${nombre.toUpperCase()}`), {
      nombre: nombre.toUpperCase(), vivo: true, host: false
    }).then(() => {
      setConectado(true);
      setEtapa("lobby");
    });
  };

  const iniciarRevelacionOnline = () => {
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

  return (
    <div className="main-card">
      {etapa !== "partida" && modo !== "inicio" && (
        <button className="btn-back" onClick={volverAlInicio}>← VOLVER AL MENÚ</button>
      )}

      {/* 1. MENÚ INICIAL */}
      {modo === "inicio" && (
        <>
          <h1 className="title-glow">IMPOSTOR</h1>
          <div className="button-group">
            <button className="btn-modern" onClick={() => setModo("local")}>MODO LOCAL</button>
            <button className="btn-modern" onClick={() => setModo("online")}>MODO ONLINE</button>
          </div>
        </>
      )}

      {/* 2. CONFIGURACIÓN (PARA LOCAL O HOST ONLINE) */}
      {etapa === "configuracion" && modo !== "inicio" && !conectado && (
        <div className="setup-container">
          <h2>{modo === "online" ? "CREAR SALA ONLINE" : "AJUSTES LOCAL"}</h2>
          {modo === "online" && (
            <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          )}
          <label>JUGADORES</label>
          <input type="number" className="input-box" value={numJugadores} onChange={e => setNumJugadores(e.target.value)} />
          <label>IMPOSTORES</label>
          <input type="number" className="input-box" value={numImpostores} onChange={e => setNumImpostores(e.target.value)} />
          <label className="checkbox-container">
            <input type="checkbox" checked={conPista} onChange={() => setConPista(!conPista)} />
            <span>Pistas para impostores</span>
          </label>
          <button className="btn-modern btn-start" onClick={modo === "online" ? crearSalaOnline : iniciarJuegoLocal}>
            {modo === "online" ? "CREAR SALA" : "EMPEZAR"}
          </button>
          {modo === "online" && (
            <button className="btn-back" style={{marginTop:'10px'}} onClick={() => setEtapa("unirse")}>Tengo un código</button>
          )}
        </div>
      )}

      {/* 3. PANTALLAS DE INVITADO (ONLINE) */}
      {modo === "online" && (etapa === "invitacion" || etapa === "unirse") && !conectado && (
        <div className="setup-container">
          <h2>{etapa === "invitacion" ? "SALA ENCONTRADA" : "UNIRSE"}</h2>
          <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          {etapa === "unirse" && (
            <input className="input-box" placeholder="CÓDIGO (Ej: AX42)" value={salaId} onChange={e => setSalaId(e.target.value.toUpperCase())} />
          )}
          <button className="btn-modern btn-start" onClick={unirseASalaOnline}>ENTRAR A LA SALA</button>
        </div>
      )}

      {/* 4. LOBBY (ESPERA) */}
      {etapa === "lobby" && conectado && (
        <div className="lobby-container">
          <h2>SALA: {salaId}</h2>
          {esHost && <button className="btn-copy" onClick={() => navigator.clipboard.writeText(`${window.location.origin}?sala=${salaId}`).then(()=>alert("¡Link copiado!"))}>🔗 COPIAR LINK</button>}
          <p>Jugadores: {jugadoresLista.length}</p>
          <div className="lives-grid">
            {jugadoresLista.map((p, i) => <div key={i} className="player-item">❤️ {p.nombre}</div>)}
          </div>
          {esHost ? (
            <button className="btn-modern btn-start" onClick={iniciarRevelacionOnline}>REVELAR ROLES</button>
          ) : (
            <p className="animate-pulse">Esperando al anfitrión...</p>
          )}
        </div>
      )}

      {/* 5. REVELAR PALABRA */}
      {etapa === "revelar" && (
        <div className="reveal-box">
          <h2>{modo === "local" ? jugadoresLista[jugadorActualLocal]?.nombre : (miRol?.nombre || nombre)}</h2>
          {!revelado ? (
            <button className="btn-modern" onClick={() => setRevelado(true)}>REVELAR ROL</button>
          ) : (
            <div>
              { (modo === "local" ? jugadoresLista[jugadorActualLocal].tipo : miRol?.tipo) === "impostor" ? (
                <div className="role-card">
                  <span className="text-impostor">IMPOSTOR</span>
                  {conPista && <p className="pista-text">Pista: {modo === "local" ? jugadoresLista[jugadorActualLocal].pista : miRol?.pista}</p>}
                </div>
              ) : (
                <div className="role-card">
                  <p>TU PALABRA:</p>
                  <span className="text-palabra">{palabraRonda}</span>
                </div>
              )}
              <button className="btn-modern" style={{marginTop:'25px'}} onClick={() => {
                setRevelado(false);
                if (modo === "local") {
                  if (jugadorActualLocal + 1 < numJugadores) setJugadorActualLocal(jugadorActualLocal+1);
                  else setEtapa("partida");
                } else if (esHost) {
                  update(ref(db, `salas/${salaId}`), { etapa: "partida" });
                }
              }}>
                {modo === "local" && jugadorActualLocal + 1 < numJugadores ? "SIGUIENTE" : (esHost ? "IR A LA ARENA" : "ESPERANDO AL HOST...")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. PARTIDA (ARENA) */}
      {etapa === "partida" && (
        <div className="arena-container">
          <div className="lives-grid">
            {jugadoresLista.map((p, i) => (
              <div key={i} className={`player-item ${!p.vivo ? 'dead' : ''}`} 
                onClick={() => (esHost || modo === "local") && (modo === "local" ? (setJugadoresLista(prev => {let n=[...prev]; n[i].vivo=!n[i].vivo; return n;})) : update(ref(db, `salas/${salaId}/jugadores/${p.nombre}`), { vivo: !p.vivo }))}>
                <span>{p.vivo ? "❤️" : "🖤"}</span><p>{p.nombre}</p>
              </div>
            ))}
          </div>
          <button className="btn-copy" onClick={() => setVerRecordatorio(!verRecordatorio)}>👁️ RECORDAR ROL</button>
          {verRecordatorio && (
            <div className="recordatorio-popup">
               { (modo === "local" ? jugadoresLista[jugadorActualLocal].tipo : miRol?.tipo) === "impostor" ? (
                <p>Eres <strong>IMPOSTOR</strong>. {conPista && `Pista: ${modo === "local" ? jugadoresLista[jugadorActualLocal].pista : miRol?.pista}`}</p>
              ) : (
                <p>Palabra: <strong>{palabraRonda}</strong></p>
              )}
            </div>
          )}
          {(esHost || modo === "local") && <button className="btn-modern btn-danger" onClick={() => {if(modo === "online") remove(ref(db, 'salas/' + salaId)); volverAlInicio();}}>REINICIAR</button>}
        </div>
      )}
    </div>
  );
}