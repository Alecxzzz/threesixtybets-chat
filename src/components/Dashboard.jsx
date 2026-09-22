import { useEffect, useMemo, useState } from "react";
import { fetchDashboard } from "../services/api";
import PagosAceptados from "./PagosAceptados";

/**
 * Dashboard - pagina principal de 3SIXTYBETS.
 * Hero + stats + efectividad + tabs (Pronosticos del dia / Acertados)
 * + tarjetas de picks con badges. Auto-refresco cada 60 s.
 */

function ConfianzaBadge({ confianza }) {
  if (confianza === "ALTA")
    return <span className="dp-badge b-fuego">🔥 Bomba</span>;
  if (confianza === "MEDIA")
    return <span className="dp-badge b-valor">⭐ Valor</span>;
  if (confianza === "BAJA")
    return <span className="dp-badge b-suave">Riesgo</span>;
  return null;
}

/* Texto del pick listo para compartir (copiar o WhatsApp). */
function textoPick(p) {
  const lineas = [
    p.tier === "GOLDEN PICK" ? "GOLDEN PICK 3SIXTYBETS" : "Pick 3SIXTYBETS",
    p.eventName || [p.awayName, "vs", p.homeName].filter(Boolean).join(" "),
    `Mercado: ${p.titulo || p.market || "?"}`,
    `Seleccion: ${p.porque || p.selection || "?"}`,
  ];
  if (p.odds) lineas.push(`Cuota: ${Number(p.odds).toFixed(2)}`);
  if (p.tier === "GOLDEN PICK") lineas.push("Doble verificado por los servidores.");
  return lineas.join("\n");
}

function esGolden(p) {
  return (
    (p.tier || "") === "GOLDEN PICK" ||
    (p.odds != null && Number(p.odds) >= 1.35 && Number(p.odds) <= 1.4)
  );
}

