import { SOLO_CHAPTERS, SOLO_MISSIONS, getMission, getMissionStatus, validateCampaignProgress, recordMissionResult } from '../content/SoloCampaign.js';
import { escapeHtml } from '../security.js';

const SAVE_KEY = 'ygo_solo_campaign_v1';
const MEDALS = ['À découvrir', 'Bronze', 'Argent', 'Or'];

/** Local, transparent progression: no account, ranking or anti-cheat claim. */
export class SoloCampaignController {
  constructor({ openDialog, closeDialog, onLaunch, onBack }) {
    this.openDialog = openDialog;
    this.closeDialog = closeDialog;
    this.onLaunch = onLaunch;
    this.onBack = onBack;
    this.dialog = document.getElementById('campaign-modal');
    this.message = '';
    this.storageBlocked = false;
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch {
      this.message = 'Stockage indisponible : progression en mémoire seulement. Exportez-la avant de fermer la page.';
    }
    const checked = validateCampaignProgress(raw);
    this.progress = checked.progress;
    if (!checked.valid) {
      this.storageBlocked = true;
      this.message = 'Sauvegarde locale invalide : elle est conservée sans écrasement. Importez une sauvegarde valide ou réinitialisez explicitement le parcours.';
    }
    this.dialog.addEventListener('click', event => {
      const launch = event.target.closest('[data-mission-launch]');
      if (launch) this.launch(launch.dataset.missionLaunch);
    });
    document.getElementById('btn-campaign-back').addEventListener('click', onBack);
    document.getElementById('btn-campaign-export').addEventListener('click', () => this.export());
    document.getElementById('campaign-import').addEventListener('change', event => this.import(event));
    document.getElementById('btn-campaign-reset').addEventListener('click', () => {
      if (!window.confirm('Réinitialiser uniquement les résultats du parcours solo ? Exportez-les d’abord pour pouvoir les récupérer.')) return;
      this.progress = validateCampaignProgress(null).progress;
      this.storageBlocked = false;
      this.persist();
      this.render();
    });
    this.renderSummary();
  }

  renderSummary() {
    const states = SOLO_MISSIONS.map(mission => getMissionStatus(this.progress, mission.id));
    document.getElementById('campaign-summary').textContent =
      `${states.filter(state => state.completed).length}/${SOLO_MISSIONS.length} défis remportés · ${states.reduce((sum, state) => sum + state.medals, 0)}/${SOLO_MISSIONS.length * 3} médailles`;
  }

  render() {
    this.renderSummary();
    document.getElementById('campaign-feedback').textContent = this.message;
    document.getElementById('campaign-chapters').innerHTML = SOLO_CHAPTERS.map(chapter => `
      <section class="campaign-chapter" aria-labelledby="chapter-${chapter.id}">
        <h3 id="chapter-${chapter.id}">${chapter.number}. ${escapeHtml(chapter.title)}</h3>
        <p>${escapeHtml(chapter.description)}</p>
        <div class="campaign-missions">${SOLO_MISSIONS.filter(m => m.chapterId === chapter.id).map(mission => {
          const state = getMissionStatus(this.progress, mission.id);
          return `<article class="campaign-mission ${state.unlocked ? '' : 'mission-locked'}">
            <p class="campaign-kicker">DÉFI ${mission.number} · ${state.unlocked ? MEDALS[state.medals] : 'Verrouillé'}</p>
            <h4>${escapeHtml(mission.title)}</h4>
            <p>${escapeHtml(mission.briefing)}</p>
            <details><summary>Stratégie, adversaire et objectifs</summary>
              <p>${escapeHtml(mission.strategy)}</p>
              <p><strong>${escapeHtml(mission.opponentName)} :</strong> ${escapeHtml(mission.opponentPlan)}</p>
              <p>Bronze : gagner le duel. Une victoire déverrouille le défi suivant.</p>
              <p>Argent : ${escapeHtml(mission.objectives[0].label)}</p>
              <p>Or : obtenir l’Argent et ${escapeHtml(mission.objectives[1].label)}</p>
              <p>Decks imposés · TCG strict · IA ${escapeHtml(mission.aiDifficulty)} · ${mission.firstPlayerId === 'player' ? 'Vous commencez' : 'L’adversaire commence'}.</p>
              <p>${state.attempts} tentative(s) terminée(s) · ${state.wins} victoire(s).</p>
            </details>
            <button type="button" class="btn ${state.unlocked ? 'btn-magenta' : ''}" data-mission-launch="${mission.id}" ${state.unlocked ? '' : 'disabled'}>${state.completed ? 'REJOUER' : state.unlocked ? 'JOUER' : 'GAGNER LE DÉFI PRÉCÉDENT'} — ${escapeHtml(mission.title)}</button>
          </article>`;
        }).join('')}</div>
      </section>`).join('');
  }

  open() {
    this.render();
    this.openDialog(this.dialog, document.getElementById('campaign-title'));
  }

  async launch(id) {
    if (this.launching || !getMissionStatus(this.progress, id)?.unlocked) return;
    this.launching = true;
    this.closeDialog(this.dialog, { restoreFocus: false });
    try {
      await this.onLaunch(getMission(id));
    } catch {
      this.message = 'Impossible de lancer ce défi. Le duel en cours n’a pas été modifié ; vous pouvez réessayer.';
      this.open();
    } finally {
      this.launching = false;
    }
  }

  persist() {
    if (this.storageBlocked) return false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.progress));
      this.message = 'Progression enregistrée dans ce navigateur. Exportez une copie pour la conserver ailleurs.';
      return true;
    } catch {
      this.message = 'Sauvegarde impossible : résultat conservé en mémoire seulement. Exportez votre progression avant de fermer cette page.';
      return false;
    }
  }

  complete(id, outcome, stats) {
    const result = recordMissionResult(this.progress, id, outcome || 'draw', stats);
    if (!result.accepted) return { ...result, summary: 'Résultat du parcours non enregistré. Exportez votre progression et consultez le parcours solo.' };
    this.progress = result.progress;
    const saved = this.persist();
    this.renderSummary();
    const earned = result.earnedMedal > 0 ? `Médaille ${MEDALS[result.earnedMedal]}.` : 'Aucune médaille gagnée : vous pouvez réessayer.';
    return {
      ...result,
      summary: `${earned} ${result.newlyUnlocked.length ? 'Défi suivant déverrouillé. ' : ''}${saved ? 'Progression sauvegardée.' : 'Attention : progression non sauvegardée sur disque. Exportez-la depuis le parcours solo.'}`
    };
  }

  export() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.progress, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ygo-parcours-solo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async import(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 1_500_000) {
      this.message = 'Import refusé : fichier trop volumineux (maximum 1,5 Mo).';
      this.render();
      return;
    }
    let checked;
    try { checked = validateCampaignProgress(await file.text()); } catch { checked = { valid: false }; }
    if (!checked.valid) {
      this.message = 'Import refusé : sauvegarde invalide ou version incompatible. Votre progression actuelle est intacte.';
    } else if (window.confirm('Remplacer la progression du parcours solo par ce fichier ? Cette opération ne modifie ni vos decks ni vos statistiques de duels libres.')) {
      this.progress = checked.progress;
      this.storageBlocked = false;
      this.persist();
    }
    this.render();
  }
}
