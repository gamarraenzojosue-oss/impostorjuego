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
  const [estaOculto, setEstaOculto] = useState(true);

  const [numJugadores, setNumJugadores] = useState(5);
  const [numImpostores, setNumImpostores] = useState(1);
  const [numRondas, setNumRondas] = useState(3);
  const [rondaActual, setRondaActual] = useState(1);
  const [conPista, setConPista] = useState(true);

  const [jugadoresLista, setJugadoresLista] = useState([]);
  const [miRol, setMiRol] = useState(null);
  const [palabraRonda, setPalabraRonda] = useState("");
  const [jugadorActualLocal, setJugadorActualLocal] = useState(0);

  // NUEVOS ESTADOS PARA MARCADOR E HISTORIAL
  const [puntosEquipo, setPuntosEquipo] = useState(0);
  const [puntosImpostores, setPuntosImpostores] = useState(0);
  const [historialRondas, setHistorialRondas] = useState([]);

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
          setRondaActual(data.rondaActual || 1);
          setConPista(data.config?.conPista ?? true);
          setNumRondas(data.config?.numRondas || 3);
          setPuntosEquipo(data.puntosEquipo || 0);
          setPuntosImpostores(data.puntosImpostores || 0);
          setHistorialRondas(data.historialRondas || []);
          
          const lista = data.jugadores ? Object.values(data.jugadores) : [];
          setJugadoresLista(lista);
          const yo = lista.find(p => p.nombre === nombre.toUpperCase());
          if (yo) setMiRol(yo);

          if (data.etapa === "revelar") {
             setRevelado(false);
             setVerRecordatorio(false);
          }
        } else {
          if (conectado && etapa !== "configuracion") volverAlInicio();
        }
      });
      return () => unsubscribe();
    }
  }, [modo, salaId, conectado, nombre, etapa]);

  const volverAlInicio = () => {
    setModo("inicio");
    setEtapa("configuracion");
    setSalaId("");
    setEsHost(false);
    setConectado(false);
    setRevelado(false);
    setVerRecordatorio(false);
    setJugadorActualLocal(0);
    setEstaOculto(true);
    setPuntosEquipo(0);
    setPuntosImpostores(0);
    setHistorialRondas([]);
    window.history.replaceState({}, document.title, "/");
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?sala=${salaId}`)
      .then(() => alert("¡Link de invitación copiado!"));
  };

  // LÓGICA DE REPARTO DE ROLES (Compartida)
  const generarRolesUpdates = (itemsPalabra) => {
    const updates = {};
    let baraja = [...jugadoresLista].sort(() => Math.random() - 0.5);
    jugadoresLista.forEach((p) => {
      const esImp = baraja.slice(0, numImpostores).some(imp => imp.nombre === p.nombre);
      updates[`salas/${salaId}/jugadores/${p.nombre}/tipo`] = esImp ? "impostor" : "jugador";
      updates[`salas/${salaId}/jugadores/${p.nombre}/pista`] = (esImp && conPista) ? itemsPalabra.pistas[0] : null;
      updates[`salas/${salaId}/jugadores/${p.nombre}/vivo`] = true;
    });
    return updates;
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
    setJugadorActualLocal(0);
    setEstaOculto(true);
  };

  const crearSalaOnline = () => {
    if (!nombre) return alert("Escribe tu nombre");
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSalaId(id);
    setEsHost(true);
    setConectado(true);
    set(ref(db, 'salas/' + id), {
      etapa: "lobby",
      rondaActual: 1,
      puntosEquipo: 0,
      puntosImpostores: 0,
      historialRondas: [],
      config: { numJugadores, numImpostores, conPista, numRondas },
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

  const finalizarRondaOnline = (ganador) => {
    const impostorNombre = jugadoresLista.find(p => p.tipo === "impostor")?.nombre || "???";
    const nuevoHistorial = [...historialRondas, { ronda: rondaActual, impostor: impostorNombre, ganoImpostor: ganador === 'impostor' }];
    
    const updates = {};
    updates[`salas/${salaId}/puntosEquipo`] = puntosEquipo + (ganador === 'equipo' ? 1 : 0);
    updates[`salas/${salaId}/puntosImpostores`] = puntosImpostores + (ganador === 'impostor' ? 1 : 0);
    updates[`salas/${salaId}/historialRondas`] = nuevoHistorial;

    if (rondaActual >= numRondas) {
      updates[`salas/${salaId}/etapa`] = "decision_final";
    } else {
      const item = listaPalabras[Math.floor(Math.random() * listaPalabras.length)];
      Object.assign(updates, generarRolesUpdates(item));
      updates[`salas/${salaId}/palabraRonda`] = item.palabra;
      updates[`salas/${salaId}/rondaActual`] = rondaActual + 1;
      updates[`salas/${salaId}/etapa`] = "revelar";
    }
    update(ref(db), updates);
  };

  const forzarSiguienteRonda = () => {
    const item = listaPalabras[Math.floor(Math.random() * listaPalabras.length)];
    const updates = generarRolesUpdates(item);
    updates[`salas/${salaId}/palabraRonda`] = item.palabra;
    updates[`salas/${salaId}/rondaActual`] = rondaActual + 1;
    updates[`salas/${salaId}/etapa`] = "revelar";
    update(ref(db), updates);
  };

  return (
    <div className="main-card">
      {esHost && modo === "online" && etapa !== "configuracion" && (
        <button className="btn-invite-fixed" onClick={copiarLink}>👤+ INVITAR</button>
      )}

      {etapa !== "partida" && modo !== "inicio" && etapa !== "resumen" && (
        <button className="btn-back" onClick={volverAlInicio}>← VOLVER</button>
      )}

      {modo === "inicio" && (
        <div className="button-group">
          <h1>IMPOSTOR</h1>
          <button className="btn-modern" onClick={() => setModo("local")}>MODO LOCAL</button>
          <button className="btn-modern" onClick={() => setModo("online")}>MODO ONLINE</button>
        </div>
      )}

      {etapa === "configuracion" && modo !== "inicio" && !conectado && (
        <div className="setup-container">
          <h2>{modo === "online" ? "SALA ONLINE" : "AJUSTES LOCAL"}</h2>
          {modo === "online" && <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />}
          <label>JUGADORES</label>
          <input type="number" className="input-box" value={numJugadores} onChange={e => setNumJugadores(e.target.value)} />
          <label>IMPOSTORES</label>
          <input type="number" className="input-box" value={numImpostores} onChange={e => setNumImpostores(e.target.value)} />
          {modo === "online" && (
            <>
              <label>RONDAS TOTALES</label>
              <input type="number" className="input-box" value={numRondas} onChange={e => setNumRondas(e.target.value)} />
            </>
          )}
          <label className="checkbox-container">
            <input type="checkbox" checked={conPista} onChange={() => setConPista(!conPista)} />
            <span>Pistas para impostores</span>
          </label>
          <button className="btn-modern btn-start" onClick={modo === "online" ? crearSalaOnline : iniciarJuegoLocal}>EMPEZAR</button>
          {modo === "online" && <button className="btn-back" style={{marginTop:'10px'}} onClick={() => setEtapa("unirse")}>Tengo un código</button>}
        </div>
      )}

      {modo === "online" && (etapa === "invitacion" || etapa === "unirse") && !conectado && (
        <div className="setup-container">
          <h2>UNIRSE</h2>
          <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          {etapa === "unirse" && <input className="input-box" placeholder="CÓDIGO" value={salaId} onChange={e => setSalaId(e.target.value.toUpperCase())} />}
          <button className="btn-modern btn-start" onClick={unirseASalaOnline}>ENTRAR</button>
        </div>
      )}

      {etapa === "lobby" && conectado && (
        <div className="lobby-container">
          <h2>SALA: {salaId}</h2>
          <div className="lives-grid">
            {jugadoresLista.map((p, i) => <div key={i} className="player-item">❤️ {p.nombre}</div>)}
          </div>
          {esHost ? <button className="btn-modern btn-start" onClick={() => forzarSiguienteRonda()}>REVELAR ROLES</button> : <p className="animate-pulse">Esperando al host...</p>}
        </div>
      )}

      {etapa === "revelar" && (
        <div className="reveal-box">
          {modo === "online" && <div className="ronda-indicador">Ronda {rondaActual} de {numRondas}</div>}
          <h2>{modo === "local" ? jugadoresLista[jugadorActualLocal]?.nombre : (miRol?.nombre || nombre)}</h2>
          {modo === "local" && estaOculto ? (
            <div className="security-check">
              <p>Pasa el celular a este jugador.</p>
              <button className="btn-modern" onClick={() => setEstaOculto(false)}>VER MI ROL</button>
            </div>
          ) : (
            <div>
              {!revelado ? <button className="btn-modern" onClick={() => setRevelado(true)}>REVELAR ROL</button> : (
                <div>
                  <div className="role-card">
                    {(modo === "local" ? jugadoresLista[jugadorActualLocal].tipo : miRol?.tipo) === "impostor" ? (
                      <><span className="text-impostor">IMPOSTOR</span>{conPista && <p className="pista-text">Pista: {modo === "local" ? jugadoresLista[jugadorActualLocal].pista : miRol?.pista}</p>}</>
                    ) : (
                      <><p>TU PALABRA:</p><span className="text-palabra">{palabraRonda}</span></>
                    )}
                  </div>
                  <button className="btn-modern" style={{marginTop:'25px'}} onClick={() => {
                    setRevelado(false); setEstaOculto(true);
                    if (modo === "local") {
                      if (jugadorActualLocal + 1 < numJugadores) setJugadorActualLocal(jugadorActualLocal+1);
                      else setEtapa("partida");
                    } else if (esHost) update(ref(db, `salas/${salaId}`), { etapa: "partida" });
                  }}>
                    {modo === "local" && jugadorActualLocal + 1 < numJugadores ? "SIGUIENTE" : "IR A LA ARENA"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {etapa === "partida" && (
        <div className="arena-container">
          <div className="scoreboard">
            <div className="score-item"><span className="score-label">EQUIPO</span><span className="score-num">{puntosEquipo}</span></div>
            <div className="score-item"><span className="score-label">IMPOSTOR</span><span className="score-num">{puntosImpostores}</span></div>
          </div>
          <div className="lives-grid">
            {jugadoresLista.map((p, i) => (
              <div key={i} className={`player-item ${!p.vivo ? 'dead' : ''}`} 
                onClick={() => (modo === "local" || esHost) && (modo === "local" ? (setJugadoresLista(prev => {let n=[...prev]; n[i].vivo=!n[i].vivo; return n;})) : update(ref(db, `salas/${salaId}/jugadores/${p.nombre}`), { vivo: !p.vivo }))}>
                <span>{p.vivo ? "❤️" : "🖤"}</span><p>{p.nombre}</p>
              </div>
            ))}
          </div>
          <div className="admin-actions">
            {modo === "online" && (
              <>
                <button className="btn-copy" onClick={() => setVerRecordatorio(!verRecordatorio)}>👁️ RECORDAR</button>
                {verRecordatorio && <div className="recordatorio-popup">{(miRol?.tipo) === "impostor" ? <p>IMPOSTOR. {conPista && `Pista: ${miRol?.pista}`}</p> : <p>Palabra: {palabraRonda}</p>}</div>}
                {esHost && (
                  <div style={{display:'flex', gap:'10px', width:'100%'}}>
                    <button className="btn-modern btn-next-round" onClick={() => finalizarRondaOnline('equipo')}>GANÓ EQUIPO</button>
                    <button className="btn-modern btn-danger" onClick={() => finalizarRondaOnline('impostor')}>GANÓ IMP.</button>
                  </div>
                )}
              </>
            )}
            {(modo === "local" || esHost) && <button className="btn-modern" style={{border:'1px solid #333', marginTop:'10px'}} onClick={volverAlInicio}>REINICIAR TODO</button>}
          </div>
        </div>
      )}

      {etapa === "decision_final" && (
        <div className="setup-container">
          <h1>PARTIDA TERMINADA</h1>
          <div className="button-group">
            <button className="btn-modern btn-next-round" onClick={forzarSiguienteRonda}>UNA RONDA MÁS</button>
            <button className="btn-modern" onClick={() => update(ref(db, `salas/${salaId}`), { etapa: "resumen" })}>RESUMEN FINAL</button>
          </div>
        </div>
      )}

      {etapa === "resumen" && (
        <div className="resumen-final">
          <h1 style={{color: puntosEquipo > puntosImpostores ? '#00d2ff' : '#ff3131'}}>
            GANADOR: {puntosEquipo >= puntosImpostores ? 'EQUIPO' : 'IMPOSTORES'}
          </h1>
          <div className="history-container">
            {historialRondas.map((h, i) => (
              <div key={i} className="history-item">
                <span>R{h.ronda}: <b className="history-impostor">{h.impostor}</b></span>
                <span className={h.ganoImpostor ? "history-impostor" : "history-win"}>{h.ganoImpostor ? "Ganó Impostor 💀" : "Ganó Equipo 🛡️"}</span>
              </div>
            ))}
          </div>
          <button className="btn-modern btn-danger" onClick={volverAlInicio}>SALIR AL MENÚ</button>
        </div>
      )}
    </div>
  );
}