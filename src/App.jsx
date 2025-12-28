import React, { useState } from "react";
import "./App.css"; // incluye el CSS que te paso más abajo

const listaPalabras = [
  { palabra: "INFARTO AGUDO DE MIOCARDIO", pistas: ["Reloj de arena", "Prensa torácica", "Puerta coronaria cerrada"] },
  { palabra: "INSUFICIENCIA CARDÍACA CONGESTIVA", pistas: ["Gravedad nocturna", "Agua que retorna", "Pulmón cansado"] },
  { palabra: "FIBRILACIÓN AURICULAR", pistas: ["Electricidad caótica", "Pulso mentiroso", "Coágulo viajero"] },
  { palabra: "HTA", pistas: ["Presión constante", "Daño silencioso", "Resistencia periférica"] },
  { palabra: "NEUMONÍA BACTERIANA", pistas: ["Alvéolo ocupado", "Aire pesado", "Invasión microscópica"] },
  { palabra: "EMBOLIA PULMONAR", pistas: ["Puñalada aérea", "Viaje inmóvil", "Pulmón en pánico"] },
  { palabra: "CÁNCER DE PULMÓN", pistas: ["Mancha que progresa", "Humo acumulado", "Pérdida sin causa"] },
  { palabra: "HIPERTENSIÓN PULMONAR", pistas: ["Montaña diaria", "Voz fatigada", "Ventrículo forzado"] },
  { palabra: "DERRAME PLEURAL", pistas: ["Agua entre capas", "Expansión limitada", "Peso lateral"] },
  { palabra: "NEUMOTÓRAX", pistas: ["Espacio indebido", "Silencio unilateral", "Globo traicionero"] },
  { palabra: "APNEA OBSTRUCTIVA DEL SUEÑO", pistas: ["Pausas nocturnas", "Cerebro hipóxico", "Día sin descanso"] },
  { palabra: "EDEMA PULMONAR", pistas: ["Espuma ascendente", "Ahogo horizontal", "Capilar desbordado"] },
  { palabra: "ICTUS ISQUÉMICO", pistas: ["Tiempo robado", "Mitad ausente", "Lengua torpe"] },
  { palabra: "HEMORRAGIA SUBARACNOIDEA", pistas: ["Trueno súbito", "Presión intracraneal", "Rigidez posterior"] },
  { palabra: "MENINGITIS", pistas: ["Casco rígido", "Luz enemiga", "Inflamación meníngea"] },
  { palabra: "ENCEFALITIS", pistas: ["Conciencia alterada", "Sueño patológico", "Parénquima inflamado"] },
  { palabra: "CEFALEA EN RACIMOS", pistas: ["Taladro orbital", "Despertar forzado", "Reloj nocturno"] },
  { palabra: "MIASTENIA GRAVIS", pistas: ["Fuerza intermitente", "Fatiga engañosa", "Sinapsis fallida"] },
  { palabra: "SÍNDROME DE GUILLAIN-BARRÉ", pistas: ["Ascenso progresivo", "Reflejos mudos", "Nervio desmielinizado"] },
  { palabra: "HIDROCEFALIA", pistas: ["Presión acumulada", "Marcha magnética", "Ventrículos dilatados"] },
  { palabra: "PARÁLISIS DE BELL", pistas: ["Asimetría súbita", "Nervio congelado", "Expresión incompleta"] },
  { palabra: "ÚLCERA PÉPTICA", pistas: ["Ácido persistente", "Mucosa rota", "Dolor rítmico"] },
  { palabra: "COLITIS ULCEROSA", pistas: ["Inflamación continua", "Sangre distal", "Urgencia repetida"] },
  { palabra: "DIVERTICULITIS", pistas: ["Bolsas inflamadas", "Colon izquierdo", "Microperforación"] },
  { palabra: "PANCREATITIS AGUDA", pistas: ["Autodigestión", "Dolor transfixiante", "Enzimas libres"] },
  { palabra: "PANCREATITIS CRÓNICA", pistas: ["Glándula cicatrizada", "Digestión incompleta", "Dolor persistente"] },
  { palabra: "CIRROSIS HEPÁTICA", pistas: ["Filtro cicatrizado", "Presión portal", "Función perdida"] },
  { palabra: "OBSTRUCCIÓN INTESTINAL", pistas: ["Tránsito detenido", "Distensión progresiva", "Contenido retenido"] },
  { palabra: "APENDICITIS", pistas: ["Migración dolorosa", "Inflamación ciega", "Tiempo limitado"] },
  { palabra: "SÍNDROME DE OVARIO POLIQUÍSTICO", pistas: ["Anovulación crónica", "Andrógenos altos", "Ovario en collar"] },
  { palabra: "ENDOMETRIOSIS", pistas: ["Tejido exiliado", "Inflamación cíclica", "Dolor oculto"] },
  { palabra: "MIOMAS UTERINOS", pistas: ["Masa benigna", "Sangrado excesivo", "Útero cargado"] },
  { palabra: "EPI", pistas: ["Infección ascendente", "Daño tubárico", "Dolor pélvico"] },
  { palabra: "CÁNCER DE CUELLO UTERINO", pistas: ["Virus persistente", "Epitelio alterado", "Sangrado anormal"] },
  { palabra: "ABORTO", pistas: ["Interrupción gestacional", "Dolor uterino", "Sangrado activo"] },
  { palabra: "PREECLAMPSIA", pistas: ["Endotelio alterado", "Presión gestacional", "Órgano diana"] },
  { palabra: "RUPTURA PREMATURA DE MEMBRANAS", pistas: ["Barrera rota", "Líquido libre", "Riesgo infeccioso"] },
  { palabra: "BRONQUIOLITIS", pistas: ["Vía aérea pequeña", "Obstrucción viral", "Esfuerzo respiratorio"] },
  { palabra: "OTITIS MEDIA AGUDA", pistas: ["Presión timpánica", "Espacio cerrado", "Inflamación bacteriana"] },
  { palabra: "BOCA-MANO-PIE", pistas: ["Virus infantil", "Exantema distal", "Cavidad oral"] },
  { palabra: "CRUP", pistas: ["Vía aérea superior", "Edema laríngeo", "Obstrucción nocturna"] },
  { palabra: "ICTERICIA NEONATAL", pistas: ["Bilirrubina libre", "Hígado inmaduro", "Coloración progresiva"] },
  { palabra: "FARINGITIS", pistas: ["Mucosa inflamada", "Dolor al tragar", "Respuesta inmune"] },
  { palabra: "ASPIRACIÓN MECONIAL", pistas: ["Vía aérea sucia", "Hipoxia neonatal", "Obstrucción química"] },
  { palabra: "DIARREA", pistas: ["Pérdida hídrica", "Tránsito acelerado", "Desequilibrio electrolítico"] },
  { palabra: "ESQUIZOFRENIA", pistas: ["Realidad fragmentada", "Pensamiento desorganizado", "Percepción alterada"] },
  { palabra: "TEA", pistas: ["Comunicación atípica", "Conducta repetitiva", "Desarrollo divergente"] },
  { palabra: "GLOMERULONEFRITIS", pistas: ["Filtro inflamado", "Sangre urinaria", "Retención hídrica"] },
  { palabra: "PIELONEFRITIS", pistas: ["Infección ascendente", "Fiebre sistémica", "Dolor lumbar"] },
  { palabra: "SÍNDROME NEFRÓTICO", pistas: ["Pérdida proteica", "Edema generalizado", "Hiperlipidemia"] },
  { palabra: "INCONTINENCIA URINARIA", pistas: ["Control fallido", "Presión vesical", "Escape involuntario"] },
  { palabra: "INSUFICIENCIA RENAL (AGUDA O CRÓNICA)", pistas: ["Filtrado reducido", "Toxinas acumuladas", "Homeostasis rota"] },
  { palabra: "LITIASIS RENAL / CÓLICO RENAL", pistas: ["Obstrucción aguda", "Dolor migratorio", "Cristales sólidos"] },
];

