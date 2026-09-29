// ============================================================
// ZENITH CHAMPIONSHIP - VISUALIZER PATCH v1.0
// ============================================================
// · Estética premium: Negro + Plata + Dorado
// · Series nav en fase regular (modal con tabs por partida)
// · Play-In labels correctos en playoffs
// · Soporte de PIG dinámico (Performance con bajadas reales)
// · Balón de Oro con columnas ATK/DEF y flechas
// · Salón de la Fama navegable (por temporada)
// · Compatible con: playoffs-bracket-patch, player-history-patch,
//   team-card-patch
// ============================================================
// Carga DESPUÉS de todos los demás patches
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // 0. GUARDS
    // ============================================================
    if (typeof window.showMatchStats !== 'function') {
        console.error('[zenith-visual] script.js no cargado. Abortando.');
        return;
    }

    // ============================================================
    // 1. HELPERS
    // ============================================================
    function getCurrentData() {
        try {
            if (typeof currentData !== 'undefined' && currentData) return currentData;
        } catch (_) {}
        return window.currentData || null;
    }

    function setCurrentData(data) {
        try { currentData = data; } catch (_) {}
        window.currentData = data;
    }

    function isZenith(t) {
        t = t || getCurrentData();
        return !!(t && t.format === 'zenith');
    }

    function hasDynamicPIG(t) {
        t = t || getCurrentData();
        return !!(t && t.dynamicPIGEnabled === true);
    }

    function esc(s) {
        if (typeof s !== 'string') return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
        return s.replace(/[&<>"']/g, m => map[m]);
    }

    // ============================================================
    // 2. THEME (M1)
    // ============================================================
    const Z = {
        bg: '#0a0a0a', surface: '#141414', surfaceHover: '#1e1e1e',
        border: '#2a2a2a', text: '#e5e5e5', textMuted: '#a3a3a3',
        silver: '#c0c0c0', silverLight: '#e5e5e5', silverDark: '#525252',
        gold: '#d4af37', goldBright: '#f4d03f', goldDark: '#8b6914',
        white: '#ffffff', red: '#dc2626', green: '#16a34a',
        yellow: '#eab308', cyan: '#06b6d4', purple: '#9333ea'
    };

    function injectZenithTheme() {
        if (!isZenith()) return;
        const root = document.documentElement;
        root.style.setProperty('--color-bg', Z.bg);
        root.style.setProperty('--color-surface', Z.surface);
        root.style.setProperty('--color-surface-hover', Z.surfaceHover);
        root.style.setProperty('--color-text', Z.text);
        root.style.setProperty('--color-text-muted', Z.textMuted);
        root.style.setProperty('--color-border', Z.border);
        root.style.setProperty('--neon-purple', Z.gold);
        root.style.setProperty('--neon-cyan', Z.cyan);
        root.style.setProperty('--neon-yellow', Z.goldBright);
        root.style.setProperty('--neon-green', Z.green);
        root.style.setProperty('--neon-red', Z.red);
        document.body.classList.add('zenith-theme');
        injectZenithStyles();
    }

    function injectZenithStyles() {
        if (document.getElementById('zenith-visual-styles')) return;
        const style = document.createElement('style');
        style.id = 'zenith-visual-styles';
        style.textContent = `
body.zenith-theme { background: #0a0a0a; color: #e5e5e5; }
body.zenith-theme .sidebar { background: #050505 !important; border-right: 1px solid #2a2a2a !important; }
body.zenith-theme .sidebar-brand h1 {
    background: linear-gradient(135deg, #f4d03f 0%, #d4af37 30%, #e5e5e5 70%, #ffffff 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    font-weight: 900; letter-spacing: 0.08em;
}
body.zenith-theme .sidebar-brand small { color: #a3a3a3 !important; letter-spacing: 0.25em; }
body.zenith-theme .nav-item { color: #a3a3a3 !important; border-left-color: transparent; transition: all 0.2s; }
body.zenith-theme .nav-item:hover { color: #ffffff !important; background: rgba(212,175,55,0.08); }
body.zenith-theme .nav-item.active {
    color: #d4af37 !important; background: rgba(212,175,55,0.1);
    border-left-color: #d4af37 !important; box-shadow: inset 0 0 20px rgba(212,175,55,0.05);
}
body.zenith-theme .nav-item.active i { color: #d4af37 !important; }
body.zenith-theme .nav-item i { color: #737373 !important; }
body.zenith-theme .nav-divider { border-top-color: #1f1f1f !important; }
body.zenith-theme .nav-divider span { color: #737373 !important; letter-spacing: 0.3em; }
body.zenith-theme .section-title { color: #e5e5e5; font-weight: 900; text-shadow: 0 0 30px rgba(212,175,55,0.1); }
body.zenith-theme .section-title span, body.zenith-theme .neon-text {
    color: #d4af37 !important; text-shadow: 0 0 20px rgba(212,175,55,0.4);
    background: linear-gradient(135deg, #f4d03f, #d4af37);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
body.zenith-theme .card, body.zenith-theme .glass-card {
    background: linear-gradient(180deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%) !important;
    border-color: #2a2a2a !important; backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
body.zenith-theme .card:hover { border-color: rgba(212,175,55,0.4) !important; box-shadow: 0 8px 32px rgba(212,175,55,0.08); }
body.zenith-theme .card-header { color: #a3a3a3; border-bottom-color: #2a2a2a; letter-spacing: 0.2em; }
body.zenith-theme .table-wrap {
    background: rgba(10,10,10,0.6); border: 1px solid #2a2a2a; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
body.zenith-theme thead {
    background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%) !important;
    border-bottom: 2px solid rgba(212,175,55,0.3) !important;
}
body.zenith-theme thead th { color: #a3a3a3 !important; letter-spacing: 0.15em; font-weight: 900; }
body.zenith-theme tbody tr { border-bottom-color: rgba(42,42,42,0.5); }
body.zenith-theme tbody tr:hover { background: rgba(212,175,55,0.04); }
body.zenith-theme .btn-primary {
    background: linear-gradient(135deg, #d4af37 0%, #8b6914 100%);
    color: #0a0a0a; box-shadow: 0 4px 20px rgba(212,175,55,0.3);
    font-weight: 900; letter-spacing: 0.05em;
}
body.zenith-theme .btn-primary:hover {
    background: linear-gradient(135deg, #f4d03f 0%, #d4af37 100%);
    box-shadow: 0 6px 28px rgba(212,175,55,0.5); transform: translateY(-1px);
}
body.zenith-theme .btn-secondary {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    color: #e5e5e5; border: 1px solid #2a2a2a;
}
body.zenith-theme .btn-secondary:hover {
    border-color: #d4af37; color: #f4d03f;
    background: linear-gradient(135deg, #1f1f1f 0%, #141414 100%);
}
body.zenith-theme .podium-item { background: rgba(15,15,15,0.8); border-top: 2px solid #2a2a2a; }
body.zenith-theme .podium-item.first {
    background: linear-gradient(to top, rgba(212,175,55,0.2), rgba(15,15,15,0.9));
    border-color: #d4af37; box-shadow: 0 0 40px rgba(212,175,55,0.15);
}
body.zenith-theme .podium-item.second {
    background: linear-gradient(to top, rgba(192,192,192,0.1), rgba(15,15,15,0.9)); border-color: #c0c0c0;
}
body.zenith-theme .podium-item.third {
    background: linear-gradient(to top, rgba(205,127,50,0.1), rgba(15,15,15,0.9)); border-color: #cd7f32;
}
body.zenith-theme .match-stats-modal {
    background: linear-gradient(180deg, #141414 0%, #0a0a0a 100%);
    border: 1px solid #2a2a2a;
    box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(212,175,55,0.05);
}
body.zenith-theme .match-stats-score { color: #d4af37; text-shadow: 0 0 20px rgba(212,175,55,0.5); }
body.zenith-theme .tournament-card { background: linear-gradient(180deg, #141414 0%, #0a0a0a 100%); border: 2px solid #2a2a2a; }
body.zenith-theme .tournament-card:hover { border-color: #d4af37; box-shadow: 0 0 30px rgba(212,175,55,0.2); }
body.zenith-theme .tournament-card h3 { color: #e5e5e5; }
body.zenith-theme .tournament-card .badge.first { background: linear-gradient(135deg, #d4af37, #8b6914); color: #0a0a0a; }
body.zenith-theme .tournament-card .badge.second { background: linear-gradient(135deg, #e5e5e5, #a3a3a3); color: #0a0a0a; }
body.zenith-theme .hamburger { background: #141414; border: 1px solid #2a2a2a; color: #d4af37; }
body.zenith-theme .hamburger:hover { background: #1e1e1e; border-color: #d4af37; }
body.zenith-theme .section-title .print-btn:hover { background: #d4af37; color: #0a0a0a; }
body.zenith-theme .bg-surface { background: #141414 !important; }
body.zenith-theme .bg-surface_hover { background: #1e1e1e !important; }
body.zenith-theme .text-neon-cyan { color: #06b6d4 !important; }
body.zenith-theme .text-neon-pink { color: #d4af37 !important; }
body.zenith-theme .text-neon-yellow { color: #f4d03f !important; }
body.zenith-theme .text-neon-green { color: #16a34a !important; }
body.zenith-theme .text-neon-red { color: #dc2626 !important; }
body.zenith-theme header {
    border-bottom: 1px solid #2a2a2a;
    background: linear-gradient(180deg, rgba(10,10,10,0.95), rgba(15,15,15,0.95)) !important;
    backdrop-filter: blur(12px);
}
body.zenith-theme ::-webkit-scrollbar-thumb { background: #2a2a2a; }
body.zenith-theme ::-webkit-scrollbar-thumb:hover { background: #d4af37; }
body.zenith-theme .jornada-card { background: linear-gradient(180deg, #141414 0%, #0a0a0a 100%); border-color: #2a2a2a; }
body.zenith-theme .jornada-card:hover { border-color: rgba(212,175,55,0.3); }
body.zenith-theme .jornada-header { color: #ffffff; border-bottom-color: #2a2a2a; }
body.zenith-theme .jornada-score { color: #d4af37; background: rgba(0,0,0,0.6); border-color: rgba(212,175,55,0.2); }
body.zenith-theme .jornada-match-row:hover { background: rgba(212,175,55,0.03); }
body.zenith-theme .match-stats-table thead th.g { color: #16a34a; }
body.zenith-theme .match-stats-table thead th.a { color: #06b6d4; }
body.zenith-theme .match-stats-table thead th.s { color: #d4af37; }
body.zenith-theme .match-stats-table thead th.t { color: #f4d03f; }

.zenith-header-brand { display: flex; align-items: center; gap: 0.85rem; }
.zenith-header-brand .logo-triangle {
    width: 38px; height: 38px;
    background: linear-gradient(135deg, #e5e5e5 0%, #a3a3a3 50%, #525252 100%);
    clip-path: polygon(50% 0%, 100% 85%, 92% 85%, 50% 20%, 8% 85%, 0% 85%);
    filter: drop-shadow(0 0 10px rgba(212,175,55,0.35));
}
.zenith-title-container { display: flex; flex-direction: column; line-height: 1.1; }
.zenith-title-main {
    font-family: 'Montserrat', sans-serif; font-size: 1rem; font-weight: 900;
    letter-spacing: 0.25em; text-transform: uppercase;
    background: linear-gradient(135deg, #f4d03f 0%, #d4af37 30%, #e5e5e5 70%, #ffffff 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.zenith-title-sub {
    font-family: 'Inter', sans-serif; font-size: 0.6rem; font-weight: 700;
    letter-spacing: 0.3em; color: #a3a3a3; text-transform: uppercase; margin-top: 0.15rem;
}

.zenith-table-col-gold { color: #d4af37 !important; font-weight: 900 !important; text-shadow: 0 0 8px rgba(212,175,55,0.2); }
.zenith-table-col-silver { color: #c0c0c0 !important; font-weight: 700 !important; }
.zenith-table-header-gold { color: #d4af37 !important; border-bottom: 2px solid rgba(212,175,55,0.4) !important; }

.zenith-series-tabs {
    display: flex; flex-wrap: wrap; gap: 0.4rem;
    padding: 0.75rem 1rem; border-bottom: 1px solid #2a2a2a; background: rgba(0,0,0,0.3);
}
.zenith-series-tab {
    padding: 0.4rem 0.9rem; border-radius: 8px;
    background: transparent; border: 1px solid #2a2a2a; color: #a3a3a3;
    font-weight: 900; font-size: 0.7rem; text-transform: uppercase;
    letter-spacing: 0.05em; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.zenith-series-tab:hover { color: #ffffff; border-color: rgba(212,175,55,0.5); }
.zenith-series-tab.active {
    background: linear-gradient(135deg, #d4af37, #8b6914);
    color: #0a0a0a; border-color: #d4af37; box-shadow: 0 0 16px rgba(212,175,55,0.4);
}
.zenith-series-tab.aggregate {
    background: rgba(6,182,212,0.1); color: #06b6d4; border-color: rgba(6,182,212,0.3);
}
.zenith-series-tab.aggregate.active {
    background: #06b6d4; color: #0a0a0a; box-shadow: 0 0 16px rgba(6,182,212,0.4);
}

.zenith-hall-card {
    background: linear-gradient(180deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%);
    border: 1px solid #2a2a2a; border-radius: 16px; padding: 1rem;
    margin-bottom: 1rem; cursor: pointer; transition: all 0.2s;
}
.zenith-hall-card:hover {
    border-color: #d4af37; box-shadow: 0 0 30px rgba(212,175,55,0.15); transform: translateY(-2px);
}
.zenith-hall-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.zenith-hall-title {
    font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 1rem;
    color: #d4af37; letter-spacing: 0.05em; text-transform: uppercase;
}
.zenith-hall-date { font-size: 0.7rem; color: #a3a3a3; }
.zenith-hall-champion {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.5rem 0.75rem; background: rgba(212,175,55,0.08);
    border-left: 3px solid #d4af37; border-radius: 8px; margin-bottom: 0.5rem;
}
.zenith-hall-champion img {
    width: 32px; height: 32px; border-radius: 50%; background: #000;
    object-fit: contain; border: 2px solid #d4af37;
}
.zenith-hall-champion .name { font-weight: 900; color: #ffffff; font-size: 0.9rem; }
.zenith-hall-champion .stat { font-size: 0.7rem; color: #d4af37; font-weight: 700; }
.zenith-hall-dreamteam { display: flex; gap: 0.6rem; flex-wrap: wrap; font-size: 0.7rem; color: #a3a3a3; }

.zenith-return-banner {
    background: linear-gradient(90deg, #8b6914 0%, #d4af37 50%, #8b6914 100%);
    color: #0a0a0a; padding: 0.6rem 1rem; border-radius: 8px;
    font-weight: 900; font-size: 0.75rem; letter-spacing: 0.1em;
    text-transform: uppercase; display: flex; align-items: center;
    justify-content: space-between; gap: 1rem; margin-bottom: 1rem;
    box-shadow: 0 4px 20px rgba(212,175,55,0.3);
}
.zenith-return-banner button {
    background: rgba(0,0,0,0.3); color: #0a0a0a; border: 2px solid #0a0a0a;
    padding: 0.35rem 0.9rem; border-radius: 6px; font-weight: 900;
    cursor: pointer; font-size: 0.7rem; letter-spacing: 0.05em;
    text-transform: uppercase; transition: all 0.15s; font-family: inherit;
}
.zenith-return-banner button:hover { background: #0a0a0a; color: #d4af37; }
`;
        document.head.appendChild(style);
    }

    function injectZenithHeader() {
        if (!isZenith()) return;
        const headerInfo = document.querySelector('header .header-info');
        if (!headerInfo) return;
        if (headerInfo.dataset.zenithStyled === 'true') return;
        headerInfo.dataset.zenithStyled = 'true';
        const indicators = headerInfo.querySelector('#header-indicators');
        const t = getCurrentData();
        const tournamentName = t ? t.name : '';
        headerInfo.innerHTML = `
            <div class="zenith-header-brand">
                <div class="logo-triangle"></div>
                <div class="zenith-title-container">
                    <div class="zenith-title-main">ZENITH CHAMPIONSHIP</div>
                    <div class="zenith-title-sub">${esc(tournamentName)}</div>
                </div>
            </div>
        `;
        if (indicators) headerInfo.appendChild(indicators);
    }

    function applyTableZenithStyles() {
        if (!isZenith()) return;
        const table = document.querySelector('#tabla-general-container table');
        if (!table) return;
        const thead = table.querySelector('thead');
        if (thead) {
            thead.querySelectorAll('th').forEach(th => {
                const txt = th.textContent.trim().toUpperCase();
                if (txt === 'PTS' || txt === 'SG' || txt === 'DP') {
                    th.classList.add('zenith-table-header-gold');
                }
            });
        }
        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(row => {
                const tds = row.querySelectorAll('td');
                if (tds.length >= 10) {
                    if (tds[2]) tds[2].classList.add('zenith-table-col-gold');
                    if (tds[4]) tds[4].classList.add('zenith-table-col-gold');
                    if (tds[6]) tds[6].classList.add('zenith-table-col-gold');
                }
            });
        }
    }

    // ============================================================
    // 3. SERIES NAV (M2)
    // ============================================================
    const _origShowMatchStats = window.showMatchStats;

    window.showMatchStats = function (matchId) {
        const t = getCurrentData();
        if (!t) return;
        let match = null;
        for (const round of (t.rounds || [])) {
            match = round.find(m => m.id === matchId);
            if (match) break;
        }
        if (!match) {
            for (const fm of (t.friendlyMatches || [])) {
                if (fm.id === matchId) { match = fm; break; }
            }
        }
        if (!match || !match.box || !match.box.enabled) {
            return _origShowMatchStats.call(this, matchId);
        }
        buildBoxSeriesModal(match, t);
    };

    function buildBoxSeriesModal(match, torneo) {
        const h = torneo.teams.find(x => x.id === match.h);
        const a = torneo.teams.find(x => x.id === match.a);
        const hName = h ? h.name : 'Desconocido';
        const aName = a ? a.name : 'Desconocido';
        const hShield = h ? h.shield : '';
        const aShield = a ? a.shield : '';
        const box = match.box || {};
        const games = box.games || [];
        const winsH = box.winsH || 0;
        const winsA = box.winsA || 0;
        const boxLabel = box.label || '';

        const modalHtml = `
            <div class="print-modal-overlay" id="zenith-series-modal" onclick="if(event.target===this) this.remove()">
                <div class="match-stats-modal" style="max-width: 900px;">
                    <div class="match-stats-header">
                        <div class="team-block ${winsH > winsA ? 'winner' : ''}">
                            <img src="${hShield}" alt="">
                            <div class="team-name">${esc(hName)}</div>
                        </div>
                        <div class="match-stats-score">${winsH} - ${winsA}</div>
                        <div class="team-block ${winsA > winsH ? 'winner' : ''}">
                            <img src="${aShield}" alt="">
                            <div class="team-name">${esc(aName)}</div>
                        </div>
                    </div>
                    <div class="text-center font-black uppercase tracking-widest mt-2" style="color:#d4af37;font-size:0.75rem;">
                        Serie ${boxLabel} · ${games.length} partida(s)
                    </div>
                    <div class="zenith-series-tabs" id="zenith-series-tabs">
                        ${games.map((g, i) => `
                            <button class="zenith-series-tab ${i === 0 ? 'active' : ''}" data-game-idx="${i}">
                                P${i + 1} · ${g.sH}-${g.sA}
                            </button>
                        `).join('')}
                        <button class="zenith-series-tab aggregate" data-game-idx="agg">Σ Suma Total</button>
                    </div>
                    <div id="zenith-series-stats-body" class="match-stats-body">
                        ${buildSeriesStatsBody(match, torneo, 0)}
                    </div>
                    <div class="match-stats-actions">
                        <button class="btn-cancel" onclick="document.getElementById('zenith-series-modal').remove()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        document.querySelectorAll('#zenith-series-modal').forEach(el => el.remove());
        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHtml;
        document.body.appendChild(wrapper);
        wrapper.querySelectorAll('#zenith-series-tabs .zenith-series-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                wrapper.querySelectorAll('#zenith-series-tabs .zenith-series-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const idx = tab.dataset.gameIdx;
                const body = document.getElementById('zenith-series-stats-body');
                if (body) body.innerHTML = buildSeriesStatsBody(match, torneo, idx);
            });
        });
    }

    function buildSeriesStatsBody(match, torneo, gameIdx) {
        const h = torneo.teams.find(x => x.id === match.h);
        const a = torneo.teams.find(x => x.id === match.a);
        const box = match.box || {};
        const games = box.games || [];
        let statsArray = [];
        let label = '';
        if (gameIdx === 'agg') {
            statsArray = match.stats || [];
            label = 'Σ Suma total de la serie';
        } else {
            const game = games[gameIdx];
            statsArray = (game && game.stats) || [];
            label = game ? `Partido ${gameIdx + 1} · ${game.sH}-${game.sA}` : '';
        }
        const hStats = statsArray.filter(s => s.tId === match.h);
        const aStats = statsArray.filter(s => s.tId === match.a);
        const renderTeamTable = (team, statsArr) => {
            if (!team) return `<div class="match-stats-team"><h4>Sin equipo</h4></div>`;
            const active = statsArr.filter(s => (s.g || 0) > 0 || (s.a || 0) > 0 || (s.s || 0) > 0 || (s.t || 0) > 0);
            if (!active.length) {
                return `<div class="match-stats-team ${team.id === match.h ? 'home' : 'away'}">
                    <h4>🛡️ ${esc(team.name)}</h4>
                    <table class="match-stats-table"><tbody><tr><td class="empty" colspan="5">Sin estadísticas</td></tr></tbody></table>
                </div>`;
            }
            let rows = '';
            active.forEach(st => {
                const p = team.players.find(x => x.id === st.pId);
                const name = p ? p.name : '?';
                const captain = p && p.isCaptain ? '👑 ' : '';
                rows += `<tr>
                    <td>${captain}${esc(name)}</td>
                    <td class="g">${st.g || 0}</td>
                    <td class="a">${st.a || 0}</td>
                    <td class="s">${st.s || 0}</td>
                    <td class="t">${st.t || 0}</td>
                </tr>`;
            });
            return `<div class="match-stats-team ${team.id === match.h ? 'home' : 'away'}">
                <h4>🛡️ ${esc(team.name)}</h4>
                <table class="match-stats-table">
                    <thead><tr>
                        <th>Jugador</th><th class="g">⚽ G</th><th class="a">🎯 A</th>
                        <th class="s">🧤 S</th><th class="t">💀 T</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        };
        return `
            <div style="text-align:center;padding:0.5rem;color:#d4af37;font-weight:900;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;">${label}</div>
            <div class="match-stats-body">
                ${renderTeamTable(h, hStats)}
                ${renderTeamTable(a, aStats)}
            </div>
        `;
    }

    // ============================================================
    // 4. PLAY-IN LABELS (M3)
    // ============================================================
    function renamePlayInRound() {
        const t = getCurrentData();
        if (!t || !t.playoffs || !t.playoffs.playIn) return;
        if (!t.playoffs.rounds || !t.playoffs.rounds.length) return;
        const roundHeaders = document.querySelectorAll('.mb-round-header');
        if (roundHeaders.length === 0) return;
        const firstHeader = roundHeaders[0];
        if (firstHeader && firstHeader.textContent.trim().toUpperCase() !== 'PLAY-IN') {
            firstHeader.textContent = 'PLAY-IN';
            firstHeader.style.color = '#eab308';
            firstHeader.style.borderBottomColor = 'rgba(234,179,8,0.4)';
            firstHeader.style.textShadow = '0 0 12px rgba(234,179,8,0.3)';
        }
        if (roundHeaders.length >= 2) {
            const totalAfter = roundHeaders.length - 1;
            for (let i = 1; i < roundHeaders.length; i++) {
                const idx = i - 1;
                let label = '';
                if (totalAfter === 1) label = 'Final';
                else if (totalAfter === 2) label = idx === 0 ? 'Semis' : 'Final';
                else if (totalAfter === 3) label = ['Cuartos', 'Semis', 'Final'][idx];
                else if (totalAfter === 4) label = ['Octavos', 'Cuartos', 'Semis', 'Final'][idx];
                else label = 'R' + (idx + 1);
                if (roundHeaders[i].textContent.trim() !== label) roundHeaders[i].textContent = label;
            }
        }
    }

    // ============================================================
    // 5. DYNAMIC PIG SUPPORT (M4)
    // ============================================================
    if (typeof window.calculatePlayerMarketValueHistory === 'function') {
        const _origCalcMarketHistory = window.calculatePlayerMarketValueHistory;
        window.calculatePlayerMarketValueHistory = function (playerId, torneo) {
            const t = torneo || getCurrentData();
            if (!t) return [];
            let player = null;
            for (const tm of (t.teams || [])) {
                const found = tm.players.find(p => p.id === playerId);
                if (found) { player = found; break; }
            }
            if (!player && t.freeAgents) player = t.freeAgents.find(p => p.id === playerId);
            if (player && Array.isArray(player.valueHistory) && player.valueHistory.length > 0) {
                return player.valueHistory.map(v => ({
                    label: `J${(v.round || 0) + 1}`,
                    marketValue: v.value || 0,
                    pig: v.pig || 0,
                    roundIdx: v.round || 0,
                    hasData: true
                }));
            }
            return _origCalcMarketHistory.call(this, playerId, torneo);
        };
    }

    // ============================================================
    // 6. BALÓN DE ORO CON ATK/DEF (M5)
    // ============================================================
    function upgradeBdorTable() {
        const t = getCurrentData();
        if (!t || !hasDynamicPIG(t)) return;
        let hasDynamic = false;
        for (const tm of (t.teams || [])) {
            for (const p of (tm.players || [])) {
                if (p.pigDynamic !== undefined) { hasDynamic = true; break; }
            }
            if (hasDynamic) break;
        }
        if (!hasDynamic) return;
        const bdorSection = document.querySelector('#section-balon');
        if (!bdorSection) return;
        const table = bdorSection.querySelector('table');
        if (!table || table.dataset.zenithUpgraded === 'true') return;
        table.dataset.zenithUpgraded = 'true';
        const thead = table.querySelector('thead tr');
        if (thead) {
            const ths = Array.from(thead.querySelectorAll('th'));
            let pigIdx = -1;
            ths.forEach((th, i) => {
                if (th.textContent.toUpperCase().includes('PIG')) pigIdx = i;
            });
            if (pigIdx > 0) {
                const atkTh = document.createElement('th');
                atkTh.textContent = 'ATK';
                atkTh.style.cssText = 'text-align:center;color:#06b6d4;font-weight:900;';
                const defTh = document.createElement('th');
                defTh.textContent = 'DEF';
                defTh.style.cssText = 'text-align:center;color:#d4af37;font-weight:900;';
                ths[pigIdx].insertAdjacentElement('beforebegin', atkTh);
                ths[pigIdx].insertAdjacentElement('beforebegin', defTh);
            }
        }
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        tbody.querySelectorAll('tr').forEach(row => {
            const tds = row.querySelectorAll('td');
            if (tds.length < 3) return;
            const nameCell = row.querySelector('td:nth-child(2)');
            if (!nameCell) return;
            const playerName = nameCell.textContent.replace(/[👑🆓↪]/g, '').trim();
            let playerObj = null;
            for (const tm of (t.teams || [])) {
                const found = tm.players.find(p => p.name.trim() === playerName);
                if (found) { playerObj = found; break; }
            }
            const atk = playerObj && playerObj.atkDynamic !== undefined ? playerObj.atkDynamic : '-';
            const def = playerObj && playerObj.defDynamic !== undefined ? playerObj.defDynamic : '-';
            const trend = playerObj && playerObj.pigTrend ? playerObj.pigTrend : '';
            const lastTd = tds[tds.length - 1];
            const atkTd = document.createElement('td');
            atkTd.textContent = typeof atk === 'number' ? atk.toFixed(0) : atk;
            atkTd.style.cssText = 'text-align:center;color:#06b6d4;font-weight:900;';
            const defTd = document.createElement('td');
            defTd.textContent = typeof def === 'number' ? def.toFixed(0) : def;
            defTd.style.cssText = 'text-align:center;color:#d4af37;font-weight:900;';
            if (trend && lastTd) {
                const trendSpan = document.createElement('span');
                trendSpan.textContent = ' ' + trend;
                const color = trend === '▲' ? '#16a34a' : (trend === '▼' ? '#dc2626' : '#a3a3a3');
                trendSpan.style.cssText = `color:${color};font-weight:900;margin-left:0.3rem;`;
                lastTd.appendChild(trendSpan);
            }
            if (lastTd) {
                lastTd.insertAdjacentElement('beforebegin', atkTd);
                lastTd.insertAdjacentElement('beforebegin', defTd);
            }
        });
    }

    // ============================================================
    // 7. HALL OF FAME COMPLETO (M6)
    // ============================================================
    let zenithSeasonView = null;
    let _savedCurrentData = null;

    function upgradeHallOfFame() {
        const t = getCurrentData();
        if (!t) return;
        const container = document.querySelector('#section-salon');
        if (!container) return;
        const content = container.querySelector('#hall-content');
        if (!content) return;
        const originalTorneo = zenithSeasonView ? _savedCurrentData : t;
        if (!originalTorneo.seasons || originalTorneo.seasons.length === 0) return;
        if (content.dataset.zenithUpgraded === 'true' && !zenithSeasonView) return;
        content.dataset.zenithUpgraded = 'true';
        let html = '';
        if (zenithSeasonView) {
            const championName = getChampionName(zenithSeasonView);
            html += `
                <div class="zenith-return-banner">
                    <span>📖 Viendo: ${esc(zenithSeasonView.name)} — Campeón: ${esc(championName)}</span>
                    <button onclick="window.ZenithReturnToCurrent()">← Volver a temporada actual</button>
                </div>
            `;
        }
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem;">`;
        originalTorneo.seasons.slice().reverse().forEach((season, idx) => {
            const realIdx = originalTorneo.seasons.length - 1 - idx;
            const champion = season.champion ? (season.teams || []).find(tm => tm.id === season.champion) : null;
            const dreamTeam = season.dreamTeam || {};
            const date = new Date(season.date).toLocaleDateString('es-MX');
            html += `
                <div class="zenith-hall-card" onclick="window.ZenithNavigateToSeason(${realIdx})">
                    <div class="zenith-hall-header">
                        <div class="zenith-hall-title">${esc(season.name)}</div>
                        <div class="zenith-hall-date">${date}</div>
                    </div>
                    ${champion ? `
                        <div class="zenith-hall-champion">
                            <img src="${champion.shield || ''}" alt="">
                            <div>
                                <div class="name">🏆 ${esc(champion.name)}</div>
                                <div class="stat">${champion.pts || 0} pts</div>
                            </div>
                        </div>
                    ` : ''}
                    ${dreamTeam.goleador || dreamTeam.asistidor || dreamTeam.portero ? `
                        <div class="zenith-hall-dreamteam">
                            ${dreamTeam.goleador ? `<span>⚽ ${esc(dreamTeam.goleador.name)}</span>` : ''}
                            ${dreamTeam.asistidor ? `<span>🎯 ${esc(dreamTeam.asistidor.name)}</span>` : ''}
                            ${dreamTeam.portero ? `<span>🧤 ${esc(dreamTeam.portero.name)}</span>` : ''}
                        </div>
                    ` : ''}
                    <div style="margin-top:0.75rem;text-align:right;">
                        <span style="font-size:0.65rem;color:#d4af37;font-weight:900;letter-spacing:0.1em;">VER TEMPORADA →</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        content.innerHTML = html;
    }

    function getChampionName(season) {
        if (!season.champion) return '—';
        const team = (season.teams || []).find(tm => tm.id === season.champion);
        return team ? team.name : '—';
    }

    window.ZenithNavigateToSeason = function (seasonIdx) {
        const currentTorneo = zenithSeasonView ? _savedCurrentData : getCurrentData();
        if (!currentTorneo || !currentTorneo.seasons || !currentTorneo.seasons[seasonIdx]) return;
        if (!zenithSeasonView) _savedCurrentData = currentTorneo;
        const season = currentTorneo.seasons[seasonIdx];
        zenithSeasonView = season;
        const pseudoTorneo = {
            ..._savedCurrentData,
            name: _savedCurrentData.name + ' · ' + season.name,
            teams: season.teams,
            rounds: season.rounds || [],
            playoffs: season.playoffs || null,
            friendlyMatches: season.friendlyMatches || [],
            economyLogs: season.economyLogs || [],
            sanctionsLog: season.sanctionsLog || [],
            tableConfig: season.tableConfig || _savedCurrentData.tableConfig,
            zenithConfig: season.zenithConfig || _savedCurrentData.zenithConfig,
            dynamicPIGEnabled: season.dynamicPIGEnabled || false,
            seasons: _savedCurrentData.seasons,
            _isHistoricalView: true,
            _originalData: _savedCurrentData
        };
        setCurrentData(pseudoTorneo);
        if (typeof window.applyData === 'function') {
            window.applyData(pseudoTorneo);
        } else if (typeof window.buildUI === 'function') {
            window.buildUI(pseudoTorneo);
            if (typeof window.switchView === 'function') window.switchView('salon');
        }
        setTimeout(() => {
            upgradeHallOfFame();
            injectZenithHeader();
        }, 150);
    };

    window.ZenithReturnToCurrent = function () {
        if (!_savedCurrentData) return;
        zenithSeasonView = null;
        const restore = _savedCurrentData;
        _savedCurrentData = null;
        setCurrentData(restore);
        if (typeof window.applyData === 'function') {
            window.applyData(restore);
        } else if (typeof window.buildUI === 'function') {
            window.buildUI(restore);
            if (typeof window.switchView === 'function') window.switchView('salon');
        }
        setTimeout(() => {
            upgradeHallOfFame();
            injectZenithHeader();
        }, 150);
    };

    // ============================================================
    // 8. INIT
    // ============================================================
    function observeViews() {
        const observer = new MutationObserver(() => {
            applyTableZenithStyles();
            renamePlayInRound();
            upgradeBdorTable();
            upgradeHallOfFame();
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    function init() {
        injectZenithTheme();
        injectZenithHeader();
        observeViews();
        setInterval(() => {
            if (isZenith()) {
                const hi = document.querySelector('header .header-info');
                if (hi && hi.dataset.zenithStyled !== 'true') injectZenithHeader();
                applyTableZenithStyles();
            }
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
    } else {
        setTimeout(init, 300);
    }

    // ============================================================
    // 9. PUBLIC API
    // ============================================================
    window.ZenithVisualPatch = {
        isZenith: isZenith,
        hasDynamicPIG: hasDynamicPIG,
        refresh: () => {
            applyTableZenithStyles();
            renamePlayInRound();
            upgradeBdorTable();
            upgradeHallOfFame();
        },
        getViewingSeason: () => zenithSeasonView
    };

    console.log('✅ Zenith Visual Patch v1.0 cargado');
})();