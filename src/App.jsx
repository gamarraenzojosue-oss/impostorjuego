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
          if (etapa !== "configuracion" && etapa !== "unirse") volverAlInicio();
        }
      });
      return () => unsubscribe();
    }
  }, [modo, salaId, nombre, etapa]);

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
    navigator.clipboard.writeText(link).then(() => alert("¡Link copiado!"));
  };

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
        nombre: `JUGADOR ${indices[i] + 1}`, tipo: "impostor", 
        pista: conPista ? item.pistas[0] : null, vivo: true 
      };
    }
    setJugadoresLista(rolesTemp);
    setEtapa("revelar");
    setJugadorActualLocal(0);
  };

  const crearSalaOnline = () => {
    if (!nombre) return alert("Ingresa tu nombre");
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
    if (!nombre) return alert("Ingresa tu nombre");
    update(ref(db, `salas/${salaId}/jugadores/${nombre.toUpperCase()}`), {
      nombre: nombre.toUpperCase(), vivo: true, host: false
    }).then(() => setEtapa("lobby"));
  };

  const iniciarPartidaOnline = () => {
    if (jugadoresLista.length < 3) return alert("Mínimo 3 jugadores");
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

  const terminarYBorrarSala = () => {
    if (window.confirm("¿Seguro? Se reiniciará para todos.")) {
      if (modo === "online") remove(ref(db, 'salas/' + salaId));
      volverAlInicio();
    }
  };

  return (
    <div className="main-card">
      {modo !== "inicio" && etapa !== "partida" && (
        <button className="btn-back" onClick={volverAlInicio}>← VOLVER</button>
      )}

      {modo === "inicio" && (
        <>
          <h1 className="title-glow">IMPOSTOR</h1>
          <div className="button-group">
            <button className="btn-modern" onClick={() => setModo("local")}>JUEGO ÚNICO</button>
            <button className="btn-modern" onClick={() => setModo("online")}>JUEGO ONLINE</button>
          </div>
        </>
      )}

      {modo !== "inicio" && etapa === "configuracion" && (
        <>
          <h2>CONFIGURAR {modo === "online" ? "SALA" : "PARTIDA"}</h2>
          {modo === "online" && <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />}
          <div className="input-group">
            <label>JUGADORES</label>
            <input type="number" className="input-box" value={numJugadores} onChange={e => setNumJugadores(e.target.value)} />
          </div>
          <div className="input-group">
            <label>IMPOSTORES</label>
            <input type="number" className="input-box" value={numImpostores} onChange={e => setNumImpostores(e.target.value)} />
          </div>
          <button className="btn-modern btn-start" onClick={modo === "online" ? crearSalaOnline : iniciarJuegoLocal}>EMPEZAR</button>
          {modo === "online" && <button className="btn-back" style={{marginTop:'10px'}} onClick={()=>setEtapa("unirse")}>Ya tengo código</button>}
        </>
      )}

      {modo === "online" && etapa === "unirse" && (
        <>
          <h2>UNIRSE</h2>
          <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          <input className="input-box" placeholder="CÓDIGO" value={salaId} onChange={e => setSalaId(e.target.value.toUpperCase())} />
          <button className="btn-modern" onClick={aceptarInvitacion}>ENTRAR</button>
        </>
      )}

      {modo === "online" && etapa === "invitacion" && (
        <>
          <h2>HAS SIDO INVITADO</h2>
          <div className="sala-badge">SALA: {salaId}</div>
          <input className="input-box" placeholder="TU NOMBRE" onChange={e => setNombre(e.target.value.toUpperCase())} />
          <button className="btn-modern btn-start" onClick={aceptarInvitacion}>ACEPTAR</button>
        </>
      )}

      {modo === "online" && etapa === "lobby" && (
        <>
          <div className="sala-header">
            <h2 style={{color:'var(--modern-blue)'}}>SALA: {salaId}</h2>
            <button className="btn-copy" onClick={copiarLink}>🔗 LINK</button>
          </div>
          <div className="lives-grid">
            {jugadoresLista.map((p, i) => <div key={i} className="player-item">❤️ {p.nombre}</div>)}
          </div>
          {esHost ? <button className="btn-modern btn-start" onClick={iniciarPartidaOnline}>INICIAR REVELACIÓN</button> : <p className="animate-pulse">Esperando al host...</p>}
        </>
      )}

      {etapa === "revelar" && (
        <div className="reveal-box">
          <h2>{modo === "local" ? jugadoresLista[jugadorActualLocal]?.nombre : "TU ROL"}</h2>
          {!revelado ? (
            <button className="btn-modern" onClick={() => setRevelado(true)}>VER ROL</button>
          ) : (
            <div>
              <span className={(modo === "local" ? jugadoresLista[jugadorActualLocal].tipo : miRol?.tipo) === "impostor" ? "text-impostor" : "text-palabra"}>
                {(modo === "local" ? jugadoresLista[jugadorActualLocal].tipo : miRol?.tipo) === "impostor" ? "IMPOSTOR" : palabraRonda}
              </span>
              <button className="btn-modern" style={{marginTop:'25px'}} onClick={() => {
                setRevelado(false);
                if (modo === "local") {
                  if (jugadorActualLocal + 1 < numJugadores) setJugadorActualLocal(jugadorActualLocal + 1);
                  else setEtapa("partida");
                } else if (esHost) irALaArenaOnline();
              }}>
                {modo === "local" && jugadorActualLocal + 1 < numJugadores ? "SIGUIENTE" : (esHost ? "IR A LA ARENA" : "ESPERANDO AL HOST...")}
              </button>
            </div>
          )}
        </div>
      )}

      {etapa === "partida" && (
        <>
          <div className="lives-grid">
            {jugadoresLista.map((p, idx) => (
              <div key={idx} className={`player-item ${!p.vivo ? 'dead' : ''}`} 
                onClick={() => {
                  if (modo === "local") {
                    const c = [...jugadoresLista]; c[idx].vivo = !c[idx].vivo; setJugadoresLista(c);
                  } else if (esHost) update(ref(db, `salas/${salaId}/jugadores/${p.nombre}`), { vivo: !p.vivo });
                }}>
                <span>{p.vivo ? "❤️" : "🖤"}</span><p>{p.nombre}</p>
              </div>
            ))}
          </div>
          <div className="admin-actions">
            <button className="btn-copy" onClick={() => setVerRecordatorio(!verRecordatorio)}>👁️ {verRecordatorio ? "OCULTAR" : "VER MI PALABRA"}</button>
            {verRecordatorio && (
              <p className="recordatorio-text">Tu rol: <strong>{miRol?.tipo === "impostor" ? "IMPOSTOR" : palabraRonda}</strong></p>
            )}
            {(modo === "local" || esHost) && <button className="btn-modern btn-danger" style={{marginTop:'20px'}} onClick={terminarYBorrarSala}>TERMINAR JUEGO</button>}
          </div>
        </>
      )}
    </div>
  );
}