function wrapCarta(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = t;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/** Carga un logo sin romper la carta si la imagen falla. */
function cargarImagen(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    // ESPN manda "Access-Control-Allow-Origin: *": se puede dibujar en canvas.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Logo circular, igual que .dp-logo en la tarjeta. */
function dibujarLogo(ctx, img, x, y, tam) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + tam / 2, y + tam / 2, tam / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(x, y, tam, tam);
  if (img) {
    const escala = Math.max(tam / img.width, tam / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    ctx.drawImage(img, x + (tam - w) / 2, y + (tam - h) / 2, w, h);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "700 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("?", x + tam / 2, y + tam / 2 + 14);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

/** Pill (badge) con el mismo look que .dp-badge del dashboard. */
function dibujarPill(ctx, x, y, texto, fondo, color, borde) {
  ctx.font = "800 30px system-ui, sans-serif";
  const w = ctx.measureText(texto).width + 54;
  const h = 62;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2);
  else ctx.rect(x, y, w, h);
  ctx.fillStyle = fondo;
  ctx.fill();
  if (borde) {
    ctx.strokeStyle = borde;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(texto, x + w / 2, y + h / 2 + 11);
  ctx.textAlign = "left";
  return w;
}

/**
 * Carta para compartir: replica la tarjeta del dashboard (badges, equipos con
 * logo, mercado, seleccion, cuota y bullets de stats).
 */
async function dibujarCartaPick(p) {
  const golden = esGolden(p);
  const W = 1080;
  const H = 1400;
  const acento = golden ? "#f5c542" : "#4ade80";
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Fondo: mismo degradado que .dash-pick / .pick-golden
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, golden ? "#1a1c26" : "#141826");
  bg.addColorStop(1, "#10131f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (golden) {
    const glow = ctx.createLinearGradient(0, 0, 0, 560);
    glow.addColorStop(0, "rgba(245,197,66,0.16)");
    glow.addColorStop(1, "rgba(245,197,66,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 560);
  }
  ctx.strokeStyle = golden ? "rgba(245,197,66,0.75)" : "rgba(74,222,128,0.45)";
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  // Cabecera de marca
  ctx.textAlign = "center";
  ctx.fillStyle = acento;
  ctx.font = "900 46px system-ui, sans-serif";
  ctx.fillText("3SIXTYBETS", W / 2, 120);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText("SPORTS BETTING INTELLIGENCE", W / 2, 162);

  // Badges (los mismos de la tarjeta: confianza, GOLDEN, verificado)
  const pillOro = ctx.createLinearGradient(0, 0, 300, 0);
  pillOro.addColorStop(0, "#ffe08a");
  pillOro.addColorStop(1, "#f5c542");
  const pills = [];
  if (p.confidence === "ALTA")
    pills.push(["🔥 BOMBA", "rgba(244,63,94,0.16)", "#ffb1c0", "rgba(244,63,94,0.45)"]);
  else if (p.confidence === "MEDIA")
    pills.push(["⭐ VALOR", "rgba(124,108,255,0.16)", "#a89bff", "rgba(124,108,255,0.45)"]);
  else if (p.confidence === "BAJA")
    pills.push(["RIESGO", "rgba(245,158,11,0.14)", "#fcd34d", "rgba(245,158,11,0.45)"]);
  if (golden) pills.push(["GOLDEN PICK", pillOro, "#111", "#f5c542"]);
  if (p.verificado >= 2)
    pills.push(["x2 VERIFICADO", "rgba(34,197,94,0.16)", "#4ade80", "rgba(34,197,94,0.45)"]);
  if (p.result === "ACIERTO")
    pills.push(["✓ ACERTADO", "rgba(34,197,94,0.16)", "#4ade80", "rgba(34,197,94,0.45)"]);
  let anchoPills = 0;
  for (const pl of pills) {
    ctx.font = "800 30px system-ui, sans-serif";
    anchoPills += ctx.measureText(pl[0]).width + 54 + 14;
  }
  let px = (W - (anchoPills - 14)) / 2;
  for (const pl of pills) {
    px += dibujarPill(ctx, px, 214, pl[0], pl[1], pl[2], pl[3]) + 14;
  }

  // Filas de equipos con logo (igual que .dp-evento)
  const logos = await Promise.all([cargarImagen(p.awayLogo), cargarImagen(p.homeLogo)]);
  let y = 336;
  const filas = [
    { nombre: p.awayName || p.eventName || "", logo: logos[0] },
    { nombre: p.homeName || "", logo: logos[1] },
  ];
  for (const fila of filas) {
    dibujarLogo(ctx, fila.logo, 92, y, 96);
    ctx.fillStyle = "#eef1f6";
    ctx.font = "800 46px system-ui, sans-serif";
    const lineas = wrapCarta(ctx, fila.nombre, W - 320);
    lineas.forEach((l, i) => ctx.fillText(l, 216, y + 62 + i * 52));
    y += Math.max(132, 46 + lineas.length * 52);
  }

  // Mercado (titulo del pick)
  ctx.textAlign = "center";
  ctx.fillStyle = "#97a0b5";
  ctx.font = "700 36px system-ui, sans-serif";
  const mercLines = wrapCarta(ctx, p.titulo || p.market || "", W - 200);
  mercLines.forEach((l, i) => ctx.fillText(l, W / 2, y + 24 + i * 48));
  y += 24 + mercLines.length * 48 + 44;

  // Seleccion destacada
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 54px system-ui, sans-serif";
  const selLines = wrapCarta(ctx, p.porque || p.selection || "", W - 200);
  selLines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 66));
  y += (selLines.length - 1) * 66 + 40;

  // Cuota grande (como el chip .dp-cuota de la tarjeta)
  y += 34;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "800 32px system-ui, sans-serif";
  ctx.fillText("CUOTA", W / 2, y);
  ctx.fillStyle = "#4ade80";
  ctx.font = "900 132px system-ui, sans-serif";
  ctx.fillText(p.odds != null ? String(Number(p.odds).toFixed(2)) : "-", W / 2, y + 128);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText(
    golden ? "GOLDEN PICK · rango 1.35-1.40" : "Seleccionada por 3SIXTYBETS AI",
    W / 2,
    y + 176
  );
  y += 232;

  // Bullets de estadisticas (los .dp-stats de la tarjeta)
  if (Array.isArray(p.stats) && p.stats.length) {
    ctx.textAlign = "left";
    ctx.font = "600 30px system-ui, sans-serif";
    for (const stat of p.stats.slice(0, 4)) {
      if (y > H - 240) break; // no invadir el pie de la carta
      ctx.fillStyle = "#6d5df6";
      ctx.beginPath();
      ctx.arc(108, y - 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b6bfd0";
      const lineas = wrapCarta(ctx, stat, W - 260);
      lineas.forEach((l, i) => ctx.fillText(l, 140, y + i * 42));
      y += Math.max(48, lineas.length * 42 + 8);
    }
    ctx.textAlign = "center";
  }

  // Pie: deporte + fecha y aviso legal
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(
    `${p.sportLabel || ""}${p.league ? ` · ${p.league}` : ""}${p.fechaLabel ? ` · ${p.fechaLabel}` : ""}`,
    W / 2,
    H - 150
  );
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillText("3SIXTYBETS · Juega responsablemente · +18", W / 2, H - 90);
  return canvas;
}

async function compartirPick(ev, p) {
  ev.stopPropagation();
  try {
    const canvas = await dibujarCartaPick(p);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    const nombre = `pick-3sixtybets-${String(p.eventName || p.id || "pick").replace(/[^\w-]+/g, "-").slice(0, 40)}.png`;
    if (blob && navigator.canShare) {
      const file = new File([blob], nombre, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Pick 3SIXTYBETS", text: textoPick(p) });
        return;
      }
    }
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      try {
        await navigator.clipboard.writeText(textoPick(p));
      } catch { /* sin portapapeles */ }
      ev.currentTarget && (ev.currentTarget.textContent = "✓ Foto descargada");
      setTimeout(() => {
        const btn = document.getElementById(`share-${p.id}`);
        if (btn) btn.textContent = "📸 Compartir carta";
      }, 1800);
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  const t = textoPick(p);
  try {
    if (navigator.share) {
      await navigator.share({ title: "Pick 3SIXTYBETS", text: t });
      return;
    }
  } catch { /* cancelado: no hacer nada */ }
  try {
    if (ev.shiftKey) {
      window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank");
      return;
    }
    await navigator.clipboard.writeText(t);
    ev.currentTarget && (ev.currentTarget.textContent = "✓ Copiado");
    setTimeout(() => {
      const btn = document.getElementById(`share-${p.id}`);
      if (btn) btn.textContent = "📸 Compartir carta";
    }, 1800);
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank");
  }
}

function GoldenBadge({ p }) {
  if (!esGolden(p)) return null;
  return <span className="dp-badge b-golden">GOLDEN PICK</span>;
}

function RingEfectividad({ porcentaje }) {
  const radio = 34;
  const circ = 2 * Math.PI * radio;
  const offset = circ * (1 - Math.min(porcentaje, 100) / 100);
  return (
    <div className="dash-ring">
      <svg width="86" height="86" viewBox="0 0 86 86">
        <circle cx="43" cy="43" r={radio} className="ring-fondo" />
        <circle
          cx="43"
          cy="43"
          r={radio}
          className="ring-progreso"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 43 43)"
        />
      </svg>
      <span className="dash-ring-num">{porcentaje}%</span>
    </div>
  );
}

/** Etiqueta inteligente: Hoy / Manana HH:MM / dia de la semana. */
function etiquetaFecha(eventDate) {
  if (!eventDate) return "Hoy";
  const d = new Date(eventDate);
  if (isNaN(d)) return "Hoy";
  const hoy = new Date();
  const dias = Math.floor(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()) -
      new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 86400000
  );
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (dias === 0) return `Hoy ${hora}`;
  if (dias === 1) return `Mañana ${hora}`;
  if (dias > 1 && dias < 7)
    return `${d.toLocaleDateString("es-ES", { weekday: "long" })} ${hora}`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

/** Skeleton premium mientras carga el dashboard. */
function DashboardSkeleton() {
  return (
    <div className="dashboard">
      <div className="sk sk-hero shimmer" />
      <div className="dash-stats-row">
        <div className="sk sk-kpi shimmer" />
        <div className="sk sk-kpi shimmer" />
        <div className="sk sk-kpi shimmer" />
      </div>
      <div className="sk sk-efect shimmer" />
      <div className="sk sk-tabs shimmer" />
      <div className="dash-picks">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="dash-pick">
            <div className="sk sk-badge shimmer" />
            <div className="sk sk-linea shimmer" style={{ width: "85%" }} />
            <div className="sk sk-linea shimmer" style={{ width: "70%" }} />
            <div className="sk sk-linea shimmer" style={{ width: "55%" }} />
            <div className="sk sk-linea shimmer" style={{ width: "45%" }} />
          </div>
        ))}
      </div>
      <div className="dash-cargando">
        <span className="dash-spinner" />
        <span>Analizando partidos y calculando valor con IA...</span>
      </div>
    </div>
  );
}

