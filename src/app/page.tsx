"use client";

import { useState, useEffect } from "react";
import D4_DATA from "../data/builds.json";

export default function Home() {
  const [clase, setClase] = useState("");
  const [tipoBuild, setTipoBuild] = useState("");
  const [buildSeleccionada, setBuildSeleccionada] = useState(null);
  const [nivelExpandido, setNivelExpandido] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  
  // Estado para el modo Admin
  const [modoAdmin, setModoAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'individual' | 'masiva'>('individual');
  
  // Estado Formularios Admin
  const [adminForm, setAdminForm] = useState({ url: "", clase: "Nigromante", tipoBuild: "Leveo (1-60)", nombre: "" });
  const [masivaForm, setMasivaForm] = useState({ url: "https://maxroll.gg/d4/tierlists/endgame-tier-list", clase: "Nigromante", tipoBuild: "Juego Tardío (Endgame)" });
  
  // Estados de carga
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [progresoMasivo, setProgresoMasivo] = useState<{nombre: string, status: string}[]>([]);

  useEffect(() => {
    const guardado = localStorage.getItem("d4-checklist");
    if (guardado) setChecklist(JSON.parse(guardado));
  }, []);

  const toggleCheck = (id: string) => {
    const nuevoChecklist = { ...checklist, [id]: !checklist[id] };
    setChecklist(nuevoChecklist);
    localStorage.setItem("d4-checklist", JSON.stringify(nuevoChecklist));
  };

  const buildsDisponibles = D4_DATA.builds[clase as keyof typeof D4_DATA.builds]?.[tipoBuild] || [];

  // ==================== LÓGICA INDIVIDUAL ====================
  const handleProcesarBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje("⏳ Iniciando navegador invisible... Esto puede tomar unos 30 segundos.");
    
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje("✅ ¡Build procesada y guardada con éxito! (Refresca para verla)");
        setAdminForm({ ...adminForm, url: "", nombre: "" });
      } else {
        setMensaje(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setMensaje(`❌ Error de conexión: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  // ==================== LÓGICA MASIVA (AUTO-DISCOVER) ====================
  const handleBusquedaMasiva = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setProgresoMasivo([]);
    setMensaje(`🕵️‍♂️ Escaneando Tier List buscando al ${masivaForm.clase}...`);

    try {
      // 1. Descubrir builds
      const res = await fetch('/api/auto-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: masivaForm.url, clase: masivaForm.clase })
      });
      const data = await res.json();

      if (!res.ok) {
        setMensaje(`❌ Error al escanear: ${data.error}`);
        setCargando(false);
        return;
      }

      const descubiertas = data.builds;
      if (descubiertas.length === 0) {
        setMensaje(`⚠️ No encontré builds de ${masivaForm.clase} en ese enlace.`);
        setCargando(false);
        return;
      }

      setMensaje(`✅ ¡Encontré ${descubiertas.length} builds Top Tier! Iniciando extracción individual...`);
      const inicial = descubiertas.map((b: any) => ({ nombre: b.nombre, status: '⏳ Esperando...' }));
      setProgresoMasivo(inicial);

      // 2. Procesar cada una secuencialmente
      for (let i = 0; i < descubiertas.length; i++) {
        const build = descubiertas[i];
        
        // Actualizar UI: En progreso
        setProgresoMasivo(prev => prev.map((p, idx) => idx === i ? { ...p, status: '⚙️ Extrayendo...' } : p));

        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: build.url,
            clase: masivaForm.clase,
            tipoBuild: masivaForm.tipoBuild,
            nombre: build.nombre
          })
        });

        // Actualizar UI: Completado o Error
        if (scrapeRes.ok) {
          setProgresoMasivo(prev => prev.map((p, idx) => idx === i ? { ...p, status: '✅ Lista' } : p));
        } else {
          setProgresoMasivo(prev => prev.map((p, idx) => idx === i ? { ...p, status: '❌ Falló' } : p));
        }
      }

      setMensaje("🎉 ¡Migración masiva terminada! (Refresca la página)");
    } catch (err: any) {
      setMensaje(`❌ Error general: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-6 md:p-12 selection:bg-red-900">
      
      {/* Botón Admin */}
      <button 
        onClick={() => setModoAdmin(!modoAdmin)}
        className="fixed top-4 right-4 bg-neutral-900 border border-neutral-700 text-xs px-3 py-1 rounded hover:bg-red-900/50 transition-colors z-50"
      >
        {modoAdmin ? "Volver a Modo Jugador" : "⚙️ Modo Admin"}
      </button>

      <div className="max-w-4xl mx-auto mt-4">
        {/* Header */}
        <div className="text-center mb-12 border-b border-red-900/30 pb-8">
          <h1 className="text-5xl font-black text-red-600 mb-2 tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            Sanctuario Builds
          </h1>
          <p className="text-neutral-400 text-lg">Tu guía de Diablo 4, directo al grano y en español.</p>
        </div>

        {/* ======================= MODO ADMIN ======================= */}
        {modoAdmin && (
          <div className="bg-neutral-900 border border-red-900 rounded-2xl p-8 mb-12 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              🏭 Panel de Control
              <span className="text-sm font-normal text-red-400 bg-red-950 px-2 py-1 rounded">Extraer Datos</span>
            </h2>

            {/* Pestañas de Admin */}
            <div className="flex gap-4 mb-6 border-b border-neutral-800 pb-4">
              <button 
                onClick={() => setAdminTab('individual')}
                className={`font-bold pb-2 ${adminTab === 'individual' ? 'text-red-500 border-b-2 border-red-500' : 'text-neutral-500 hover:text-white'}`}
              >
                Agregar Manual (1x1)
              </button>
              <button 
                onClick={() => setAdminTab('masiva')}
                className={`font-bold pb-2 flex items-center gap-2 ${adminTab === 'masiva' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-neutral-500 hover:text-white'}`}
              >
                🕵️‍♂️ Auto-Descubrimiento Masivo
              </button>
            </div>

            {/* TAB: INDIVIDUAL */}
            {adminTab === 'individual' && (
              <form onSubmit={handleProcesarBuild} className="space-y-5 animate-in fade-in">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">URL de la Guía Específica</label>
                  <input required type="url" placeholder="https://maxroll.gg/d4/build-guides/..." className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white focus:border-red-600 outline-none" value={adminForm.url} onChange={e => setAdminForm({...adminForm, url: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Clase</label>
                    <select className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none" value={adminForm.clase} onChange={e => setAdminForm({...adminForm, clase: e.target.value})}>
                      {D4_DATA.clases.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Tipo de Build</label>
                    <select className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none" value={adminForm.tipoBuild} onChange={e => setAdminForm({...adminForm, tipoBuild: e.target.value})}>
                      {D4_DATA.tiposBuild.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Nombre (Ej: Pícaro Cuchillas)</label>
                  <input required type="text" className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white focus:border-red-600 outline-none" value={adminForm.nombre} onChange={e => setAdminForm({...adminForm, nombre: e.target.value})} />
                </div>
                <button disabled={cargando} type="submit" className={`w-full font-bold py-3 rounded text-white transition-all ${cargando ? 'bg-neutral-700' : 'bg-red-700 hover:bg-red-600'}`}>
                  {cargando ? 'Trabajando...' : 'Procesar Build'}
                </button>
              </form>
            )}

            {/* TAB: MASIVA */}
            {adminTab === 'masiva' && (
              <form onSubmit={handleBusquedaMasiva} className="space-y-5 animate-in fade-in">
                <div className="bg-orange-950/20 border border-orange-900/50 p-4 rounded-lg text-sm text-orange-200 mb-4">
                  <strong>Modo "Veo Burro y Se Me Antoja El Viaje":</strong> Ponle la URL del Tier List de Maxroll. El sistema leerá la tabla, encontrará el "Meta" actual de tu clase favorita, y clonará todas las mejores builds automáticamente.
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">URL del Tier List General</label>
                  <input required type="url" placeholder="https://maxroll.gg/d4/tierlists/endgame-tier-list" className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white focus:border-orange-500 outline-none" value={masivaForm.url} onChange={e => setMasivaForm({...masivaForm, url: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">¿De qué clase traemos el Meta?</label>
                    <select className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none" value={masivaForm.clase} onChange={e => setMasivaForm({...masivaForm, clase: e.target.value})}>
                      {D4_DATA.clases.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Tipo de Build</label>
                    <select className="w-full bg-neutral-950 border border-neutral-700 rounded p-3 text-white outline-none" value={masivaForm.tipoBuild} onChange={e => setMasivaForm({...masivaForm, tipoBuild: e.target.value})}>
                      {D4_DATA.tiposBuild.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                
                <button disabled={cargando} type="submit" className={`w-full font-bold py-3 rounded text-white transition-all ${cargando ? 'bg-neutral-700' : 'bg-orange-600 hover:bg-orange-500'}`}>
                  {cargando ? 'Buscando el Meta...' : '¡Tráete todas las S-Tier!'}
                </button>

                {/* Lista de progreso masivo */}
                {progresoMasivo.length > 0 && (
                  <div className="mt-6 space-y-2 border-t border-neutral-800 pt-4">
                    <h4 className="text-white font-bold mb-2">Builds Encontradas:</h4>
                    {progresoMasivo.map((b, i) => (
                      <div key={i} className="flex justify-between items-center bg-neutral-950 p-3 rounded border border-neutral-800">
                        <span className="text-neutral-300">{b.nombre}</span>
                        <span className={`text-sm font-bold ${b.status.includes('❌') ? 'text-red-500' : b.status.includes('✅') ? 'text-green-500' : 'text-yellow-500'}`}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}

            {/* Mensaje Global Admin */}
            {mensaje && (
              <div className={`p-4 mt-6 rounded border ${mensaje.includes('❌') ? 'bg-red-950/30 border-red-900 text-red-200' : 'bg-green-950/30 border-green-900 text-green-200'}`}>
                {mensaje}
              </div>
            )}
          </div>
        )}

        {/* ======================= MODO JUGADOR (El que teníamos) ======================= */}
        {!modoAdmin && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-in fade-in">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="bg-red-600 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-3">1</span>
                  Clase
                </h2>
                <select className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white outline-none" value={clase} onChange={(e) => { setClase(e.target.value); setTipoBuild(""); setBuildSeleccionada(null); }}>
                  <option value="">-- Elige tu clase --</option>
                  {D4_DATA.clases.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className={`bg-neutral-900 border ${clase ? 'border-red-900/50' : 'border-neutral-800 opacity-50'} p-6 rounded-xl shadow-lg transition-all`}>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="bg-red-600 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-3">2</span>
                  Objetivo
                </h2>
                <select className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white outline-none" value={tipoBuild} onChange={(e) => { setTipoBuild(e.target.value); setBuildSeleccionada(null); }} disabled={!clase}>
                  <option value="">-- Elige el objetivo --</option>
                  {D4_DATA.tiposBuild.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className={`bg-neutral-900 border ${tipoBuild && buildsDisponibles.length > 0 ? 'border-red-900/50' : 'border-neutral-800 opacity-50'} p-6 rounded-xl shadow-lg transition-all`}>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="bg-red-600 text-white w-8 h-8 rounded-full inline-flex items-center justify-center mr-3">3</span>
                  Build
                </h2>
                <select className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-white outline-none" value={buildSeleccionada ? (buildSeleccionada as any).nombre : ""} onChange={(e) => { const build = buildsDisponibles.find((b: any) => b.nombre === e.target.value); setBuildSeleccionada(build || null); setNivelExpandido(null); }} disabled={!tipoBuild || buildsDisponibles.length === 0}>
                  <option value="">-- Elige la build --</option>
                  {buildsDisponibles.map((b: any) => <option key={b.nombre} value={b.nombre}>{b.nombre}</option>)}
                </select>
              </div>
            </div>

            {/* Detalles de la Build con Acordeón */}
            {buildSeleccionada && (
              <div className="bg-neutral-900 border border-red-900/40 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-r from-red-900/50 to-neutral-900 p-8 border-b border-red-900/30">
                  <h2 className="text-3xl font-bold text-white">{(buildSeleccionada as any).nombre}</h2>
                  <p className="text-red-400 mt-2 font-medium">Selecciona una etapa de nivel para ver tus objetivos y equipo.</p>
                </div>
                
                <div className="p-4 md:p-8 space-y-4">
                  {(buildSeleccionada as any).guia.map((paso: any) => {
                    const isExpanded = nivelExpandido === paso.id;
                    return (
                      <div key={paso.id} className="border border-neutral-800 rounded-xl overflow-hidden transition-all bg-neutral-950">
                        <button onClick={() => setNivelExpandido(isExpanded ? null : paso.id)} className={`w-full text-left p-5 flex justify-between items-center transition-colors ${isExpanded ? 'bg-red-950/30' : 'hover:bg-neutral-900'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isExpanded ? 'bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'bg-neutral-600'}`}></div>
                            <h3 className="text-xl font-bold text-white">{paso.nivel}</h3>
                          </div>
                          <span className="text-red-600 font-bold text-xl">{isExpanded ? '−' : '+'}</span>
                        </button>
                        {isExpanded && (
                          <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 animate-in fade-in zoom-in-95 duration-200">
                            
                            {/* Objetivo General y Dónde Farmear */}
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-red-500 font-bold uppercase text-sm mb-2 tracking-wider">¿Cuál es el objetivo?</h4>
                                <p className="text-neutral-300">{paso.descripcion}</p>
                              </div>
                              <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                                <h4 className="text-orange-500 font-bold uppercase text-sm mb-1 tracking-wider">🗺️ Dónde farmear</h4>
                                <p className="text-neutral-300 text-sm">{paso.dondeBuscar}</p>
                              </div>
                            </div>

                            {/* Estrategia y Rotación */}
                            {paso.estrategia && (
                              <div className="mb-6 bg-red-950/20 p-5 rounded-xl border border-red-900/30">
                                <h4 className="text-red-400 font-bold uppercase text-sm mb-2 tracking-wider">🧠 Estrategia y Rotación</h4>
                                <p className="text-neutral-200 leading-relaxed text-sm">{paso.estrategia}</p>
                              </div>
                            )}

                            {/* Barra de Acción Sugerida */}
                            {paso.barraDeAccion && (
                              <div className="mb-8">
                                <h4 className="text-red-500 font-bold uppercase text-sm mb-3 tracking-wider flex items-center gap-2">⌨️ Barra de Acción Sugerida</h4>
                                <div className="flex flex-wrap gap-3">
                                  {paso.barraDeAccion.map((btn: any, i: number) => (
                                    <div key={i} className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden shadow-sm">
                                      <span className="bg-neutral-800 px-3 py-2 text-red-400 font-bold text-xs border-r border-neutral-700 min-w-[50px] text-center">
                                        {btn.tecla}
                                      </span>
                                      <span className="px-4 py-2 text-neutral-200 text-sm font-medium">
                                        {btn.habilidad}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Checklists (Habilidades y Equipo) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* ... Habilidades ... */}
                              <div>
                                <h4 className="text-red-500 font-bold uppercase text-sm mb-3 tracking-wider flex items-center gap-2">⚔️ Puntos de Habilidad</h4>
                                <div className="space-y-2">
                                  {paso.habilidades.map((hab: string, i: number) => {
                                    const checkId = `${(buildSeleccionada as any).nombre}-${paso.id}-hab-${i}`;
                                    return (
                                      <label key={i} className="flex items-start gap-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-red-900/50 cursor-pointer group transition-colors">
                                        <input type="checkbox" checked={checklist[checkId] || false} onChange={() => toggleCheck(checkId)} className="mt-1 w-5 h-5 accent-red-600 rounded bg-neutral-900 border-neutral-700 cursor-pointer" />
                                        <span className={`transition-all ${checklist[checkId] ? 'text-neutral-500 line-through' : 'text-neutral-200 group-hover:text-white'}`}>{hab}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* ... Equipo ... */}
                              <div>
                                <h4 className="text-red-500 font-bold uppercase text-sm mb-3 tracking-wider flex items-center gap-2">🛡️ Esquema de Equipo</h4>
                                <div className="space-y-2">
                                  {paso.equipo.map((eq: any, i: number) => {
                                    const checkId = `${(buildSeleccionada as any).nombre}-${paso.id}-eq-${i}`;
                                    return (
                                      <label key={i} className="flex items-start gap-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-red-900/50 cursor-pointer group transition-colors">
                                        <input type="checkbox" checked={checklist[checkId] || false} onChange={() => toggleCheck(checkId)} className="mt-1 w-5 h-5 accent-red-600 rounded bg-neutral-900 border-neutral-700 cursor-pointer" />
                                        <div className={`flex flex-col transition-all ${checklist[checkId] ? 'opacity-50' : ''}`}>
                                          <span className={`text-xs font-bold uppercase tracking-wider ${checklist[checkId] ? 'text-neutral-600 line-through' : 'text-red-400'}`}>{eq.slot}</span>
                                          <span className={`${checklist[checkId] ? 'text-neutral-500 line-through' : 'text-neutral-200 group-hover:text-white'}`}>{eq.item}</span>
                                          {eq.dondeCae && (
                                            <span className="text-xs text-orange-400/80 mt-1.5 flex items-center gap-1 font-medium bg-orange-950/30 px-2 py-0.5 rounded w-fit">
                                              📍 {eq.dondeCae}
                                            </span>
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
