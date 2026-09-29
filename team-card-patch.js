// ============================================================
// MTM VISUALIZADOR - TEAM CARD + TROPHY CASE PATCH v1.0
// ============================================================
// · Tarjeta de equipo (click en escudo/nombre)
// · Vitrina de trofeos con agrupación opcional
// · Badges de ascenso/descenso en tabla general
// · Vitrina de jugador (botón "Ver Vitrina")
// ============================================================
// Carga DESPUÉS de player-history-patch.js
// ============================================================

(function () {
    'use strict';

    // ============================================================
    // HELPERS
    // ============================================================
    function tcEsc(s) {
        if (typeof s !== 'string') return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
        return s.replace(/[&<>"']/g, m => map[m]);
    }

    function getAllT() {
        const all = [];
        try { if (typeof currentData !== 'undefined' && currentData) all.push(currentData); } catch (_) {}
        if (window.copaData) {
            const cd = (typeof currentData !== 'undefined' ? currentData : null);
            if (!cd || cd.id !== window.copaData.id) all.push(window.copaData);
        }
        return all;
    }

    function findTeamInAnyT(teamId) {
        for (const t of getAllT()) {
            const tm = t.teams.find(x => x.id === teamId);
            if (tm) return { team: tm, tournament: t };
            // Buscar cup clones
            const cupClone = t.teams.find(x => x._originalTeamId === teamId);
            if (cupClone) return { team: cupClone, tournament: t };
        }
        return null;
    }

    function extractOrigId(id) {
        if (!id || typeof id !== 'string' || !id.startsWith('cup_')) return id;
        const rest = id.substring(4);
        const lastIdx = rest.lastIndexOf('_');
        if (lastIdx === -1) return id;
        return rest.substring(lastIdx + 1);
    }

    function matchInvolvesTeam(m, teamId) {
        if (!m) return false;
        if (m.h === teamId || m.a === teamId) return true;
        if (m.h && typeof m.h === 'string' && m.h.startsWith('cup_') && extractOrigId(m.h) === teamId) return true;
        if (m.a && typeof m.a === 'string' && m.a.startsWith('cup_') && extractOrigId(m.a) === teamId) return true;
        return false;
    }

    function getRoundLabels(totalRounds) {
        const base = ['32°avos', '16°avos', 'Octavos', 'Cuartos', 'Semis', 'FINAL'];
        if (totalRounds <= 6) return base.slice(6 - totalRounds);
        const extra = totalRounds - 6;
        const prefix = [];
        for (let i = 0; i < extra; i++) prefix.push('R' + (i + 1));
        return prefix.concat(base);
    }

    function formatCurrencyShort(amount) {
        if (typeof formatCurrency === 'function') return formatCurrency(amount);
        if (amount >= 1e6) return '$' + (amount / 1e6).toFixed(1) + 'M';
        if (amount >= 1e3) return '$' + (amount / 1e3).toFixed(0) + 'K';
        return '$' + amount;
    }

    // ============================================================
    // MÓDULO 1 — CLICK EN EQUIPO
    // ============================================================
    document.addEventListener('click', (e) => {
        const crest = e.target.closest('.team-card-print .team-crest');
        const nameInCard = e.target.closest('.team-card-print .team-name');
        if (!crest && !nameInCard) return;

        const card = e.target.closest('.team-card-print');
        if (!card) return;

        let torneo = null;
        try { torneo = currentData; } catch (_) {}
        if (!torneo || !torneo.teams) return;

        const cards = [...card.parentElement.querySelectorAll('.team-card-print')];
        const idx = cards.indexOf(card);
        const team = torneo.teams[idx];
        if (!team) return;

        e.stopPropagation();
        openTeamCard(team.id);
    });

    // ============================================================
    // MÓDULO 2 — TEAM CARD MODAL
    // ============================================================

    let _tcGroupTrophies = false;

    function openTeamCard(teamId) {
        const found = findTeamInAnyT(teamId);
        if (!found) return alert('Equipo no encontrado.');

        document.querySelectorAll('.tc-modal-overlay').forEach(el => el.remove());

        _tcGroupTrophies = false;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildTeamCardHtml(found.team, found.tournament);
        document.body.appendChild(wrapper);

        // Wire events
        wrapper.querySelector('.tc-close').onclick = () => wrapper.remove();
        wrapper.querySelector('.tc-modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('tc-modal-overlay')) wrapper.remove();
        });
        const toggle = wrapper.querySelector('#tc-group-toggle');
        if (toggle) {
            toggle.addEventListener('change', () => {
                _tcGroupTrophies = toggle.checked;
                renderTeamVitrina(wrapper, found.team, found.tournament);
            });
        }
    }

    function buildTeamCardHtml(team, tournament) {
        const stats = getTeamStats(team.id, tournament);
        const position = getTeamPosition(team.id, tournament);
        const playoffPhase = getPlayoffPhase(team.id, tournament);
        const captain = (team.players || []).find(p => p.isCaptain);

        // Header badges
        const badges = [];
        badges.push(`<span class="tc-badge atk">⚡ ATK ${team.atk || 0}</span>`);
        badges.push(`<span class="tc-badge def">🛡️ DEF ${team.def || 0}</span>`);
        badges.push(`<span class="tc-badge glb">⭐ GLB ${team.glb || 0}</span>`);
        badges.push(`<span class="tc-badge budget">💰 ${formatCurrencyShort(team.budget || 0)}</span>`);
        if (captain) badges.push(`<span class="tc-badge captain">👑 ${tcEsc(captain.name)}</span>`);

        // Phase badge
        let phaseHtml = '';
        if (playoffPhase) {
            const colorClass = playoffPhase.color === 'eliminated'
                ? 'tc-phase-red'
                : (playoffPhase.color === 'champion' ? 'tc-phase-gold' : 'tc-phase-green');
            phaseHtml = `<span class="tc-phase-badge ${colorClass}">${tcEsc(playoffPhase.label)}</span>`;
        }

        // Position badge
        let posHtml = '';
        if (position !== null) {
            posHtml = `<span class="tc-position-badge">#${position}</span>`;
        }

        return `
            <div class="tc-modal-overlay">
                <div class="tc-modal">
                    <div class="tc-modal-header">
                        <img class="tc-shield" src="${tcEsc(team.shield || '')}" onerror="this.style.display='none'">
                        <div class="tc-header-info">
                            <div class="tc-name">
                                ${tcEsc(team.name)}
                                ${posHtml}
                                ${phaseHtml}
                            </div>
                            <div class="tc-badges">${badges.join('')}</div>
                        </div>
                        <button class="tc-close">✕</button>
                    </div>
                    <div class="tc-modal-body">
                        <div class="tc-section">
                            <div class="tc-section-title">📊 Performance Histórico</div>
                            <div class="tc-stats-grid">
                                <div class="tc-stat">
                                    <div class="tc-stat-value">${stats.totalMatches}</div>
                                    <div class="tc-stat-label">Partidos Totales</div>
                                </div>
                                <div class="tc-stat">
                                    <div class="tc-stat-value">${stats.officialMatches}</div>
                                    <div class="tc-stat-label">Partidos Oficiales</div>
                                </div>
                                <div class="tc-stat">
                                    <div class="tc-stat-value">${stats.biggestWin ? `${stats.biggestWin.score}` : '—'}</div>
                                    <div class="tc-stat-label">Mayor Goleada</div>
                                    ${stats.biggestWin ? `<div class="tc-stat-sub">vs ${tcEsc(stats.biggestWin.opponentName)}</div>` : ''}
                                </div>
                                <div class="tc-stat">
                                    <div class="tc-stat-value">${stats.biggestLoss ? `${stats.biggestLoss.score}` : '—'}</div>
                                    <div class="tc-stat-label">Mayor Derrota</div>
                                    ${stats.biggestLoss ? `<div class="tc-stat-sub">vs ${tcEsc(stats.biggestLoss.opponentName)}</div>` : ''}
                                </div>
                            </div>
                        </div>

                        <div class="tc-section">
                            <div class="tc-section-title">⚔️ Rival / Clásico</div>
                            <div class="tc-rival">
                                <div class="tc-rival-team">
                                    <div class="tc-rival-shield-empty">?</div>
                                    <span class="tc-rival-name">Sin rival</span>
                                </div>
                                <div class="tc-rival-stats">
                                    <div class="tc-rival-stat">
                                        <div class="tc-rival-value">0</div>
                                        <div class="tc-rival-label">Ganados</div>
                                    </div>
                                    <div class="tc-rival-stat">
                                        <div class="tc-rival-value">0</div>
                                        <div class="tc-rival-label">Empates</div>
                                    </div>
                                    <div class="tc-rival-stat">
                                        <div class="tc-rival-value">0</div>
                                        <div class="tc-rival-label">Perdidos</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="tc-section">
                            <div class="tc-section-title">
                                🏆 Vitrina de Trofeos
                                <label class="tc-group-toggle">
                                    <input type="checkbox" id="tc-group-toggle"> Agrupar
                                </label>
                            </div>
                            <div class="tc-vitrina-scroll" id="tc-vitrina-scroll">
                                ${renderVitrinaItems(team, tournament, false)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTeamVitrina(wrapper, team, tournament) {
        const container = wrapper.querySelector('#tc-vitrina-scroll');
        if (!container) return;
        container.innerHTML = renderVitrinaItems(team, tournament, _tcGroupTrophies);
    }

    function renderVitrinaItems(team, tournament, grouped) {
        const history = tournament.teamHistory && tournament.teamHistory[team.id];
        let titles = (history && history.titles) ? [...history.titles] : [];

        // Fallback: si no hay teamHistory, calcular en runtime (leaguesWon/cupsWon desde tabla)
        if (titles.length === 0 && tournament.seasons) {
            // Intento básico desde seasons
            tournament.seasons.forEach((season, idx) => {
                if (season.champion === team.id) {
                    titles.push({
                        type: 'league',
                        tournamentName: season.name || tournament.name,
                        seasonNumber: idx + 1,
                        trophyImage: tournament.trophy && tournament.trophy.image ? tournament.trophy.image : null
                    });
                }
            });
        }

        // Ordenar por fecha descendente (más reciente primero)
        titles.sort((a, b) => (b.date || 0) - (a.date || 0));

        if (titles.length === 0) {
            return '<div class="tc-empty-vitrina"><i class="fa-solid fa-trophy"></i> Sin trofeos ganados todavía</div>';
        }

        let items = titles;
        if (grouped) {
            const map = new Map();
            titles.forEach(t => {
                const key = `${t.type || 'other'}::${t.tournamentName || t.tournamentId || 'other'}`;
                if (!map.has(key)) {
                    map.set(key, {
                        type: t.type,
                        tournamentName: t.tournamentName || '?',
                        tournamentId: t.tournamentId,
                        count: 0,
                        trophyImage: t.trophyImage,
                        latestDate: 0
                    });
                }
                const g = map.get(key);
                g.count++;
                if (!g.trophyImage && t.trophyImage) g.trophyImage = t.trophyImage;
                g.latestDate = Math.max(g.latestDate, t.date || 0);
            });
            items = [...map.values()].sort((a, b) => b.latestDate - a.latestDate);
        }

        return items.map(item => {
            let img = item.trophyImage;
            if (!img && item.tournamentId) {
                const t = getAllT().find(x => x.id === item.tournamentId);
                if (t && t.trophy && t.trophy.image) img = t.trophy.image;
            }
            const typeIcon = {
                'league': '🏆',
                'cup': '🥇',
                'promotion': '⬆️',
                'relegation': '⬇️'
            }[item.type] || '🏅';
            const typeLabel = {
                'league': 'Liga',
                'cup': 'Copa',
                'promotion': 'Ascenso',
                'relegation': 'Descenso'
            }[item.type] || '';

            const imgHtml = img
                ? `<img src="${tcEsc(img)}" class="tc-trophy-img" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'tc-trophy-img tc-trophy-placeholder',textContent:'🏆'}))">`
                : `<div class="tc-trophy-img tc-trophy-placeholder">${typeIcon}</div>`;

            const nameHtml = grouped
                ? `<div class="tc-trophy-name">${tcEsc(item.tournamentName)}</div>
                   <div class="tc-trophy-count">x${item.count}</div>`
                : `<div class="tc-trophy-name">${tcEsc(item.tournamentName || '?')}</div>
                   <div class="tc-trophy-season">T${item.seasonNumber || '?'} · ${typeLabel}</div>`;

            return `
                <div class="tc-trophy-card">
                    ${imgHtml}
                    ${nameHtml}
                </div>
            `;
        }).join('');
    }

    // ============================================================
    // CÁLCULO DE STATS
    // ============================================================
    function getTeamStats(teamId, mainTournament) {
        let totalMatches = 0;
        let officialMatches = 0;
        let biggestWin = null;
        let biggestLoss = null;

        const allT = getAllT();
        allT.forEach(t => {
            // Rounds
            (t.rounds || []).forEach(round => {
                (round || []).forEach(m => {
                    if (!m.played || !matchInvolvesTeam(m, teamId)) return;
                    const isHome = m.h === teamId || (m.h && m.h.startsWith('cup_') && extractOrigId(m.h) === teamId);
                    const myScore = isHome ? m.sH : m.sA;
                    const oppScore = isHome ? m.sA : m.sH;
                    const diff = myScore - oppScore;

                    totalMatches++;
                    officialMatches++;

                    const oppId = isHome ? m.a : m.h;
                    const oppInfo = findTeamInAnyT(oppId);
                    const oppName = oppInfo ? oppInfo.team.name : '?';

                    if (!biggestWin || diff > biggestWin.diff) {
                        biggestWin = { diff, score: `${myScore}-${oppScore}`, opponentName: oppName };
                    }
                    if (!biggestLoss || -diff > biggestLoss.diff) {
                        biggestLoss = { diff: -diff, score: `${myScore}-${oppScore}`, opponentName: oppName };
                    }
                });
            });

            // Playoffs
            if (t.playoffs && t.playoffs.rounds) {
                t.playoffs.rounds.forEach(round => {
                    (round || []).forEach(m => {
                        if (!m.played || !matchInvolvesTeam(m, teamId)) return;
                        const isHome = m.h === teamId || (m.h && m.h.startsWith('cup_') && extractOrigId(m.h) === teamId);
                        const myScore = isHome ? m.sH : m.sA;
                        const oppScore = isHome ? m.sA : m.sH;
                        const diff = myScore - oppScore;

                        totalMatches++;
                        officialMatches++;

                        const oppId = isHome ? m.a : m.h;
                        const oppInfo = findTeamInAnyT(oppId);
                        const oppName = oppInfo ? oppInfo.team.name : '?';

                        if (!biggestWin || diff > biggestWin.diff) {
                            biggestWin = { diff, score: `${myScore}-${oppScore}`, opponentName: oppName };
                        }
                        if (!biggestLoss || -diff > biggestLoss.diff) {
                            biggestLoss = { diff: -diff, score: `${myScore}-${oppScore}`, opponentName: oppName };
                        }
                    });
                });
            }

            // Amistosos
            (t.friendlyMatches || []).forEach(m => {
                if (!m.played || !matchInvolvesTeam(m, teamId)) return;
                totalMatches++;
                // NO oficial
            });
        });

        return { totalMatches, officialMatches, biggestWin, biggestLoss };
    }

    function getTeamPosition(teamId, tournament) {
        if (!tournament || !tournament.teams) return null;
        const sorted = [...tournament.teams].sort((a, b) =>
            b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
        );
        const idx = sorted.findIndex(tm => tm.id === teamId);
        return idx === -1 ? null : idx + 1;
    }

    function getPlayoffPhase(teamId, tournament) {
        if (!tournament || !tournament.playoffs || !tournament.playoffs.rounds) return null;
        const rounds = tournament.playoffs.rounds;
        const totalRounds = rounds.length;
        if (totalRounds === 0) return null;
        const labels = getRoundLabels(totalRounds);

        let furthestRound = -1;
        let furthestMatch = null;

        for (let r = 0; r < totalRounds; r++) {
            const round = rounds[r];
            for (let i = 0; i < round.length; i++) {
                const m = round[i];
                if (m.h === teamId || m.a === teamId) {
                    if (r > furthestRound) {
                        furthestRound = r;
                        furthestMatch = m;
                    }
                }
            }
        }

        if (furthestRound === -1) return null;

        const label = labels[furthestRound] || `Ronda ${furthestRound + 1}`;
        const isFinal = furthestRound === totalRounds - 1;

        if (!furthestMatch.played) {
            return { label, color: 'active' };
        }

        const isHome = furthestMatch.h === teamId;
        const myScore = isHome ? furthestMatch.sH : furthestMatch.sA;
        const oppScore = isHome ? furthestMatch.sA : furthestMatch.sH;

        if (myScore > oppScore) {
            if (isFinal) return { label: 'CAMPEÓN', color: 'champion' };
            return { label, color: 'active' };
        }
        return { label, color: 'eliminated' };
    }

    // ============================================================
    // MÓDULO 3 — BADGES ASCENSO/DESCENSO EN TABLA
    // ============================================================
    const _origBuildUI = window.buildUI;
    window.buildUI = function (torneo) {
        const result = _origBuildUI.call(this, torneo);
        setTimeout(() => addPromotionRelegationBadges(torneo), 150);
        setTimeout(() => addPromotionRelegationBadges(torneo), 400);
        return result;
    };

    function addPromotionRelegationBadges(torneo) {
        if (!torneo || !torneo.tableConfig) return;
        const asc = torneo.tableConfig.ascenso || 0;
        const des = torneo.tableConfig.descenso || 0;
        if (asc === 0 && des === 0) return;

        const allT = getAllT();
        const superior = allT.find(t =>
            !t.isCup && (t.divisionLevel || 1) === (torneo.divisionLevel || 1) - 1
        );
        const inferior = allT.find(t =>
            !t.isCup && (t.divisionLevel || 1) === (torneo.divisionLevel || 1) + 1
        );

        const rows = document.querySelectorAll('#tabla-general-container tbody tr');
        if (!rows.length) return;

        rows.forEach((row, idx) => {
            const teamCell = row.querySelector('td:nth-child(2)');
            if (!teamCell) return;
            teamCell.querySelectorAll('.tc-asc-badge, .tc-desc-badge').forEach(b => b.remove());

            // Ascenso
            if (asc > 0 && superior && idx < asc) {
                const title = `Asciende a ${superior.name}`;
                teamCell.insertAdjacentHTML('beforeend', `
                    <span class="tc-asc-badge" title="${tcEsc(title)}">
                        <span class="tc-asc-trophy">🏆</span><span class="tc-asc-arrow">⬆️</span>
                    </span>
                `);
            }

            // Descenso
            if (des > 0 && inferior && idx >= rows.length - des) {
                const title = `Desciende a ${inferior.name}`;
                const logo = inferior.logo || '';
                teamCell.insertAdjacentHTML('beforeend', `
                    <span class="tc-desc-badge" title="${tcEsc(title)}">
                        ${logo ? `<img src="${tcEsc(logo)}" class="tc-desc-logo">` : '<span class="tc-desc-trophy">⬇️</span>'}
                        <span class="tc-desc-arrow">⬇️</span>
                    </span>
                `);
            }
        });
    }

    // ============================================================
    // MÓDULO 4 — PLAYER TROPHY CASE
    // ============================================================
    // Hook en showPlayerProfile para añadir el botón
    const _origShowPlayerProfile = window.showPlayerProfile;
    window.showPlayerProfile = function (playerId) {
        if (typeof _origShowPlayerProfile === 'function') {
            _origShowPlayerProfile.call(this, playerId);
        }
        setTimeout(() => addTrophyButtonToProfile(playerId), 100);
        setTimeout(() => addTrophyButtonToProfile(playerId), 250);
    };

    function addTrophyButtonToProfile(playerId) {
        const content = document.getElementById('profile-modal-content');
        if (!content) return;
        const actionsLeft = content.querySelector('.profile-actions-left');
        if (!actionsLeft) return;
        if (actionsLeft.querySelector('.btn-trophy-case')) return;

        const btn = document.createElement('button');
        btn.className = 'btn-trophy-case';
        btn.type = 'button';
        btn.innerHTML = '🏆 Ver Vitrina';
        btn.onclick = () => openPlayerTrophyCase(playerId);

        // Insertar después de btn-history si existe
        const historyBtn = actionsLeft.querySelector('.btn-history');
        const perfBtn = actionsLeft.querySelector('.btn-performance');
        if (historyBtn) {
            historyBtn.insertAdjacentElement('afterend', btn);
        } else if (perfBtn) {
            perfBtn.insertAdjacentElement('afterend', btn);
        } else {
            actionsLeft.appendChild(btn);
        }
    }

    function openPlayerTrophyCase(playerId) {
        let player = null, team = null, tournament = null;
        for (const t of getAllT()) {
            for (const tm of (t.teams || [])) {
                const found = tm.players.find(p => p.id === playerId);
                if (found) { player = found; team = tm; tournament = t; break; }
            }
            if (player) break;
            if (t.freeAgents) {
                const found = t.freeAgents.find(p => p.id === playerId);
                if (found) { player = found; tournament = t; break; }
            }
        }
        if (!player) return alert('Jugador no encontrado.');

        document.querySelectorAll('.tc-modal-overlay').forEach(el => el.remove());

        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildPlayerTrophyCaseHtml(player, team, tournament);
        document.body.appendChild(wrapper);

        wrapper.querySelector('.tc-close').onclick = () => wrapper.remove();
        wrapper.querySelector('.tc-modal-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('tc-modal-overlay')) wrapper.remove();
        });

        const toggle = wrapper.querySelector('#tc-group-toggle');
        if (toggle) {
            toggle.addEventListener('change', () => {
                const c = wrapper.querySelector('#tc-vitrina-scroll');
                if (c) c.innerHTML = renderPlayerTrophiesItems(player, tournament, toggle.checked);
            });
        }
    }

    function buildPlayerTrophyCaseHtml(player, team, tournament) {
        const trophies = getPlayerTrophies(player, tournament);
        const teamShield = team ? team.shield : '';
        const teamName = team ? team.name : 'Agente Libre';

        let headerBadges = [];
        headerBadges.push(`<span class="tc-badge">📦 ${trophies.length} trofeos</span>`);
        if (player.isCaptain) headerBadges.push(`<span class="tc-badge captain">👑 Capitán</span>`);

        return `
            <div class="tc-modal-overlay">
                <div class="tc-modal">
                    <div class="tc-modal-header">
                        <img class="tc-shield" src="${tcEsc(teamShield)}" onerror="this.style.display='none'">
                        <div class="tc-header-info">
                            <div class="tc-name">${tcEsc(player.name)}</div>
                            <div class="tc-badges">${headerBadges.join('')}</div>
                            <div class="tc-header-sub">${tcEsc(teamName)}</div>
                        </div>
                        <button class="tc-close">✕</button>
                    </div>
                    <div class="tc-modal-body">
                        <div class="tc-section">
                            <div class="tc-section-title">
                                🏆 Vitrina de Trofeos
                                <label class="tc-group-toggle">
                                    <input type="checkbox" id="tc-group-toggle"> Agrupar
                                </label>
                            </div>
                            <div class="tc-vitrina-scroll" id="tc-vitrina-scroll">
                                ${renderPlayerTrophiesItems(player, tournament, false)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function getPlayerTrophies(player, tournament) {
        let trophies = [];
        // Del player directo
        if (player.trophies && player.trophies.length > 0) {
            trophies = [...player.trophies];
        }
        // Del playerHistory
        if (tournament && tournament.playerHistory && tournament.playerHistory[player.id]) {
            const pEntry = tournament.playerHistory[player.id];
            if (pEntry.trophies && pEntry.trophies.length > 0) {
                // Merge
                const existingKeys = new Set(trophies.map(t => t.key));
                pEntry.trophies.forEach(t => {
                    if (!existingKeys.has(t.key)) trophies.push(t);
                });
            }
        }
        // Buscar también en otras tournaments
        getAllT().forEach(t => {
            if (t === tournament) return;
            if (t.playerHistory && t.playerHistory[player.id]) {
                const pEntry = t.playerHistory[player.id];
                if (pEntry.trophies) {
                    const existingKeys = new Set(trophies.map(x => x.key));
                    pEntry.trophies.forEach(tr => {
                        if (!existingKeys.has(tr.key)) trophies.push(tr);
                    });
                }
            }
        });
        return trophies;
    }

    function renderPlayerTrophiesItems(player, tournament, grouped) {
        const trophies = getPlayerTrophies(player, tournament);
        trophies.sort((a, b) => (b.date || 0) - (a.date || 0));

        if (trophies.length === 0) {
            return '<div class="tc-empty-vitrina"><i class="fa-solid fa-trophy"></i> Sin trofeos ganados todavía</div>';
        }

        let items = trophies;
        if (grouped) {
            const map = new Map();
            trophies.forEach(t => {
                const key = `${t.type || 'other'}::${t.teamName || '?'}::${t.tournamentName || '?'}`;
                if (!map.has(key)) {
                    map.set(key, {
                        type: t.type,
                        tournamentName: t.tournamentName || '?',
                        teamId: t.teamId,
                        teamName: t.teamName,
                        count: 0,
                        trophyImage: t.trophyImage,
                        latestDate: 0
                    });
                }
                const g = map.get(key);
                g.count++;
                if (!g.trophyImage && t.trophyImage) g.trophyImage = t.trophyImage;
                g.latestDate = Math.max(g.latestDate, t.date || 0);
            });
            items = [...map.values()].sort((a, b) => b.latestDate - a.latestDate);
        }

        return items.map(item => {
            let img = item.trophyImage;
            if (!img && item.tournamentId) {
                const t = getAllT().find(x => x.id === item.tournamentId);
                if (t && t.trophy && t.trophy.image) img = t.trophy.image;
            }
            const typeIcon = {
                'league': '🏆',
                'cup': '🥇',
                'promotion': '⬆️',
                'relegation': '⬇️'
            }[item.type] || '🏅';

            const imgHtml = img
                ? `<img src="${tcEsc(img)}" class="tc-trophy-img" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'tc-trophy-img tc-trophy-placeholder',textContent:'🏆'}))">`
                : `<div class="tc-trophy-img tc-trophy-placeholder">${typeIcon}</div>`;

            // Team shield
            let teamHtml = '';
            if (item.teamId) {
                const teamInfo = findTeamInAnyT(item.teamId);
                if (teamInfo) {
                    teamHtml = `<div class="tc-trophy-team">
                        <img src="${tcEsc(teamInfo.team.shield || '')}" onerror="this.style.display='none'">
                        <span>${tcEsc(teamInfo.team.name)}</span>
                    </div>`;
                }
            }

            const nameHtml = grouped
                ? `<div class="tc-trophy-name">${tcEsc(item.tournamentName)}</div>
                   <div class="tc-trophy-count">x${item.count}</div>`
                : `<div class="tc-trophy-name">${tcEsc(item.tournamentName || '?')}</div>
                   <div class="tc-trophy-season">T${item.seasonNumber || '?'}</div>`;

            return `
                <div class="tc-trophy-card">
                    ${imgHtml}
                    ${teamHtml}
                    ${nameHtml}
                </div>
            `;
        }).join('');
    }

    // ============================================================
    // CSS
    // ============================================================
    function injectStyles() {
        if (document.getElementById('tc-styles')) return;
        const style = document.createElement('style');
        style.id = 'tc-styles';
        style.textContent = `
/* ============ BADGES ASCENSO/DESCENSO ============ */
.tc-asc-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    margin-left: 0.4rem;
    font-size: 0.75rem;
    padding: 0.05rem 0.3rem;
    background: rgba(250,204,21,0.15);
    border: 1px solid rgba(250,204,21,0.4);
    border-radius: 6px;
    vertical-align: middle;
    cursor: help;
}
.tc-asc-trophy { color: #facc15; }
.tc-asc-arrow { color: #facc15; }

.tc-desc-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    margin-left: 0.4rem;
    padding: 0.05rem 0.3rem;
    background: rgba(248,113,113,0.15);
    border: 1px solid rgba(248,113,113,0.4);
    border-radius: 6px;
    vertical-align: middle;
    cursor: help;
}
.tc-desc-logo {
    width: 14px;
    height: 14px;
    object-fit: contain;
    border-radius: 50%;
    background: #000;
}
.tc-desc-arrow { color: #f87171; font-size: 0.75rem; }
.tc-desc-trophy { color: #f87171; font-size: 0.75rem; }

/* ============ MODAL TC ============ */
.tc-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.9);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000003;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: tcFadeIn 0.2s ease;
}
@keyframes tcFadeIn { from { opacity: 0; } to { opacity: 1; } }

.tc-modal {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    width: 100%;
    max-width: 780px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: tcModalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 20px 60px rgba(0,0,0,0.8);
}
@keyframes tcModalIn {
    from { opacity: 0; transform: scale(0.96) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.tc-modal-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.2rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background: linear-gradient(180deg, rgba(168,85,247,0.08), transparent);
    flex-shrink: 0;
}
.tc-shield {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #000;
    border: 2px solid var(--color-border);
    object-fit: contain;
    flex-shrink: 0;
}
.tc-header-info {
    flex: 1;
    min-width: 0;
}
.tc-name {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.4rem;
    font-weight: 900;
    color: #fff;
    margin-bottom: 0.3rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.tc-position-badge {
    display: inline-block;
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    background: rgba(34,211,238,0.15);
    color: #22d3ee;
    border: 1px solid rgba(34,211,238,0.4);
    border-radius: 6px;
    font-weight: 900;
}
.tc-phase-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.7rem;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}
.tc-phase-badge::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 6px currentColor;
}
.tc-phase-green {
    color: #4ade80;
    background: rgba(74,222,128,0.12);
    border: 1px solid rgba(74,222,128,0.4);
}
.tc-phase-red {
    color: #f87171;
    background: rgba(248,113,113,0.12);
    border: 1px solid rgba(248,113,113,0.4);
}
.tc-phase-gold {
    color: #facc15;
    background: rgba(250,204,21,0.12);
    border: 1px solid rgba(250,204,21,0.4);
}
.tc-header-sub {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    margin-top: 0.3rem;
}
.tc-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.25rem;
}
.tc-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.72rem;
    font-weight: 900;
    padding: 0.2rem 0.55rem;
    border-radius: 8px;
    background: rgba(0,0,0,0.35);
    border: 1px solid var(--color-border);
    color: #fff;
    white-space: nowrap;
}
.tc-badge.atk { color: #4ade80; border-color: rgba(74,222,128,0.4); }
.tc-badge.def { color: #f87171; border-color: rgba(248,113,113,0.4); }
.tc-badge.glb { color: #facc15; border-color: rgba(250,204,21,0.4); }
.tc-badge.budget { color: #a855f7; border-color: rgba(168,85,247,0.4); }
.tc-badge.captain { color: #facc15; border-color: rgba(250,204,21,0.4); background: rgba(250,204,21,0.08); }

.tc-close {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    width: 36px;
    height: 36px;
    border-radius: 10px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}
.tc-close:hover { background: rgba(255,255,255,0.05); }

.tc-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem 1.5rem;
}

.tc-section {
    margin-bottom: 1.4rem;
}
.tc-section:last-child { margin-bottom: 0; }
.tc-section-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.85rem;
    font-weight: 900;
    color: #22d3ee;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.7rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
}
.tc-group-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--color-text-muted);
    cursor: pointer;
    text-transform: none;
    letter-spacing: 0;
}
.tc-group-toggle input {
    width: 0.9rem;
    height: 0.9rem;
    accent-color: #a855f7;
    cursor: pointer;
}

/* Stats Grid */
.tc-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
}
@media (min-width: 640px) {
    .tc-stats-grid { grid-template-columns: repeat(4, 1fr); }
}
.tc-stat {
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 0.7rem 0.5rem;
    text-align: center;
}
.tc-stat-value {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.3rem;
    font-weight: 900;
    color: #fff;
    line-height: 1.1;
}
.tc-stat-label {
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.2rem;
}
.tc-stat-sub {
    font-size: 0.6rem;
    color: var(--color-text-muted);
    margin-top: 0.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Rival */
.tc-rival {
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.9rem 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}
.tc-rival-team {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    min-width: 0;
}
.tc-rival-shield-empty {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #000;
    border: 2px dashed var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    font-size: 1.1rem;
    font-weight: 900;
    flex-shrink: 0;
}
.tc-rival-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text-muted);
    font-style: italic;
}
.tc-rival-stats {
    display: flex;
    gap: 1rem;
}
.tc-rival-stat {
    text-align: center;
}
.tc-rival-value {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.1rem;
    font-weight: 900;
    color: #fff;
}
.tc-rival-label {
    font-size: 0.58rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Vitrina */
.tc-vitrina-scroll {
    display: flex;
    gap: 0.7rem;
    overflow-x: auto;
    padding: 0.5rem 0.2rem 0.8rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
}
.tc-vitrina-scroll::-webkit-scrollbar { height: 6px; }
.tc-vitrina-scroll::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
}
.tc-vitrina-scroll::-webkit-scrollbar-thumb:hover { background: #a855f7; }

.tc-trophy-card {
    flex: 0 0 110px;
    background: rgba(0,0,0,0.3);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 0.6rem 0.5rem;
    text-align: center;
    transition: border-color 0.15s, transform 0.15s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
}
.tc-trophy-card:hover {
    border-color: rgba(250,204,21,0.5);
    transform: translateY(-2px);
}
.tc-trophy-img {
    width: 56px;
    height: 56px;
    object-fit: contain;
    display: block;
}
.tc-trophy-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    background: rgba(250,204,21,0.08);
    border-radius: 50%;
    border: 1px solid rgba(250,204,21,0.3);
}
.tc-trophy-name {
    font-size: 0.65rem;
    font-weight: 700;
    color: #fff;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    max-width: 100%;
}
.tc-trophy-season {
    font-size: 0.58rem;
    color: var(--color-text-muted);
    font-weight: 700;
}
.tc-trophy-count {
    font-family: 'Montserrat', sans-serif;
    font-size: 1rem;
    font-weight: 900;
    color: #facc15;
    text-shadow: 0 0 8px rgba(250,204,21,0.5);
}
.tc-trophy-team {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.58rem;
    color: var(--color-text-muted);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.tc-trophy-team img {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #000;
    border: 1px solid var(--color-border);
    object-fit: contain;
    flex-shrink: 0;
}
.tc-empty-vitrina {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    font-style: italic;
}
.tc-empty-vitrina i {
    display: block;
    font-size: 2rem;
    margin-bottom: 0.5rem;
    opacity: 0.4;
}

/* Botón Ver Vitrina */
.btn-trophy-case {
    background: linear-gradient(135deg, #facc15, #eab308);
    color: #000;
    padding: 0.5rem 1.2rem;
    border-radius: 10px;
    border: none;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.82rem;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: inherit;
}
.btn-trophy-case:hover {
    box-shadow: 0 0 16px rgba(250,204,21,0.5);
    transform: translateY(-1px);
}

@media (max-width: 640px) {
    .tc-modal-overlay { padding: 0; align-items: flex-start; }
    .tc-modal {
        max-height: 100vh;
        max-height: 100dvh;
        border-radius: 0;
        max-width: 100%;
    }
    .tc-modal-header { padding: 0.9rem 1rem; }
    .tc-shield { width: 48px; height: 48px; }
    .tc-name { font-size: 1.05rem; }
    .tc-modal-body { padding: 0.8rem 1rem 1rem; }
    .tc-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .tc-trophy-card { flex: 0 0 95px; }
    .tc-trophy-img { width: 44px; height: 44px; }
}
`;
        document.head.appendChild(style);
    }

    // ============================================================
    // INIT
    // ============================================================
    injectStyles();

    window.teamCardPatch = {
        openTeamCard,
        openPlayerTrophyCase,
        addPromotionRelegationBadges
    };

    console.log('✅ Team Card + Trophy Case Patch v1.0 cargado.');
})();