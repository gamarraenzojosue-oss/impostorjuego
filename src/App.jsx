import React, { useState } from "react";
import "./App.css";
import { listaPalabras } from "./data/palabras";

export default function App() {
  const [etapa, setEtapa] = useState("configuracion");
  const [jugadores, setJugadores] = useState(0);
  const [impostores, setImpostores] = useState(0);
  const [conPista, setConPista] = useState(true);
  const [roles, setRoles] = useState([]);
  const [jugadorActual, setJugadorActual] = useState(0);
  const [revelado, setRevelado] = useState(false);
  const [palabraRonda, setPalabraRonda] = useState("");

  const iniciarJuego = () => {
    if (jugadores < 1 || impostores < 1 || impostores >= jugadores) {
      alert("Revisa la cantidad de jugadores e impostores.");
      return;
    }

    const item = listaPalabras[Math.floor(Math.random() * listaPalabras.length)];
    setPalabraRonda(item.palabra);

    // Creamos los roles con la propiedad 'vivo'
    let rolesTemp = Array(jugadores).fill(null).map((_, i) => ({
      id: i,
      tipo: "jugador",
      palabra: item.palabra,
      vivo: true
    }));

    let indices = [...Array(jugadores).keys()];
    let indicesImpostores = [];
    while (indicesImpostores.length < impostores) {
      const r = Math.floor(Math.random() * indices.length);
      indicesImpostores.push(indices.splice(r, 1)[0]);
    }

    indicesImpostores.forEach((i) => {
      rolesTemp[i] = {
        id: i,
        tipo: "impostor",
        palabra: null,
        pista: conPista ? item.pistas[Math.floor(Math.random() * item.pistas.length)] : null,
        vivo: true
      };
    });

    setRoles(rolesTemp);
    setEtapa("revelar");
    setJugadorActual(0);
    setRevelado(false);
  };

  const siguienteJugador = () => {
    setRevelado(false);
    if (jugadorActual + 1 < jugadores) {
      setJugadorActual(jugadorActual + 1);
    } else {
      setEtapa("partida"); // Nueva etapa con los corazones
    }
  };

  const eliminarJugador = (index) => {
    const nuevosRoles = [...roles];
    nuevosRoles[index].vivo = !nuevosRoles[index].vivo; // Cambia entre vivo/muerto
    setRoles(nuevosRoles);
  };

  const volverMenu = () => {
    setEtapa("configuracion");
    setRoles([]);
    setJugadores(0);
    setImpostores(0);
  };

  return (
    <div className="main-card">
      {etapa === "configuracion" && (
        <>
          <h1>Juego del Impostor</h1>
          
          <div className="input-group">
            <label>NÚMERO DE JUGADORES</label>
            <input
              type="number"
              value={jugadores || ""}
              onChange={(e) => setJugadores(Math.min(30, Math.max(0, +e.target.value)))}
              className="input-box"
              placeholder="Ej: 5"
            />
          </div>

          <div className="input-group">
            <label>NÚMERO DE IMPOSTORES</label>
            <input
              type="number"
              value={impostores || ""}
              onChange={(e) => setImpostores(Math.min(10, Math.max(0, +e.target.value)))}
              className="input-box"
              placeholder="Ej: 1"
            />
          </div>

          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={conPista}
              onChange={() => setConPista(!conPista)}
            />
            <span>Activar pistas para impostores</span>
          </label>

          <div className="btn-container">
            <button onClick={iniciarJuego} className="btn-glow btn-start">Empezar</button>
            <button onClick={() => alert("Próximamente")} className="btn-glow">Online</button>
          </div>
        </>
      )}

      {etapa === "revelar" && (
        <>
          <h2 className="header-white">JUGADOR {jugadorActual + 1}</h2>
          {!revelado ? (
            <button onClick={() => setRevelado(true)} className="btn-glow btn-reveal">
              Revelar Palabra
            </button>
          ) : (
            <div className="reveal-content">
              {roles[jugadorActual].tipo === "impostor" ? (
                <>
                  <span className="text-impostor">IMPOSTOR</span>
                  {roles[jugadorActual].pista && (
                    <p className="text-pista">Pista: {roles[jugadorActual].pista}</p>
                  )}
                </>
              ) : (
                <span className="text-palabra">{palabraRonda}</span>
              )}
              <button onClick={siguienteJugador} className="btn-glow btn-next">
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {etapa === "partida" && (
        <>
          <h1 style={{fontSize: '2.5rem'}}>ELIMINACIÓN</h1>
          <div className="lives-grid">
            {roles.map((jugador, i) => (
              <div 
                key={i} 
                className={`player-item ${!jugador.vivo ? 'dead' : ''}`}
                onClick={() => eliminarJugador(i)}
              >
                <span className="heart">{jugador.vivo ? "❤️" : "🖤"}</span>
                <span className="player-name">J{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="footer-victory">
            <button onClick={volverMenu} className="btn-glow btn-win-team">Gano el equipo</button>
            <button onClick={volverMenu} className="btn-glow btn-win-imp">Gano el impostor</button>
          </div>
        </>
      )}
    </div>
  );
}