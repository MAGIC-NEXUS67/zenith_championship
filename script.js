// ==========================================
// MAGIC NEXUS - VISUALIZADOR DE TORNEO
// script.js v6 - Fixes: jornadas black, stats limpios (top 3 dorado), sin botón "ver 10 más",
//                    escudos en print stats, fix modal perfil PC
// ==========================================

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let data1 = null;
let data2 = null;
let currentData = null;
let currentDivision = 1;
let customThemes = [];
let currentTheme = 'dominio';
let currentDensity = 'normal';
let advFilters = { rankMin: '', rankMax: '', division: '', priceMin: 0, priceMax: Infinity };
let rankingsCache = {};
let currentMvpJornada = 0;
let currentEcoFilters = { round: 'todas', team: 'all', type: 'todos', sort: 'reciente' };
let perfSelectedTeamId = null;
let perfSelectedPlayerId = null;
let perfCurrentTab = 'equipos';
let chartZoom = 2.0;

// ==========================================
// LOCK DE IMPRESIÓN
// ==========================================
let _printLock = false;
function _acquirePrintLock() {
  if (_printLock) return false;
  _printLock = true;
  return true;
}
function _releasePrintLock() {
  _printLock = false;
}

const sidebar = document.getElementById('sidebar');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mainNav = document.getElementById('mainNav');
const sectionsContainer = document.getElementById('sectionsContainer');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');

const MENU_ITEMS = [
  { id: 'tabla', label: 'Tabla General', icon: 'fa-table' },
  { id: 'media', label: 'Tabla de Media', icon: 'fa-chart-simple' },
  { id: 'jornadas', label: 'Jornadas', icon: 'fa-calendar-day' },
  { id: 'playoffs', label: 'PlayOffs', icon: 'fa-sitemap' },
  { id: 'stats', label: 'Stats', icon: 'fa-chart-bar' },
  { id: 'performance', label: 'Performance', icon: 'fa-chart-line' },
  { id: 'balon', label: 'Balón de Oro', icon: 'fa-trophy' },
  { id: 'equipos', label: 'Equipos', icon: 'fa-users' },
  { id: 'mercado', label: 'Mercado', icon: 'fa-store' },
  { id: 'economia', label: 'Mov. Económicos', icon: 'fa-coins' },
  { id: 'sanciones', label: 'Sanciones', icon: 'fa-gavel' },
  { id: 'seleccion', label: 'Selección Nacional', icon: 'fa-flag' },
  { id: 'amistosos', label: 'Partidos Amistosos', icon: 'fa-handshake' },
  { id: 'salon', label: 'Salón de la Fama', icon: 'fa-medal' }
];

// ==========================================
// UTILIDADES
// ==========================================
function formatCurrency(amount) {
  if (amount >= 1e6) return '$' + (amount / 1e6).toFixed(1) + 'M';
  if (amount >= 1e3) return '$' + (amount / 1e3).toFixed(0) + 'K';
  return '$' + amount.toFixed(0);
}

function getRankColor(rank) {
  const colors = { 'Bronce':'#cd7f32','Plata':'#c0c0c0','Oro':'#ffd700','Platino':'#e5e4e2','Diamante':'#b9f2ff','Campeón':'#ff6b6b','Gran Campeón':'#ff4757','SSL':'#ff4757' };
  return colors[rank] || '#fff';
}

function getTeamById(teams, id) {
  if (!teams) return null;
  return teams.find(t => t.id === id);
}

function getPlayerById(torneo, playerId) {
  if (!torneo || !torneo.teams) return null;
  for (let tm of torneo.teams) {
    const p = tm.players.find(x => x.id === playerId);
    if (p) return p;
  }
  return null;
}