export default function App() {
  const [etapa, setEtapa] = useState("configuracion");
  const [jugadores, setJugadores] = useState(4);
  const [impostores, setImpostores] = useState(1);
  const [conPista, setConPista] = useState(true);
  const [roles, setRoles] = useState([]);
  const [jugadorActual, setJugadorActual] = useState(0);
  const [revelado, setRevelado] = useState(false);
  const [ganador, setGanador] = useState(null);
  const [palabraRonda, setPalabraRonda] = useState("");

  const iniciarJuego = () => {
    const item = listaPalabras[Math.floor(Math.random() * listaPalabras.length)];
    setPalabraRonda(item.palabra);

    let rolesTemp = Array(jugadores).fill(null);
    for (let i = 0; i < jugadores; i++) {
      rolesTemp[i] = { tipo: "jugador", palabra: item.palabra, pista: null };
    }

    let indicesImpostores = [];
    while (indicesImpostores.length < impostores) {
      const r = Math.floor(Math.random() * jugadores);
      if (!indicesImpostores.includes(r)) indicesImpostores.push(r);
    }

    indicesImpostores.forEach((i) => {
      const pistaAleatoria = conPista
        ? item.pistas[Math.floor(Math.random() * item.pistas.length)]
        : null;
      rolesTemp[i] = { tipo: "impostor", palabra: null, pista: pistaAleatoria };
    });

    setRoles(rolesTemp);
    setEtapa("revelar");
    setJugadorActual(0);
    setRevelado(false);
    setGanador(null);
  };

  const siguienteJugador = () => {
    setRevelado(false);
    if (jugadorActual + 1 < jugadores) {
      setJugadorActual(jugadorActual + 1);
    } else {
      setGanador("Ronda terminada");
      setEtapa("terminado");
    }
  };

  const volverMenu = () => {
    setEtapa("configuracion");
    setRoles([]);
    setJugadorActual(0);
    setRevelado(false);
    setGanador(null);
    setPalabraRonda("");
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-6">
      <div className="bg-black/50 border-2 border-cyan-400 rounded-2xl p-6 w-full max-w-md shadow-2xl backdrop-blur-md">
        {etapa === "configuracion" && (
          <>
            <h1 className="text-3xl font-orbitron mb-4 text-center text-cyan-400 animate-pulse">Juego del Impostor</h1>
            <label>Jugadores (1-30)</label>
            <input
              type="number"
              value={jugadores}
              onChange={(e) => setJugadores(Math.min(30, Math.max(1, +e.target.value)))}
              className="w-full mb-2 text-black p-1 rounded"
            />
            <label>Impostores (1-10)</label>
            <input
              type="number"
              value={impostores}
              onChange={(e) => setImpostores(Math.min(10, Math.max(1, +e.target.value)))}
              className="w-full mb-2 text-black p-1 rounded"
            />
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={conPista} onChange={() => setConPista(!conPista)} /> Con pista (solo impostor)
            </label>
            <button
              onClick={iniciarJuego}
              className="mt-4 w-full bg-green-500 hover:bg-green-600 p-2 rounded-xl font-bold shadow-lg shadow-green-400/50"
            >
              Empezar
            </button>
          </>
        )}

        {etapa === "revelar" && (
          <>
            <h2 className="text-xl mb-4 text-center font-orbitron">Jugador {jugadorActual + 1}</h2>
            {!revelado ? (
              <button
                onClick={() => setRevelado(true)}
                className="w-full bg-blue-500 p-4 rounded-xl text-xl font-bold hover:bg-blue-600 hover:shadow-lg hover:shadow-cyan-400/50 transition"
              >
                Revelar palabra
              </button>
            ) : (
              <div className="text-center transition-all duration-700 opacity-100">
                {roles[jugadorActual].tipo === "impostor" ? (
                  <>
                    <p className="text-red-500 text-3xl font-bold animate-pulse">IMPOSTOR</p>
                    {roles[jugadorActual].pista && (
                      <p className="mt-2 text-cyan-300 italic">{roles[jugadorActual].pista}</p>
                    )}
                  </>
                ) : (
                  <p className="text-green-400 text-2xl font-bold">{palabraRonda}</p>
                )}
                <button
                  onClick={siguienteJugador}
                  className="mt-4 bg-cyan-500 hover:bg-cyan-600 p-2 rounded-xl font-bold shadow-lg shadow-cyan-400/50"
                >
                  Siguiente jugador
                </button>
              </div>
            )}
          </>
        )}

        {etapa === "terminado" && (
          <>
            <h2 className="text-center text-2xl text-cyan-300 font-bold font-orbitron">{ganador}</h2>
            <button
              onClick={volverMenu}
              className="mt-4 bg-green-500 hover:bg-green-600 p-2 rounded-xl font-bold w-full shadow-lg shadow-green-400/50"
            >
              Volver al menú principal
            </button>
          </>
        )}
      </div>
    </div>
  );
}
