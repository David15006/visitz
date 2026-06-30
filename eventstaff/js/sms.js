/* EventStaff — génération du SMS d'invitation (texte uniquement, aucun envoi) */
window.EventStaff = window.EventStaff || {};

EventStaff.Sms = (function () {
  const Utils = EventStaff.Utils;

  function buildInvitationMessage(event, shift) {
    const dateLabel = Utils.formatDateFr(event.date);
    const heures = Utils.formatHeure(shift.heureDebut) + '-' + Utils.formatHeure(shift.heureFin);
    return [
      'Bonjour,',
      '',
      'Vous êtes invité à travailler :',
      '',
      event.nom,
      dateLabel,
      heures,
      '',
      'Merci de répondre OUI ou NON.'
    ].join('\n');
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext !== false) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        /* fallback ci-dessous */
      }
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }

  return { buildInvitationMessage, copyToClipboard };
})();