export default function Dashboard({ session, onIrACreditos }) {
  const [data, setData] = useState(null);
  const [vista, setVista] = useState("dia"); // "dia" | "acertados"
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const cargar = () =>
      fetchDashboard(session)
        .then((d) => alive && (setData(d), setError(null)))
        .catch((e) => alive && setError(e.message));
    cargar();
    const intervalo = setInterval(cargar, 60000);
    return () => {
      alive = false;
      clearInterval(intervalo);
    };
  }, [session]);

  const stats = data?.stats;

  // Efectividad de HOY (coherente con los KPIs); si hoy no hay resueltos,
  // se muestra la historica etiquetada como tal.
  const efectividadHoy = stats?.efectividad_hoy;
  const efectividadHist = useMemo(() => {
    if (!stats?.historico_resueltos) return null;
    return Math.round((stats.historico_aciertos / stats.historico_resueltos) * 100);
  }, [stats]);

  const usarHoy = efectividadHoy !== null && efectividadHoy !== undefined;
  const porcentaje = usarHoy ? efectividadHoy : efectividadHist || 0;
  const resueltosMostrar = usarHoy ? stats.resueltos_hoy : stats?.historico_resueltos || 0;
  // Coherencia: en modo HOY, aciertos de HOY (los de ayer no entran en el
  // denominador de resueltos_hoy; mostrarlos aqui daba "14 de 6").
  const aciertosMostrar = usarHoy
    ? (stats.aciertos_hoy ?? stats.pronosticos_acertados_por_la_ia)
    : stats?.historico_aciertos || 0;

  // GOLDEN PICK primero, luego el resto por orden de generacion. IMPORTANTE:
  // este useMemo va ANTES de los return tempranos (reglas de hooks de React).
  const picks = useMemo(() => {
    const base =
      (vista === "dia" ? data?.pronosticos_del_dia : data?.pronosticos_acertados) || [];
    return [...base].sort((a, b) => {
      if (esGolden(a) && !esGolden(b)) return -1;
      if (!esGolden(a) && esGolden(b)) return 1;
      return 0;
    });
  }, [data, vista]);

  if (error)
    return <div className="dash-error">⚠️ No se pudo cargar el dashboard: {error}</div>;
  if (!data) return <DashboardSkeleton />;

  const scrollPicks = (dir) => {
    document.getElementById("dash-picks-track")?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="dashboard">
      {/* ===== HERO ===== */}
      <section className="dash-hero">
        <span className="dash-hero-badge">⚡ Con tecnología de 3SIXTYBETS AI</span>
        <h1 className="dash-hero-title">Pronósticos del Día</h1>
        <p className="dash-hero-sub">
          Picks elegidos por nuestra IA entre los mercados de mayor probabilidad,
          variando deportes y mercados para buscar siempre el mayor valor.
        </p>
      </section>

      {/* ===== STATS ===== */}
      <section className="dash-stats-row">
        <div className="dash-kpi">
          <span className="dash-kpi-label">PRONÓSTICOS DEL DÍA</span>
          <span className="dash-kpi-num">{stats.pronosticos_del_dia}</span>
          <span className="dash-kpi-foot">
            {Object.entries(stats.por_deporte || {})
              .map(([d, n]) => `${d}: ${n}`)
              .join(" · ") || "esperando análisis de la IA"}
          </span>
        </div>
        <div className="dash-kpi kpi-verde">
          <span className="dash-kpi-label">ACERTADOS POR LA IA</span>
          <span className="dash-kpi-num">{stats.pronosticos_acertados_por_la_ia}</span>
          <span className="dash-kpi-foot">solo se muestran los aciertos</span>
        </div>
        <div className="dash-kpi kpi-morado">
          <span className="dash-kpi-label">EFECTIVIDAD {usarHoy ? "DE HOY" : "HISTÓRICA"}</span>
          <span className="dash-kpi-num">{porcentaje}%</span>
          <span className="dash-kpi-foot">
            {aciertosMostrar} de {resueltosMostrar} picks resueltos
          </span>
        </div>
      </section>

      {/* ===== EFECTIVIDAD ===== */}
      <section className="dash-efectividad">
        <h2 className="dash-seccion-titulo">📊 Efectividad de los pronósticos</h2>
        <div className="dash-efect-card">
          <RingEfectividad porcentaje={porcentaje} />
          <div className="dash-efect-item">
            <span className="dash-efect-num">
              {aciertosMostrar} de {resueltosMostrar}
            </span>
            <span className="dash-efect-label">
              Picks resueltos {usarHoy ? "hoy" : "(histórico)"}
            </span>
          </div>
          <div className="dash-efect-item">
            <span className="dash-efect-num">{stats.pronosticos_del_dia}</span>
            <span className="dash-efect-label">Pendientes de hoy</span>
          </div>
          <div className="dash-efect-item">
            <span className="dash-efect-num">{stats.pronosticos_acertados_por_la_ia}</span>
            <span className="dash-efect-label">Acertados hoy</span>
          </div>
        </div>
        <p className="dash-efect-nota">
          {usarHoy
            ? "Efectividad de los pronosticos resueltos hoy. El rendimiento pasado no garantiza resultados futuros."
            : "Resultados historicos de la IA. El rendimiento pasado no garantiza resultados futuros."}
        </p>
      </section>

      {/* ===== TABS ===== */}
      <section className="dash-tabs-wrap">
        <div className="dash-tabs">
          <button
            className={`dash-tab ${vista === "dia" ? "activa" : ""}`}
            onClick={() => setVista("dia")}
          >
            Pronósticos del día
          </button>
          <button
            className={`dash-tab ${vista === "acertados" ? "activa" : ""}`}
            onClick={() => setVista("acertados")}
          >
            ✅ Acertados
          </button>
        </div>
        <div className="dash-tabs-nav">
          <button className="dash-arrow" onClick={() => scrollPicks(-1)}>‹</button>
          <button className="dash-arrow" onClick={() => scrollPicks(1)}>›</button>
        </div>
      </section>

      {/* ===== PICKS ===== */}
      <section id="dash-picks-track" className="dash-picks">
        {picks.length === 0 && (
          <p className="dash-vacio">
            {vista === "dia"
              ? "🤖 La IA aún está analizando los partidos de hoy. Vuelve en unos minutos."
              : "Aún no hay pronósticos acertados hoy."}
          </p>
        )}
        {picks.map((p) =>
          p.bloqueado ? (
            <article key={p.id} className="dash-pick pick-bloqueado">
              <div className="dp-badges">
                <span className="dp-badge b-locked">🔒 Premium</span>
              </div>
              <div className="dp-evento">
                <div className="dp-fila-equipo">
                  {p.awayLogo ? (
                    <img className="dp-logo" src={p.awayLogo} alt="" loading="lazy" />
                  ) : (
                    <span className="dp-logo dp-logo-fallback">?</span>
                  )}
                  <span className="dp-equipo">{p.awayName || p.eventName}</span>
                </div>
                <div className="dp-fila-equipo">
                  {p.homeLogo ? (
                    <img className="dp-logo" src={p.homeLogo} alt="" loading="lazy" />
                  ) : (
                    <span className="dp-logo dp-logo-fallback">?</span>
                  )}
                  <span className="dp-equipo">{p.homeName || ""}</span>
                </div>
              </div>
              <div className="dp-mercado dp-bloqueado-txt">
                La IA ya eligio su apuesta para este partido 🔒
              </div>
              <div className="dp-foot">
                <span className="dp-liga">{p.sportLabel}</span>
                <span className="dp-fecha">{etiquetaFecha(p.eventDate)}</span>
              </div>
              <button
                type="button"
                className="dp-unlock"
                onClick={onIrACreditos}
                title="Ver planes"
              >
                🔓 Desbloquear con Premium
              </button>
            </article>
          ) : (
          <article key={p.id} className={`dash-pick${esGolden(p) ? " pick-golden" : ""}${p.result === "ACIERTO" ? " pick-acierto" : ""}`}>
            <div className="dp-badges">
              <ConfianzaBadge confianza={p.confidence} />
              <GoldenBadge p={p} />
              {p.verificado >= 2 && (
                <span className="dp-badge b-verif">x2 verificado</span>
              )}
              {p.result === "ACIERTO" && (
                <span className="dp-badge b-acierto">✓ Acertado</span>
              )}
            </div>
            <div className="dp-evento">
              <div className="dp-fila-equipo">
                {p.awayLogo ? (
                  <img className="dp-logo" src={p.awayLogo} alt="" loading="lazy" />
                ) : (
                  <span className="dp-logo dp-logo-fallback">?</span>
                )}
                <span className="dp-equipo">{p.awayName || p.eventName}</span>
              </div>
              <div className="dp-fila-equipo">
                {p.homeLogo ? (
                  <img className="dp-logo" src={p.homeLogo} alt="" loading="lazy" />
                ) : (
                  <span className="dp-logo dp-logo-fallback">?</span>
                )}
                <span className="dp-equipo">{p.homeName || ""}</span>
              </div>
            </div>
            <div className="dp-mercado">{p.titulo || p.market}</div>
            <div className="dp-pie">
              <span className="dp-pick-sel">{p.porque || p.selection}</span>
              {p.odds ? <span className="dp-cuota">cuota {p.odds.toFixed(2)}</span> : null}
            </div>
            {Array.isArray(p.stats) && p.stats.length > 0 && (
              <ul className="dp-stats">
                {p.stats.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
            <div className="dp-foot">
              <span className="dp-liga">{p.sportLabel}</span>
              <span className="dp-fecha">{etiquetaFecha(p.eventDate)}</span>
            </div>
            <button
              type="button"
              id={`share-${p.id}`}
              className="dp-share"
              onClick={(ev) => compartirPick(ev, p)}
              title="Copiar pick (Shift+clic: abrir WhatsApp)"
            >
              📸 Compartir carta
            </button>
          </article>
          )
        )}
      </section>

      {/* ===== AVISO ===== */}
      <footer className="dash-aviso">
        ⚠️ <strong>Aviso de responsabilidad:</strong> los pronósticos mostrados son
        estimaciones de modelos predictivos basados en datos históricos. No
        garantizamos la exactitud de los resultados deportivos. Cualquier decisión
        tomada basándose en esta información es de absoluta responsabilidad del
        usuario. Plataforma exclusiva para mayores de 18 años.
        <PagosAceptados />
      </footer>
    </div>
  );
}