function formatDate(timestamp) {
  try {
    const d = new Date(timestamp);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch (_) { return '--/--/--'; }
}

function getTipoInfo(type) {
  const map = {
    'bonus': { label: 'Bonos', icon: '🏆' },
    'transfer_in': { label: 'Fichajes', icon: '📥' },
    'transfer_out': { label: 'Ventas', icon: '📤' },
    'loan': { label: 'Préstamos', icon: '📋' },
    'penalty': { label: 'Sanciones', icon: '⚠️' },
    'release': { label: 'Liberación', icon: '📄' },
    'return': { label: 'Retorno', icon: '↩️' }
  };
  return map[type] || { label: 'Otro', icon: '🔄' };
}

function getPlayerCategory(pig) {
  if (pig > 200) return { label: 'Leyenda', emoji: '⭐', multiplier: 3.0 };
  if (pig > 150) return { label: 'Elite', emoji: '🏆', multiplier: 2.5 };
  if (pig > 100) return { label: 'Superestrella', emoji: '💎', multiplier: 2.0 };
  if (pig > 75) return { label: 'Estrella', emoji: '🌟', multiplier: 1.6 };
  if (pig > 50) return { label: 'Promesa', emoji: '⚡', multiplier: 1.3 };
  if (pig > 30) return { label: 'Consolidado', emoji: '🔄', multiplier: 1.0 };
  if (pig > 15) return { label: 'Rotación', emoji: '📋', multiplier: 0.7 };
  if (pig > 5) return { label: 'Fondo', emoji: '🪑', multiplier: 0.5 };
  return { label: 'Novato', emoji: '🆕', multiplier: 0.3 };
}

function getRankMultiplier(rank, division) {
  const base = { 'Bronce':0.5, 'Plata':0.7, 'Oro':1.0, 'Platino':1.3, 'Diamante':1.7, 'Campeón':2.2, 'Gran Campeón':2.8, 'SSL':3.5 }[rank] || 1.0;
  if (rank === 'SSL') return 3.5;
  const bonus = { 1:0, 2:0.12, 3:0.25 }[division] || 0;
  return base * (1 + bonus);
}

function applyPowerFrenzy(value) {
  if (value <= 120) return Math.min(value, 500);
  if (value <= 200) return 120 + (value - 120) / 1.2;
  if (value <= 400) return 200 + (value - 200) / 1.8;
  return 400 + (value - 400) / 3;
}

function getPlayerVisibility(player, team) {
  if (!team) return '☆☆☆☆☆';
  const pig = player.seasonStats?.pig || 0;
  const catFactor = getPlayerCategory(pig).multiplier;
  const rankFactor = getRankMultiplier(player.rocketRank, player.division || 2);
  const roleMap = { 'Titular 🌟':1.5, 'Suplente 🔄':0.9, 'Reserva 💤':0.5 };
  const roleFactor = roleMap[player.role] || 0.5;
  const glb = team.glb || 50;
  let teamFactor = 0.5;
  if (glb >= 450) teamFactor = 2.0;
  else if (glb >= 350) teamFactor = 1.7;
  else if (glb >= 250) teamFactor = 1.4;
  else if (glb >= 150) teamFactor = 1.1;
  else if (glb >= 100) teamFactor = 0.9;
  else if (glb >= 70) teamFactor = 0.7;
  let raw = catFactor * rankFactor * roleFactor * teamFactor;
  const scaled = Math.pow(raw, 0.6);
  let stars = Math.min(5, Math.max(1, Math.ceil(scaled)));
  if (player.isCaptain && glb >= 250) stars = Math.max(stars, 4);
  if (player.isCaptain && glb >= 400) stars = 5;
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

function getTeamName(teamId) {
  if (!teamId) return 'Agente Libre';
  if (!currentData) return '?';
  for (let tm of currentData.teams) {
    if (tm.id === teamId) return tm.name;
  }
  return '?';
}

function sanitizeForFilename(str) {
  return (str || 'sin_nombre').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
}

function findMatchRoundIndex(matchId, torneo) {
  if (!torneo || !torneo.rounds) return 0;
  for (let i = 0; i < torneo.rounds.length; i++) {
    if (torneo.rounds[i].some(m => m.id === matchId)) return i + 1;
  }
  return 0;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// ==========================================
// NOMBRE DE LIGA TRICOLOR (México)
// ==========================================
function getLeagueNameHtml() {
  const raw = (document.getElementById('brandTitle')?.innerText || 'LIGA DOMINIO MX').trim();
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 3) {
    return `<span style="color:#006847;">${words[0]}</span> <span style="color:#ffffff;">${words[1]}</span> <span style="color:#ce1126;">${words[2]}</span>`;
  }
  return `<span style="color:#006847;">${raw}</span>`;
}

function resolveCSSVars(html) {
  return html
    .replace(/var\(--neon-green\)/g, '#4ade80')
    .replace(/var\(--neon-red\)/g, '#f87171')
    .replace(/var\(--neon-yellow\)/g, '#facc15')
    .replace(/var\(--neon-cyan\)/g, '#22d3ee')
    .replace(/var\(--neon-pink\)/g, '#ec4899')
    .replace(/var\(--neon-purple\)/g, '#a855f7')
    .replace(/var\(--color-text\)/g, '#e2e8f0')
    .replace(/var\(--color-text-muted\)/g, '#94a3b8')
    .replace(/var\(--color-border\)/g, '#2d2d44')
    .replace(/var\(--color-surface\)/g, '#14141e')
    .replace(/var\(--color-bg\)/g, '#0a0a0f')
    .replace(/var\(--gold\)/g, '#ffd700');
}

// ==========================================
// MODAL DE CONFIGURACIÓN DE IMPRESIÓN
// ==========================================
function openPrintConfigModal(title, bodyHtml, onConfirm) {
  document.querySelectorAll('.print-config-overlay').forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'print-config-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:999999;padding:1.5rem;overflow-y:auto;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);';

  overlay.innerHTML = `
    <div class="print-config-modal" style="background:#14141e;border:1px solid #2d2d44;border-radius:20px;padding:1.75rem 2rem;max-width:620px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.8);position:relative;z-index:1;margin:auto;">
      <h3 style="font-family:Montserrat,sans-serif;font-size:1.4rem;font-weight:900;color:#a855f7;margin-bottom:1.25rem;text-transform:uppercase;letter-spacing:-0.3px;">${title}</h3>
      <div class="print-config-body" style="display:flex;flex-direction:column;gap:0.5rem;">${bodyHtml}</div>
      <div class="print-config-actions" style="display:flex;justify-content:flex-end;gap:0.6rem;padding-top:1rem;border-top:1px solid #2d2d44;margin-top:1rem;">
        <button class="btn-cancel-config" style="padding:0.55rem 1.4rem;border-radius:10px;border:1px solid #2d2d44;background:transparent;color:#e2e8f0;font-weight:700;cursor:pointer;font-size:0.82rem;font-family:inherit;">Cancelar</button>
        <button class="btn-confirm-config" style="padding:0.55rem 1.4rem;border-radius:10px;border:none;background:#a855f7;color:#000;font-weight:700;cursor:pointer;font-size:0.82rem;font-family:inherit;">🖨️ Imprimir</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  function closeOverlay() {
    overlay.remove();
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', escHandler);
  }
  function escHandler(e) {
    if (e.key === 'Escape') {
      closeOverlay();
      _releasePrintLock();
    }
  }
  document.addEventListener('keydown', escHandler);

  overlay.querySelector('.btn-cancel-config').addEventListener('click', () => {
    closeOverlay();
    _releasePrintLock();
  });
  overlay.querySelector('.btn-confirm-config').addEventListener('click', () => {
    let result;
    try {
      result = onConfirm();
    } catch (e) {
      console.error('Error en onConfirm:', e);
      result = false;
    }
    if (result !== false) {
      closeOverlay();
    }
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeOverlay();
      _releasePrintLock();
    }
  });
}

// ==========================================
// HELPER: jugadores ordenados por key
// ==========================================
function getSortedPlayersByKey(torneo, key) {
  const allPlayers = [];
  torneo.teams.forEach(team => {
    team.players.forEach(p => {
      if (p.name && p.name.trim() !== '') {
        const s = p.seasonStats || {};
        allPlayers.push({
          id: p.id, name: p.name, isCaptain: p.isCaptain || false,
          rocketRank: p.rocketRank || 'Platino', division: p.division || 2,
          teamName: team.name, teamShield: team.shield,
          goals: s.goals || 0, assists: s.assists || 0, saves: s.saves || 0, shots: s.shots || 0,
          pig: s.pig || 0, marketValue: p.marketValue || 0
        });
      }
    });
  });
  (torneo.freeAgents || []).forEach(p => {
    if (p.name && p.name.trim() !== '') {
      const s = p.seasonStats || {};
      allPlayers.push({
        id: p.id, name: p.name, isCaptain: p.isCaptain || false,
        rocketRank: p.rocketRank || 'Platino', division: p.division || 2,
        teamName: 'Agente Libre', teamShield: '',
        goals: s.goals || 0, assists: s.assists || 0, saves: s.saves || 0, shots: s.shots || 0,
        pig: s.pig || 0, marketValue: p.marketValue || 0
      });
    }
  });
  return allPlayers.sort((a, b) => (b[key] || 0) - (a[key] || 0));
}

function computePlayerWinner(pA, pB) {
  const statsA = pA.seasonStats || {};
  const statsB = pB.seasonStats || {};
  const pigA = statsA.pig || 0, pigB = statsB.pig || 0;
  if (pigA !== pigB) return pigA > pigB ? 'A' : 'B';
  if ((statsA.goals||0) !== (statsB.goals||0)) return (statsA.goals||0) > (statsB.goals||0) ? 'A' : 'B';
  if ((statsA.assists||0) !== (statsB.assists||0)) return (statsA.assists||0) > (statsB.assists||0) ? 'A' : 'B';
  if ((pA.marketValue||0) !== (pB.marketValue||0)) return (pA.marketValue||0) > (pB.marketValue||0) ? 'A' : 'B';
  return 'tie';
}

function computeTeamWinner(tA, tB) {
  if ((tA.glb||0) !== (tB.glb||0)) return (tA.glb||0) > (tB.glb||0) ? 'A' : 'B';
  const valA = tA.players.reduce((s, p) => s + (p.marketValue||0), 0);
  const valB = tB.players.reduce((s, p) => s + (p.marketValue||0), 0);
  if (valA !== valB) return valA > valB ? 'A' : 'B';
  if ((tA.budget||0) !== (tB.budget||0)) return (tA.budget||0) > (tB.budget||0) ? 'A' : 'B';
  return 'tie';
}

// ==========================================
// PODIO PARA IMPRESIÓN
// ==========================================
function renderPrintPodium(top3) {
  if (!top3 || top3.length === 0) {
    return '<div style="text-align:center;color:#94a3b8;padding:2rem;">Sin datos</div>';
  }
  const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
  const sizes = [130, 105, 95];
  const order = [1, 0, 2];
  const elevations = { 1: '-20px', 0: '-55px', 2: '-20px' };

  let html = '<div style="display:flex;justify-content:center;align-items:flex-end;gap:2.5rem;padding:3rem 1rem 2rem;min-height:320px;flex-wrap:wrap;">';
  order.forEach((idx) => {
    const p = top3[idx];
    if (!p) return;
    const pos = idx + 1;
    const color = colors[idx];
    const size = sizes[idx];
    const elevation = elevations[idx] || '0';
    html += `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;transform:translateY(${elevation});">
        <div style="font-weight:900;font-size:1.15rem;color:#e2e8f0;margin-bottom:0.6rem;letter-spacing:0.05em;">#${pos}</div>
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:#000;border:4px solid ${color};overflow:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px ${color}50;">
          <img src="${p.teamShield || ''}" style="width:100%;height:100%;object-fit:contain;background:#000;">
        </div>
        <div style="font-weight:700;font-size:1rem;color:#fff;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:0.8rem;">${p.name}</div>
        <div style="font-weight:900;font-size:1.15rem;color:#ffd700;margin-top:0.2rem;">${(p.pig||0).toFixed(1)} PIG</div>
        <div style="font-size:0.78rem;color:#94a3b8;margin-top:0.15rem;">${p.teamName || ''}</div>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

// ==========================================
// FASE 4 — Tabla de stats para impresión CON ESCUDOS
// ==========================================
function buildPrintStatsTable(title, players, key, fieldLabel) {
  if (!players || players.length === 0) return '';
  let html = `<div style="margin-bottom:1.2rem;"><h3 style="font-family:Montserrat,sans-serif;font-size:1rem;font-weight:900;color:#a855f7;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em;">${title}</h3>`;
  html += '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;">';
  html += '<thead><tr style="background:rgba(30,30,47,0.7);border-bottom:1px solid #2d2d44;">';
  html += '<th style="padding:0.45rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;width:40px;">#</th>';
  html += '<th style="padding:0.45rem 0.6rem;text-align:left;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;">Jugador</th>';
  html += '<th style="padding:0.45rem 0.6rem;text-align:left;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;">Equipo</th>';
  html += `<th style="padding:0.45rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.06em;width:80px;">${fieldLabel}</th>`;
  html += '</tr></thead><tbody>';
  players.forEach((p, i) => {
    const bg = i % 2 === 0 ? 'rgba(30,30,47,0.4)' : 'rgba(20,20,30,0.4)';
    const rankColor = i < 3 ? '#ffd700' : '#94a3b8';
    html += `<tr style="background:${bg};border-bottom:1px solid #2d2d44;">`;
    html += `<td style="padding:0.4rem 0.6rem;text-align:center;color:${rankColor};font-weight:700;">${i+1}</td>`;
    html += `<td style="padding:0.4rem 0.6rem;color:#fff;font-weight:700;">`;
    html += `<div style="display:flex;align-items:center;gap:0.5rem;">`;
    html += `<img src="${p.teamShield || ''}" style="width:18px;height:18px;border-radius:50%;background:#000;border:1px solid #2d2d44;object-fit:contain;flex-shrink:0;">`;
    html += `<span>${p.isCaptain ? '👑 ' : ''}${p.name}</span>`;
    html += `</div></td>`;
    html += `<td style="padding:0.4rem 0.6rem;color:#94a3b8;">${p.teamName}</td>`;
    html += `<td style="padding:0.4rem 0.6rem;text-align:center;color:#a855f7;font-weight:900;font-size:0.9rem;">${p[key] || 0}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

// ==========================================
// FASE 4 — Bloque MVP para impresión CON ESCUDO
// ==========================================
function buildPrintMvpBlock(torneo, jornadaIdx) {
  const round = torneo.rounds && torneo.rounds[jornadaIdx];
  if (!round) return '';
  const statsMap = {};
  const teamStats = {};
  torneo.teams.forEach(t => { teamStats[t.id] = { pts: 0, g: 0, a: 0, s: 0, pig: 0 }; });
  round.forEach(m => {
    if (m.stats) {
      m.stats.forEach(st => {
        if (!statsMap[st.pId]) statsMap[st.pId] = { g:0, a:0, s:0, t:0, pig:0, teamId: st.tId };
        statsMap[st.pId].g += st.g || 0;
        statsMap[st.pId].a += st.a || 0;
        statsMap[st.pId].s += st.s || 0;
        statsMap[st.pId].t += st.t || 0;
        const pig = (st.g||0)*2 + (st.a||0)*1.5 + (st.s||0)*1 + ((st.t||0) - (st.g||0))*0.2;
        statsMap[st.pId].pig += pig;
        if (teamStats[st.tId]) {
          teamStats[st.tId].g += st.g || 0;
          teamStats[st.tId].a += st.a || 0;
          teamStats[st.tId].s += st.s || 0;
          teamStats[st.tId].pig += pig;
        }
      });
    }
    if (m.played) {
      if (m.sH > m.sA) { if (teamStats[m.h]) teamStats[m.h].pts += 3; }
      else if (m.sA > m.sH) { if (teamStats[m.a]) teamStats[m.a].pts += 3; }
      else { if (teamStats[m.h]) teamStats[m.h].pts += 1; if (teamStats[m.a]) teamStats[m.a].pts += 1; }
    }
  });
  let mvp = null, maxPig = -1;
  Object.keys(statsMap).forEach(pid => {
    if (statsMap[pid].pig > maxPig) { maxPig = statsMap[pid].pig; mvp = { id: pid, pig: statsMap[pid].pig }; }
  });
  const getPlayerInfo = (pid) => {
    for (let tm of torneo.teams) {
      const p = tm.players.find(x => x.id === pid);
      if (p) return { name: p.name, teamName: tm.name, shield: tm.shield };
    }
    return null;
  };
  let html = `<div style="margin-bottom:1.2rem;"><h3 style="font-family:Montserrat,sans-serif;font-size:1rem;font-weight:900;color:#a855f7;margin-bottom:0.5rem;text-transform:uppercase;">⭐ MVP Jornada ${jornadaIdx + 1}</h3>`;
  if (mvp) {
    const info = getPlayerInfo(mvp.id);
    html += `<div style="background:rgba(30,30,47,0.6);border:1px solid #2d2d44;border-radius:12px;padding:1rem;display:flex;align-items:center;gap:1rem;max-width:400px;">`;
    html += `<img src="${info?.shield || ''}" style="width:50px;height:50px;border-radius:50%;background:#000;border:2px solid #2d2d44;object-fit:contain;">`;
    html += `<div><div style="font-weight:900;color:#fff;font-size:1rem;">${info?.name || '?'}</div>`;
    html += `<div style="font-size:0.75rem;color:#94a3b8;">${info?.teamName || ''}</div>`;
    html += `<div style="font-size:1.1rem;color:#ffd700;font-weight:900;">${mvp.pig.toFixed(1)} PIG</div></div></div>`;
  }
  html += '</div>';
  return html;
}

function buildPlayerComparisonHtml(pA, pB, teamA, teamB, showWinner) {
  const winner = showWinner ? computePlayerWinner(pA, pB) : null;
  const winnerA = winner === 'A';
  const winnerB = winner === 'B';

  const renderSide = (player, team, isWinner) => {
    const stats = player.seasonStats || {};
    const borderColor = isWinner ? '#ffd700' : '#2d2d44';
    const badge = isWinner ? '<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#ffd700;color:#000;font-weight:900;padding:0.35rem 1.1rem;border-radius:20px;font-size:0.72rem;letter-spacing:0.05em;box-shadow:0 4px 16px rgba(255,215,0,0.5);">🏆 GANADOR</div>' : '';
    return `
      <div style="position:relative;background:rgba(0,0,0,0.3);border:3px solid ${borderColor};border-radius:18px;padding:1.6rem 1.25rem 1.25rem;display:flex;flex-direction:column;align-items:center;gap:0.5rem;">
        ${badge}
        <img src="${team?.shield || ''}" style="width:75px;height:75px;border-radius:50%;background:#000;border:2px solid #2d2d44;object-fit:contain;">
        <div style="font-size:1.15rem;font-weight:900;color:#fff;text-align:center;margin-top:0.3rem;">${player.name}</div>
        <div style="font-size:0.78rem;color:#94a3b8;">${team?.name || 'Agente Libre'}</div>
        <div style="font-size:0.75rem;color:${getRankColor(player.rocketRank)};font-weight:700;background:rgba(0,0,0,0.3);padding:0.15rem 0.7rem;border-radius:12px;">${player.rocketRank} ${player.rocketRank !== 'SSL' ? player.division : ''}</div>
        <div style="font-size:1.7rem;font-weight:900;color:#ffd700;margin:0.4rem 0;text-shadow:0 0 12px rgba(255,215,0,0.4);">${formatCurrency(player.marketValue || 0)}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.45rem;width:100%;margin-top:0.4rem;">
          <div style="text-align:center;padding:0.5rem 0.3rem;background:rgba(0,0,0,0.35);border-radius:8px;">
            <div style="font-size:1.15rem;font-weight:900;color:#4ade80;">${stats.goals || 0}</div>
            <div style="font-size:0.55rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">⚽ Goles</div>
          </div>
          <div style="text-align:center;padding:0.5rem 0.3rem;background:rgba(0,0,0,0.35);border-radius:8px;">
            <div style="font-size:1.15rem;font-weight:900;color:#22d3ee;">${stats.assists || 0}</div>
            <div style="font-size:0.55rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">🎯 Asist</div>
          </div>
          <div style="text-align:center;padding:0.5rem 0.3rem;background:rgba(0,0,0,0.35);border-radius:8px;">
            <div style="font-size:1.15rem;font-weight:900;color:#ec4899;">${stats.saves || 0}</div>
            <div style="font-size:0.55rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">🧤 Salv</div>
          </div>
          <div style="text-align:center;padding:0.5rem 0.3rem;background:rgba(0,0,0,0.35);border-radius:8px;">
            <div style="font-size:1.15rem;font-weight:900;color:#a855f7;">${(stats.pig || 0).toFixed(1)}</div>
            <div style="font-size:0.55rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">📊 PIG</div>
          </div>
        </div>
      </div>
    `;
  };

  let html = '';
  if (winner && winner !== 'tie') {
    const winnerName = winnerA ? pA.name : pB.name;
    html += `<div style="text-align:center;margin-bottom:1rem;padding:0.75rem;background:rgba(255,215,0,0.15);border:2px solid #ffd700;border-radius:12px;">
      <span style="font-size:1.05rem;font-weight:900;color:#ffd700;text-shadow:0 0 10px rgba(255,215,0,0.4);">🏆 GANADOR: ${winnerName}</span>
    </div>`;
  } else if (winner === 'tie') {
    html += `<div style="text-align:center;margin-bottom:1rem;padding:0.75rem;background:rgba(148,163,184,0.15);border:2px solid #94a3b8;border-radius:12px;">
      <span style="font-size:1.05rem;font-weight:900;color:#94a3b8;">⚖️ EMPATE</span>
    </div>`;
  }
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;">`;
  html += renderSide(pA, teamA, winnerA);
  html += renderSide(pB, teamB, winnerB);
  html += `</div>`;
  return html;
}

function buildTeamComparisonHtml(tA, tB, showWinner) {
  const winner = showWinner ? computeTeamWinner(tA, tB) : null;
  const winnerA = winner === 'A';
  const winnerB = winner === 'B';

  const renderTeamSide = (team, isWinner) => {
    const totalValue = team.players.reduce((s, p) => s + (p.marketValue || 0), 0);
    const borderColor = isWinner ? '#ffd700' : '#2d2d44';
    const badge = isWinner ? '<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#ffd700;color:#000;font-weight:900;padding:0.35rem 1.1rem;border-radius:20px;font-size:0.72rem;letter-spacing:0.05em;box-shadow:0 4px 16px rgba(255,215,0,0.5);">🏆 GANADOR</div>' : '';

    let playersHtml = '';
    const activePlayers = team.players.filter(p => p.name && p.name.trim() !== '');
    activePlayers.forEach(p => {
      const s = p.seasonStats || {};
      playersHtml += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0.6rem;background:rgba(0,0,0,0.25);border-radius:6px;margin-bottom:0.3rem;font-size:0.72rem;gap:0.4rem;">
          <span style="font-weight:700;color:#fff;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.isCaptain ? '👑 ' : ''}${p.name}</span>
          <span style="color:#4ade80;font-weight:700;">⚽${s.goals||0}</span>
          <span style="color:#22d3ee;font-weight:700;">🎯${s.assists||0}</span>
          <span style="color:#ec4899;font-weight:700;">🧤${s.saves||0}</span>
        </div>
      `;
    });

    return `
      <div style="position:relative;background:rgba(0,0,0,0.3);border:3px solid ${borderColor};border-radius:18px;padding:1.6rem 1rem 1rem;">
        ${badge}
        <div style="display:flex;align-items:center;gap:0.7rem;margin-bottom:0.8rem;padding-bottom:0.7rem;border-bottom:1px solid #2d2d44;">
          <img src="${team.shield || ''}" style="width:55px;height:55px;border-radius:50%;background:#000;border:2px solid #2d2d44;object-fit:contain;flex-shrink:0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:1.05rem;font-weight:900;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${team.name}</div>
            <div style="font-size:0.7rem;color:#94a3b8;">GLB ${team.glb || 0} · ATK ${team.atk || 0} · DEF ${team.def || 0}</div>
          </div>
        </div>
        <div style="max-height:400px;overflow-y:auto;">${playersHtml}</div>
        <div style="margin-top:0.8rem;padding-top:0.7rem;border-top:1px solid #2d2d44;display:flex;justify-content:space-between;font-size:0.82rem;">
          <span style="color:#94a3b8;">💰 Valor plantilla:</span>
          <span style="font-weight:900;color:#ffd700;">${formatCurrency(totalValue)}</span>
        </div>
      </div>
    `;
  };

  let html = '';
  if (winner && winner !== 'tie') {
    const winnerName = winnerA ? tA.name : tB.name;
    html += `<div style="text-align:center;margin-bottom:1rem;padding:0.75rem;background:rgba(255,215,0,0.15);border:2px solid #ffd700;border-radius:12px;">
      <span style="font-size:1.05rem;font-weight:900;color:#ffd700;">🏆 GANADOR: ${winnerName}</span>
    </div>`;
  } else if (winner === 'tie') {
    html += `<div style="text-align:center;margin-bottom:1rem;padding:0.75rem;background:rgba(148,163,184,0.15);border:2px solid #94a3b8;border-radius:12px;">
      <span style="font-size:1.05rem;font-weight:900;color:#94a3b8;">⚖️ EMPATE</span>
    </div>`;
  }
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;">`;
  html += renderTeamSide(tA, winnerA);
  html += renderTeamSide(tB, winnerB);
  html += `</div>`;
  return html;
}

// ==========================================
// CÁLCULO DE RANKINGS
// ==========================================
function calculateRankings(torneo) {
  const allPlayers = [];
  torneo.teams.forEach(team => {
    team.players.forEach(p => {
      if (p.name && p.name.trim() !== '') {
        allPlayers.push({ ...p, teamName: team.name, teamShield: team.shield, teamGlb: team.glb });
      }
    });
  });
  (torneo.freeAgents || []).forEach(p => {
    if (p.name && p.name.trim() !== '') {
      allPlayers.push({ ...p, teamName: 'Agente Libre', teamShield: '', teamGlb: 0 });
    }
  });
  if (allPlayers.length === 0) return {};

  const sortBy = (key, desc = true) => {
    const sorted = [...allPlayers].sort((a, b) => {
      const va = a.seasonStats?.[key] || 0;
      const vb = b.seasonStats?.[key] || 0;
      return desc ? vb - va : va - vb;
    });
    sorted.forEach((p, i) => p[`rank_${key}`] = i + 1);
    return sorted;
  };

  sortBy('goals');
  sortBy('assists');
  sortBy('saves');
  sortBy('shots');
  sortBy('pig');

  const sortedByMarket = [...allPlayers].sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0));
  sortedByMarket.forEach((p, i) => p.rank_market = i + 1);

  const sortedByPig = [...allPlayers].sort((a, b) => (b.seasonStats?.pig || 0) - (a.seasonStats?.pig || 0));
  sortedByPig.forEach((p, i) => p.rank_bdor = i + 1);

  const cache = {};
  allPlayers.forEach(p => {
    cache[p.id] = {
      rank_market: p.rank_market || 0,
      rank_goals: p.rank_goals || 0,
      rank_assists: p.rank_assists || 0,
      rank_saves: p.rank_saves || 0,
      rank_shots: p.rank_shots || 0,
      rank_pig: p.rank_pig || 0,
      rank_bdor: p.rank_bdor || 0
    };
  });
  return cache;
}

// ==========================================
// PERFIL DE JUGADOR
// ==========================================
function showPlayerProfile(playerId) {
  const torneo = currentData;
  if (!torneo) return;

  let player = null;
  let team = null;
  for (let tm of torneo.teams) {
    const found = tm.players.find(p => p.id === playerId);
    if (found) { player = found; team = tm; break; }
  }
  if (!player && torneo.freeAgents) {
    const found = torneo.freeAgents.find(p => p.id === playerId);
    if (found) { player = found; team = null; }
  }
  if (!player) return alert('Jugador no encontrado.');

  const ranks = rankingsCache[playerId] || { rank_market: 0, rank_goals: 0, rank_assists: 0, rank_saves: 0, rank_pig: 0, rank_bdor: 0 };
  const stats = player.seasonStats || { goals: 0, assists: 0, saves: 0, shots: 0, pig: 0 };
  const career = player.careerStats || { totalGoals: 0, totalAssists: 0, totalSaves: 0, totalPIG: 0, seasonsPlayed: 0, teams: [] };
  const history = player.transferHistory || [];
  const rankColor = getRankColor(player.rocketRank);
  const category = getPlayerCategory(stats.pig);
  const visibility = getPlayerVisibility(player, team);

  let badges = '';
  if (player.isCaptain) badges += '<span class="badge-captain">👑 Capitán</span> ';
  if (player.status === 'loaned') badges += '<span class="badge-loan">📤 PRESTADO</span> ';
  if (player.status === 'free_agent') badges += '<span class="badge-free">🆓 AGENTE LIBRE</span> ';
  if (torneo.nationalTeams) {
    let inNational = false;
    for (let nt of torneo.nationalTeams) {
      if (nt.players && nt.players.some(p => p.id === playerId)) { inNational = true; break; }
    }
    if (inNational) badges += '<span class="badge-national">🌍 SELECCIÓN</span> ';
  }
  if (player.sanctions && player.sanctions.length > 0) {
    const active = player.sanctions.filter(s => s.active !== false);
    if (active.some(s => s.type === 'red' || s.type === 'suspension')) {
      badges += '<span class="badge-suspended">🚫 SUSPENDIDO</span> ';
    } else if (active.some(s => s.type === 'yellow')) {
      badges += '<span class="badge-yellow">🟨 AMONESTADO</span> ';
    }
  }

  const visibilityDisplay = visibility || '☆☆☆☆☆';

  const bodyHtml = `
    <div class="player-profile-card">
      <div class="profile-header-row">
        <div class="profile-shield">
          <img src="${team ? team.shield : ''}" alt="${team ? team.name : 'Sin equipo'}" onerror="this.style.display='none'">
        </div>
        <div class="profile-header-info">
          <div class="profile-name">
            <span class="icon">🎯</span> ${player.name}
          </div>
          <div class="profile-meta">
            ${team ? team.name : 'Agente Libre'} •
            <span style="color:${rankColor}; font-weight:700;">${player.rocketRank} ${player.rocketRank !== 'SSL' ? player.division : ''}</span> •
            ${category.emoji} ${category.label} •
            ${player.role || 'Sin rol'}
          </div>
          <div class="profile-badges">
            ${badges}
            <span class="profile-visibility">${visibilityDisplay} Visibilidad</span>
            <span class="bdor-rank">🏅 Ranking BdO: #${ranks.rank_bdor}</span>
          </div>
        </div>
      </div>

      <div class="profile-value">
        💰 Valor de Mercado: ${formatCurrency(player.marketValue || 0)} &nbsp;|&nbsp; 📊 Ranking en mercado: #${ranks.rank_market}
      </div>

      <div class="profile-stats-grid">
        <div class="stat-item">
          <div class="stat-value">⚽ ${stats.goals || 0}</div>
          <div class="stat-label">Goles · <span style="color:#ffd700;">#${ranks.rank_goals}</span></div>
        </div>
        <div class="stat-item">
          <div class="stat-value">🎯 ${stats.assists || 0}</div>
          <div class="stat-label">Asisten · <span style="color:#ffd700;">#${ranks.rank_assists}</span></div>
        </div>
        <div class="stat-item">
          <div class="stat-value">🧤 ${stats.saves || 0}</div>
          <div class="stat-label">Salv · <span style="color:#ffd700;">#${ranks.rank_saves}</span></div>
        </div>
        <div class="stat-item">
          <div class="stat-value">📊 ${(stats.pig || 0).toFixed(1)}</div>
          <div class="stat-label">PIG · <span style="color:#ffd700;">#${ranks.rank_pig}</span></div>
        </div>
      </div>

      <div class="profile-career">
        <div class="section-title-sm">📊 Estadísticas de Carrera</div>
        <div class="career-stats">
          <span>Goles: ${career.totalGoals || 0}</span>
          <span>Asistencias: ${career.totalAssists || 0}</span>
          <span>Salvadas: ${career.totalSaves || 0}</span>
          <span>PIG total: ${(career.totalPIG || 0).toFixed(1)}</span>
          <span>Temporadas: ${career.seasonsPlayed || 0}</span>
          <span>Equipos: ${(career.teams || []).length}</span>
        </div>
      </div>

      <div class="profile-info">
        <div class="section-title-sm">ℹ️ Información</div>
        <div class="info-items">
          <span>Estado: ${player.status === 'loaned' ? '📤 Prestado' : player.status === 'free_agent' ? '🆓 Agente Libre' : '✅ Propio'}</span>
          <span>Peligro: ${player.peligro || 0} 💀</span>
          <span>Visibilidad: ${visibilityDisplay}</span>
        </div>
      </div>

      ${history.length > 0 ? `
      <div class="profile-history">
        <div class="section-title-sm">📜 Historial de Movimientos</div>
        ${history.slice().reverse().map(h => {
          const fromName = getTeamName(h.fromTeamId);
          const toName = getTeamName(h.toTeamId);
          const typeMap = {
            'transfer': '🔄 Traspaso',
            'loan': '📤 Préstamo',
            'return': '📥 Retorno',
            'free_agent': '🆓 Agente Libre'
          };
          return `
            <div class="history-item">
              ${typeMap[h.type] || '🔄 Movimiento'} 
              ${fromName} → ${toName} 
              ${h.fee ? '💰 '+formatCurrency(h.fee) : ''}
              ${h.round ? '(Jornada '+h.round+')' : ''}
            </div>
          `;
        }).join('')}
      </div>
      ` : ''}
    </div>
  `;

  const actionsHtml = `
    <div class="profile-actions">
      <div class="profile-actions-left">
        <button onclick="showPlayerPerformance('${player.id}')" class="btn-performance">
          📊 Ver Performance
        </button>
        <button onclick="printPlayerProfile('${player.id}')" class="btn-share">
          🖨️ Imprimir
        </button>
      </div>
      <button onclick="closePlayerProfile()" class="btn-close">
        ❌ Cerrar
      </button>
    </div>
  `;

  const modal = document.getElementById('profile-modal-overlay');
  const content = document.getElementById('profile-modal-content');
  content.innerHTML = `<div class="profile-modal-body">${bodyHtml}</div>${actionsHtml}`;
  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closePlayerProfile() {
  document.getElementById('profile-modal-overlay').classList.remove('active');
  document.body.classList.remove('modal-open');
}

function showPlayerPerformance(playerId) {
  closePlayerProfile();
  perfSelectedPlayerId = playerId;
  perfCurrentTab = 'jugadores';
  switchView('performance');
}

function printPlayerProfile(playerId) {
  if (!_acquirePrintLock()) return;
  closePlayerProfile();

  const torneo = currentData;
  if (!torneo) { _releasePrintLock(); return; }

  let player = null;
  let team = null;
  for (let tm of torneo.teams) {
    const found = tm.players.find(p => p.id === playerId);
    if (found) { player = found; team = tm; break; }
  }
  if (!player && torneo.freeAgents) {
    const found = torneo.freeAgents.find(p => p.id === playerId);
    if (found) { player = found; team = null; }
  }
  if (!player) { _releasePrintLock(); return alert('Jugador no encontrado.'); }

  const ranks = rankingsCache[playerId] || { rank_market: 0, rank_goals: 0, rank_assists: 0, rank_saves: 0, rank_pig: 0, rank_bdor: 0 };
  const stats = player.seasonStats || { goals: 0, assists: 0, saves: 0, shots: 0, pig: 0 };
  const career = player.careerStats || { totalGoals: 0, totalAssists: 0, totalSaves: 0, totalPIG: 0, seasonsPlayed: 0, teams: [] };
  const rankColor = getRankColor(player.rocketRank);
  const category = getPlayerCategory(stats.pig);
  const visibility = getPlayerVisibility(player, team);

  let badges = '';
  if (player.isCaptain) badges += '👑 Capitán ';
  if (player.status === 'loaned') badges += '📤 PRESTADO ';
  if (player.status === 'free_agent') badges += '🆓 AGENTE LIBRE ';
  if (player.sanctions && player.sanctions.length > 0) {
    const active = player.sanctions.filter(s => s.active !== false);
    if (active.some(s => s.type === 'red' || s.type === 'suspension')) badges += '🚫 SUSPENDIDO ';
    else if (active.some(s => s.type === 'yellow')) badges += '🟨 AMONESTADO ';
  }

  const visibilityDisplay = visibility || '☆☆☆☆☆';

  let printHtml = `
    <div style="background:#14141e;color:#e2e8f0;padding:1.5rem;border-radius:16px;border:1px solid #2d2d44;max-width:700px;margin:0 auto;font-family:Inter,sans-serif;">
      <div style="display:flex;gap:1rem;align-items:center;border-bottom:1px solid #2d2d44;padding-bottom:0.8rem;">
        <div style="flex-shrink:0;"><img src="${team ? team.shield : ''}" style="width:60px;height:60px;border-radius:50%;background:#000;border:1px solid #2d2d44;object-fit:contain;"></div>
        <div style="flex:1;">
          <div style="font-size:1.3rem;font-weight:900;">🎯 ${player.name}</div>
          <div style="font-size:0.75rem;color:#94a3b8;">
            ${team ? team.name : 'Agente Libre'} •
            <span style="color:${rankColor};font-weight:700;">${player.rocketRank} ${player.rocketRank !== 'SSL' ? player.division : ''}</span> •
            ${category.emoji} ${category.label} •
            ${player.role || 'Sin rol'}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.2rem;font-size:0.65rem;">
            ${badges ? `<span>${badges}</span>` : ''}
            <span style="color:#facc15;">${visibilityDisplay} Visibilidad</span>
            <span style="color:#ffd700;font-weight:900;">🏅 Ranking BdO: #${ranks.rank_bdor}</span>
          </div>
        </div>
      </div>

      <div style="text-align:center;font-size:0.9rem;font-weight:700;background:rgba(0,0,0,0.2);padding:0.4rem;border-radius:10px;margin:0.5rem 0;">
        💰 Valor de Mercado: ${formatCurrency(player.marketValue || 0)} &nbsp;|&nbsp; 📊 Ranking: #${ranks.rank_market}
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-bottom:0.5rem;">
        ${['goals','assists','saves','pig'].map(key => {
          const labelMap = { goals:'Goles', assists:'Asisten', saves:'Salv', pig:'PIG' };
          const iconMap = { goals:'⚽', assists:'🎯', saves:'🧤', pig:'📊' };
          const rankKey = key === 'pig' ? 'rank_pig' : `rank_${key}`;
          const val = key === 'pig' ? (stats[key]||0).toFixed(1) : stats[key]||0;
          return `
            <div style="background:rgba(0,0,0,0.2);padding:0.5rem 0.3rem;border-radius:10px;text-align:center;">
              <div style="font-size:1.2rem;font-weight:900;">${iconMap[key]} ${val}</div>
              <div style="font-size:0.55rem;color:#94a3b8;">${labelMap[key]} · <span style="color:#ffd700;">#${ranks[rankKey]||0}</span></div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="margin-top:0.5rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>
    </div>
  `;

  printHtml = resolveCSSVars(printHtml);
  showPrintModal(printHtml, `perfil_${sanitizeForFilename(player.name)}.jpg`, 700);
}

// ==========================================
// IMPRESIÓN
// ==========================================
function getPrintHeader(title) {
  const logoImg = document.getElementById('logoImage');
  const logoUrl = logoImg.style.display !== 'none' && logoImg.src ? logoImg.src : '';
  const leagueNameHtml = getLeagueNameHtml();
  return `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;border-bottom:2px solid #2d2d44;padding-bottom:0.5rem;">
      ${logoUrl ? `<img src="${logoUrl}" style="width:50px;height:50px;border-radius:50%;background:#000;border:1px solid #2d2d44;object-fit:contain;" />` : ''}
      <div>
        <div style="font-family:'Montserrat',sans-serif;font-weight:900;font-size:1.2rem;">${leagueNameHtml}</div>
        <div style="font-size:0.8rem;color:#94a3b8;">${title}</div>
      </div>
    </div>
  `;
}

function showPrintModalIOS(htmlContent, filename) {
  try {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir.');
      _releasePrintLock();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Imprimir - ${filename}</title>
      <style>body { background: #0a0a0f; color: #e2e8f0; font-family: Inter, system-ui, sans-serif; padding: 2rem; max-width: 900px; margin: 0 auto; } img { max-width: 100%; } table { width: 100%; border-collapse: collapse; } th, td { padding: 0.3rem 0.5rem; border: 1px solid #2d2d44; } th { background: #1e1e2f; }</style>
      </head><body>${htmlContent}<script>window.onload=function(){window.print();};<\/script></body></html>
    `);
    printWindow.document.close();
    const checkClosed = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(checkClosed);
        _releasePrintLock();
      }
    }, 500);
    setTimeout(() => { clearInterval(checkClosed); _releasePrintLock(); }, 60000);
  } catch (e) {
    alert('Error al imprimir: ' + e.message);
    _releasePrintLock();
  }
}

function showPrintModal(htmlContent, filename, width = 800) {
  if (isIOS() || /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
    showPrintModalIOS(htmlContent, filename);
    return;
  }
  if (typeof html2canvas === 'undefined') {
    showPrintModalIOS(htmlContent, filename);
    return;
  }

  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.width = width + 'px';
  tempDiv.style.background = '#0a0a0f';
  tempDiv.style.padding = '1rem';
  tempDiv.style.color = '#e2e8f0';
  tempDiv.style.fontFamily = 'Inter, system-ui, sans-serif';
  tempDiv.style.borderRadius = '8px';
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  html2canvas(tempDiv, {
    scale: 2,
    backgroundColor: '#0a0a0f',
    useCORS: true,
    logging: false,
    windowHeight: tempDiv.scrollHeight,
    windowWidth: tempDiv.scrollWidth
  }).then(canvas => {
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    tempDiv.remove();
    const overlay = document.createElement('div');
    overlay.className = 'print-modal-overlay';
    overlay.innerHTML = `
      <div class="print-modal">
        <h3><i class="fas fa-print"></i> Vista previa</h3>
        <div class="preview"><img src="${imgData}" style="max-width:100%;border-radius:4px;" /></div>
        <div class="actions">
          <button class="btn-cancel">Cancelar</button>
          <button class="btn-download">Descargar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function closeOverlay() {
      overlay.remove();
      _releasePrintLock();
    }
    overlay.querySelector('.btn-cancel').addEventListener('click', closeOverlay);
    overlay.querySelector('.btn-download').addEventListener('click', () => {
      downloadImage(imgData, filename);
      closeOverlay();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
  }).catch(err => {
    console.error('html2canvas error:', err);
    tempDiv.remove();
    _releasePrintLock();
    showPrintModalIOS(htmlContent, filename);
  });
}

function downloadImage(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

// ==========================================
// CARGA DE DATOS
// ==========================================
async function loadAllData() {
  try {
    const resp1 = await fetch('datos.json?t=' + Date.now());
    if (!resp1.ok) throw new Error('No se pudo cargar datos.json (1ª División)');
    data1 = await resp1.json();
    if (data1.tournaments && Array.isArray(data1.tournaments) && data1.tournaments.length) {
      data1 = data1.tournaments[0];
    }
  } catch (e) {
    errorContainer.style.display = 'block';
    errorMessage.textContent = 'Error al cargar datos.json: ' + e.message;
    return;
  }

  try {
    const resp2 = await fetch('datos2.json?t=' + Date.now());
    if (resp2.ok) {
      data2 = await resp2.json();
      if (data2.tournaments && Array.isArray(data2.tournaments) && data2.tournaments.length) {
        data2 = data2.tournaments[0];
      }
    } else {
      data2 = null;
    }
  } catch (_) {
    data2 = null;
  }

  if (data1 && data2) {
    showTournamentSelector();
  } else if (data1) {
    selectTournament(1);
  } else {
    errorContainer.style.display = 'block';
    errorMessage.textContent = 'No se encontraron datos válidos.';
  }
}

function showTournamentSelector() {
  const selector = document.getElementById('tournament-selector');
  selector.style.display = 'flex';
  document.getElementById('selector-name1').textContent = data1.name || '1ª División';
  document.getElementById('selector-name2').textContent = data2.name || '2ª División';
  document.getElementById('selector-info1').textContent = `${data1.teams?.length || 0} equipos`;
  document.getElementById('selector-info2').textContent = `${data2.teams?.length || 0} equipos`;
  const logo1 = document.getElementById('selector-logo1');
  const logo2 = document.getElementById('selector-logo2');
  logo1.src = data1.logo || '';
  logo2.src = data2.logo || '';
  logo1.onerror = function() { this.style.display = 'none'; };
  logo2.onerror = function() { this.style.display = 'none'; };
}

function selectTournament(division) {
  const selector = document.getElementById('tournament-selector');
  selector.style.display = 'none';

  if (division === 1) {
    currentData = data1;
    currentDivision = 1;
    loadLogo('logo.png', 'logo.jpg');
  } else {
    currentData = data2;
    currentDivision = 2;
    loadLogo('logo2.png', 'logo2.jpg');
  }
  applyData(currentData);
}

function applyData(torneo) {
  if (!torneo) return;
  rankingsCache = calculateRankings(torneo);
  const brandTitle = document.getElementById('brandTitle');
  const brandSub = document.getElementById('brandSub');
  brandTitle.innerHTML = `MTM <span>NEXUS</span>`;
  brandSub.textContent = torneo.name || 'Visualizador de Torneo';
  loadPreferences();
  buildUI(torneo);
  errorContainer.style.display = 'none';
}

function loadLogo(primary, secondary) {
  const img = document.getElementById('logoImage');
  const noLogo = document.getElementById('noLogoText');
  const names = [primary, secondary];
  for (let name of names) {
    if (!name) continue;
    const testImg = new Image();
    testImg.onload = function() {
      img.src = name;
      img.style.display = 'block';
      noLogo.style.display = 'none';
    };
    testImg.onerror = function() {
      img.style.display = 'none';
      noLogo.style.display = 'block';
    };
    testImg.src = name;
    break;
  }
}

function loadCustomThemes() {
  try {
    const saved = localStorage.getItem('mtm_custom_themes');
    if (saved) customThemes = JSON.parse(saved);
  } catch (_) { customThemes = []; }
}

function applyTheme(theme) {
  currentTheme = theme;
  let themeConfig = null;
  if (theme.startsWith('custom_')) {
    const id = theme.replace('custom_', '');
    themeConfig = customThemes.find(t => t.id === id);
    if (!themeConfig) { applyTheme('dominio'); return; }
  }

  try {
    if (theme === 'dominio') {
      document.documentElement.setAttribute('data-theme', 'dominio');
      document.getElementById('brandTitle').innerHTML = '<span style="color:#006847;">LIGA</span> <span style="color:#fff;">DOMINIO</span> <span style="color:#ce1126;">MX</span>';
      document.getElementById('brandSub').innerHTML = '<span style="color:#006847;">COMPITE</span>, <span style="color:#fff;">DOMINA</span> <span style="color:#ce1126;">Y REPITE</span>';
      loadLogo('logo.png', 'logo.jpg');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.getElementById('brandTitle').innerHTML = 'MTM <span>NEXUS</span>';
      document.getElementById('brandSub').textContent = 'Modo Claro';
      loadLogo('logo.png', 'logo.jpg');
    } else {
      applyTheme('dominio');
      return;
    }
    localStorage.setItem('mtm_theme', theme);
  } catch (_) {}
}

function applyDensity(density) {
  currentDensity = density;
  document.documentElement.setAttribute('data-density', density);
  try { localStorage.setItem('mtm_density', density); } catch (_) {}
}

function loadPreferences() {
  loadCustomThemes();
  try {
    const savedTheme = localStorage.getItem('mtm_theme');
    if (savedTheme) applyTheme(savedTheme);
    else applyTheme('dominio');
    const savedDensity = localStorage.getItem('mtm_density');
    if (savedDensity) applyDensity(savedDensity);
    else applyDensity('normal');
  } catch (_) {
    applyTheme('dominio');
    applyDensity('normal');
  }
}

function goToTournamentSelector() {
  if (data1 && data2) {
    showTournamentSelector();
    sectionsContainer.innerHTML = '';
    currentData = null;
  } else {
    location.reload();
  }
}

// ==========================================
// CÁLCULO DE PODER REAL POR JORNADA (EQUIPOS)
// ==========================================
function calculateTeamPowerAtRound(teamId, torneo, targetRound) {
  const team = getTeamById(torneo.teams, teamId);
  if (!team) return { atk: 0, def: 0, glb: 0 };

  let pigAtk = 0, pigDef = 0, formAtk = 0, formDef = 0;

  for (let r = 0; r <= targetRound; r++) {
    const round = torneo.rounds[r];
    if (!round) continue;
    round.forEach(m => {
      if (!m.played) return;
      if (m.h !== teamId && m.a !== teamId) return;
      const isHome = m.h === teamId;
      if (isHome) {
        formAtk += (m.sH - 3) * 1.5;
        formDef += (3 - m.sA) * 1.5;
      } else {
        formAtk += (m.sA - 3) * 1.5;
        formDef += (3 - m.sH) * 1.5;
      }
      formAtk = Math.max(-20, Math.min(20, formAtk));
      formDef = Math.max(-20, Math.min(20, formDef));
      if (m.stats) {
        m.stats.forEach(st => {
          if (st.tId === teamId) {
            pigAtk += (st.g || 0) * 2.0 + (st.a || 0) * 1.5;
            pigDef += (st.s || 0) * 1.0;
          }
        });
      }
    });
  }

  const activePlayers = team.players.filter(p => p.name && p.name.trim() !== '');
  let avgRankMult = 1;
  if (activePlayers.length > 0) {
    const sum = activePlayers.reduce((acc, p) => {
      const rankValue = getRankMultiplier(p.rocketRank, p.division || 2);
      return acc + rankValue;
    }, 0);
    avgRankMult = sum / activePlayers.length;
    avgRankMult = 1 + (avgRankMult - 1) * 2.0;
  }

  let baseAtk = 30 + (pigAtk / 25) + (formAtk * 1.5);
  let baseDef = 30 + (pigDef / 30) + (formDef * 1.5);
  let calcAtk = baseAtk * avgRankMult;
  let calcDef = baseDef * avgRankMult;
  calcAtk = applyPowerFrenzy(calcAtk);
  calcDef = applyPowerFrenzy(calcDef);

  const atk = Math.min(500, Math.max(10, Math.floor(calcAtk)));
  const def = Math.min(500, Math.max(10, Math.floor(calcDef)));
  const glb = Math.floor((atk + def) / 2);
  return { atk, def, glb };
}

// ==========================================
// PERFORMANCE - LABELS
// ==========================================
function getPlayoffLabels(torneo) {
  const labels = [];
  const rounds = torneo.rounds || [];
  const totalRounds = rounds.length;

  let lastPlayedRound = -1;
  for (let i = 0; i < totalRounds; i++) {
    const round = rounds[i];
    if (round && round.some(m => m.played)) {
      lastPlayedRound = i;
    }
  }

  if (lastPlayedRound === -1) {
    labels.push({ type: 'liguilla', round: 0, label: 'J1', hasData: false, roundIdx: 0 });
    return labels;
  }

  for (let i = 0; i <= lastPlayedRound; i++) {
    const round = rounds[i];
    const hasPlayed = round && round.some(m => m.played);
    labels.push({
      type: 'liguilla',
      round: i,
      roundIdx: i,
      label: `J${i + 1}`,
      hasData: hasPlayed
    });
  }

  if (torneo.playoffs && torneo.playoffs.rounds) {
    const playoffRounds = torneo.playoffs.rounds;
    const phaseNames = ['4°tos', 'Semis', 'Final'];
    playoffRounds.forEach((round, idx) => {
      const hasPlayed = round && round.some(m => m.played);
      const phaseName = phaseNames[idx] || `PO${idx + 1}`;
      labels.push({
        type: 'playoff',
        round: idx,
        roundIdx: idx,
        label: phaseName,
        hasData: hasPlayed
      });
    });
  }

  return labels;
}

function calculateTeamPerformance(teamId, torneo) {
  const team = getTeamById(torneo.teams, teamId);
  if (!team) return [];

  const labels = getPlayoffLabels(torneo);
  const result = [];
  let totalGF = 0, totalGA = 0, totalSaves = 0, totalMatches = 0;

  labels.forEach((label) => {
    let gf = 0, ga = 0, saves = 0;

    if (label.type === 'liguilla') {
      const round = torneo.rounds[label.round];
      if (round) {
        round.forEach(m => {
          if (m.played && (m.h === teamId || m.a === teamId)) {
            const isHome = m.h === teamId;
            gf += isHome ? m.sH : m.sA;
            ga += isHome ? m.sA : m.sH;
            totalMatches++;
            if (m.stats) {
              m.stats.forEach(st => {
                if (st.tId === teamId) saves += st.s || 0;
              });
            }
          }
        });
      }
    } else if (label.type === 'playoff') {
      const round = torneo.playoffs.rounds[label.round];
      if (round) {
        round.forEach(m => {
          if (m.played && (m.h === teamId || m.a === teamId)) {
            const isHome = m.h === teamId;
            gf += isHome ? m.sH : m.sA;
            ga += isHome ? m.sA : m.sH;
            totalMatches++;
            if (m.stats) {
              m.stats.forEach(st => {
                if (st.tId === teamId) saves += st.s || 0;
              });
            }
          }
        });
      }
    }

    totalGF += gf;
    totalGA += ga;
    totalSaves += saves;

    const power = calculateTeamPowerAtRound(teamId, torneo, label.roundIdx);

    result.push({
      label: label.label,
      type: label.type,
      roundIdx: label.roundIdx,
      hasData: label.hasData,
      atk: power.atk,
      def: power.def,
      glb: power.glb,
      gf: gf,
      ga: ga,
      saves: saves,
      matches: totalMatches
    });
  });

  result.totalGF = totalGF;
  result.totalGA = totalGA;
  result.totalSaves = totalSaves;
  result.matches = totalMatches;
  return result;
}

function calculatePlayerPerformance(playerId, torneo) {
  const result = [];
  let totalGoals = 0, totalAssists = 0, totalSaves = 0, totalShots = 0, totalPIG = 0;
  const labels = getPlayoffLabels(torneo);

  labels.forEach((label) => {
    let goals = 0, assists = 0, saves = 0, shots = 0;

    if (label.type === 'liguilla') {
      const round = torneo.rounds[label.round];
      if (round) {
        round.forEach(m => {
          if (m.played && m.stats) {
            const stat = m.stats.find(s => s.pId === playerId);
            if (stat) {
              goals += stat.g || 0;
              assists += stat.a || 0;
              saves += stat.s || 0;
              shots += stat.t || 0;
            }
          }
        });
      }
    } else if (label.type === 'playoff') {
      const round = torneo.playoffs.rounds[label.round];
      if (round) {
        round.forEach(m => {
          if (m.played && m.stats) {
            const stat = m.stats.find(s => s.pId === playerId);
            if (stat) {
              goals += stat.g || 0;
              assists += stat.a || 0;
              saves += stat.s || 0;
              shots += stat.t || 0;
            }
          }
        });
      }
    }

    const pig = (goals * 2) + (assists * 1.5) + (saves * 1) + ((shots - goals) * 0.2);
    totalGoals += goals;
    totalAssists += assists;
    totalSaves += saves;
    totalShots += shots;
    totalPIG += pig;

    result.push({
      label: label.label,
      type: label.type,
      roundIdx: label.roundIdx,
      hasData: label.hasData,
      goals: goals,
      assists: assists,
      saves: saves,
      shots: shots,
      pig: pig
    });
  });

  result.totalGoals = totalGoals;
  result.totalAssists = totalAssists;
  result.totalSaves = totalSaves;
  result.totalShots = totalShots;
  result.totalPIG = totalPIG;
  return result;
}

function calculatePlayerMarketValueHistory(playerId, torneo) {
  const history = [];
  const labels = getPlayoffLabels(torneo);
  let accumulatedStats = { goals: 0, assists: 0, saves: 0, shots: 0, matches: 0 };
  let pigHistory = [];

  let player = null, team = null;
  for (let tm of torneo.teams) {
    const found = tm.players.find(p => p.id === playerId);
    if (found) { player = found; team = tm; break; }
  }
  if (!player || !team) return history;

  const basePlayer = JSON.parse(JSON.stringify(player));
  const baseTeam = JSON.parse(JSON.stringify(team));

  labels.forEach((label) => {
    let goals = 0, assists = 0, saves = 0, shots = 0, matches = 0;

    if (label.type === 'liguilla') {
      const round = torneo.rounds[label.round];
      if (round) {
        round.forEach(m => {
          if (m.played && m.stats) {
            const stat = m.stats.find(s => s.pId === playerId);
            if (stat) {
              goals += stat.g || 0;
              assists += stat.a || 0;
              saves += stat.s || 0;
              shots += stat.t || 0;
              matches++;
            }
          }
        });
      }
    } else if (label.type === 'playoff') {
      const round = torneo.playoffs.rounds[label.round];
      if (round) {
        round.forEach(m => {
          if (m.played && m.stats) {
            const stat = m.stats.find(s => s.pId === playerId);
            if (stat) {
              goals += stat.g || 0;
              assists += stat.a || 0;
              saves += stat.s || 0;
              shots += stat.t || 0;
              matches++;
            }
          }
        });
      }
    }

    accumulatedStats.goals += goals;
    accumulatedStats.assists += assists;
    accumulatedStats.saves += saves;
    accumulatedStats.shots += shots;
    accumulatedStats.matches += matches;

    const pig = (accumulatedStats.goals * 2) + (accumulatedStats.assists * 1.5) + (accumulatedStats.saves * 1) + ((accumulatedStats.shots - accumulatedStats.goals) * 0.2);
    pigHistory.push(pig);

    const marketValue = calculateMarketValueFromStats(basePlayer, baseTeam, accumulatedStats, pigHistory);

    history.push({
      label: label.label,
      type: label.type,
      roundIdx: label.roundIdx,
      marketValue: marketValue,
      pig: pig,
      matches: accumulatedStats.matches,
      goals: accumulatedStats.goals,
      assists: accumulatedStats.assists,
      saves: accumulatedStats.saves,
      shots: accumulatedStats.shots
    });
  });

  return history;
}

function getBasePrice(rank, division) {
  const BASE_PRICES = {
    'Bronce': { 1: 300, 2: 500, 3: 700 },
    'Plata': { 1: 800, 2: 1200, 3: 2000 },
    'Oro': { 1: 2500, 2: 3500, 3: 5000 },
    'Platino': { 1: 6000, 2: 8000, 3: 10000 },
    'Diamante': { 1: 15000, 2: 18000, 3: 22000 },
    'Campeón': { 1: 25000, 2: 40000, 3: 60000 },
    'Gran Campeón': { 1: 90000, 2: 120000, 3: 160000 },
    'SSL': { 1: 250000, 2: 250000, 3: 250000 }
  };
  return BASE_PRICES[rank]?.[division] || 5000;
}

function calculateMarketValueFromStats(player, team, stats, pigHistory) {
  if (!player || !team) return 5000;

  const { goals, assists, saves, shots } = stats;
  const effectivePig = (goals * 2) + (assists * 1.5) + (saves * 1) + ((shots - goals) * 0.2);

  const basePrice = getBasePrice(player.rocketRank, player.division || 2);
  const ROLE_MULTIPLIER = { 'Titular 🌟': 1.4, 'Suplente 🔄': 0.9, 'Reserva 💤': 0.6 };
  let roleFactor = player.isCaptain ? 1.8 : (ROLE_MULTIPLIER[player.role] || 0.6);

  let sanctionPenalty = 0;
  if (player.sanctions) {
    const active = player.sanctions.filter(s => s.active);
    if (active.some(s => s.type === 'red' || s.type === 'suspension')) sanctionPenalty = -0.30;
    else if (active.some(s => s.type === 'yellow')) sanctionPenalty = -0.10;
  }
  roleFactor = Math.max(0.1, roleFactor + sanctionPenalty);

  const avgPIG = pigHistory.length > 0 ? pigHistory.reduce((a,b) => a+b, 0) / pigHistory.length : 0;
  const last5 = pigHistory.slice(-5);
  const avgLast5 = last5.length > 0 ? last5.reduce((a,b) => a+b, 0) / last5.length : 0;
  let streakPenalty = 0;
  if (last5.length >= 3 && avgLast5 < avgPIG * 0.5) streakPenalty = -0.20;
  else if (last5.length >= 3 && avgLast5 < avgPIG * 0.7) streakPenalty = -0.10;
  roleFactor = Math.max(0.1, roleFactor + streakPenalty);

  const pigValue = effectivePig * 25000;
  const goalValue = goals * 40000;
  const assistValue = assists * 25000;
  const saveValue = saves * 20000;
  const dangerValue = (goals + assists + shots) * 10000;

  let performanceValue = (pigValue * 0.5) + (goalValue * 0.15) + (assistValue * 0.1) +
                        (saveValue * 0.05) + (dangerValue * 0.05);
  const consistencyMultiplier = 1 + (avgPIG / 1000);
  performanceValue *= consistencyMultiplier;

  const rankValue = getRankMultiplier(player.rocketRank, player.division || 2);
  const rankFactor = 0.5 + (rankValue / 2);

  let category = 0.3;
  if (effectivePig > 200) category = 3.0;
  else if (effectivePig > 150) category = 2.5;
  else if (effectivePig > 100) category = 2.0;
  else if (effectivePig > 75) category = 1.6;
  else if (effectivePig > 50) category = 1.3;
  else if (effectivePig > 30) category = 1.0;
  else if (effectivePig > 15) category = 0.7;
  else if (effectivePig > 5) category = 0.5;

  const glb = team.glb || 50;
  let visibility = 0.6;
  if (glb >= 450) visibility = 2.0;
  else if (glb >= 350) visibility = 1.7;
  else if (glb >= 250) visibility = 1.4;
  else if (glb >= 150) visibility = 1.1;
  else if (glb >= 100) visibility = 0.9;
  else if (glb >= 70) visibility = 0.7;

  let marketValue = (basePrice * roleFactor * visibility) +
                    (performanceValue * rankFactor * roleFactor * category * visibility);
  const minPrice = basePrice * 0.5;
  marketValue = Math.max(minPrice, Math.min(20000000, marketValue));

  return Math.round(marketValue / 100) * 100;
}

// ==========================================
// DIBUJO DE GRÁFICO
// ==========================================
function drawPerformanceChart(canvasId, data, type, labels, visibleLines) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const parentRect = canvas.parentElement.getBoundingClientRect();
  let width = Math.max(500, Math.floor((parentRect.width || 800) * chartZoom));
  const height = 340;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  if (!data || data.length === 0 || !labels || labels.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin datos disponibles', width / 2, height / 2);
    return;
  }

  const alignedData = labels.map((label, idx) => {
    const entry = data[idx] || {};
    return {
      label: label.label,
      type: label.type,
      roundIdx: label.roundIdx !== undefined ? label.roundIdx : idx,
      hasData: label.hasData,
      goals: entry.goals || 0,
      assists: entry.assists || 0,
      saves: entry.saves || 0,
      shots: entry.shots || 0,
      pig: entry.pig || 0,
      atk: entry.atk || 0,
      def: entry.def || 0,
      glb: entry.glb || 0,
      marketValue: entry.marketValue || 0
    };
  });

  let maxVal = 0;
  let maxValMarket = 0;
  alignedData.forEach(d => {
    if (type === 'equipo') {
      maxVal = Math.max(maxVal, d.atk || 0, d.def || 0, d.glb || 0);
    } else {
      maxVal = Math.max(maxVal, d.goals || 0, d.assists || 0, d.saves || 0, d.shots || 0, d.pig || 0);
      maxValMarket = Math.max(maxValMarket, d.marketValue || 0);
    }
  });

  maxVal = maxVal * 1.15;
  if (maxVal < 10) maxVal = 10;
  maxVal = Math.ceil(maxVal / 5) * 5;
  maxValMarket = maxValMarket * 1.15;
  if (maxValMarket > 0 && maxValMarket < 10000) maxValMarket = 10000;
  maxValMarket = Math.ceil(maxValMarket / 1000) * 1000;

  const padding = { top: 20, bottom: 35, left: 45, right: 65 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(type === 'equipo' ? 'EQUIPO' : 'JUGADOR', padding.left, 14);

  const legendColors = {
    'goals': '#4ade80', 'assists': '#22d3ee', 'saves': '#ec4899',
    'shots': '#facc15', 'pig': '#a855f7', 'marketValue': '#ff6b6b',
    'atk': '#4ade80', 'def': '#f87171', 'glb': '#ffffff'
  };
  const legendLabels = {
    'goals': '⚽ Goles', 'assists': '🎯 Asist', 'saves': '🧤 Salv',
    'shots': '💀 Tiros', 'pig': '📊 PIG', 'marketValue': '💰 Valor',
    'atk': '⚡ ATK', 'def': '🛡️ DEF', 'glb': '⭐ GLB'
  };

  const keys = type === 'equipo' ? ['atk', 'def', 'glb'] : ['goals', 'assists', 'saves', 'shots', 'pig', 'marketValue'];
  let legendItems = [];
  keys.forEach(key => {
    if (visibleLines[key]) legendItems.push({ key, color: legendColors[key], label: legendLabels[key] });
  });

  legendItems.forEach((item, i) => {
    const xPos = padding.left + 10 + i * 78;
    ctx.fillStyle = item.color;
    ctx.fillRect(xPos, 8, 14, 3);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '8px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, xPos + 18, 12);
  });

  ctx.strokeStyle = 'rgba(45,45,68,0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (i / 5) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal - (i / 5) * maxVal), padding.left - 6, y + 3);
  }

  if (type !== 'equipo' && visibleLines.marketValue && maxValMarket > 0) {
    ctx.strokeStyle = 'rgba(255,107,107,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(width - padding.right + 5, y);
      ctx.lineTo(width - padding.right + 10, y);
      ctx.stroke();
      ctx.fillStyle = '#ff6b6b';
      ctx.font = '8px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(formatCurrency(maxValMarket - (i / 5) * maxValMarket), width - padding.right + 12, y + 3);
    }
  }

  ctx.strokeStyle = 'rgba(45,45,68,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(width - padding.right, padding.top + chartHeight);
  ctx.stroke();

  const totalPoints = alignedData.length;
  alignedData.forEach((d, i) => {
    const x = padding.left + (i / (totalPoints - 1 || 1)) * chartWidth;
    const isPlayoff = d.type === 'playoff';
    ctx.fillStyle = isPlayoff ? '#facc15' : '#94a3b8';
    ctx.font = isPlayoff ? 'bold 8px Inter, sans-serif' : '8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x, padding.top + chartHeight + 16);

    if (isPlayoff && i > 0 && alignedData[i-1].type === 'liguilla') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  const allPoints = [];

  const drawLineWithPoints = (key, color, useRightScale = false, yOffset = 0) => {
    if (!visibleLines[key]) return;
    const hasData = alignedData.some(d => d[key] > 0);
    if (!hasData) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);

    const points = [];
    alignedData.forEach((d, i) => {
      const x = padding.left + (i / (totalPoints - 1 || 1)) * chartWidth;
      const val = typeof d[key] === 'number' ? d[key] : 0;
      let y;
      if (useRightScale && maxValMarket > 0) {
        y = padding.top + chartHeight - (val / maxValMarket) * chartHeight;
      } else {
        y = padding.top + chartHeight - (val / maxVal) * chartHeight;
      }
      y += yOffset;
      points.push({
        x, y, val,
        label: d.label,
        roundIdx: d.roundIdx,
        type: d.type,
        data: d,
        key: key
      });
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    points.forEach((p) => {
      if (p.val > 0 || key === 'marketValue') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      allPoints.push(p);
    });
  };

  if (type === 'equipo') {
    const allSame = alignedData.every(d => d.atk === d.def && d.def === d.glb && d.atk > 0);
    if (allSame) {
      drawLineWithPoints('atk', '#4ade80', false, -3);
      drawLineWithPoints('def', '#f87171', false, 0);
      drawLineWithPoints('glb', '#ffffff', false, 3);
    } else {
      drawLineWithPoints('atk', '#4ade80', false, 0);
      drawLineWithPoints('def', '#f87171', false, 0);
      drawLineWithPoints('glb', '#ffffff', false, 0);
    }
  } else {
    drawLineWithPoints('goals', '#4ade80', false);
    drawLineWithPoints('assists', '#22d3ee', false);
    drawLineWithPoints('saves', '#ec4899', false);
    drawLineWithPoints('shots', '#facc15', false);
    drawLineWithPoints('pig', '#a855f7', false);
    if (visibleLines.marketValue) {
      drawLineWithPoints('marketValue', '#ff6b6b', true);
    }
  }

  canvas._chartPoints = allPoints;
  canvas._type = type;
  canvas._labels = labels;
  canvas._torneo = currentData;
  canvas._teamId = type === 'equipo' ? perfSelectedTeamId : null;
  canvas._playerId = type === 'jugador' ? perfSelectedPlayerId : null;
  canvas._chartWidth = chartWidth;
  canvas._padding = padding;
  canvas._maxVal = maxVal;
  canvas._maxValMarket = maxValMarket;
}

// ==========================================
// TOOLTIP — touch con scroll horizontal nativo
// ==========================================
function setupTooltip(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const tooltip = document.getElementById('perf-tooltip');
  let tooltipTimeout = null;

  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const HIT_RADIUS = isTouch ? 14 : 8;

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y, clientX, clientY };
  }

  function showTooltip(e) {
    const coords = getCanvasCoords(e);
    const points = canvas._chartPoints || [];

    if (points.length === 0) {
      tooltip.style.display = 'none';
      return;
    }

    let closest = null;
    let minDist = Infinity;
    for (const p of points) {
      const dx = p.x - coords.x;
      const dy = p.y - coords.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= HIT_RADIUS && dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }

    if (!closest) {
      tooltip.style.display = 'none';
      return;
    }

    const type = canvas._type || 'equipo';
    const torneo = canvas._torneo || currentData;

    tooltip.style.display = 'block';

    const tooltipW = 300;
    const tooltipH = 240;
    let left = coords.clientX + 15;
    let top = coords.clientY + 15;

    if (left + tooltipW > window.innerWidth - 10) {
      left = coords.clientX - tooltipW - 15;
    }
    if (left < 10) left = 10;

    if (top + tooltipH > window.innerHeight - 10) {
      top = window.innerHeight - tooltipH - 10;
    }
    if (top < 10) top = 10;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';

    document.getElementById('tooltip-jornada').textContent = closest.label || '';

    let statsHtml = '';
    const d = closest.data || {};
    if (type === 'equipo') {
      statsHtml = `
        <div>⚡ ATK: ${d.atk || 0}</div>
        <div>🛡️ DEF: ${d.def || 0}</div>
        <div>⭐ GLB: ${d.glb || 0}</div>
      `;
    } else {
      statsHtml = `
        <div>⚽ Goles: ${d.goals || 0}</div>
        <div>🎯 Asistencias: ${d.assists || 0}</div>
        <div>🧤 Salvadas: ${d.saves || 0}</div>
        <div>💀 Tiros: ${d.shots || 0}</div>
        <div>📊 PIG: ${(d.pig || 0).toFixed(1)}</div>
        ${d.marketValue !== undefined && d.marketValue > 0 ? `<div>💰 Valor: ${formatCurrency(d.marketValue)}</div>` : ''}
      `;
    }
    document.getElementById('tooltip-stats').innerHTML = statsHtml;

    let matchHtml = 'Sin partido en esta jornada';
    if (torneo && closest.roundIdx !== undefined && closest.roundIdx !== null) {
      let match = null;
      if (closest.type === 'liguilla') {
        const round = torneo.rounds && torneo.rounds[closest.roundIdx];
        if (round) {
          if (type === 'equipo') {
            match = round.find(m => m.played && (m.h === canvas._teamId || m.a === canvas._teamId));
          } else {
            const playerId = canvas._playerId;
            for (let tm of torneo.teams) {
              if (tm.players.some(p => p.id === playerId)) {
                match = round.find(m => m.played && (m.h === tm.id || m.a === tm.id));
                break;
              }
            }
          }
        }
      } else if (closest.type === 'playoff' && torneo.playoffs && torneo.playoffs.rounds) {
        const round = torneo.playoffs.rounds[closest.roundIdx];
        if (round) {
          if (type === 'equipo') {
            match = round.find(m => m.played && (m.h === canvas._teamId || m.a === canvas._teamId));
          } else {
            const playerId = canvas._playerId;
            for (let tm of torneo.teams) {
              if (tm.players.some(p => p.id === playerId)) {
                match = round.find(m => m.played && (m.h === tm.id || m.a === tm.id));
                break;
              }
            }
          }
        }
      }
      if (match) {
        const h = getTeamById(torneo.teams, match.h);
        const a = getTeamById(torneo.teams, match.a);
        matchHtml = `${h?.name || '?'} ${match.sH} - ${match.sA} ${a?.name || '?'}`;
      }
    }
    document.getElementById('tooltip-match').textContent = matchHtml;
  }

  function hideTooltip() {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
      tooltip.style.display = 'none';
    }, 200);
  }

  canvas.addEventListener('mousemove', function(e) {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    showTooltip(e);
  });
  canvas.addEventListener('mouseleave', hideTooltip);

  let touchStartX = 0, touchStartY = 0, isHorizontalScroll = false, touchMoved = false;

  canvas.addEventListener('touchstart', function(e) {
    const t = e.touches[0];
    if (!t) return;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    isHorizontalScroll = false;
    touchMoved = false;
  }, { passive: true });

  canvas.addEventListener('touchmove', function(e) {
    const t = e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - touchStartX);
    const dy = Math.abs(t.clientY - touchStartY);
    if (dx > 8 || dy > 8) {
      touchMoved = true;
    }
    if (dx > dy && dx > 10) {
      isHorizontalScroll = true;
      tooltip.style.display = 'none';
      return;
    }
    if (!isHorizontalScroll) {
      e.preventDefault();
      const fakeEvent = { clientX: t.clientX, clientY: t.clientY, touches: e.touches };
      showTooltip(fakeEvent);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function() {
    hideTooltip();
    isHorizontalScroll = false;
    touchMoved = false;
  }, { passive: true });
}

// ==========================================
// ZOOM DE GRÁFICA
// ==========================================
function setChartZoom(zoom) {
  chartZoom = zoom;
  document.querySelectorAll('.chart-zoom-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.zoom) === zoom);
  });
  if (perfCurrentTab === 'equipos') renderPerformanceEquipos();
  else renderPerformanceJugadores();
}

// ==========================================
// RENDERIZADO PERFORMANCE - EQUIPOS
// ==========================================
function renderPerformanceEquipos() {
  const torneo = currentData;
  if (!torneo) return;

  const listContainer = document.getElementById('perf-equipo-list');
  if (!listContainer) return;

  if (!torneo.teams || torneo.teams.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">No hay equipos.</div>';
    return;
  }

  const scrollPos = listContainer.scrollTop;

  if (!perfSelectedTeamId || !torneo.teams.find(t => t.id === perfSelectedTeamId)) {
    perfSelectedTeamId = torneo.teams[0]?.id || null;
  }

  listContainer.innerHTML = torneo.teams.map(t => `
    <div class="list-item ${t.id === perfSelectedTeamId ? 'active' : ''}"
         onclick="selectPerformanceEquipo('${t.id}')">
      <img src="${t.shield || ''}" style="width:1.2rem;height:1.2rem;border-radius:50%;background:#000;border:1px solid var(--color-border);object-fit:contain;margin-right:0.3rem;">
      ${t.name} <span style="margin-left:auto;font-size:0.6rem;color:var(--neon-yellow);">${t.glb || 0}</span>
    </div>
  `).join('');

  listContainer.scrollTop = scrollPos;

  const team = getTeamById(torneo.teams, perfSelectedTeamId);
  if (team) {
    const labels = getPlayoffLabels(torneo);
    const data = calculateTeamPerformance(perfSelectedTeamId, torneo);

    let atkPeak = { value: 0, label: '—' };
    let defPeak = { value: 0, label: '—' };
    let glbPeak = { value: 0, label: '—' };
    data.forEach((d, i) => {
      const lbl = labels[i]?.label || '—';
      if (d.atk > atkPeak.value) atkPeak = { value: d.atk, label: lbl };
      if (d.def > defPeak.value) defPeak = { value: d.def, label: lbl };
      if (d.glb > glbPeak.value) glbPeak = { value: d.glb, label: lbl };
    });

    const visibleLines = {
      atk: document.getElementById('perf-show-atk')?.checked !== false,
      def: document.getElementById('perf-show-def')?.checked !== false,
      glb: document.getElementById('perf-show-glb')?.checked !== false
    };

    const matches = data.matches || 0;
    const gf = data.totalGF || 0;
    const ga = data.totalGA || 0;
    const saves = data.totalSaves || 0;
    const avgGF = matches > 0 ? (gf / matches).toFixed(2) : '0.00';
    const avgGA = matches > 0 ? (ga / matches).toFixed(2) : '0.00';
    const avgSaves = matches > 0 ? (saves / matches).toFixed(2) : '0.00';

    const statsHtml = `
      <div class="perf-stats-grid">
        <div class="stat-box">
          <div class="icon">🏟️</div>
          <div class="label">Partidos</div>
          <div class="value">${matches}</div>
        </div>
        <div class="stat-box">
          <div class="icon">⚽</div>
          <div class="label">Goles Favor</div>
          <div class="value" style="color:var(--neon-green);">${gf}</div>
        </div>
        <div class="stat-box">
          <div class="icon">🥅</div>
          <div class="label">Goles Contra</div>
          <div class="value" style="color:var(--neon-red);">${ga}</div>
        </div>
        <div class="stat-box">
          <div class="icon">🧤</div>
          <div class="label">Salvadas</div>
          <div class="value" style="color:var(--neon-pink);">${saves}</div>
        </div>
      </div>
      <div class="perf-peaks">
        <div class="peak-item peak-atk">
          <div class="peak-header"><span class="peak-icon">⚡</span> ATK Peak</div>
          <div class="peak-value" style="color:var(--neon-green);">${atkPeak.value}</div>
          <div class="peak-label">Alcanzado en ${atkPeak.label}</div>
        </div>
        <div class="peak-item peak-def">
          <div class="peak-header"><span class="peak-icon">🛡️</span> DEF Peak</div>
          <div class="peak-value" style="color:var(--neon-red);">${defPeak.value}</div>
          <div class="peak-label">Alcanzado en ${defPeak.label}</div>
        </div>
        <div class="peak-item peak-glb">
          <div class="peak-header"><span class="peak-icon">⭐</span> GLB Peak</div>
          <div class="peak-value" style="color:#ffffff;">${glbPeak.value}</div>
          <div class="peak-label">Alcanzado en ${glbPeak.label}</div>
        </div>
        <div class="peak-item peak-neutral">
          <div class="peak-header"><span class="peak-icon">📊</span> Prom. GF</div>
          <div class="peak-value" style="color:var(--neon-green);">${avgGF}</div>
          <div class="peak-label">Goles a favor por partido</div>
        </div>
        <div class="peak-item peak-neutral">
          <div class="peak-header"><span class="peak-icon">📉</span> Prom. GC</div>
          <div class="peak-value" style="color:var(--neon-red);">${avgGA}</div>
          <div class="peak-label">Goles en contra por partido</div>
        </div>
        <div class="peak-item peak-neutral">
          <div class="peak-header"><span class="peak-icon">🧤</span> Prom. Salv</div>
          <div class="peak-value" style="color:var(--neon-pink);">${avgSaves}</div>
          <div class="peak-label">Salvadas por partido</div>
        </div>
      </div>
    `;
    document.getElementById('perf-equipo-stats').innerHTML = statsHtml;

    requestAnimationFrame(() => {
      setTimeout(() => {
        drawPerformanceChart('perf-equipo-chart', data, 'equipo', labels, visibleLines);
        setupTooltip('perf-equipo-chart');
      }, 30);
    });
  }
}

// ==========================================
// RENDERIZADO PERFORMANCE - JUGADORES
// ==========================================
function renderPerformanceJugadores() {
  const torneo = currentData;
  if (!torneo) return;

  const listContainer = document.getElementById('perf-jugador-list');
  if (!listContainer) return;

  if (!torneo.teams || torneo.teams.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">No hay jugadores.</div>';
    return;
  }

  const scrollPos = listContainer.scrollTop;

  let listHtml = '';
  torneo.teams.forEach(t => {
    const players = t.players.filter(p => p.name && p.name.trim() !== '');
    if (players.length === 0) return;
    listHtml += `
      <div class="perf-team-header">
        <img src="${t.shield || ''}">
        ${t.name}
      </div>
    `;
    players.forEach(p => {
      const active = p.id === perfSelectedPlayerId ? 'active' : '';
      const pig = p.seasonStats?.pig || 0;
      listHtml += `
        <div class="list-item sub-item ${active}" onclick="selectPerformancePlayer('${p.id}')">
          ${p.isCaptain ? '👑' : ''}
          <span>${p.name}</span>
          <span style="margin-left:auto;font-size:0.6rem;color:var(--neon-yellow);">${pig.toFixed(1)}</span>
        </div>
      `;
    });
  });
  listContainer.innerHTML = listHtml;

  if (!perfSelectedPlayerId || !getPlayerById(torneo, perfSelectedPlayerId)) {
    let firstPlayerWithData = null;
    for (let team of torneo.teams) {
      for (let player of team.players) {
        if (player.name && player.name.trim() !== '') {
          if (player.seasonStats && (player.seasonStats.matchesPlayed > 0 || player.seasonStats.pig > 0)) {
            firstPlayerWithData = player;
            break;
          }
          if (!firstPlayerWithData) firstPlayerWithData = player;
        }
      }
      if (firstPlayerWithData && firstPlayerWithData.seasonStats?.matchesPlayed > 0) break;
    }
    if (firstPlayerWithData) perfSelectedPlayerId = firstPlayerWithData.id;
  }

  listContainer.scrollTop = scrollPos;

  if (perfSelectedPlayerId) {
    const playerContent = document.getElementById('perf-jugadores-content');
    if (playerContent && !playerContent.classList.contains('active')) {
      playerContent.classList.add('active');
    }

    const labels = getPlayoffLabels(torneo);
    const data = calculatePlayerPerformance(perfSelectedPlayerId, torneo);
    const marketData = calculatePlayerMarketValueHistory(perfSelectedPlayerId, torneo);

    const combinedData = data.map((d, idx) => {
      const market = marketData[idx] || { marketValue: 0 };
      return { ...d, marketValue: market.marketValue || 0 };
    });

    let pigPeak = { value: 0, label: '—' };
    let valuePeak = { value: 0, label: '—' };
    let valueMin = { value: Infinity, label: '—' };

    combinedData.forEach((d, i) => {
      const lbl = labels[i]?.label || '—';
      if (d.pig > pigPeak.value) { pigPeak.value = d.pig; pigPeak.label = lbl; }
      if (d.marketValue > valuePeak.value) { valuePeak.value = d.marketValue; valuePeak.label = lbl; }
      if (d.marketValue < valueMin.value && d.marketValue > 0) { valueMin.value = d.marketValue; valueMin.label = lbl; }
    });

    const visibleLines = {
      goals: document.getElementById('perf-show-goals')?.checked !== false,
      assists: document.getElementById('perf-show-assists')?.checked !== false,
      saves: document.getElementById('perf-show-saves')?.checked !== false,
      shots: document.getElementById('perf-show-shots')?.checked !== false,
      pig: document.getElementById('perf-show-pig')?.checked !== false,
      marketValue: document.getElementById('perf-show-value')?.checked !== false
    };

    const totalRounds = labels.length || 1;
    const totals = data;
    const avgGoals = (totals.totalGoals / totalRounds).toFixed(2);
    const avgAssists = (totals.totalAssists / totalRounds).toFixed(2);
    const avgSaves = (totals.totalSaves / totalRounds).toFixed(2);
    const avgShots = (totals.totalShots / totalRounds).toFixed(2);

    const statsHtml = `
      <div class="perf-stats-grid">
        <div class="stat-box">
          <div class="icon">⚽</div>
          <div class="label">Prom. Goles</div>
          <div class="value" style="color:var(--neon-green);">${avgGoals}</div>
        </div>
        <div class="stat-box">
          <div class="icon">🎯</div>
          <div class="label">Prom. Asistencias</div>
          <div class="value" style="color:var(--neon-cyan);">${avgAssists}</div>
        </div>
        <div class="stat-box">
          <div class="icon">🧤</div>
          <div class="label">Prom. Salvadas</div>
          <div class="value" style="color:var(--neon-pink);">${avgSaves}</div>
        </div>
        <div class="stat-box">
          <div class="icon">💀</div>
          <div class="label">Prom. Tiros</div>
          <div class="value" style="color:var(--neon-yellow);">${avgShots}</div>
        </div>
      </div>
      <div class="perf-peaks">
        <div class="peak-item peak-pig">
          <div class="peak-header"><span class="peak-icon">📊</span> PIG Peak</div>
          <div class="peak-value" style="color:var(--neon-yellow);">${pigPeak.value.toFixed(1)}</div>
          <div class="peak-label">Alcanzado en ${pigPeak.label}</div>
        </div>
        ${valuePeak.value > 0 ? `
        <div class="peak-item peak-value">
          <div class="peak-header"><span class="peak-icon">💰</span> Valor Peak</div>
          <div class="peak-value" style="color:#ff6b6b;">${formatCurrency(valuePeak.value)}</div>
          <div class="peak-label">Alcanzado en ${valuePeak.label}</div>
        </div>` : ''}
        ${valueMin.value < Infinity ? `
        <div class="peak-item peak-min">
          <div class="peak-header"><span class="peak-icon">📉</span> Valor Mín</div>
          <div class="peak-value" style="color:var(--neon-cyan);">${formatCurrency(valueMin.value)}</div>
          <div class="peak-label">Registrado en ${valueMin.label}</div>
        </div>` : ''}
      </div>
    `;
    document.getElementById('perf-jugador-stats').innerHTML = statsHtml;

    requestAnimationFrame(() => {
      setTimeout(() => {
        drawPerformanceChart('perf-jugador-chart', combinedData, 'jugador', labels, visibleLines);
        setupTooltip('perf-jugador-chart');
      }, 50);
    });
  }
}

function refreshPerfChart(type) {
  if (type === 'equipo') {
    renderPerformanceEquipos();
  } else {
    renderPerformanceJugadores();
  }
}

function selectPerformanceEquipo(teamId) {
  if (perfSelectedTeamId === teamId) return;
  perfSelectedTeamId = teamId;
  renderPerformanceEquipos();
}

function selectPerformancePlayer(playerId) {
  if (perfSelectedPlayerId === playerId) return;
  perfSelectedPlayerId = playerId;
  renderPerformanceJugadores();
}

function switchPerfTab(tab) {
  perfCurrentTab = tab;
  document.querySelectorAll('.perf-tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector(`.perf-tabs button[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.perf-sub-view').forEach(v => v.classList.remove('active'));

  if (tab === 'equipos') {
    document.getElementById('perf-equipos-content').classList.add('active');
    document.getElementById('perf-title').textContent = 'Equipos';
    renderPerformanceEquipos();
  } else {
    document.getElementById('perf-jugadores-content').classList.add('active');
    document.getElementById('perf-title').textContent = 'Jugadores';
    renderPerformanceJugadores();
  }
}

// ==========================================
// IMPRESIÓN PERFORMANCE
// ==========================================
function printPerformance() {
  if (!_acquirePrintLock()) return;
  const torneo = currentData;
  if (!torneo) { _releasePrintLock(); return alert('No hay datos.'); }
  const tab = perfCurrentTab || 'equipos';
  const title = tab === 'equipos' ? 'Equipos' : 'Jugadores';

  let htmlContent = getPrintHeader(`Performance - ${title}`);

  if (tab === 'equipos') {
    const team = getTeamById(torneo.teams, perfSelectedTeamId);
    if (!team) { _releasePrintLock(); return alert('No hay equipo seleccionado.'); }
    htmlContent += `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;padding:0.7rem;background:rgba(0,0,0,0.25);border-radius:12px;">
        <img src="${team.shield || ''}" style="width:60px;height:60px;border-radius:50%;background:#000;border:2px solid #2d2d44;object-fit:contain;">
        <div>
          <div style="font-weight:900;font-size:1.2rem;color:#fff;">${team.name}</div>
          <div style="font-size:0.72rem;color:#94a3b8;">GLB ${team.glb || 0} · ATK ${team.atk || 0} · DEF ${team.def || 0}</div>
        </div>
      </div>
    `;
  } else {
    let player = null, team = null;
    for (let tm of torneo.teams) {
      const found = tm.players.find(p => p.id === perfSelectedPlayerId);
      if (found) { player = found; team = tm; break; }
    }
    if (!player) { _releasePrintLock(); return alert('No hay jugador seleccionado.'); }
    htmlContent += `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;padding:0.7rem;background:rgba(0,0,0,0.25);border-radius:12px;">
        <img src="${team?.shield || ''}" style="width:60px;height:60px;border-radius:50%;background:#000;border:2px solid #2d2d44;object-fit:contain;">
        <div>
          <div style="font-weight:900;font-size:1.2rem;color:#fff;">${player.name}</div>
          <div style="font-size:0.72rem;color:#94a3b8;">${team?.name || 'Agente Libre'} · ${player.rocketRank}</div>
        </div>
      </div>
    `;
  }

  const canvasId = tab === 'equipos' ? 'perf-equipo-chart' : 'perf-jugador-chart';
  const canvas = document.getElementById(canvasId);
  if (canvas) {
    const imgData = canvas.toDataURL('image/png');
    htmlContent += `<div style="margin:1rem 0;text-align:center;"><img src="${imgData}" style="max-width:100%;border:1px solid #2d2d44;border-radius:8px;" /></div>`;
  }

  const statsGridId = tab === 'equipos' ? 'perf-equipo-stats' : 'perf-jugador-stats';
  const statsGrid = document.getElementById(statsGridId);
  if (statsGrid) {
    const clone = statsGrid.cloneNode(true);
    htmlContent += `<div style="margin-top:1rem;">${clone.innerHTML}</div>`;
  }

  htmlContent += `<div style="margin-top:1rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>`;
  htmlContent = resolveCSSVars(htmlContent);
  showPrintModal(htmlContent, `performance_${sanitizeForFilename(title)}_${Date.now()}.jpg`, 900);
}

function renderPerformance(torneo) {
  const container = document.getElementById('section-performance');
  if (!container) return;
  const title = container.querySelector('.section-title');
  if (title) {
    const tabLabel = perfCurrentTab === 'equipos' ? 'Equipos' : 'Jugadores';
    title.innerHTML = `<i class="fas fa-chart-line"></i> Performance - <span id="perf-title">${tabLabel}</span>
      <button class="print-btn" onclick="printPerformance()"><i class="fas fa-print"></i> Imprimir</button>`;
  }
  if (perfCurrentTab === 'equipos') renderPerformanceEquipos();
  else renderPerformanceJugadores();
}

// ==========================================
// CONSTRUCCIÓN DE LA INTERFAZ
// ==========================================
function buildUI(torneo) {
  let navHtml = '';
  const menuGroups = [
    { items: ['tabla', 'media', 'jornadas', 'playoffs', 'stats', 'performance', 'balon', 'equipos'], border: 'green' },
    { items: ['mercado', 'economia', 'sanciones', 'seleccion', 'amistosos'], border: 'white' },
    { items: ['salon'], border: 'red' }
  ];

  menuGroups.forEach((group) => {
    group.items.forEach((id) => {
      const item = MENU_ITEMS.find(i => i.id === id);
      if (!item) return;
      const borderClass = group.border === 'green' ? 'menu-border-green' : group.border === 'white' ? 'menu-border-white' : 'menu-border-red';
      navHtml += `<div class="nav-item ${borderClass}" data-section="${item.id}" onclick="switchView('${item.id}')">`;
      navHtml += `<i class="fas ${item.icon}"></i> ${item.label}`;
      navHtml += `</div>`;
    });
    if (group !== menuGroups[menuGroups.length - 1]) {
      navHtml += `<div class="nav-divider"><span></span></div>`;
    }
  });

  mainNav.innerHTML = navHtml;

  let sectionsHtml = '';
  MENU_ITEMS.forEach(function(item) {
    const id = item.id;
    let contentFn = null;
    let title = '';
    let icon = '';
    let printFn = null;

    switch (id) {
      case 'tabla': contentFn = renderTabla; title = 'Tabla General'; icon = 'fa-table'; printFn = printTablaGeneral; break;
      case 'media': contentFn = renderMedia; title = 'Tabla de Media'; icon = 'fa-chart-simple'; printFn = printTablaMedia; break;
      case 'jornadas': contentFn = renderJornadas; title = 'Jornadas'; icon = 'fa-calendar-day'; printFn = printJornada; break;
      case 'playoffs': contentFn = renderPlayoffs; title = 'PlayOffs'; icon = 'fa-sitemap'; break;
      case 'stats': contentFn = renderStats; title = 'Stats'; icon = 'fa-chart-bar'; printFn = printStats; break;
      case 'performance': contentFn = null; title = 'Performance'; icon = 'fa-chart-line'; break;
      case 'balon': contentFn = renderBalon; title = 'Balón de Oro'; icon = 'fa-trophy'; printFn = printBalon; break;
      case 'equipos': contentFn = renderEquipos; title = 'Equipos'; icon = 'fa-users'; printFn = printEquipos; break;
      case 'mercado': contentFn = renderMercado; title = 'Mercado'; icon = 'fa-store'; printFn = printMercado; break;
      case 'economia': contentFn = renderEconomia; title = 'Mov. Económicos'; icon = 'fa-coins'; printFn = printEconomia; break;
      case 'sanciones': contentFn = renderSanciones; title = 'Sanciones'; icon = 'fa-gavel'; printFn = printSanciones; break;
      case 'seleccion': contentFn = renderSeleccion; title = 'Selección Nacional'; icon = 'fa-flag'; printFn = printSeleccion; break;
      case 'amistosos': contentFn = renderAmistosos; title = 'Partidos Amistosos'; icon = 'fa-handshake'; printFn = printAmistosos; break;
      case 'salon': contentFn = renderSalon; title = 'Salón de la Fama'; icon = 'fa-medal'; printFn = printSalon; break;
    }

    if (id === 'performance') {
      sectionsHtml += `<div class="section" id="section-performance"></div>`;
      return;
    }

    if (contentFn) {
      const contentData = contentFn(torneo);
      const printBtnHtml = printFn ? `<button class="print-btn" onclick="window['${printFn.name}']()"><i class="fas fa-print"></i> Imprimir</button>` : '';
      sectionsHtml += `<div class="section" id="section-${id}">`;
      sectionsHtml += `<div class="section-title"><i class="fas ${icon}"></i> ${title} ${printBtnHtml}</div>`;
      sectionsHtml += contentData;
      sectionsHtml += `</div>`;
    }
  });

  sectionsContainer.innerHTML = sectionsHtml;

  const perfContainer = document.getElementById('section-performance');
  if (perfContainer) {
    perfContainer.innerHTML = `
      <div class="section-title"><i class="fas fa-chart-line"></i> Performance - <span id="perf-title">Equipos</span>
        <button class="print-btn" onclick="printPerformance()"><i class="fas fa-print"></i> Imprimir</button>
      </div>
      <div class="perf-tabs">
        <button class="active" data-tab="equipos" onclick="switchPerfTab('equipos')">Equipos</button>
        <button data-tab="jugadores" onclick="switchPerfTab('jugadores')">Jugadores</button>
      </div>
      <div id="perf-equipos-content" class="perf-sub-view active">
        <div class="perf-layout">
          <div class="perf-list" id="perf-equipo-list"></div>
          <div class="perf-chart-area" id="perf-equipo-chart-area">
            <div class="perf-line-selectors">
              <label><input type="checkbox" id="perf-show-atk" checked onchange="refreshPerfChart('equipo')"> ⚡ ATK</label>
              <label><input type="checkbox" id="perf-show-def" checked onchange="refreshPerfChart('equipo')"> 🛡️ DEF</label>
              <label><input type="checkbox" id="perf-show-glb" checked onchange="refreshPerfChart('equipo')"> ⭐ GLB</label>
              <button onclick="refreshPerfChart('equipo')" class="btn-refresh"><i class="fas fa-rotate"></i></button>
            </div>
            <div class="chart-zoom-bar">
              <span class="chart-zoom-label">🔍 Zoom:</span>
              <button class="chart-zoom-btn" data-zoom="1" onclick="setChartZoom(1)">1.0×</button>
              <button class="chart-zoom-btn" data-zoom="1.5" onclick="setChartZoom(1.5)">1.5×</button>
              <button class="chart-zoom-btn active" data-zoom="2" onclick="setChartZoom(2)">2.0×</button>
              <button class="chart-zoom-btn" data-zoom="2.5" onclick="setChartZoom(2.5)">2.5×</button>
            </div>
            <div class="chart-scroll">
              <canvas id="perf-equipo-chart" height="340"></canvas>
            </div>
            <div id="perf-equipo-stats"></div>
          </div>
        </div>
      </div>
      <div id="perf-jugadores-content" class="perf-sub-view">
        <div class="perf-layout">
          <div class="perf-list" id="perf-jugador-list"></div>
          <div class="perf-chart-area" id="perf-jugador-chart-area">
            <div class="perf-line-selectors">
              <label><input type="checkbox" id="perf-show-goals" checked onchange="refreshPerfChart('jugador')"> ⚽ Goles</label>
              <label><input type="checkbox" id="perf-show-assists" checked onchange="refreshPerfChart('jugador')"> 🎯 Asistencias</label>
              <label><input type="checkbox" id="perf-show-saves" checked onchange="refreshPerfChart('jugador')"> 🧤 Salvadas</label>
              <label><input type="checkbox" id="perf-show-shots" checked onchange="refreshPerfChart('jugador')"> 💀 Tiros</label>
              <label><input type="checkbox" id="perf-show-pig" checked onchange="refreshPerfChart('jugador')"> 📊 PIG</label>
              <label><input type="checkbox" id="perf-show-value" onchange="refreshPerfChart('jugador')"> 💰 Valor</label>
              <button onclick="refreshPerfChart('jugador')" class="btn-refresh"><i class="fas fa-rotate"></i></button>
            </div>
            <div class="chart-zoom-bar">
              <span class="chart-zoom-label">🔍 Zoom:</span>
              <button class="chart-zoom-btn" data-zoom="1" onclick="setChartZoom(1)">1.0×</button>
              <button class="chart-zoom-btn" data-zoom="1.5" onclick="setChartZoom(1.5)">1.5×</button>
              <button class="chart-zoom-btn active" data-zoom="2" onclick="setChartZoom(2)">2.0×</button>
              <button class="chart-zoom-btn" data-zoom="2.5" onclick="setChartZoom(2.5)">2.5×</button>
            </div>
            <div class="chart-scroll">
              <canvas id="perf-jugador-chart" height="340"></canvas>
            </div>
            <div id="perf-jugador-stats"></div>
          </div>
        </div>
      </div>
    `;
    renderPerformanceEquipos();
  }

  switchView('tabla');
}

function switchView(id) {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  const target = document.getElementById('section-' + id);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.section === id);
  });
  if (id === 'performance') {
    setTimeout(() => {
      switchPerfTab(perfCurrentTab || 'equipos');
    }, 50);
  }
  if (window.innerWidth <= 820) {
    sidebar.classList.remove('open');
  }
}

// ==========================================
// RENDERIZADO DE SECCIONES
// ==========================================
function renderTabla(torneo) {
  if (!torneo.teams || !torneo.teams.length) return '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i>No hay equipos.</div>';
  const teams = [...torneo.teams];
  teams.sort((a,b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
  const lig = torneo.tableConfig?.liguilla ?? 8;
  const des = torneo.tableConfig?.descenso ?? 2;
  const asc = torneo.tableConfig?.ascenso ?? 2;

  let html = `<div class="table-wrap" id="tabla-general-container"><table><thead><tr>`;
  html += `<th class="th-pts">#</th><th>Equipo</th><th class="th-pts">Pts</th><th class="th-pj">PJ</th><th class="th-pg">PG</th><th class="th-pe">PE</th><th class="th-pp">PP</th><th class="th-gf">GF</th><th class="th-gc">GC</th><th class="th-dg">DG</th>`;
  html += `</tr></thead><tbody>`;
  teams.forEach((tm, i) => {
    let rowClass = '';
    if (i < asc && torneo.linkedTournamentId) rowClass = 'row-ascenso';
    else if (i < lig) rowClass = 'row-clasif';
    else if (i >= teams.length - des && des > 0) rowClass = 'row-descenso';
    const dg = (tm.gf||0) - (tm.gc||0);
    html += `<tr class="${rowClass}">`;
    html += `<td>${i+1}</td>`;
    html += `<td class="flex-center"><img src="${tm.shield||''}" class="shield-sm" alt=""> ${tm.name}</td>`;
    html += `<td class="td-pts"><strong>${tm.pts||0}</strong></td>`;
    html += `<td class="td-pj">${tm.pj||0}</td>`;
    html += `<td class="td-pg">${tm.pg||0}</td>`;
    html += `<td class="td-pe">${tm.pe||0}</td>`;
    html += `<td class="td-pp">${tm.pp||0}</td>`;
    html += `<td class="td-gf">${tm.gf||0}</td>`;
    html += `<td class="td-gc">${tm.gc||0}</td>`;
    html += `<td class="td-dg">${dg}</td>`;
    html += `</tr>`;
  });
  html += '</tbody></table></div>';
  let legend = '<div class="flex-center gap-1" style="font-size:0.65rem;margin-top:0.4rem;">';
  if (lig > 0) legend += `<span class="flex-center"><span style="display:inline-block;width:10px;height:10px;background:var(--neon-green);border-radius:2px;"></span> Clasificación</span>`;
  if (asc > 0 && torneo.linkedTournamentId) legend += `<span class="flex-center"><span style="display:inline-block;width:10px;height:10px;background:var(--neon-yellow);border-radius:2px;"></span> Ascenso</span>`;
  if (des > 0) legend += `<span class="flex-center"><span style="display:inline-block;width:10px;height:10px;background:var(--neon-red);border-radius:2px;"></span> Descenso</span>`;
  legend += '</div>';
  setTimeout(() => {
    const cont = document.getElementById('tabla-general-container');
    if (cont && cont.scrollWidth > cont.clientWidth + 4) {
      cont.classList.add('scrollable');
    }
  }, 100);
  return html + legend;
}

function renderMedia(torneo) {
  if (!torneo.teams || !torneo.teams.length) return '<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i>No hay equipos.</div>';
  const sorted = [...torneo.teams].sort((a,b) => (b.glb||0) - (a.glb||0));
  const avgGLB = torneo.teams.reduce((sum, t) => sum + t.glb, 0) / torneo.teams.length;
  const getTrend = (team, valKey) => {
    const diff = (team[valKey] || 0) - avgGLB;
    if (diff > 10) return { symbol: '▲', cls: 'trend-up' };
    if (diff < -10) return { symbol: '▼', cls: 'trend-down' };
    return { symbol: '—', cls: 'trend-flat' };
  };
  let html = `<div class="table-wrap" id="tabla-media-container"><table><thead><tr><th>#</th><th>Equipo</th><th class="th-neutral">ATK</th><th class="th-neutral">DEF</th><th class="th-neutral">GLB</th></tr></thead><tbody>`;
  sorted.forEach((tm, i) => {
    const atkTrend = getTrend(tm, 'atk');
    const defTrend = getTrend(tm, 'def');
    const glbTrend = getTrend(tm, 'glb');
    html += `<tr><td>${i+1}</td><td class="flex-center"><img src="${tm.shield||''}" class="shield-sm"> ${tm.name}</td>`;
    html += `<td><span class="power-badge atk">${tm.atk||0} <span class="${atkTrend.cls}">${atkTrend.symbol}</span></span></td>`;
    html += `<td><span class="power-badge def">${tm.def||0} <span class="${defTrend.cls}">${defTrend.symbol}</span></span></td>`;
    html += `<td><span class="power-badge glb">${tm.glb||0} <span class="${glbTrend.cls}">${glbTrend.symbol}</span></span></td>`;
    html += `</tr>`;
  });
  html += '</tbody></table></div>';
  return html;
}

// ==========================================
// FASE 1 — JORNADAS modernas (negro puro)
// ==========================================
function renderJornadas(torneo) {
  if (!torneo.rounds || !torneo.rounds.length) {
    return '<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i>No hay jornadas generadas.</div>';
  }
  let html = '';
  torneo.rounds.forEach((round, idx) => {
    html += `<div class="jornada-card">`;
    html += `<div class="jornada-header">Jornada ${idx+1}<span class="jornada-badge">${round.length} partidos</span></div>`;
    if (!round.length) {
      html += '<div class="text-muted" style="font-size:0.8rem;padding:1rem;text-align:center;">Sin partidos</div>';
    } else {
      round.forEach(m => {
        const h = getTeamById(torneo.teams, m.h);
        const a = getTeamById(torneo.teams, m.a);
        const hName = h ? h.name : '???';
        const aName = a ? a.name : '???';
        const hShield = h ? h.shield : '';
        const aShield = a ? a.shield : '';
        const played = m.played || false;
        const scoreHtml = played
          ? `<div class="jornada-score">${m.sH} - ${m.sA}</div>`
          : `<div class="jornada-score pending">VS</div>`;
        const clickable = played ? ' match-clickable' : '';
        const clickAttr = played ? ` onclick="showMatchStats('${m.id}')"` : '';
        html += `<div class="jornada-match-row${clickable}"${clickAttr}>`;
        html += `<div class="jornada-team home">`;
        html += `<span class="jornada-team-name">${hName}</span>`;
        html += `<img src="${hShield}" class="jornada-team-shield" alt="">`;
        html += `</div>`;
        html += scoreHtml;
        html += `<div class="jornada-team away">`;
        html += `<img src="${aShield}" class="jornada-team-shield" alt="">`;
        html += `<span class="jornada-team-name">${aName}</span>`;
        html += `</div>`;
        html += `</div>`;
      });
    }
    html += `</div>`;
  });
  return html;
}

// ==========================================
// MODAL DE STATS DE PARTIDO
// ==========================================
window.showMatchStats = function(matchId) {
  if (!currentData) return;
  let match = null;
  for (let round of (currentData.rounds || [])) {
    const found = round.find(m => m.id === matchId);
    if (found) { match = found; break; }
  }
  if (!match) {
    for (let fm of (currentData.friendlyMatches || [])) {
      if (fm.id === matchId) { match = fm; break; }
    }
  }
  if (!match || !match.played || !match.stats) {
    alert('Este partido no tiene estadísticas detalladas.');
    return;
  }

  const h = getTeamById(currentData.teams, match.h);
  const a = getTeamById(currentData.teams, match.a);
  const hName = h ? h.name : 'Desconocido';
  const aName = a ? a.name : 'Desconocido';
  const hShield = h ? h.shield : '';
  const aShield = a ? a.shield : '';
  const hWinner = match.sH > match.sA;
  const aWinner = match.sA > match.sH;

  const hStats = match.stats.filter(s => s.tId === match.h);
  const aStats = match.stats.filter(s => s.tId === match.a);

  function renderPlayerStats(team, statsArray, isHome) {
    const activeStats = statsArray.filter(s => (s.g||0) > 0 || (s.a||0) > 0 || (s.s||0) > 0 || (s.t||0) > 0);
    if (!team || !activeStats.length) {
      return `<table class="match-stats-table"><tbody><tr><td class="empty" colspan="5">Sin estadísticas registradas</td></tr></tbody></table>`;
    }
    let rows = '';
    activeStats.forEach(st => {
      const p = team.players.find(x => x.id === st.pId);
      const name = p ? p.name : '?';
      const captain = p && p.isCaptain ? '👑 ' : '';
      rows += `<tr>
        <td>${captain}${name}</td>
        <td class="g">${st.g||0}</td>
        <td class="a">${st.a||0}</td>
        <td class="s">${st.s||0}</td>
        <td class="t">${st.t||0}</td>
      </tr>`;
    });
    return `
      <table class="match-stats-table">
        <thead>
          <tr>
            <th>Jugador</th>
            <th class="g">⚽ G</th>
            <th class="a">🎯 A</th>
            <th class="s">🧤 S</th>
            <th class="t">💀 T</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const modalHtml = `
    <div class="print-modal-overlay" onclick="if(event.target===this) this.remove()">
      <div class="match-stats-modal">
        <div class="match-stats-header">
          <div class="team-block ${hWinner ? 'winner' : ''}">
            <img src="${hShield}" alt="">
            <div class="team-name">${hName}</div>
          </div>
          <div class="match-stats-score">${match.sH} - ${match.sA}</div>
          <div class="team-block ${aWinner ? 'winner' : ''}">
            <img src="${aShield}" alt="">
            <div class="team-name">${aName}</div>
          </div>
        </div>
        <div class="match-stats-body">
          <div class="match-stats-team home">
            <h4>🛡️ ${hName}</h4>
            ${renderPlayerStats(h, hStats, true)}
          </div>
          <div class="match-stats-team away">
            <h4>🛡️ ${aName}</h4>
            ${renderPlayerStats(a, aStats, false)}
          </div>
        </div>
        <div class="match-stats-actions">
          <button class="btn-cancel" onclick="this.closest('.print-modal-overlay').remove()">Cerrar</button>
          <button class="btn-download" onclick="printMatchStats('${matchId}')">🖨️ Imprimir</button>
        </div>
      </div>
    </div>
  `;
  const overlay = document.createElement('div');
  overlay.innerHTML = modalHtml;
  document.body.appendChild(overlay);
};

// ==========================================
// IMPRESIÓN DE PARTIDO
// ==========================================
window.printMatchStats = function(matchId) {
  if (!_acquirePrintLock()) return;
  const match = (() => {
    for (let round of (currentData.rounds || [])) {
      const found = round.find(m => m.id === matchId);
      if (found) return found;
    }
    return null;
  })();
  if (!match) { _releasePrintLock(); return alert('Partido no encontrado.'); }

  const h = getTeamById(currentData.teams, match.h);
  const a = getTeamById(currentData.teams, match.a);
  const hStats = (match.stats || []).filter(s => s.tId === match.h);
  const aStats = (match.stats || []).filter(s => s.tId === match.a);

  function renderStats(team, statsArray) {
    const activeStats = statsArray.filter(s => (s.g||0) > 0 || (s.a||0) > 0 || (s.s||0) > 0 || (s.t||0) > 0);
    if (!team || !activeStats.length) {
      return '<div style="color:#94a3b8;font-size:0.75rem;padding:0.5rem;text-align:center;">Sin estadísticas registradas</div>';
    }
    let html = '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;">';
    html += '<thead><tr style="border-bottom:1px solid #2d2d44;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;letter-spacing:0.05em;">';
    html += '<th style="text-align:left;padding:0.4rem 0.3rem;">Jugador</th>';
    html += '<th style="text-align:center;padding:0.4rem 0.3rem;color:#4ade80;">G</th>';
    html += '<th style="text-align:center;padding:0.4rem 0.3rem;color:#22d3ee;">A</th>';
    html += '<th style="text-align:center;padding:0.4rem 0.3rem;color:#ec4899;">S</th>';
    html += '<th style="text-align:center;padding:0.4rem 0.3rem;color:#facc15;">T</th>';
    html += '</tr></thead><tbody>';
    activeStats.forEach(st => {
      const p = team.players.find(x => x.id === st.pId);
      html += '<tr style="border-bottom:1px solid rgba(45,45,68,0.3);">';
      html += `<td style="padding:0.4rem 0.3rem;font-weight:700;color:#fff;">${p ? p.name : '?'}</td>`;
      html += `<td style="text-align:center;padding:0.4rem 0.3rem;color:#4ade80;font-weight:700;">${st.g||0}</td>`;
      html += `<td style="text-align:center;padding:0.4rem 0.3rem;color:#22d3ee;font-weight:700;">${st.a||0}</td>`;
      html += `<td style="text-align:center;padding:0.4rem 0.3rem;color:#ec4899;font-weight:700;">${st.s||0}</td>`;
      html += `<td style="text-align:center;padding:0.4rem 0.3rem;color:#facc15;font-weight:700;">${st.t||0}</td>`;
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  const jornada = findMatchRoundIndex(matchId, currentData);

  let htmlContent = getPrintHeader('Estadísticas del partido') +
    `<div style="display:flex;justify-content:space-between;align-items:center;font-size:1rem;margin:0.8rem 0;padding:0.9rem 1rem;background:rgba(0,0,0,0.3);border-radius:12px;border:1px solid #2d2d44;">
      <div style="display:flex;align-items:center;gap:0.7rem;flex:1;min-width:0;">
        <img src="${h?.shield || ''}" style="width:46px;height:46px;border-radius:50%;background:#000;border:2px solid #2d2d44;object-fit:contain;flex-shrink:0;">
        <strong style="font-size:1.05rem;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h?.name || '?'}</strong>
      </div>
      <div style="font-weight:900;font-size:1.7rem;padding:0 1rem;color:#facc15;white-space:nowrap;">${match.sH} - ${match.sA}</div>
      <div style="display:flex;align-items:center;gap:0.7rem;flex:1;justify-content:flex-end;min-width:0;">
        <strong style="font-size:1.05rem;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a?.name || '?'}</strong>
        <img src="${a?.shield || ''}" style="width:46px;height:46px;border-radius:50%;background:#000;border:2px solid #2d2d44;object-fit:contain;flex-shrink:0;">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:0.6rem;">
      <div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:0.8rem;border-left:3px solid #4ade80;">
        <h4 style="font-size:0.85rem;color:#4ade80;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em;">${h?.name || ''}</h4>
        ${renderStats(h, hStats)}
      </div>
      <div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:0.8rem;border-left:3px solid #f87171;">
        <h4 style="font-size:0.85rem;color:#f87171;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.05em;">${a?.name || ''}</h4>
        ${renderStats(a, aStats)}
      </div>
    </div>
    <div style="margin-top:0.8rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${currentData.name} · Generado desde MTM Nexus</div>`;

  htmlContent = resolveCSSVars(htmlContent);
  const filename = `PJ${jornada}_${sanitizeForFilename(h?.name)}_vs_${sanitizeForFilename(a?.name)}.jpg`;
  showPrintModal(htmlContent, filename, 850);

  document.querySelectorAll('.print-modal-overlay').forEach((el, i, arr) => {
    if (i < arr.length - 1) el.remove();
  });
};

function renderPlayoffs(torneo) {
  if (!torneo.playoffs || !torneo.playoffs.rounds || !torneo.playoffs.rounds.length) {
    return '<div class="empty-state"><i class="fa-solid fa-clock"></i>Próximamente</div>';
  }
  const rounds = torneo.playoffs.rounds;
  let html = '<div style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;">';
  rounds.forEach((r, ri) => {
    html += `<div style="display:flex;flex-direction:column;gap:0.4rem;min-width:130px;">`;
    html += `<div class="card-header" style="text-align:center;">${ri === 0 ? 'Cuartos' : ri === 1 ? 'Semis' : ri === 2 ? 'Final' : `Ronda ${ri+1}`}</div>`;
    r.forEach(m => {
      const h = getTeamById(torneo.teams, m.h);
      const a = getTeamById(torneo.teams, m.a);
      const played = m.played || false;
      const score = played ? `${m.sH} - ${m.sA}` : 'vs';
      html += `<div class="card" style="padding:0.4rem 0.6rem;margin:0;min-width:110px;"><div class="flex-center" style="justify-content:space-between;font-size:0.7rem;"><span class="flex-center"><img src="${h?.shield||''}" class="shield-sm" style="width:1.2rem;height:1.2rem;"> ${h?.name || 'TBD'}</span><span style="font-weight:700;">${score}</span><span class="flex-center">${a?.name || 'TBD'} <img src="${a?.shield||''}" class="shield-sm" style="width:1.2rem;height:1.2rem;"></span></div></div>`;
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ==========================================
// FASE 2 + 3 — Stats Table moderna
// Números: top 3 dorados, resto blancos
// Sin botón "Mostrar 10 más" (solo scroll)
// ==========================================
function buildStatsRows(players, key) {
  return players.map((p, i) => {
    const rank = i + 1;
    const rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : ''));
    return `<tr class="stats-row-clickable ${rankClass}" onclick="showPlayerProfile('${p.id}')">
      <td class="rank-cell">${rank}</td>
      <td class="player-cell"><img src="${p.teamShield||''}" class="shield-sm" onerror="this.style.display='none'"> ${p.isCaptain ? '👑 ' : ''}${p.name}</td>
      <td class="team-cell">${p.teamName}</td>
      <td class="value-cell">${p[key]||0}</td>
    </tr>`;
  }).join('');
}

function renderStats(torneo) {
  const allPlayers = [];
  torneo.teams.forEach(team => {
    team.players.forEach(p => {
      if (p.name && p.name.trim() !== '') {
        const s = p.seasonStats || {};
        allPlayers.push({
          id: p.id, ...p, teamName: team.name, teamShield: team.shield,
          goals: s.goals || 0, assists: s.assists || 0, saves: s.saves || 0, shots: s.shots || 0,
          pig: s.pig || 0, matchesPlayed: s.matchesPlayed || 0
        });
      }
    });
  });
  if (!allPlayers.length) return '<div class="empty-state"><i class="fa-solid fa-users-slash"></i>No hay jugadores con estadísticas.</div>';

  function makeTable(title, key, label) {
    const sorted = [...allPlayers].sort((a,b) => (b[key]||0) - (a[key]||0));
    const visible = sorted;
    const icon = key === 'goals' ? '⚽' : (key === 'assists' ? '🎯' : (key === 'saves' ? '🧤' : '💀'));
    return `
      <div class="card" style="padding:0.85rem;">
        <div class="card-header" style="font-size:0.78rem;">
          <span>${icon} ${title}</span>
          <span style="font-size:0.62rem;color:var(--color-text-muted);font-weight:700;">${sorted.length} jugadores</span>
        </div>
        <div class="stats-table-wrap">
          <table>
            <thead>
              <tr>
                <th style="text-align:center;width:50px;">#</th>
                <th>Jugador</th>
                <th style="width:140px;">Equipo</th>
                <th style="text-align:center;width:80px;">${label}</th>
              </tr>
            </thead>
            <tbody>${buildStatsRows(visible, key)}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  let html = '<div style="display:grid;grid-template-columns:1fr;gap:0.8rem;">';
  html += makeTable('Goleadores', 'goals', 'Goles');
  html += makeTable('Asistencias', 'assists', 'Asistencias');
  html += makeTable('Salvadas', 'saves', 'Salvadas');
  html += makeTable('Tiros (Peligro)', 'shots', 'Tiros');
  html += '</div>';

  html += `<div class="card"><div class="card-header">⭐ MVPs por Jornada</div>`;
  const totalJornadas = torneo.rounds ? torneo.rounds.length : 0;
  if (!totalJornadas) {
    html += '<div class="text-muted" style="font-size:0.8rem;">No hay jornadas.</div>';
  } else {
    html += `<div class="jornada-nav" id="mvp-jornada-nav">`;
    for (let i = 0; i < totalJornadas; i++) {
      html += `<button data-jornada="${i}" class="${i === currentMvpJornada ? 'active' : ''}">J${i+1}</button>`;
    }
    html += `</div><div id="mvp-content"></div>`;
  }
  html += '</div>';

  setTimeout(function() {
    document.querySelectorAll('#mvp-jornada-nav button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.jornada);
        currentMvpJornada = idx;
        document.querySelectorAll('#mvp-jornada-nav button').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById('mvp-content').innerHTML = renderMvpForJornada(currentData, idx);
      });
    });
    if (totalJornadas > 0) {
      const mvpContent = document.getElementById('mvp-content');
      if (mvpContent) mvpContent.innerHTML = renderMvpForJornada(currentData, currentMvpJornada);
    }
  }, 50);

  return html;
}

function renderMvpForJornada(torneo, jornadaIdx) {
  const round = torneo.rounds && torneo.rounds[jornadaIdx];
  if (!round || !round.length) return '<div class="text-muted" style="font-size:0.8rem;">No hay partidos en esta jornada.</div>';

  const statsMap = {};
  const teamStats = {};
  torneo.teams.forEach(function(t) { teamStats[t.id] = { pts: 0, g: 0, a: 0, s: 0, pig: 0 }; });

  round.forEach(function(m) {
    if (m.stats) {
      m.stats.forEach(function(st) {
        if (!statsMap[st.pId]) statsMap[st.pId] = { g:0, a:0, s:0, t:0, pig:0, teamId: st.tId };
        statsMap[st.pId].g += st.g || 0;
        statsMap[st.pId].a += st.a || 0;
        statsMap[st.pId].s += st.s || 0;
        statsMap[st.pId].t += st.t || 0;
        const pig = (st.g||0)*2 + (st.a||0)*1.5 + (st.s||0)*1 + ((st.t||0) - (st.g||0))*0.2;
        statsMap[st.pId].pig += pig;
        if (teamStats[st.tId]) {
          teamStats[st.tId].g += st.g || 0;
          teamStats[st.tId].a += st.a || 0;
          teamStats[st.tId].s += st.s || 0;
          teamStats[st.tId].pig += pig;
        }
      });
    }
    if (m.played) {
      if (m.sH > m.sA) { if (teamStats[m.h]) teamStats[m.h].pts += 3; }
      else if (m.sA > m.sH) { if (teamStats[m.a]) teamStats[m.a].pts += 3; }
      else { if (teamStats[m.h]) teamStats[m.h].pts += 1; if (teamStats[m.a]) teamStats[m.a].pts += 1; }
    }
  });

  let mvp = null, maxPig = -1;
  Object.keys(statsMap).forEach(function(pid) {
    const st = statsMap[pid];
    if (st.pig > maxPig) { maxPig = st.pig; mvp = { id: pid, pig: st.pig }; }
  });

  let bestTeam = null, bestScore = -1;
  Object.keys(teamStats).forEach(function(tid) {
    const st = teamStats[tid];
    const score = (st.pts || 0) + (st.pig || 0)/10;
    if (score > bestScore) { bestScore = score; bestTeam = { id: tid, pts: st.pts, pig: st.pig }; }
  });

  let bestGoleador = null, bestAsistidor = null, bestMuro = null;
  let maxG=-1, maxA=-1, maxS=-1;
  Object.keys(statsMap).forEach(function(pid) {
    const st = statsMap[pid];
    if (st.g > maxG) { maxG = st.g; bestGoleador = { id: pid, g: st.g }; }
    if (st.a > maxA) { maxA = st.a; bestAsistidor = { id: pid, a: st.a }; }
    if (st.s > maxS) { maxS = st.s; bestMuro = { id: pid, s: st.s }; }
  });

  function getPlayerInfo(pid) {
    for (let i = 0; i < torneo.teams.length; i++) {
      const team = torneo.teams[i];
      const p = team.players.find(function(x) { return x.id === pid; });
      if (p) return { name: p.name, teamName: team.name, rank: p.rocketRank || 'Platino' };
    }
    return null;
  }

  let html = '<div class="mvp-grid">';
  if (mvp) {
    const info = getPlayerInfo(mvp.id);
    html += '<div class="mvp-card"><div class="label">🏆 MVP</div><div class="name">' + (info ? info.name : '?') + '</div><div style="font-size:0.65rem;color:var(--color-text-muted);">' + (info ? info.teamName : '') + '</div><div class="stat">' + mvp.pig.toFixed(1) + ' PIG</div></div>';
  }
  if (bestTeam) {
    const team = getTeamById(torneo.teams, bestTeam.id);
    html += '<div class="mvp-card"><div class="label">🏅 Equipo</div><div class="name">' + (team ? team.name : '?') + '</div><div class="stat">' + (bestTeam.pts||0) + ' pts</div></div>';
  }
  html += '<div class="mvp-card" style="max-width:300px;flex:2;"><div class="label">⭐ Dream Team</div>';
  if (bestGoleador) {
    const info = getPlayerInfo(bestGoleador.id);
    html += '<div style="font-size:0.65rem;"><span class="text-neon-green">⚽</span> ' + (info ? info.name : '?') + ' (' + bestGoleador.g + ')</div>';
  }
  if (bestAsistidor) {
    const info = getPlayerInfo(bestAsistidor.id);
    html += '<div style="font-size:0.65rem;"><span class="text-neon-cyan">🎯</span> ' + (info ? info.name : '?') + ' (' + bestAsistidor.a + ')</div>';
  }
  if (bestMuro) {
    const info = getPlayerInfo(bestMuro.id);
    html += '<div style="font-size:0.65rem;"><span class="text-neon-pink">🧤</span> ' + (info ? info.name : '?') + ' (' + bestMuro.s + ')</div>';
  }
  html += '</div></div>';
  return html;
}

// ==========================================
// BALÓN DE ORO
// ==========================================
function renderBalon(torneo) {
  const allPlayers = [];
  torneo.teams.forEach(team => {
    team.players.forEach(p => {
      if (p.name && p.name.trim() !== '') {
        const s = p.seasonStats || {};
        allPlayers.push({ id: p.id, name: p.name, teamName: team.name, teamShield: team.shield, pig: s.pig || 0 });
      }
    });
  });
  if (!allPlayers.length) return '<div class="empty-state"><i class="fa-solid fa-trophy"></i>Sin jugadores.</div>';
  const sorted = allPlayers.sort((a, b) => (b.pig || 0) - (a.pig || 0));

  let html = '<div class="podium">';
  const top3 = sorted.slice(0, 3);
  const cls = ['first', 'second', 'third'];
  top3.forEach((p, i) => {
    const displayName = p.name.length > 16 ? p.name.substring(0, 14) + '…' : p.name;
    html += `<div class="podium-item ${cls[i]}" onclick="showPlayerProfile('${p.id}')">`;
    html += `<div class="circle"><img src="${p.teamShield || ''}" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'no-img\\'>#${i+1}</span>';" /></div>`;
    html += `<div class="pos">#${i+1}</div>`;
    html += `<div class="name">${displayName}</div>`;
    html += `<div class="value">${(p.pig||0).toFixed(1)} PIG</div>`;
    html += `<div class="sub">${p.teamName}</div>`;
    html += '</div>';
  });
  html += '</div>';

  html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th style="text-align:right;">PIG</th></tr></thead><tbody>';
  sorted.slice(3).forEach((p, i) => {
    html += `<tr onclick="showPlayerProfile('${p.id}')" style="cursor:pointer;"><td>${i+4}</td><td class="flex-center"><img src="${p.teamShield||''}" class="shield-sm"> ${p.name}</td><td>${p.teamName}</td><td style="text-align:right;color:#ffd700;font-weight:900;">${(p.pig||0).toFixed(1)}</td></tr>`;
  });
  html += '</tbody></table></div>';
  return html;
}

// ==========================================
// EQUIPOS
// ==========================================
function renderEquipos(torneo) {
  if (!torneo.teams || !torneo.teams.length) return '<div class="empty-state"><i class="fa-solid fa-users-slash"></i>No hay equipos.</div>';
  let html = '<div class="equipos-grid">';
  torneo.teams.forEach(function(team) {
    const titulares = team.players.filter(function(p) { return p.role === 'Titular 🌟' && p.name && p.name.trim() !== ''; });
    const suplentes = team.players.filter(function(p) { return p.role === 'Suplente 🔄' && p.name && p.name.trim() !== ''; });
    const reservas = team.players.filter(function(p) { return p.role === 'Reserva 💤' && p.name && p.name.trim() !== ''; });
    const capitan = team.players.find(function(p) { return p.isCaptain; });

    const renderPlayerSlots = function(players, cls) {
      if (!players.length) return '<div class="text-muted" style="font-size:0.68rem;padding:0.3rem;">Sin jugadores</div>';
      return players.map(function(p) {
        const stats = p.seasonStats || { goals: 0, assists: 0, saves: 0 };
        const rankColor = getRankColor(p.rocketRank);
        const captainClass = p.isCaptain ? ' captain' : '';
        return `
          <div class="player-slot ${cls}${captainClass}" onclick="showPlayerProfile('${p.id}')" title="Ver perfil de ${p.name}">
            <div class="slot-name">${p.name}</div>
            <div class="slot-rank" style="color:${rankColor}">${p.rocketRank} ${p.rocketRank !== 'SSL' ? p.division : ''}</div>
            <div class="slot-stats">
              <span>⚽${stats.goals||0}</span>
              <span>🎯${stats.assists||0}</span>
              <span>🧤${stats.saves||0}</span>
            </div>
          </div>
        `;
      }).join('');
    };

    html += '<div class="team-card-print">';
    html += '<div class="team-card-header">';
    html += '<img class="team-crest" src="' + (team.shield||'') + '" alt="">';
    html += '<div class="team-info">';
    html += '<div class="team-name">' + team.name + '</div>';
    html += '<div class="team-meta">';
    html += '<span><i class="fas fa-bolt" style="color:var(--neon-green);"></i> ATK ' + (team.atk||0) + '</span>';
    html += '<span><i class="fas fa-shield" style="color:var(--neon-red);"></i> DEF ' + (team.def||0) + '</span>';
    html += '<span><i class="fas fa-star" style="color:#ffffff;"></i> GLB ' + (team.glb||0) + '</span>';
    html += '<span><i class="fas fa-coins" style="color:var(--neon-green);"></i> ' + formatCurrency(team.budget||0) + '</span>';
    if (capitan) html += '<span><i class="fas fa-crown" style="color:var(--neon-yellow);"></i> ' + capitan.name + '</span>';
    html += '</div></div></div>';

    html += '<div class="team-slots-wrapper">';
    if (titulares.length) {
      html += '<div class="team-section-label label-titular">Titulares</div>';
      html += '<div class="team-slots-grid">' + renderPlayerSlots(titulares, 'titular') + '</div>';
    }
    if (suplentes.length) {
      html += '<div class="team-section-label label-suplente">Suplentes</div>';
      html += '<div class="team-slots-grid">' + renderPlayerSlots(suplentes, 'suplente') + '</div>';
    }
    if (reservas.length) {
      html += '<div class="team-section-label label-reserva">Reservas</div>';
      html += '<div class="team-slots-grid">' + renderPlayerSlots(reservas, 'reserva') + '</div>';
    }
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// ==========================================
// MERCADO
// ==========================================
function renderMercado(torneo) {
  const allPlayers = [];
  torneo.teams.forEach(function(team) {
    team.players.forEach(function(p) {
      if (p.name && p.name.trim() !== '') {
        const s = p.seasonStats || { pig:0 };
        const rankDisplay = p.rocketRank + (p.rocketRank !== 'SSL' ? ' ' + p.division : '');
        allPlayers.push({ id: p.id, name: p.name, teamId: team.id, teamName: team.name, teamShield: team.shield, pig: s.pig || 0, marketValue: p.marketValue || 0, rocketRankDisplay: rankDisplay, isCaptain: p.isCaptain || false, isFree: false, rocketRank: p.rocketRank || 'Platino', division: p.division || 2 });
      }
    });
  });
  (torneo.freeAgents || []).forEach(function(p) {
    if (p.name && p.name.trim() !== '') {
      const s = p.seasonStats || { pig:0 };
      const rankDisplay = p.rocketRank + (p.rocketRank !== 'SSL' ? ' ' + p.division : '');
      allPlayers.push({ id: p.id, name: p.name, teamId: null, teamName: 'Agente Libre', teamShield: '', pig: s.pig || 0, marketValue: p.marketValue || 0, rocketRankDisplay: rankDisplay, isCaptain: p.isCaptain || false, isFree: true, rocketRank: p.rocketRank || 'Platino', division: p.division || 2 });
    }
  });
  if (!allPlayers.length) return '<div class="empty-state"><i class="fa-solid fa-store-slash"></i>No hay jugadores.</div>';

  const teamsOpts = torneo.teams.map(function(t) { return '<option value="' + t.id + '">' + t.name + '</option>'; }).join('');

  let html = '<div class="filters" style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-bottom:0.8rem;">';
  html += '<select id="mercadoEquipo" style="background:rgba(0,0,0,0.5);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.35rem 0.7rem;color:var(--color-text);"><option value="all">Todos los equipos</option>' + teamsOpts + '<option value="free">Agentes Libres</option></select>';
  html += '<select id="mercadoOrden" style="background:rgba(0,0,0,0.5);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.35rem 0.7rem;color:var(--color-text);">';
  html += '<option value="precio-desc">Precio ↓</option><option value="precio-asc">Precio ↑</option><option value="pig-desc">PIG ↓</option><option value="pig-asc">PIG ↑</option><option value="nombre">Nombre A-Z</option><option value="nombre-desc">Nombre Z-A</option>';
  html += '</select>';
  html += '<input id="mercadoBuscar" type="text" placeholder="Buscar jugador..." style="flex:1;min-width:120px;background:rgba(0,0,0,0.5);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.35rem 0.7rem;color:var(--color-text);">';
  html += '<button onclick="openAdvancedSearch()" style="background:var(--neon-purple);color:#000;border:none;padding:0.35rem 0.8rem;border-radius:var(--radius);font-weight:700;cursor:pointer;font-size:0.7rem;">🔍 Búsqueda avanzada</button>';
  html += '<button onclick="clearMarketFilters()" style="background:var(--color-border);color:var(--color-text);border:none;padding:0.35rem 0.8rem;border-radius:var(--radius);font-weight:700;cursor:pointer;font-size:0.7rem;">↺ Limpiar</button>';
  html += '</div>';
  html += '<div id="mercadoTablaContainer"></div>';

  function renderMercadoTabla() {
    const equipo = document.getElementById('mercadoEquipo').value;
    const orden = document.getElementById('mercadoOrden').value;
    const busqueda = document.getElementById('mercadoBuscar').value.toLowerCase();

    let filtered = allPlayers;
    if (equipo === 'free') filtered = filtered.filter(function(p) { return p.isFree; });
    else if (equipo !== 'all') filtered = filtered.filter(function(p) { return p.teamId === equipo; });
    if (busqueda) filtered = filtered.filter(function(p) { return p.name.toLowerCase().includes(busqueda); });

    if (advFilters.rankMin) {
      const rankOrder = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Campeón', 'Gran Campeón', 'SSL'];
      const minIdx = rankOrder.indexOf(advFilters.rankMin);
      if (minIdx !== -1) filtered = filtered.filter(p => rankOrder.indexOf(p.rocketRank) >= minIdx);
    }
    if (advFilters.rankMax) {
      const rankOrder = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Campeón', 'Gran Campeón', 'SSL'];
      const maxIdx = rankOrder.indexOf(advFilters.rankMax);
      if (maxIdx !== -1) filtered = filtered.filter(p => rankOrder.indexOf(p.rocketRank) <= maxIdx);
    }
    if (advFilters.division) filtered = filtered.filter(p => p.division == advFilters.division);
    if (advFilters.priceMin > 0) filtered = filtered.filter(p => p.marketValue >= advFilters.priceMin);
    if (advFilters.priceMax < Infinity) filtered = filtered.filter(p => p.marketValue <= advFilters.priceMax);

    switch (orden) {
      case 'precio-desc': filtered.sort(function(a,b) { return (b.marketValue||0) - (a.marketValue||0); }); break;
      case 'precio-asc': filtered.sort(function(a,b) { return (a.marketValue||0) - (b.marketValue||0); }); break;
      case 'pig-desc': filtered.sort(function(a,b) { return (b.pig||0) - (a.pig||0); }); break;
      case 'pig-asc': filtered.sort(function(a,b) { return (a.pig||0) - (b.pig||0); }); break;
      case 'nombre': filtered.sort(function(a,b) { return a.name.localeCompare(b.name); }); break;
      case 'nombre-desc': filtered.sort(function(a,b) { return b.name.localeCompare(a.name); }); break;
    }

    if (!filtered.length) {
      document.getElementById('mercadoTablaContainer').innerHTML = '<div class="empty-state"><i class="fa-solid fa-search"></i>No se encontraron jugadores.</div>';
      return;
    }

    let tabla = '<div class="table-wrap"><table><thead><tr><th>RNK</th><th>Jugador</th><th>Equipo</th><th>PIG</th><th>Rango</th><th>Precio</th></tr></thead><tbody>';
    filtered.forEach(function(p, index) {
      const rank = index + 1;
      const rnkClass = (rank <= 10) ? 'rnk-gold' : '';
      tabla += `<tr class="market-row-click" onclick="showPlayerProfile('${p.id}')">`;
      tabla += `<td style="text-align:center;font-weight:700;" class="${rnkClass}">${rank}</td>`;
      tabla += '<td class="flex-center"><img src="' + (p.teamShield||'') + '" class="shield-sm"> ' + p.name + (p.isCaptain ? ' 👑' : '') + (p.isFree ? ' 🆓' : '') + '</td>';
      tabla += '<td>' + p.teamName + '</td>';
      tabla += '<td>' + (p.pig||0).toFixed(1) + '</td>';
      tabla += '<td style="color:' + getRankColor(p.rocketRank) + ';font-weight:700;">' + p.rocketRankDisplay + '</td>';
      tabla += '<td>' + formatCurrency(p.marketValue||0) + '</td>';
      tabla += '</tr>';
    });
    tabla += '</tbody></table></div>';
    document.getElementById('mercadoTablaContainer').innerHTML = tabla;
  }

  setTimeout(function() {
    document.getElementById('mercadoEquipo').addEventListener('change', renderMercadoTabla);
    document.getElementById('mercadoOrden').addEventListener('change', renderMercadoTabla);
    document.getElementById('mercadoBuscar').addEventListener('input', renderMercadoTabla);
    renderMercadoTabla();
  }, 0);

  return html;
}

function clearMarketFilters() {
  document.getElementById('mercadoEquipo').value = 'all';
  document.getElementById('mercadoOrden').value = 'precio-desc';
  document.getElementById('mercadoBuscar').value = '';
  advFilters = { rankMin: '', rankMax: '', division: '', priceMin: 0, priceMax: Infinity };
  if (document.getElementById('section-mercado').classList.contains('active')) {
    renderMercado(currentData);
  }
}

function openAdvancedSearch() {
  document.getElementById('adv-search-overlay').classList.add('active');
  document.getElementById('adv-rank-min').value = advFilters.rankMin || '';
  document.getElementById('adv-rank-max').value = advFilters.rankMax || '';
  document.getElementById('adv-division').value = advFilters.division || '';
  document.getElementById('adv-price-min').value = advFilters.priceMin || '';
  document.getElementById('adv-price-max').value = advFilters.priceMax < Infinity ? advFilters.priceMax : '';
}

function closeAdvancedSearch() {
  document.getElementById('adv-search-overlay').classList.remove('active');
}

function clearAdvancedSearch() {
  advFilters = { rankMin: '', rankMax: '', division: '', priceMin: 0, priceMax: Infinity };
  closeAdvancedSearch();
  if (document.getElementById('section-mercado').classList.contains('active')) {
    renderMercado(currentData);
  }
}

function applyAdvancedSearch() {
  const rankMin = document.getElementById('adv-rank-min').value;
  const rankMax = document.getElementById('adv-rank-max').value;
  const division = document.getElementById('adv-division').value;
  const priceMin = parseFloat(document.getElementById('adv-price-min').value) || 0;
  const priceMax = parseFloat(document.getElementById('adv-price-max').value) || Infinity;
  advFilters = { rankMin, rankMax, division, priceMin, priceMax };
  closeAdvancedSearch();
  if (document.getElementById('section-mercado').classList.contains('active')) {
    renderMercado(currentData);
  }
}

// ==========================================
// MOV. ECONÓMICOS
// ==========================================
function renderEconomia(torneo) {
  if (!torneo.economyLogs || torneo.economyLogs.length === 0) {
    return '<div class="empty-state"><i class="fa-solid fa-coins"></i>No hay movimientos económicos.</div>';
  }

  let maxRound = 0;
  torneo.economyLogs.forEach(log => { if (log.round && log.round > maxRound) maxRound = log.round; });
  if (maxRound === 0) maxRound = torneo.rounds ? torneo.rounds.length : 1;

  let roundOptions = '<option value="todas">Todas</option>';
  for (let i = 1; i <= maxRound; i++) roundOptions += `<option value="${i}">Jornada ${i}</option>`;

  const typeOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'bonus', label: '🏆 Bonos' },
    { value: 'transfer_in', label: '📥 Fichajes' },
    { value: 'transfer_out', label: '📤 Ventas' },
    { value: 'loan', label: '📋 Préstamos' },
    { value: 'penalty', label: '⚠️ Sanciones' },
    { value: 'release', label: '📄 Liberaciones' }
  ];
  const typeSelect = typeOptions.map(t => `<option value="${t.value}">${t.label}</option>`).join('');

  const sortOptions = [
    { value: 'reciente', label: 'Más reciente' },
    { value: 'antiguo', label: 'Menos reciente' },
    { value: 'mas_caro', label: 'Más caro' },
    { value: 'menos_caro', label: 'Menos caro' }
  ];
  const sortSelect = sortOptions.map(s => `<option value="${s.value}">${s.label}</option>`).join('');

  const teamOptions = torneo.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  let html = `
    <div class="card" style="padding:0.8rem 1rem;">
      <div style="display:flex;flex-wrap:wrap;gap:0.6rem;align-items:flex-end;">
        <div><label style="font-size:0.6rem;color:var(--color-text-muted);display:block;">Jornada</label><select id="eco-filtro-jornada" onchange="aplicarFiltrosEconomia()" style="background:rgba(0,0,0,0.5);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.35rem 0.7rem;color:var(--color-text);">${roundOptions}</select></div>
        <div><label style="font-size:0.6rem;color:var(--color-text-muted);display:block;">Equipo</label><select id="eco-filtro-equipo" onchange="aplicarFiltrosEconomia()" style="background:rgba(0,0,0,0.5);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.35rem 0.7rem;color:var(--color-text);"><option value="all">Todos</option>${teamOptions}</select></div>
        <div><label style="font-size:0.6rem;color:var(--color-text-muted);display:block;">Tipo</label><select id="eco-filtro-tipo" onchange="aplicarFiltrosEconomia()" style="background:rgba(0,0,0,0.5);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.35rem 0.7rem;color:var(--color-text);">${typeSelect}</select></div>
        <div><label style="font-size:0.6rem;color:var(--color-text-muted);display:block;">Orden</label><select id="eco-filtro-orden" onchange="aplicarFiltrosEconomia()" style="background:rgba(0,0,0,0.5);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.35rem 0.7rem;color:var(--color-text);">${sortSelect}</select></div>
      </div>
    </div>
    <div class="card" style="padding:0.6rem 1rem;" id="eco-summary-container">
      <div style="display:flex;flex-wrap:wrap;gap:0.8rem 1.5rem;font-size:0.85rem;">
        <span>📊 Movs: <span id="eco-total-movs" style="font-weight:700;">0</span></span>
        <span>💚 Ingresos: <span id="eco-total-ingresos" style="font-weight:700;color:var(--neon-green);">$0</span></span>
        <span>❤️ Gastos: <span id="eco-total-gastos" style="font-weight:700;color:var(--neon-red);">$0</span></span>
        <span>📈 Neto: <span id="eco-total-neto" style="font-weight:700;">$0</span></span>
      </div>
    </div>
    <div id="eco-tabla-container">
      <div class="table-wrap">
        <table><thead><tr><th>Fecha</th><th>Equipo</th><th>Descripción</th><th>Tipo</th><th style="text-align:right;">Monto</th></tr></thead>
        <tbody id="eco-tabla-body"><tr><td colspan="5" class="text-center text-muted">Cargando...</td></tr></tbody></table>
      </div>
    </div>
  `;

  setTimeout(() => { aplicarFiltrosEconomia(); }, 50);
  return html;
}

function obtenerMovimientosFiltrados(torneo, filtros) {
  if (!torneo || !torneo.economyLogs) return [];
  let movs = torneo.economyLogs.slice();
  if (filtros.round && filtros.round !== 'todas') {
    const roundNum = parseInt(filtros.round);
    movs = movs.filter(m => m.round === roundNum);
  }
  if (filtros.team && filtros.team !== 'all') movs = movs.filter(m => m.teamId === filtros.team);
  if (filtros.type && filtros.type !== 'todos') movs = movs.filter(m => m.type === filtros.type);
  switch (filtros.sort) {
    case 'reciente': movs.sort((a,b) => (b.date||0) - (a.date||0)); break;
    case 'antiguo': movs.sort((a,b) => (a.date||0) - (b.date||0)); break;
    case 'mas_caro': movs.sort((a,b) => Math.abs(b.amount||0) - Math.abs(a.amount||0)); break;
    case 'menos_caro': movs.sort((a,b) => Math.abs(a.amount||0) - Math.abs(b.amount||0)); break;
    default: movs.sort((a,b) => (b.date||0) - (a.date||0));
  }
  return movs;
}

function aplicarFiltrosEconomia() {
  const torneo = currentData;
  if (!torneo || !torneo.economyLogs) return;

  const round = document.getElementById('eco-filtro-jornada')?.value || 'todas';
  const team = document.getElementById('eco-filtro-equipo')?.value || 'all';
  const type = document.getElementById('eco-filtro-tipo')?.value || 'todos';
  const sort = document.getElementById('eco-filtro-orden')?.value || 'reciente';

  const movs = obtenerMovimientosFiltrados(torneo, { round, team, type, sort });

  let total = 0, ingresos = 0, gastos = 0;
  movs.forEach(m => {
    const amt = m.amount || 0;
    total += amt;
    if (amt > 0) ingresos += amt;
    else gastos += Math.abs(amt);
  });

  document.getElementById('eco-total-movs').textContent = movs.length;
  document.getElementById('eco-total-ingresos').textContent = formatCurrency(ingresos);
  document.getElementById('eco-total-gastos').textContent = formatCurrency(gastos);
  const netoEl = document.getElementById('eco-total-neto');
  netoEl.textContent = formatCurrency(total);
  netoEl.style.color = total >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';

  const tbody = document.getElementById('eco-tabla-body');
  if (!movs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay movimientos.</td></tr>';
    return;
  }

  let html = '';
  movs.forEach(m => {
    const team = getTeamById(torneo.teams, m.teamId);
    const teamName = team ? team.name : 'Desconocido';
    const teamShield = team ? team.shield : '';
    const tipoInfo = getTipoInfo(m.type);
    const isIncome = (m.amount || 0) > 0;
    const sign = isIncome ? '+' : '';
    const color = isIncome ? 'var(--neon-green)' : 'var(--neon-red)';
    const dateStr = formatDate(m.date);
    html += `<tr><td style="font-size:0.65rem;">${dateStr}</td><td class="flex-center"><img src="${teamShield}" class="shield-sm"> ${teamName}</td><td>${m.description || 'Sin descripción'}</td><td><span class="type-badge" style="border:1px solid var(--color-border);padding:0.1rem 0.5rem;border-radius:20px;font-size:0.6rem;">${tipoInfo.icon} ${tipoInfo.label}</span></td><td style="text-align:right;color:${color};font-weight:700;">${sign}${formatCurrency(m.amount)}</td></tr>`;
  });
  tbody.innerHTML = html;
}

// ==========================================
// SANCIONES / SELECCIÓN / AMISTOSOS / SALÓN
// ==========================================
function renderSanciones(torneo) {
  if (!torneo.sanctionsLog || !torneo.sanctionsLog.length) return '<div class="empty-state"><i class="fa-solid fa-gavel"></i>No hay sanciones registradas.</div>';
  const logs = torneo.sanctionsLog.filter(function(s) { return s.active !== false; }).slice().reverse();
  if (!logs.length) return '<div class="empty-state"><i class="fa-solid fa-check-circle" style="color:var(--neon-green);"></i>No hay sanciones activas.</div>';
  let html = '<div class="table-wrap"><table><thead><tr><th>Jugador</th><th>Equipo</th><th>Tipo</th><th>Motivo</th><th>Jornadas</th></tr></thead><tbody>';
  logs.forEach(function(s) {
    const team = torneo.teams.find(function(t) { return t.id === s.teamId; });
    const teamName = team ? team.name : 'Desconocido';
    const teamShield = team ? team.shield : '';
    const typeLabel = s.type === 'yellow' ? '🟨 Amonestación' : s.type === 'red' ? '🟥 Expulsión' : s.type === 'suspension' ? '🚫 Suspensión' : '💰 Multa';
    const rounds = s.roundEnd ? 'J' + s.roundStart + ' - J' + s.roundEnd : 'Desde J' + s.roundStart;
    html += '<tr><td><strong>' + s.playerName + '</strong></td><td class="flex-center"><img src="' + teamShield + '" class="shield-sm"> ' + teamName + '</td><td>' + typeLabel + '</td><td>' + s.reason + '</td><td>' + rounds + '</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function renderSeleccion(torneo) {
  let national = null;
  if (torneo.nationalTeams) {
    national = torneo.nationalTeams.find(function(nt) { return nt.type === 'main'; });
    if (!national) national = torneo.nationalTeams[0];
  }
  if (!national || !national.players || !national.players.length) return '<div class="empty-state"><i class="fa-solid fa-flag"></i>No hay selección nacional configurada.</div>';

  let html = '<div class="card"><div class="flex-center" style="justify-content:space-between;"><span style="font-family:Montserrat,sans-serif;font-weight:900;font-size:1.2rem;">' + national.name + '</span><span style="font-size:0.65rem;color:var(--color-text-muted);">' + (national.type === 'main' ? '🇲🇽 Selección Nacional' : '🔵 Sub Selección') + '</span></div><div style="display:flex;flex-wrap:wrap;gap:0.8rem;margin-top:0.4rem;justify-content:center;">';
  national.players.forEach(function(p) {
    const rankColor = getRankColor(p.rocketRank || 'Platino');
    const rankDisplay = p.rocketRank + (p.rocketRank !== 'SSL' ? ' ' + p.division : '');
    html += `<div onclick="showPlayerProfile('${p.id}')" style="cursor:pointer;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius);padding:0.5rem;text-align:center;min-width:90px;flex:1 0 auto;max-width:140px;">`;
    html += '<div style="font-size:0.55rem;color:var(--color-text-muted);">' + (p.role||'Jugador') + '</div>';
    html += '<img src="' + (p.shield||'') + '" style="width:2.5rem;height:2.5rem;border-radius:50%;background:#000;border:1px solid var(--color-border);object-fit:contain;margin:0.1rem auto;">';
    html += '<div style="font-weight:700;font-size:0.8rem;">' + p.name + '</div>';
    html += '<div style="font-size:0.55rem;color:' + rankColor + ';">' + rankDisplay + '</div>';
    html += '<div style="font-size:0.6rem;color:var(--neon-yellow);">G' + (p.stats?.goals||0) + ' A' + (p.stats?.assists||0) + ' S' + (p.stats?.saves||0) + '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  const power = { atk: national.atk||0, def: national.def||0, glb: national.glb||0 };
  html += '<div class="card" style="margin-top:0.3rem;"><div class="flex-center" style="gap:0.8rem;flex-wrap:wrap;"><span class="power-badge atk">ATK ' + power.atk + '</span><span class="power-badge def">DEF ' + power.def + '</span><span class="power-badge glb">GLB ' + power.glb + '</span></div></div>';
  return html;
}

function renderAmistosos(torneo) {
  if (!torneo.friendlyMatches || !torneo.friendlyMatches.length) return '<div class="empty-state"><i class="fa-solid fa-handshake-slash"></i>No hay partidos amistosos.</div>';
  let html = '';
  torneo.friendlyMatches.forEach(function(fm) {
    const h = getTeamById(torneo.teams, fm.h);
    const a = getTeamById(torneo.teams, fm.a);
    const played = fm.played || false;
    const score = played ? fm.sH + ' - ' + fm.sA : 'vs';
    const clickable = played ? 'class="match-clickable" onclick="showMatchStats(\'' + fm.id + '\')"' : '';
    html += '<div class="card"' + clickable + '><div class="flex-center" style="justify-content:space-between;">';
    html += '<span class="flex-center"><img src="' + (h?.shield || '') + '" class="shield-sm"> ' + (h?.name || 'Desconocido') + '</span>';
    html += '<span style="font-weight:700;font-size:1.1rem;">' + score + '</span>';
    html += '<span class="flex-center">' + (a?.name || 'Desconocido') + ' <img src="' + (a?.shield || '') + '" class="shield-sm"></span>';
    html += '</div></div>';
  });
  return html;
}

function renderSalon(torneo) {
  if (!torneo.seasons || !torneo.seasons.length) return '<div class="empty-state"><i class="fa-solid fa-medal"></i>No hay temporadas guardadas.</div>';
  let html = '';
  torneo.seasons.slice().reverse().forEach(function(season, idx) {
    const realIdx = torneo.seasons.length - idx;
    html += '<div class="card"><div class="card-header">Temporada ' + realIdx + ' - ' + new Date(season.date).toLocaleDateString('es-ES') + '</div>';
    const champ = season.champion ? season.teams.find(function(t) { return t.id === season.champion; }) : null;
    if (champ) {
      html += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;"><span style="font-size:1.3rem;">🏆</span><img src="' + (champ.shield||'') + '" style="width:1.8rem;height:1.8rem;border-radius:50%;background:#000;border:1px solid var(--color-border);object-fit:contain;"><strong>' + champ.name + '</strong> <span style="font-size:0.65rem;color:var(--color-text-muted);">' + (champ.pts||0) + ' pts</span></div>';
    }
    const dt = season.dreamTeam || {};
    if (dt.goleador || dt.asistidor || dt.portero) {
      html += '<div style="font-size:0.65rem;display:flex;flex-wrap:wrap;gap:0.3rem 1rem;margin:0.2rem 0;">';
      if (dt.goleador) html += '<span><span class="text-neon-green">⚽</span> ' + dt.goleador.name + ' (' + dt.goleador.g + ')</span>';
      if (dt.asistidor) html += '<span><span class="text-neon-cyan">🎯</span> ' + dt.asistidor.name + ' (' + dt.asistidor.a + ')</span>';
      if (dt.portero) html += '<span><span class="text-neon-pink">🧤</span> ' + dt.portero.name + ' (' + dt.portero.s + ')</span>';
      html += '</div>';
    }
    html += '</div>';
  });
  return html;
}

// ==========================================
// IMPRESIÓN DE SECCIONES BÁSICAS
// ==========================================
function printTablaGeneral() {
  if (!_acquirePrintLock()) return;
  const container = document.querySelector('#section-tabla .table-wrap');
  if (!container) { _releasePrintLock(); return alert('No hay tabla para imprimir.'); }
  const clone = container.cloneNode(true);
  let html = getPrintHeader('TABLA GENERAL') + clone.outerHTML + '<div style="margin-top:0.3rem;font-size:0.55rem;color:#94a3b8;">' + currentData.name + '</div>';
  html = resolveCSSVars(html);
  showPrintModal(html, 'tabla_general.jpg', 900);
}

function printTablaMedia() {
  if (!_acquirePrintLock()) return;
  const container = document.querySelector('#section-media .table-wrap');
  if (!container) { _releasePrintLock(); return alert('No hay tabla para imprimir.'); }
  const clone = container.cloneNode(true);
  let html = getPrintHeader('TABLA DE MEDIA') + clone.outerHTML + '<div style="margin-top:0.3rem;font-size:0.55rem;color:#94a3b8;">' + currentData.name + '</div>';
  html = resolveCSSVars(html);
  showPrintModal(html, 'tabla_media.jpg', 900);
}

function printJornada() {
  if (!_acquirePrintLock()) return;
  if (!currentData.rounds || !currentData.rounds.length) { _releasePrintLock(); return alert('No hay jornadas.'); }
  const options = currentData.rounds.map(function(_, i) { return '<option value="' + i + '">Jornada ' + (i+1) + '</option>'; }).join('');
  const modal = document.createElement('div');
  modal.className = 'print-modal-overlay';
  modal.innerHTML = '<div class="print-modal" style="max-width:400px;"><h3>Seleccionar Jornada</h3><select id="print-jornada-select" style="width:100%;padding:0.4rem;margin:0.4rem 0;background:#0a0a0f;color:#fff;border:1px solid #2d2d44;border-radius:8px;">' + options + '</select><div class="actions"><button class="btn-cancel">Cancelar</button><button class="btn-download">Descargar</button></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('.btn-cancel').addEventListener('click', () => { modal.remove(); _releasePrintLock(); });
  modal.querySelector('.btn-download').addEventListener('click', () => {
    const idx = parseInt(document.getElementById('print-jornada-select').value);
    const round = currentData.rounds[idx];
    if (!round) { modal.remove(); _releasePrintLock(); return alert('Jornada no encontrada.'); }

    let html = getPrintHeader('JORNADA ' + (idx+1));
    html += '<div style="max-width:760px;margin:0.8rem auto 0;">';
    html += '<table style="width:100%;border-collapse:separate;border-spacing:0 8px;font-size:0.85rem;">';
    round.forEach(function(m, i) {
      const h = getTeamById(currentData.teams, m.h);
      const a = getTeamById(currentData.teams, m.a);
      const played = m.played || false;
      const score = played ? (m.sH + ' - ' + m.sA) : 'vs';
      const scoreColor = played ? '#facc15' : '#94a3b8';
      const rowBg = i % 2 === 0 ? 'rgba(30,30,47,0.7)' : 'rgba(20,20,30,0.7)';
      html += `<tr style="background:${rowBg};">`;
      html += `<td style="padding:0.75rem 1rem;border-radius:12px 0 0 12px;width:42%;vertical-align:middle;">`;
      html += `<div style="display:flex;align-items:center;gap:0.7rem;">`;
      html += `<img src="${h?.shield || ''}" style="width:36px;height:36px;border-radius:50%;background:#000;border:1.5px solid #2d2d44;object-fit:contain;flex-shrink:0;">`;
      html += `<strong style="color:#fff;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h?.name || '???'}</strong>`;
      html += `</div></td>`;
      html += `<td style="padding:0.75rem 0.5rem;text-align:center;font-weight:900;font-size:1.2rem;color:${scoreColor};white-space:nowrap;vertical-align:middle;">${score}</td>`;
      html += `<td style="padding:0.75rem 1rem;border-radius:0 12px 12px 0;width:42%;text-align:right;vertical-align:middle;">`;
      html += `<div style="display:flex;align-items:center;gap:0.7rem;justify-content:flex-end;">`;
      html += `<strong style="color:#fff;font-size:0.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a?.name || '???'}</strong>`;
      html += `<img src="${a?.shield || ''}" style="width:36px;height:36px;border-radius:50%;background:#000;border:1.5px solid #2d2d44;object-fit:contain;flex-shrink:0;">`;
      html += `</div></td>`;
      html += '</tr>';
    });
    html += '</table></div>';
    html += '<div style="margin-top:0.8rem;font-size:0.55rem;color:#94a3b8;text-align:center;">' + currentData.name + ' · Generado desde MTM Nexus</div>';

    html = resolveCSSVars(html);
    showPrintModal(html, 'jornada_' + (idx+1) + '.jpg', 800);
    modal.remove();
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.remove(); _releasePrintLock(); } });
}

function printStats() {
  if (!_acquirePrintLock()) return;
  const torneo = currentData;
  if (!torneo) { _releasePrintLock(); return alert('No hay torneo activo.'); }

  const categories = [
    { key: 'goals', label: '⚽ Goleadores', field: 'Goles' },
    { key: 'assists', label: '🎯 Asistencias', field: 'Asistencias' },
    { key: 'saves', label: '🧤 Salvadas', field: 'Salvadas' },
    { key: 'shots', label: '💀 Tiros (Peligro)', field: 'Tiros' }
  ];

  const roundsCount = torneo.rounds ? torneo.rounds.length : 0;
  let mvpOptions = '';
  for (let i = 0; i < roundsCount; i++) {
    mvpOptions += `<option value="${i}" ${i === currentMvpJornada ? 'selected' : ''}>J${i + 1}</option>`;
  }

  let bodyHtml = '';
  categories.forEach(cat => {
    bodyHtml += `
      <div class="print-config-row">
        <label><input type="checkbox" id="print-stats-${cat.key}" checked> ${cat.label}</label>
        <input type="number" id="print-stats-${cat.key}-top" value="10" min="1" max="200" class="print-top-input" title="Top a mostrar">
      </div>`;
  });
  bodyHtml += `
    <div class="print-config-row">
      <label><input type="checkbox" id="print-stats-mvp"> ⭐ MVP por Jornada</label>
      ${roundsCount > 0 ? `<select id="print-stats-mvp-jornada" class="print-top-input" style="width:auto;min-width:80px;">${mvpOptions}</select>` : '<span style="font-size:0.7rem;color:#94a3b8;">Sin jornadas</span>'}
    </div>
  `;

  openPrintConfigModal('📊 Imprimir Stats', bodyHtml, () => {
    let html = getPrintHeader('Stats');
    let hasContent = false;

    categories.forEach(cat => {
      const checkbox = document.getElementById(`print-stats-${cat.key}`);
      if (checkbox && checkbox.checked) {
        const top = parseInt(document.getElementById(`print-stats-${cat.key}-top`).value) || 10;
        const sorted = getSortedPlayersByKey(torneo, cat.key).slice(0, top);
        html += buildPrintStatsTable(`${cat.label} · Top ${top}`, sorted, cat.key, cat.field);
        hasContent = true;
      }
    });

    const mvpCb = document.getElementById('print-stats-mvp');
    if (mvpCb && mvpCb.checked && roundsCount > 0) {
      const jIdx = parseInt(document.getElementById('print-stats-mvp-jornada')?.value) || 0;
      html += buildPrintMvpBlock(torneo, jIdx);
      hasContent = true;
    }

    if (!hasContent) { alert('Selecciona al menos una categoría.'); return false; }

    html += `<div style="margin-top:1rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>`;
    html = resolveCSSVars(html);
    showPrintModal(html, `stats_${Date.now()}.jpg`, 900);
    return true;
  });
}

function printBalon() {
  if (!_acquirePrintLock()) return;
  const torneo = currentData;
  if (!torneo) { _releasePrintLock(); return alert('No hay datos.'); }

  let bodyHtml = '';
  [3, 5, 10, 20, 30].forEach(n => {
    bodyHtml += `<div class="print-config-row"><label><input type="radio" name="print-balon-top" value="${n}" ${n === 20 ? 'checked' : ''}> Top ${n}</label></div>`;
  });
  bodyHtml += `
    <div class="print-config-row">
      <label><input type="radio" name="print-balon-top" value="custom"> Personalizado:</label>
      <input type="number" id="print-balon-top-custom" value="20" min="3" max="200" class="print-top-input">
    </div>
  `;

  openPrintConfigModal('🏆 Imprimir Balón de Oro', bodyHtml, () => {
    const selected = document.querySelector('input[name="print-balon-top"]:checked');
    let top = 20;
    if (selected) {
      if (selected.value === 'custom') {
        top = parseInt(document.getElementById('print-balon-top-custom').value) || 20;
      } else {
        top = parseInt(selected.value);
      }
    }
    if (top < 1) top = 1;
    if (top > 200) top = 200;

    const allPlayers = getSortedPlayersByKey(torneo, 'pig');
    const topN = allPlayers.slice(0, top);
    const top3 = topN.slice(0, 3);
    const rest = topN.slice(3);

    let html = getPrintHeader(`Balón de Oro · Top ${top}`);
    html += renderPrintPodium(top3);

    if (rest.length > 0) {
      html += '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;margin-top:0.5rem;">';
      html += '<thead><tr style="background:rgba(30,30,47,0.7);border-bottom:1px solid #2d2d44;">';
      html += '<th style="padding:0.45rem 0.6rem;text-align:center;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;width:40px;">#</th>';
      html += '<th style="padding:0.45rem 0.6rem;text-align:left;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;">Jugador</th>';
      html += '<th style="padding:0.45rem 0.6rem;text-align:left;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;">Equipo</th>';
      html += '<th style="padding:0.45rem 0.6rem;text-align:right;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;width:100px;">PIG</th>';
      html += '</tr></thead><tbody>';
      rest.forEach((p, i) => {
        const bg = i % 2 === 0 ? 'rgba(30,30,47,0.4)' : 'rgba(20,20,30,0.4)';
        html += `<tr style="background:${bg};border-bottom:1px solid #2d2d44;">`;
        html += `<td style="padding:0.4rem 0.6rem;text-align:center;color:#94a3b8;font-weight:700;">${i+4}</td>`;
        html += `<td style="padding:0.4rem 0.6rem;color:#fff;font-weight:700;">${p.isCaptain ? '👑 ' : ''}${p.name}</td>`;
        html += `<td style="padding:0.4rem 0.6rem;color:#94a3b8;">${p.teamName}</td>`;
        html += `<td style="padding:0.4rem 0.6rem;text-align:right;color:#ffd700;font-weight:900;font-size:0.9rem;">${(p.pig || 0).toFixed(1)}</td>`;
        html += '</tr>';
      });
      html += '</tbody></table>';
    }

    html += `<div style="margin-top:1rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>`;
    html = resolveCSSVars(html);
    showPrintModal(html, `balon_oro_top${top}.jpg`, 900);
    return true;
  });
}

function printMercado() {
  if (!_acquirePrintLock()) return;
  const torneo = currentData;
  if (!torneo) { _releasePrintLock(); return alert('No hay datos.'); }

  const teamOptions = torneo.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  const rankOptions = ['Bronce','Plata','Oro','Platino','Diamante','Campeón','Gran Campeón','SSL']
    .map(r => `<option value="${r}">${r}</option>`).join('');

  let bodyHtml = `
    <div class="print-config-row">
      <label><input type="checkbox" id="print-mercado-comparison"> ⚔️ Modo Comparación</label>
    </div>
    <div id="print-mercado-normal-section">
      <div class="print-config-row">
        <label>Equipo:</label>
        <select id="print-mercado-team" class="print-top-input" style="width:auto;min-width:160px;">
          <option value="all">Todos</option>
          <option value="free">🆓 Agentes Libres</option>
          ${teamOptions}
        </select>
      </div>
      <div class="print-config-row">
        <label>Ordenar por:</label>
        <select id="print-mercado-order" class="print-top-input" style="width:auto;min-width:160px;">
          <option value="precio-desc">Precio ↓</option>
          <option value="precio-asc">Precio ↑</option>
          <option value="pig-desc">PIG ↓</option>
          <option value="pig-asc">PIG ↑</option>
          <option value="nombre">Nombre A-Z</option>
        </select>
      </div>
      <div class="print-config-row">
        <label>Rango:</label>
        <select id="print-mercado-rank" class="print-top-input" style="width:auto;min-width:140px;">
          <option value="">Todos</option>
          ${rankOptions}
        </select>
      </div>
      <div class="print-config-row">
        <label>División:</label>
        <select id="print-mercado-division" class="print-top-input" style="width:auto;">
          <option value="">Todas</option>
          <option value="1">Div 1</option>
          <option value="2">Div 2</option>
          <option value="3">Div 3</option>
        </select>
      </div>
      <div class="print-config-row">
        <label>Cantidad de filas:</label>
        <input type="number" id="print-mercado-count" value="20" min="1" max="200" class="print-top-input">
      </div>
    </div>
    <div id="print-mercado-comparison-section" class="hidden">
      <div class="print-config-row">
        <label>Comparar:</label>
        <select id="print-mercado-comparison-type" class="print-top-input" style="width:auto;">
          <option value="player">Jugadores</option>
          <option value="team">Equipos</option>
        </select>
      </div>
      <div id="print-mercado-player-comparison">
        <div class="print-config-row">
          <label>Jugador A:</label>
          <div style="display:flex;gap:0.4rem;flex:1;justify-content:flex-end;flex-wrap:wrap;">
            <select id="print-mercado-playerA-team" class="print-top-input" style="width:auto;min-width:130px;">${teamOptions}</select>
            <select id="print-mercado-playerA-player" class="print-top-input" style="width:auto;min-width:130px;"></select>
          </div>
        </div>
        <div class="print-config-row">
          <label>Jugador B:</label>
          <div style="display:flex;gap:0.4rem;flex:1;justify-content:flex-end;flex-wrap:wrap;">
            <select id="print-mercado-playerB-team" class="print-top-input" style="width:auto;min-width:130px;">${teamOptions}</select>
            <select id="print-mercado-playerB-player" class="print-top-input" style="width:auto;min-width:130px;"></select>
          </div>
        </div>
      </div>
      <div id="print-mercado-team-comparison" class="hidden">
        <div class="print-config-row">
          <label>Equipo A:</label>
          <select id="print-mercado-teamA" class="print-top-input" style="width:auto;min-width:160px;">${teamOptions}</select>
        </div>
        <div class="print-config-row">
          <label>Equipo B:</label>
          <select id="print-mercado-teamB" class="print-top-input" style="width:auto;min-width:160px;">${teamOptions}</select>
        </div>
      </div>
      <div class="print-config-row">
        <label><input type="checkbox" id="print-mercado-show-winner" checked> 🏆 Mostrar ganador automático</label>
      </div>
    </div>
  `;

  openPrintConfigModal('🛒 Imprimir Mercado', bodyHtml, () => {
    const isComparison = document.getElementById('print-mercado-comparison')?.checked;

    if (isComparison) {
      const type = document.getElementById('print-mercado-comparison-type').value;
      const showWinner = document.getElementById('print-mercado-show-winner').checked;

      if (type === 'player') {
        const teamAId = document.getElementById('print-mercado-playerA-team').value;
        const playerAId = document.getElementById('print-mercado-playerA-player').value;
        const teamBId = document.getElementById('print-mercado-playerB-team').value;
        const playerBId = document.getElementById('print-mercado-playerB-player').value;

        if (!playerAId || !playerBId) { alert('Selecciona ambos jugadores.'); return false; }
        if (playerAId === playerBId) { alert('No puedes comparar el mismo jugador.'); return false; }

        const teamA = getTeamById(torneo.teams, teamAId);
        const teamB = getTeamById(torneo.teams, teamBId);
        const playerA = teamA?.players.find(p => p.id === playerAId);
        const playerB = teamB?.players.find(p => p.id === playerBId);
        if (!playerA || !playerB) { alert('Jugador no encontrado.'); return false; }

        let html = getPrintHeader('Comparación de Jugadores');
        html += buildPlayerComparisonHtml(playerA, playerB, teamA, teamB, showWinner);
        html += `<div style="margin-top:1rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>`;
        html = resolveCSSVars(html);
        showPrintModal(html, `comparacion_${sanitizeForFilename(playerA.name)}_vs_${sanitizeForFilename(playerB.name)}.jpg`, 900);
      } else {
        const teamAId = document.getElementById('print-mercado-teamA').value;
        const teamBId = document.getElementById('print-mercado-teamB').value;
        if (teamAId === teamBId) { alert('No puedes comparar el mismo equipo.'); return false; }
        const teamA = getTeamById(torneo.teams, teamAId);
        const teamB = getTeamById(torneo.teams, teamBId);
        if (!teamA || !teamB) { alert('Equipo no encontrado.'); return false; }

        let html = getPrintHeader('Comparación de Equipos');
        html += buildTeamComparisonHtml(teamA, teamB, showWinner);
        html += `<div style="margin-top:1rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>`;
        html = resolveCSSVars(html);
        showPrintModal(html, `comparacion_${sanitizeForFilename(teamA.name)}_vs_${sanitizeForFilename(teamB.name)}.jpg`, 900);
      }
      return true;
    }

    const teamFilter = document.getElementById('print-mercado-team').value;
    const order = document.getElementById('print-mercado-order').value;
    const rankFilter = document.getElementById('print-mercado-rank').value;
    const divisionFilter = document.getElementById('print-mercado-division').value;
    const count = parseInt(document.getElementById('print-mercado-count').value) || 20;

    let allPlayers = [];
    if (teamFilter === 'free') {
      (torneo.freeAgents || []).forEach(p => {
        if (p.name && p.name.trim() !== '') {
          const s = p.seasonStats || {};
          allPlayers.push({ ...p, teamName: 'Agente Libre', teamShield: '', pig: s.pig || 0, isFree: true });
        }
      });
    } else if (teamFilter !== 'all') {
      const team = getTeamById(torneo.teams, teamFilter);
      if (team) {
        team.players.forEach(p => {
          if (p.name && p.name.trim() !== '') {
            const s = p.seasonStats || {};
            allPlayers.push({ ...p, teamName: team.name, teamShield: team.shield, pig: s.pig || 0, isFree: false });
          }
        });
      }
    } else {
      torneo.teams.forEach(team => {
        team.players.forEach(p => {
          if (p.name && p.name.trim() !== '') {
            const s = p.seasonStats || {};
            allPlayers.push({ ...p, teamName: team.name, teamShield: team.shield, pig: s.pig || 0, isFree: false });
          }
        });
      });
      (torneo.freeAgents || []).forEach(p => {
        if (p.name && p.name.trim() !== '') {
          const s = p.seasonStats || {};
          allPlayers.push({ ...p, teamName: 'Agente Libre', teamShield: '', pig: s.pig || 0, isFree: true });
        }
      });
    }

    if (rankFilter) allPlayers = allPlayers.filter(p => p.rocketRank === rankFilter);
    if (divisionFilter) allPlayers = allPlayers.filter(p => p.division == divisionFilter);

    switch (order) {
      case 'precio-desc': allPlayers.sort((a, b) => (b.marketValue||0) - (a.marketValue||0)); break;
      case 'precio-asc': allPlayers.sort((a, b) => (a.marketValue||0) - (b.marketValue||0)); break;
      case 'pig-desc': allPlayers.sort((a, b) => (b.pig||0) - (a.pig||0)); break;
      case 'pig-asc': allPlayers.sort((a, b) => (a.pig||0) - (b.pig||0)); break;
      case 'nombre': allPlayers.sort((a, b) => a.name.localeCompare(b.name)); break;
    }

    const sliced = allPlayers.slice(0, count);

    let html = getPrintHeader('Mercado');
    html += `<div style="margin-bottom:0.6rem;font-size:0.72rem;color:#94a3b8;">Mostrando ${sliced.length} jugadores (de ${allPlayers.length} filtrados)</div>`;
    if (sliced.length === 0) {
      html += '<div style="text-align:center;color:#94a3b8;padding:2rem;">No hay jugadores con esos filtros.</div>';
    } else {
      html += '<table style="width:100%;border-collapse:collapse;font-size:0.75rem;">';
      html += '<thead><tr style="background:rgba(30,30,47,0.7);border-bottom:1px solid #2d2d44;">';
      html += '<th style="padding:0.5rem;text-align:center;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;">#</th>';
      html += '<th style="padding:0.5rem;text-align:left;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;">Jugador</th>';
      html += '<th style="padding:0.5rem;text-align:left;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;">Equipo</th>';
      html += '<th style="padding:0.5rem;text-align:center;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;">PIG</th>';
      html += '<th style="padding:0.5rem;text-align:center;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;">Rango</th>';
      html += '<th style="padding:0.5rem;text-align:right;color:#94a3b8;font-size:0.62rem;text-transform:uppercase;">Precio</th>';
      html += '</tr></thead><tbody>';
      sliced.forEach((p, i) => {
        const bg = i % 2 === 0 ? 'rgba(30,30,47,0.4)' : 'rgba(20,20,30,0.4)';
        html += `<tr style="background:${bg};border-bottom:1px solid #2d2d44;">`;
        html += `<td style="padding:0.4rem;text-align:center;color:${i < 10 ? '#ffd700' : '#94a3b8'};font-weight:700;">${i+1}</td>`;
        html += `<td style="padding:0.4rem;color:#fff;font-weight:700;">${p.isCaptain ? '👑 ' : ''}${p.name}</td>`;
        html += `<td style="padding:0.4rem;color:#94a3b8;">${p.teamName}</td>`;
        html += `<td style="padding:0.4rem;text-align:center;color:#a855f7;font-weight:700;">${(p.pig||0).toFixed(1)}</td>`;
        html += `<td style="padding:0.4rem;text-align:center;color:${getRankColor(p.rocketRank)};font-weight:700;">${p.rocketRank} ${p.rocketRank !== 'SSL' ? p.division : ''}</td>`;
        html += `<td style="padding:0.4rem;text-align:right;color:#ffd700;font-weight:700;">${formatCurrency(p.marketValue || 0)}</td>`;
        html += '</tr>';
      });
      html += '</tbody></table>';
    }
    html += `<div style="margin-top:1rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>`;
    html = resolveCSSVars(html);
    showPrintModal(html, `mercado_${sliced.length}jugadores.jpg`, 900);
    return true;
  });

  setTimeout(() => {
    const comparisonCheckbox = document.getElementById('print-mercado-comparison');
    const normalSection = document.getElementById('print-mercado-normal-section');
    const comparisonSection = document.getElementById('print-mercado-comparison-section');
    const typeSelect = document.getElementById('print-mercado-comparison-type');
    const playerComp = document.getElementById('print-mercado-player-comparison');
    const teamComp = document.getElementById('print-mercado-team-comparison');

    if (comparisonCheckbox) {
      comparisonCheckbox.addEventListener('change', () => {
        if (normalSection) normalSection.classList.toggle('hidden', comparisonCheckbox.checked);
        if (comparisonSection) comparisonSection.classList.toggle('hidden', !comparisonCheckbox.checked);
      });
    }

    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        const isPlayer = typeSelect.value === 'player';
        if (playerComp) playerComp.classList.toggle('hidden', !isPlayer);
        if (teamComp) teamComp.classList.toggle('hidden', isPlayer);
      });
    }

    const populatePlayers = (side) => {
      const teamSel = document.getElementById(`print-mercado-player${side}-team`);
      const playerSel = document.getElementById(`print-mercado-player${side}-player`);
      if (!teamSel || !playerSel) return;
      const team = getTeamById(torneo.teams, teamSel.value);
      if (!team) { playerSel.innerHTML = ''; return; }
      const players = team.players.filter(p => p.name && p.name.trim() !== '');
      playerSel.innerHTML = players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    };
    populatePlayers('A');
    populatePlayers('B');

    const teamA = document.getElementById('print-mercado-playerA-team');
    const teamB = document.getElementById('print-mercado-playerB-team');
    if (teamA) teamA.addEventListener('change', () => populatePlayers('A'));
    if (teamB) teamB.addEventListener('change', () => populatePlayers('B'));
  }, 50);
}

function printEconomia() {
  if (!_acquirePrintLock()) return;
  const torneo = currentData;
  if (!torneo || !torneo.economyLogs || torneo.economyLogs.length === 0) {
    _releasePrintLock();
    return alert('No hay movimientos económicos para imprimir.');
  }

  let maxRound = 0;
  torneo.economyLogs.forEach(log => { if (log.round && log.round > maxRound) maxRound = log.round; });
  if (maxRound === 0) maxRound = torneo.rounds ? torneo.rounds.length : 1;

  let roundOptions = '<option value="todas">Todas</option>';
  for (let i = 1; i <= maxRound; i++) roundOptions += `<option value="${i}">Jornada ${i}</option>`;

  const typeOptions = [
    { value: 'todos', label: 'Todos' }, { value: 'bonus', label: '🏆 Bonos' },
    { value: 'transfer_in', label: '📥 Fichajes' }, { value: 'transfer_out', label: '📤 Ventas' },
    { value: 'loan', label: '📋 Préstamos' }, { value: 'penalty', label: '⚠️ Sanciones' },
    { value: 'release', label: '📄 Liberaciones' }
  ];
  const typeSelect = typeOptions.map(t => `<option value="${t.value}">${t.label}</option>`).join('');

  const sortOptions = [
    { value: 'reciente', label: 'Más reciente' }, { value: 'antiguo', label: 'Menos reciente' },
    { value: 'mas_caro', label: 'Más caro' }, { value: 'menos_caro', label: 'Menos caro' }
  ];
  const sortSelect = sortOptions.map(s => `<option value="${s.value}">${s.label}</option>`).join('');

  const teamOptions = torneo.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  let bodyHtml = `
    <div class="print-config-row"><label>Jornada:</label><select id="print-eco-round" class="print-top-input" style="width:auto;min-width:140px;">${roundOptions}</select></div>
    <div class="print-config-row"><label>Equipo:</label><select id="print-eco-team" class="print-top-input" style="width:auto;min-width:160px;"><option value="all">Todos</option>${teamOptions}</select></div>
    <div class="print-config-row"><label>Tipo:</label><select id="print-eco-type" class="print-top-input" style="width:auto;min-width:160px;">${typeSelect}</select></div>
    <div class="print-config-row"><label>Ordenar por:</label><select id="print-eco-sort" class="print-top-input" style="width:auto;min-width:160px;">${sortSelect}</select></div>
    <div class="print-config-row"><label>Cantidad de filas:</label><input type="number" id="print-eco-count" value="30" min="1" max="500" class="print-top-input"></div>
  `;

  openPrintConfigModal('💰 Imprimir Mov. Económicos', bodyHtml, () => {
    const round = document.getElementById('print-eco-round').value;
    const team = document.getElementById('print-eco-team').value;
    const type = document.getElementById('print-eco-type').value;
    const sort = document.getElementById('print-eco-sort').value;
    const count = parseInt(document.getElementById('print-eco-count').value) || 30;

    let movs = obtenerMovimientosFiltrados(torneo, { round, team, type, sort });
    movs = movs.slice(0, count);

    let total = 0, ingresos = 0, gastos = 0;
    movs.forEach(m => {
      const amt = m.amount || 0;
      total += amt;
      if (amt > 0) ingresos += amt; else gastos += Math.abs(amt);
    });

    let html = getPrintHeader('Movimientos Económicos');
    html += `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1rem;">
        <div style="text-align:center;padding:0.6rem;background:rgba(0,0,0,0.25);border-radius:10px;border:1px solid #2d2d44;">
          <div style="font-size:1.4rem;font-weight:900;color:#fff;">${movs.length}</div>
          <div style="font-size:0.6rem;color:#94a3b8;text-transform:uppercase;">Movs</div>
        </div>
        <div style="text-align:center;padding:0.6rem;background:rgba(0,0,0,0.25);border-radius:10px;border:1px solid #2d2d44;">
          <div style="font-size:1.4rem;font-weight:900;color:#4ade80;">${formatCurrency(ingresos)}</div>
          <div style="font-size:0.6rem;color:#94a3b8;text-transform:uppercase;">Ingresos</div>
        </div>
        <div style="text-align:center;padding:0.6rem;background:rgba(0,0,0,0.25);border-radius:10px;border:1px solid #2d2d44;">
          <div style="font-size:1.4rem;font-weight:900;color:#f87171;">${formatCurrency(gastos)}</div>
          <div style="font-size:0.6rem;color:#94a3b8;text-transform:uppercase;">Gastos</div>
        </div>
        <div style="text-align:center;padding:0.6rem;background:rgba(0,0,0,0.25);border-radius:10px;border:1px solid #2d2d44;">
          <div style="font-size:1.4rem;font-weight:900;color:${total >= 0 ? '#4ade80' : '#f87171'};">${formatCurrency(total)}</div>
          <div style="font-size:0.6rem;color:#94a3b8;text-transform:uppercase;">Neto</div>
        </div>
      </div>
    `;

    if (movs.length === 0) {
      html += '<div style="text-align:center;color:#94a3b8;padding:2rem;">No hay movimientos con esos filtros.</div>';
    } else {
      html += '<table style="width:100%;border-collapse:collapse;font-size:0.75rem;">';
      html += '<thead><tr style="background:rgba(30,30,47,0.7);border-bottom:1px solid #2d2d44;">';
      html += '<th style="padding:0.45rem 0.5rem;text-align:left;color:#94a3b8;font-size:0.6rem;text-transform:uppercase;">Fecha</th>';
      html += '<th style="padding:0.45rem 0.5rem;text-align:left;color:#94a3b8;font-size:0.6rem;text-transform:uppercase;">Equipo</th>';
      html += '<th style="padding:0.45rem 0.5rem;text-align:left;color:#94a3b8;font-size:0.6rem;text-transform:uppercase;">Descripción</th>';
      html += '<th style="padding:0.45rem 0.5rem;text-align:center;color:#94a3b8;font-size:0.6rem;text-transform:uppercase;">Tipo</th>';
      html += '<th style="padding:0.45rem 0.5rem;text-align:right;color:#94a3b8;font-size:0.6rem;text-transform:uppercase;">Monto</th>';
      html += '</tr></thead><tbody>';
      movs.forEach((m, i) => {
        const teamData = getTeamById(torneo.teams, m.teamId);
        const teamName = teamData ? teamData.name : '—';
        const tipoInfo = getTipoInfo(m.type);
        const isIncome = (m.amount || 0) > 0;
        const sign = isIncome ? '+' : '';
        const color = isIncome ? '#4ade80' : '#f87171';
        const bg = i % 2 === 0 ? 'rgba(30,30,47,0.4)' : 'rgba(20,20,30,0.4)';
        html += `<tr style="background:${bg};border-bottom:1px solid #2d2d44;">`;
        html += `<td style="padding:0.4rem 0.5rem;font-size:0.65rem;color:#94a3b8;">${formatDate(m.date)}</td>`;
        html += `<td style="padding:0.4rem 0.5rem;color:#fff;font-weight:700;">${teamName}</td>`;
        html += `<td style="padding:0.4rem 0.5rem;color:#94a3b8;font-size:0.72rem;">${m.description || 'Sin descripción'}</td>`;
        html += `<td style="padding:0.4rem 0.5rem;text-align:center;color:#94a3b8;font-size:0.65rem;">${tipoInfo.icon} ${tipoInfo.label}</td>`;
        html += `<td style="padding:0.4rem 0.5rem;text-align:right;color:${color};font-weight:700;">${sign}${formatCurrency(m.amount || 0)}</td>`;
        html += '</tr>';
      });
      html += '</tbody></table>';
    }

    html += `<div style="margin-top:1rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>`;
    html = resolveCSSVars(html);
    showPrintModal(html, `economia_${movs.length}movs.jpg`, 1000);
    return true;
  });
}

function printEquipos() {
  if (!_acquirePrintLock()) return;
  const torneo = currentData;
  if (!torneo) { _releasePrintLock(); return alert('No hay equipos.'); }

  const teamOptions = torneo.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  let bodyHtml = `
    <div class="print-config-row">
      <label>¿Qué equipos imprimir?</label>
      <select id="print-eq-mode" class="print-top-input" style="width:auto;min-width:220px;">
        <option value="all">📋 Todos los equipos</option>
        <option value="one">🎯 Un equipo específico</option>
      </select>
    </div>
    <div class="print-config-row" id="print-eq-team-row" style="display:none;">
      <label>Equipo:</label>
      <select id="print-eq-team" class="print-top-input" style="width:auto;min-width:220px;">
        ${teamOptions}
      </select>
    </div>
    <div class="print-config-row">
      <label><input type="checkbox" id="print-eq-only-starters"> 🌟 Incluir solo titulares</label>
    </div>
    <div class="print-config-row" id="print-eq-count-row">
      <label>Cantidad de equipos:</label>
      <input type="number" id="print-eq-count" value="${torneo.teams.length}" min="1" max="${torneo.teams.length}" class="print-top-input">
    </div>
  `;

  const buildTeamPrintHtml = (team, onlyStarters) => {
    const titulares = team.players.filter(p => p.role === 'Titular 🌟' && p.name && p.name.trim() !== '');
    const suplentes = team.players.filter(p => p.role === 'Suplente 🔄' && p.name && p.name.trim() !== '');
    const reservas  = team.players.filter(p => p.role === 'Reserva 💤' && p.name && p.name.trim() !== '');
    const capitan = team.players.find(p => p.isCaptain);

    const renderSlot = (p) => {
      const s = p.seasonStats || {};
      const rankColor = getRankColor(p.rocketRank);
      const captainIcon = p.isCaptain ? '👑 ' : '';
      return `
        <div style="display:flex;flex-direction:column;gap:0.15rem;background:rgba(0,0,0,0.25);border:1px solid #2d2d44;border-left:3px solid ${p.isCaptain ? '#facc15' : (p.role === 'Titular 🌟' ? '#4ade80' : (p.role === 'Suplente 🔄' ? '#22d3ee' : '#94a3b8'))};border-radius:8px;padding:0.5rem 0.7rem;margin-bottom:0.3rem;">
          <div style="font-weight:700;font-size:0.78rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${captainIcon}${p.name}</div>
          <div style="font-size:0.62rem;color:${rankColor};font-weight:700;">${p.rocketRank} ${p.rocketRank !== 'SSL' ? p.division : ''}</div>
          <div style="display:flex;gap:0.6rem;font-size:0.65rem;color:#94a3b8;font-weight:600;">
            <span>⚽${s.goals||0}</span>
            <span>🎯${s.assists||0}</span>
            <span>🧤${s.saves||0}</span>
          </div>
        </div>
      `;
    };

    let slotsHtml = '';
    if (titulares.length) {
      slotsHtml += `<div style="font-size:0.58rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:0.5rem 0 0.3rem;display:flex;align-items:center;gap:0.35rem;"><span style="display:inline-block;width:3px;height:10px;background:#4ade80;border-radius:2px;"></span> Titulares</div>`;
      slotsHtml += titulares.map(renderSlot).join('');
    }
    if (!onlyStarters && suplentes.length) {
      slotsHtml += `<div style="font-size:0.58rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:0.5rem 0 0.3rem;display:flex;align-items:center;gap:0.35rem;"><span style="display:inline-block;width:3px;height:10px;background:#22d3ee;border-radius:2px;"></span> Suplentes</div>`;
      slotsHtml += suplentes.map(renderSlot).join('');
    }
    if (!onlyStarters && reservas.length) {
      slotsHtml += `<div style="font-size:0.58rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;margin:0.5rem 0 0.3rem;display:flex;align-items:center;gap:0.35rem;"><span style="display:inline-block;width:3px;height:10px;background:#94a3b8;border-radius:2px;"></span> Reservas</div>`;
      slotsHtml += reservas.map(renderSlot).join('');
    }

    let capitanHtml = capitan ? `<span style="color:#facc15;">👑 ${capitan.name}</span>` : '';
    return `
      <div style="background:rgba(20,20,30,0.7);border:1px solid #2d2d44;border-radius:14px;padding:1rem;margin-bottom:1rem;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:0.9rem;margin-bottom:0.6rem;padding-bottom:0.6rem;border-bottom:1px solid #2d2d44;">
          <img src="${team.shield || ''}" style="width:55px;height:55px;border-radius:50%;background:#000;border:2px solid #2d2d44;object-fit:contain;flex-shrink:0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:1.1rem;font-weight:900;color:#a855f7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${team.name}</div>
            <div style="display:flex;gap:0.8rem;font-size:0.7rem;color:#94a3b8;flex-wrap:wrap;margin-top:0.15rem;">
              <span>⚡ ATK ${team.atk||0}</span>
              <span>🛡️ DEF ${team.def||0}</span>
              <span>⭐ GLB ${team.glb||0}</span>
              <span>💰 ${formatCurrency(team.budget||0)}</span>
              ${capitanHtml}
            </div>
          </div>
        </div>
        ${slotsHtml}
      </div>
    `;
  };

  openPrintConfigModal('🛡️ Imprimir Equipos', bodyHtml, () => {
    const mode = document.getElementById('print-eq-mode').value;
    const onlyStarters = document.getElementById('print-eq-only-starters').checked;
    const count = parseInt(document.getElementById('print-eq-count').value) || torneo.teams.length;

    let teamsToPrint = [];
    if (mode === 'all') {
      teamsToPrint = torneo.teams.slice(0, count);
    } else {
      const teamId = document.getElementById('print-eq-team').value;
      const found = torneo.teams.find(t => t.id === teamId);
      if (found) teamsToPrint = [found];
    }

    if (!teamsToPrint.length) { alert('No hay equipos para imprimir.'); return false; }

    let html = getPrintHeader(`Equipos ${mode === 'all' ? '(' + teamsToPrint.length + ')' : ''}`);
    teamsToPrint.forEach(team => {
      html += buildTeamPrintHtml(team, onlyStarters);
    });
    html += `<div style="margin-top:1rem;font-size:0.55rem;color:#94a3b8;text-align:center;">${torneo.name} · Generado desde MTM Nexus</div>`;
    html = resolveCSSVars(html);

    const fname = mode === 'all'
      ? `equipos_${teamsToPrint.length}.jpg`
      : `equipo_${sanitizeForFilename(teamsToPrint[0].name)}.jpg`;
    showPrintModal(html, fname, 900);
    return true;
  });

  setTimeout(() => {
    const modeSel = document.getElementById('print-eq-mode');
    const teamRow = document.getElementById('print-eq-team-row');
    const countRow = document.getElementById('print-eq-count-row');
    if (modeSel && teamRow) {
      modeSel.addEventListener('change', () => {
        if (modeSel.value === 'one') {
          teamRow.style.display = 'flex';
          if (countRow) countRow.style.display = 'none';
        } else {
          teamRow.style.display = 'none';
          if (countRow) countRow.style.display = 'flex';
        }
      });
    }
  }, 30);
}

function printSanciones() {
  if (!_acquirePrintLock()) return;
  const container = document.querySelector('#section-sanciones .table-wrap');
  if (!container) { _releasePrintLock(); return alert('No hay sanciones.'); }
  const clone = container.cloneNode(true);
  let html = getPrintHeader('Sanciones') + clone.outerHTML;
  html = resolveCSSVars(html);
  showPrintModal(html, 'sanciones.jpg', 900);
}

function printSeleccion() {
  if (!_acquirePrintLock()) return;
  const container = document.querySelector('#section-seleccion .card');
  if (!container) { _releasePrintLock(); return alert('No hay selección.'); }
  const clone = container.cloneNode(true);
  let html = getPrintHeader('Selección Nacional') + clone.outerHTML;
  html = resolveCSSVars(html);
  showPrintModal(html, 'seleccion.jpg', 700);
}

function printAmistosos() {
  if (!_acquirePrintLock()) return;
  const container = document.querySelector('#section-amistosos');
  if (!container) { _releasePrintLock(); return alert('No hay amistosos.'); }
  const clone = container.cloneNode(true);
  let html = getPrintHeader('Partidos Amistosos') + clone.innerHTML;
  html = resolveCSSVars(html);
  showPrintModal(html, 'amistosos.jpg', 800);
}

function printSalon() {
  if (!_acquirePrintLock()) return;
  const container = document.querySelector('#section-salon');
  if (!container) { _releasePrintLock(); return alert('No hay salón.'); }
  const clone = container.cloneNode(true);
  let html = getPrintHeader('Salón de la Fama') + clone.innerHTML;
  html = resolveCSSVars(html);
  showPrintModal(html, 'salon_fama.jpg', 800);
}

// ==========================================
// EVENTOS / INICIO
// ==========================================
hamburgerBtn.addEventListener('click', function() {
  sidebar.classList.toggle('open');
});
document.addEventListener('click', function(e) {
  if (window.innerWidth <= 820) {
    if (!sidebar.contains(e.target) && e.target !== hamburgerBtn && !hamburgerBtn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const profileOverlay = document.getElementById('profile-modal-overlay');
    if (profileOverlay && profileOverlay.classList.contains('active')) {
      closePlayerProfile();
    }
    const advOverlay = document.getElementById('adv-search-overlay');
    if (advOverlay && advOverlay.classList.contains('active')) {
      closeAdvancedSearch();
    }
  }
});

loadAllData();