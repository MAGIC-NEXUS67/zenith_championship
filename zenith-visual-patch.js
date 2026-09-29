// ============================================================
// ZENITH CHAMPIONSHIP - VISUALIZER PATCH v1.1
// ============================================================
// Correcciones v1.1:
//   - FIX: isZenith() detecta format zenith O zenithConfig.enabled
//   - FIX: Series nav con HTML/CSS idéntico al de playoffs
//   - FIX: Performance recalcula PIG dinámico desde partidos
//   - FIX: Podio Balón de Oro con ATK/DEF + flechas
//   - FIX: Navegación del Salón de la Fama funcional
//   - FIX: Banner "Volver" en header
// ============================================================
// Carga DESPUÉS de todos los demás patches del visualizador
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
        if (!t) return false;
        if (t.format === 'zenith') return true;
        if (t.zenithConfig && t.zenithConfig.enabled === true) return true;
        return false;
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

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    // ============================================================
    // 2. PALETA
    // ============================================================
    const Z = {
        bg: '#0a0a0a', surface: '#141414', surfaceHover: '#1e1e1e',
        border: '#2a2a2a', text: '#e5e5e5', textMuted: '#a3a3a3',
        silver: '#c0c0c0', silverLight: '#e5e5e5', silverDark: '#525252',
        gold: '#d4af37', goldBright: '#f4d03f', goldDark: '#8b6914',
        white: '#ffffff', red: '#dc2626', green: '#16a34a',
        yellow: '#eab308', cyan: '#06b6d4', purple: '#9333ea'
    };

    // ============================================================
    // M1 — THEME
    // ============================================================
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
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.6rem; padding: 0.4rem 0.9rem; border-radius: 8px;
    background: linear-gradient(90deg, #8b6914 0%, #d4af37 50%, #8b6914 100%);
    color: #0a0a0a; font-weight: 900; font-size: 0.7rem;
    letter-spacing: 0.08em; text-transform: uppercase;
    box-shadow: 0 4px 20px rgba(212,175,55,0.35);
}
.zenith-return-banner button {
    background: rgba(0,0,0,0.35); color: #0a0a0a; border: 2px solid #0a0a0a;
    padding: 0.25rem 0.7rem; border-radius: 6px; font-weight: 900;
    cursor: pointer; font-size: 0.65rem; letter-spacing: 0.05em;
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
        headerInfo.dataset.zenithStyled = 'true';
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
    // M2 — SERIES NAV (idéntico al de playoffs)
    // ============================================================
    function buildSeriesModal(match, torneo) {
        const h = torneo.teams.find(x => x.id === match.h);
        const a = torneo.teams.find(x => x.id === match.a);
        const box = match.box || {};
        const games = box.games || [];
        const winsH = box.winsH || 0;
        const winsA = box.winsA || 0;
        const boxLabel = box.label || '';
        const hWinner = winsH > winsA;
        const aWinner = winsA > winsH;

        const tabsHtml = games.map((g, i) => {
            const isActive = i === 0;
            return `<button class="pbx-tab ${isActive ? 'active' : ''}" data-game-idx="${i}" onclick="window.ZenithSeriesNav.selectGame(${i})">Partido ${i + 1} · ${g.sH}-${g.sA}</button>`;
        }).join('');
        const aggTab = `<button class="pbx-tab aggregate" data-game-idx="agg" onclick="window.ZenithSeriesNav.selectGame('agg')">Σ Suma Total</button>`;

        const modalHtml = `
            <div class="pbx-modal-overlay" id="zenith-series-overlay" onclick="if(event.target===this) window.ZenithSeriesNav.close()">
                <div class="pbx-modal">
                    <div class="match-stats-header">
                        <div class="team-block ${hWinner ? 'winner' : ''}">
                            <img src="${h ? h.shield : ''}" alt="">
                            <div class="team-name">${h ? esc(h.name) : 'TBD'}</div>
                        </div>
                        <div class="match-stats-score">${winsH} - ${winsA}</div>
                        <div class="team-block ${aWinner ? 'winner' : ''}">
                            <img src="${a ? a.shield : ''}" alt="">
                            <div class="team-name">${a ? esc(a.name) : 'TBD'}</div>
                        </div>
                    </div>
                    <div class="pbx-match-series-label">SERIE ${boxLabel} · ${games.length} partida(s)</div>
                    <div class="pbx-modal-tabs">
                        ${tabsHtml}
                        ${aggTab}
                    </div>
                    <div id="zenith-series-body" class="pbx-modal-stats-body">
                        ${buildSeriesStatsHtml(match, torneo, 0)}
                    </div>
                    <div class="match-stats-actions">
                        <button class="btn-cancel" onclick="window.ZenithSeriesNav.close()">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        document.querySelectorAll('#zenith-series-overlay').forEach(el => el.remove());
        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHtml;
        document.body.appendChild(wrapper);
    }

    function buildSeriesStatsHtml(match, torneo, gameIdx) {
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
            <div class="pbx-stats-label">${label}</div>
            <div class="match-stats-body">
                ${renderTeamTable(h, hStats)}
                ${renderTeamTable(a, aStats)}
            </div>
        `;
    }

    window.ZenithSeriesNav = {
        _match: null,
        _torneo: null,
        open: function (match, torneo) {
            window.ZenithSeriesNav._match = match;
            window.ZenithSeriesNav._torneo = torneo;
            buildSeriesModal(match, torneo);
        },
        selectGame: function (idx) {
            const match = window.ZenithSeriesNav._match;
            const torneo = window.ZenithSeriesNav._torneo;
            if (!match || !torneo) return;
            document.querySelectorAll('#zenith-series-overlay .pbx-tab').forEach(tab => {
                const tabIdx = tab.dataset.gameIdx;
                const isActive = (tabIdx === 'agg') ? (idx === 'agg') : (parseInt(tabIdx) === idx);
                tab.classList.toggle('active', isActive);
            });
            const body = document.getElementById('zenith-series-body');
            if (body) body.innerHTML = buildSeriesStatsHtml(match, torneo, idx);
        },
        close: function () {
            document.querySelectorAll('#zenith-series-overlay').forEach(el => el.remove());
            window.ZenithSeriesNav._match = null;
            window.ZenithSeriesNav._torneo = null;
        }
    };

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
        window.ZenithSeriesNav.open(match, t);
    };

    // ============================================================
    // M3 — PLAY-IN LABELS
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
    // M4 — DYNAMIC PIG (recalculado desde partidos)
    // ============================================================
    function calculateDynamicPigHistory(playerId, torneo) {
        if (typeof window.getPlayoffLabels !== 'function') return [];
        const labels = window.getPlayoffLabels(torneo);
        const history = [];

        let player = null, team = null;
        for (const tm of (torneo.teams || [])) {
            const found = tm.players.find(p => p.id === playerId);
            if (found) { player = found; team = tm; break; }
        }
        if (!player || !team) return [];

        let accStats = { goals: 0, assists: 0, saves: 0, shots: 0, matches: 0 };
        let teamGoalsAgainst = 0;
        let pigPerMatchHistory = [];
        let pigDynamic = 50;
        let pigTrend = '—';

        labels.forEach((label, idx) => {
            let roundGoals = 0, roundAssists = 0, roundSaves = 0, roundShots = 0, roundMatches = 0;
            let roundTeamGA = 0;

            const processMatch = (m) => {
                if (!m || !m.played) return;
                const isHome = m.h === team.id;
                const isAway = m.a === team.id;
                if (!isHome && !isAway) return;
                roundMatches++;
                roundTeamGA += isHome ? (m.sA || 0) : (m.sH || 0);
                const stat = (m.stats || []).find(s => s.pId === playerId);
                if (stat) {
                    roundGoals += stat.g || 0;
                    roundAssists += stat.a || 0;
                    roundSaves += stat.s || 0;
                    roundShots += stat.t || 0;
                }
            };

            if (label.type === 'liguilla') {
                const round = torneo.rounds?.[label.round];
                if (round) round.forEach(processMatch);
            } else if (label.type === 'playoff') {
                const round = torneo.playoffs?.rounds?.[label.round];
                if (round) round.forEach(processMatch);
            }

            accStats.goals += roundGoals;
            accStats.assists += roundAssists;
            accStats.saves += roundSaves;
            accStats.shots += roundShots;
            accStats.matches += roundMatches;
            teamGoalsAgainst += roundTeamGA;

            const matchesCount = Math.max(1, accStats.matches);

            // Streak factor
            let streakFactor = 1.0;
            if (pigPerMatchHistory.length >= 3) {
                const last5 = pigPerMatchHistory.slice(-5);
                const recentAvg = last5.reduce((a, b) => a + b, 0) / last5.length;
                const globalAvg = pigPerMatchHistory.reduce((a, b) => a + b, 0) / pigPerMatchHistory.length;
                if (globalAvg > 0) streakFactor = clamp(recentAvg / globalAvg, 0.5, 1.5);
            }

            // ATK
            let atkBase = 50;
            if (accStats.shots === 0 && accStats.goals === 0) atkBase = 50;
            else if (accStats.shots === 0) atkBase = 70;
            else {
                const conversion = accStats.goals / accStats.shots;
                const volume = Math.min(accStats.shots / matchesCount, 10) / 10;
                atkBase = 50 + (conversion * 30) + (volume * 20);
            }

            // DEF
            let defBase;
            if (accStats.saves === 0) {
                const teamDefQuality = clamp((team.def || 50) / 500, 0, 1);
                defBase = 30 + (teamDefQuality * 40);
            } else {
                const saveRate = accStats.saves / (accStats.saves + teamGoalsAgainst);
                const saveVolume = Math.min(accStats.saves / matchesCount, 10) / 10;
                defBase = 50 + (saveRate * 30) + (saveVolume * 20);
            }

            const atk = clamp(atkBase * streakFactor, 10, 99);
            const def = clamp(defBase * streakFactor, 10, 99);
            const newTarget = (atk + def) / 2;
            const oldPIG = pigDynamic;
            const newPIG = idx === 0 ? newTarget : (oldPIG * 0.6 + newTarget * 0.4);

            const delta = newPIG - oldPIG;
            pigTrend = delta > 0.5 ? '▲' : (delta < -0.5 ? '▼' : '—');
            pigDynamic = Math.round(newPIG * 10) / 10;

            if (roundMatches > 0) {
                const matchPIG = (roundGoals * 2) + (roundAssists * 1.5) + (roundSaves * 1) + (roundShots * 0.2);
                pigPerMatchHistory.push(matchPIG);
            }

            // Precio
            const roleMult = player.isCaptain ? 1.8
                : (player.role === 'Titular 🌟' ? 1.4
                : (player.role === 'Suplente 🔄' ? 0.9 : 0.6));
            const roleAjust = 0.9 + roleMult * 0.1;
            const trendMult = pigTrend === '▲' ? 1.05 : (pigTrend === '▼' ? 0.95 : 1.0);
            const pigPrice = 55000 * Math.pow(pigDynamic / 50, 4.1);
            const finalPrice = Math.max(500, Math.round(pigPrice * roleAjust * trendMult / 100) * 100);

            history.push({
                label: label.label,
                type: label.type,
                roundIdx: label.roundIdx,
                marketValue: finalPrice,
                pig: pigDynamic,
                atk: atk,
                def: def,
                trend: pigTrend,
                hasData: label.hasData,
                matches: accStats.matches,
                goals: accStats.goals,
                assists: accStats.assists,
                saves: accStats.saves,
                shots: accStats.shots
            });
        });

        return history;
    }

    const _origCalcMarketHistory = window.calculatePlayerMarketValueHistory;
    window.calculatePlayerMarketValueHistory = function (playerId, torneo) {
        const t = torneo || getCurrentData();
        if (!t) return [];
        if (hasDynamicPIG(t)) {
            const dynamicHistory = calculateDynamicPigHistory(playerId, t);
            if (dynamicHistory.length > 0) return dynamicHistory;
        }
        if (typeof _origCalcMarketHistory === 'function') {
            return _origCalcMarketHistory.call(this, playerId, torneo);
        }
        return [];
    };

    // ============================================================
    // M5 — BALÓN DE ORO con ATK/DEF
    // ============================================================
    const _origRenderBalon = window.renderBalon;
    window.renderBalon = function (torneo) {
        const t = torneo || getCurrentData();
        if (!t || !hasDynamicPIG(t)) {
            return _origRenderBalon.call(this, torneo);
        }
        let hasDynamic = false;
        for (const tm of (t.teams || [])) {
            for (const p of (tm.players || [])) {
                if (p.pigDynamic !== undefined) { hasDynamic = true; break; }
            }
            if (hasDynamic) break;
        }
        if (!hasDynamic) return _origRenderBalon.call(this, torneo);

        return renderDynamicBalon(t);
    };

    function renderDynamicBalon(t) {
        const allPlayers = [];
        t.teams.forEach(team => {
            (team.players || []).forEach(p => {
                if (p && p.name && p.name.trim() !== '') {
                    const pig = p.pigDynamic !== undefined ? p.pigDynamic : (p.seasonStats?.pig || 0);
                    allPlayers.push({
                        id: p.id, name: p.name,
                        teamName: team.name, teamShield: team.shield,
                        pig: pig,
                        trend: p.pigTrend || '—',
                        atk: p.atkDynamic !== undefined ? p.atkDynamic : '-',
                        def: p.defDynamic !== undefined ? p.defDynamic : '-',
                        rocketRank: p.rocketRank || 'Platino'
                    });
                }
            });
        });
        if (!allPlayers.length) return '<div class="empty-state">Sin jugadores.</div>';
        const sorted = allPlayers.sort((a, b) => (b.pig || 0) - (a.pig || 0));
        const trendColor = { '▲': '#16a34a', '▼': '#dc2626', '—': '#a3a3a3' };

        // Podio
        const top3 = sorted.slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];
        const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        const positionsDisplay = ['1°', '2°', '3°'];

        let podiumHtml = `<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; width:100%; max-width:900px; margin:0 auto 1.5rem;">`;
        for (let i = 0; i < 3; i++) {
            const p = top3[i];
            const color = colors[i];
            const medal = medals[i];
            if (!p) {
                podiumHtml += `<div style="background:rgba(20,20,30,0.6); border:2px dashed #2d2d44; border-radius:20px; padding:1.5rem 1rem; min-height:340px; display:flex; align-items:center; justify-content:center; color:#6b7280; font-style:italic; font-size:0.85rem;">Sin jugador</div>`;
                continue;
            }
            const atkVal = typeof p.atk === 'number' ? p.atk.toFixed(0) : p.atk;
            const defVal = typeof p.def === 'number' ? p.def.toFixed(0) : p.def;
            podiumHtml += `
                <div onclick="showPlayerProfile('${p.id}')"
                     style="background:linear-gradient(180deg, ${color}20 0%, rgba(20,20,20,0.95) 100%); border:3px solid ${color}; border-radius:20px; padding:1.25rem 1rem 1rem; text-align:center; cursor:pointer; box-shadow:0 8px 32px ${color}40; min-height:340px; display:flex; flex-direction:column; align-items:center; position:relative; transition:transform 0.2s;"
                     onmouseover="this.style.transform='translateY(-4px)';"
                     onmouseout="this.style.transform='';">
                    <div style="position:absolute; top:-16px; left:50%; transform:translateX(-50%); font-size:2rem; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5));">${medal}</div>
                    <div style="font-size:0.7rem; font-weight:900; color:${color}; letter-spacing:0.15em; text-transform:uppercase; margin-top:0.5rem; margin-bottom:0.75rem;">${positionsDisplay[i]} LUGAR</div>
                    <div style="width:80px; height:80px; border-radius:50%; background:#000; border:4px solid ${color}; overflow:hidden; display:flex; align-items:center; justify-content:center; margin-bottom:0.75rem; flex-shrink:0; box-shadow:0 0 20px ${color}55;">
                        <img src="${p.teamShield || ''}" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none';">
                    </div>
                    <div style="font-weight:900; font-size:0.95rem; color:#fff; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:0.15rem;" title="${esc(p.name)}">${esc(p.name)}</div>
                    <div style="font-size:0.7rem; color:#a3a3a3; margin-bottom:0.75rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">${esc(p.teamName)}</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; width:100%; margin-bottom:0.75rem;">
                        <div style="background:rgba(6,182,212,0.12); border:1px solid rgba(6,182,212,0.35); border-radius:10px; padding:0.5rem 0.25rem;">
                            <div style="font-size:0.55rem; color:#06b6d4; font-weight:900; letter-spacing:0.1em;">ATK</div>
                            <div style="font-size:1.25rem; color:#fff; font-weight:900; line-height:1; margin-top:0.1rem;">${atkVal}</div>
                        </div>
                        <div style="background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.35); border-radius:10px; padding:0.5rem 0.25rem;">
                            <div style="font-size:0.55rem; color:#d4af37; font-weight:900; letter-spacing:0.1em;">DEF</div>
                            <div style="font-size:1.25rem; color:#fff; font-weight:900; line-height:1; margin-top:0.1rem;">${defVal}</div>
                        </div>
                    </div>
                    <div style="margin-top:auto; display:flex; align-items:baseline; justify-content:center; gap:0.35rem;">
                        <span style="font-size:1.6rem; font-weight:900; color:#d4af37; text-shadow:0 0 12px rgba(212,175,55,0.5);">${(p.pig || 0).toFixed(1)}</span>
                        <span style="font-size:1rem; color:${trendColor[p.trend]}; font-weight:900;">${p.trend}</span>
                    </div>
                    <div style="font-size:0.55rem; color:#a3a3a3; text-transform:uppercase; letter-spacing:0.15em; margin-top:0.15rem;">PIG</div>
                </div>`;
        }
        podiumHtml += '</div>';

        // Tabla
        let tableHtml = `<div class="table-wrap"><table><thead><tr>
            <th style="text-align:center;">#</th>
            <th>Jugador</th>
            <th>Equipo</th>
            <th style="text-align:center;color:#06b6d4;">ATK</th>
            <th style="text-align:center;color:#d4af37;">DEF</th>
            <th style="text-align:right;color:#d4af37;">PIG</th>
            <th style="text-align:center;">Rango</th>
        </tr></thead><tbody>`;
        sorted.slice(3).forEach((p, i) => {
            const atkVal = typeof p.atk === 'number' ? p.atk.toFixed(0) : p.atk;
            const defVal = typeof p.def === 'number' ? p.def.toFixed(0) : p.def;
            tableHtml += `<tr onclick="showPlayerProfile('${p.id}')" style="cursor:pointer;">
                <td style="text-align:center;">${i + 4}</td>
                <td class="flex-center"><img src="${p.teamShield || ''}" class="shield-sm"> ${esc(p.name)}</td>
                <td>${esc(p.teamName)}</td>
                <td style="text-align:center;color:#06b6d4;font-weight:900;">${atkVal}</td>
                <td style="text-align:center;color:#d4af37;font-weight:900;">${defVal}</td>
                <td style="text-align:right;color:#d4af37;font-weight:900;">
                    ${(p.pig || 0).toFixed(1)}
                    <span style="color:${trendColor[p.trend]}; margin-left:0.3rem;">${p.trend}</span>
                </td>
                <td style="text-align:center;font-size:0.7rem;">${p.rocketRank}</td>
            </tr>`;
        });
        tableHtml += `</tbody></table></div>`;

        return podiumHtml + tableHtml;
    }

    // ============================================================
    // M6 — HALL OF FAME navegable
    // ============================================================
    let zenithSeasonView = null;
    let _savedCurrentData = null;

    const _origRenderSalon = window.renderSalon;
    window.renderSalon = function (torneo) {
        const t = torneo || getCurrentData();
        if (!t || !t.seasons || t.seasons.length === 0) {
            return _origRenderSalon.call(this, torneo);
        }
        const originalTorneo = zenithSeasonView ? _savedCurrentData : t;
        const seasons = originalTorneo.seasons || [];
        let html = '';
        if (zenithSeasonView) {
            const championName = getChampionName(zenithSeasonView);
            html += `<div class="zenith-return-banner" style="margin-bottom:1rem;">
                <span>📖 Viendo: ${esc(zenithSeasonView.name)} · Campeón: ${esc(championName)}</span>
                <button onclick="window.ZenithReturnToCurrent()">← Volver a temporada actual</button>
            </div>`;
        }
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem;">`;
        seasons.slice().reverse().forEach((season, idx) => {
            const realIdx = seasons.length - 1 - idx;
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
        return html;
    };

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
        const pseudoTorneo = Object.assign({}, _savedCurrentData, {
            name: _savedCurrentData.name + ' · ' + season.name,
            teams: season.teams || [],
            rounds: season.rounds || [],
            playoffs: season.playoffs || null,
            friendlyMatches: season.friendlyMatches || [],
            economyLogs: season.economyLogs || [],
            sanctionsLog: season.sanctionsLog || [],
            tableConfig: season.tableConfig || _savedCurrentData.tableConfig,
            zenithConfig: season.zenithConfig || _savedCurrentData.zenithConfig,
            dynamicPIGEnabled: season.dynamicPIGEnabled || _savedCurrentData.dynamicPIGEnabled,
            seasons: _savedCurrentData.seasons,
            _isHistoricalView: true,
            _originalData: _savedCurrentData
        });
        setCurrentData(pseudoTorneo);
        try {
            if (typeof window.buildUI === 'function') {
                window.buildUI(pseudoTorneo);
                if (typeof window.switchView === 'function') window.switchView('salon');
            }
        } catch (e) { console.error('[zenith] Error navegando a temporada:', e); }
        setTimeout(() => {
            injectReturnBanner();
            injectZenithHeader();
        }, 100);
    };

    window.ZenithReturnToCurrent = function () {
        if (!_savedCurrentData) return;
        zenithSeasonView = null;
        const restore = _savedCurrentData;
        _savedCurrentData = null;
        setCurrentData(restore);
        try {
            if (typeof window.buildUI === 'function') {
                window.buildUI(restore);
                if (typeof window.switchView === 'function') window.switchView('salon');
            }
        } catch (e) { console.error('[zenith] Error volviendo:', e); }
        setTimeout(() => {
            injectZenithHeader();
        }, 100);
    };

    function injectReturnBanner() {
        if (!zenithSeasonView) return;
        const header = document.querySelector('header');
        if (!header) return;
        const existing = header.querySelector('.zenith-return-banner');
        if (existing) existing.remove();
        const actions = header.querySelector('.header-actions');
        if (!actions) return;
        const championName = getChampionName(zenithSeasonView);
        const banner = document.createElement('div');
        banner.className = 'zenith-return-banner';
        banner.innerHTML = `
            <span>📖 ${esc(zenithSeasonView.name)} · ${esc(championName)}</span>
            <button onclick="window.ZenithReturnToCurrent()">← Volver</button>
        `;
        actions.insertBefore(banner, actions.firstChild);
    }

    // ============================================================
    // INIT
    // ============================================================
    function observeViews() {
        const observer = new MutationObserver(() => {
            applyTableZenithStyles();
            renamePlayInRound();
        });
        observer.observe(document.body, { childList: true, subtree: true });
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
                if (zenithSeasonView) injectReturnBanner();
            }
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
    } else {
        setTimeout(init, 300);
    }

    // ============================================================
    // PUBLIC API
    // ============================================================
    window.ZenithVisualPatch = {
        isZenith: isZenith,
        hasDynamicPIG: hasDynamicPIG,
        refresh: () => {
            applyTableZenithStyles();
            renamePlayInRound();
        },
        getViewingSeason: () => zenithSeasonView
    };

    console.log('✅ Zenith Visual Patch v1.1 cargado');
})();