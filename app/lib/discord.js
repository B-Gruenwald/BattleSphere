/**
 * Discord webhook utilities for BattleSphere.
 * All embeds use Discord's JSON embed format.
 * https://discord.com/developers/docs/resources/webhook
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.battlesphere.cc';

// Brand colours as Discord decimal integers
const GOLD  = 12028992; // #b78c40 — BattleSphere gold
const GREEN = 5025653;  // #4caf75 — victory
const GREY  = 5921370;  // #5a5a5a — draw
const BLUE  = 6316128;  // #6060a0 — events/upcoming

/** Post a payload to a Discord webhook. Non-blocking, errors swallowed. */
export async function postToDiscord(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch (_) { /* non-fatal */ }
}

/** Discord embed for a recorded battle. */
export function buildBattleEmbed({
  battleId, headline, campaignSlug, campaignName,
  attackerName, defenderName, winnerFactionId, attackerFactionId,
  attackerScore, defenderScore, territoryName,
}) {
  const isDraw      = !winnerFactionId;
  const attackerWon = winnerFactionId === attackerFactionId;
  const winnerName  = attackerWon ? attackerName : defenderName;
  const loserName   = attackerWon ? defenderName : attackerName;

  const description = isDraw
    ? `**${attackerName}** and **${defenderName}** fought to a draw.`
    : `**${winnerName}** claimed victory over **${loserName}**.`;

  const fields = [
    { name: 'Attacker', value: attackerName, inline: true },
    { name: 'Defender', value: defenderName, inline: true },
  ];
  if (territoryName) fields.push({ name: 'Territory', value: territoryName, inline: false });
  if (attackerScore || defenderScore) {
    fields.push({ name: 'Score', value: `${attackerScore ?? 0} – ${defenderScore ?? 0}`, inline: true });
  }

  return {
    embeds: [{
      title:       `⚔ ${headline || 'Battle Recorded'}`,
      description,
      color:       isDraw ? GREY : GREEN,
      fields,
      url:         `${APP_URL}/c/${campaignSlug}/battle/${battleId}`,
      footer:      { text: `BattleSphere · ${campaignName}` },
      timestamp:   new Date().toISOString(),
    }],
  };
}

/** Discord embed for a new bulletin dispatch. */
export function buildBulletinEmbed({ dispatch, campaignName, campaignSlug }) {
  const title   = dispatch.title
    ? `Dispatch #${dispatch.dispatch_number} — ${dispatch.title}`
    : `Dispatch #${dispatch.dispatch_number}`;
  const excerpt = dispatch.body
    ? dispatch.body.replace(/\[\[.*?\]\]/g, '').replace(/##\s?/g, '').slice(0, 220).trimEnd() +
      (dispatch.body.length > 220 ? '…' : '')
    : null;

  return {
    embeds: [{
      title:     `📋 ${title}`,
      description: excerpt || null,
      color:     GOLD,
      url:       `${APP_URL}/campaign/${campaignSlug}`,
      footer:    { text: `BattleSphere · ${campaignName}` },
      timestamp: new Date().toISOString(),
    }],
  };
}

/** Discord embed for a new campaign event. */
export function buildEventEmbed({ event, campaignName, campaignSlug }) {
  const excerpt = event.body
    ? event.body.slice(0, 220).trimEnd() + (event.body.length > 220 ? '…' : '')
    : null;

  return {
    embeds: [{
      title:       `⚡ New Event — ${event.name || event.title}`,
      description: excerpt || null,
      color:       BLUE,
      url:         `${APP_URL}/c/${campaignSlug}/events/${event.id}`,
      footer:      { text: `BattleSphere · ${campaignName}` },
      timestamp:   new Date().toISOString(),
    }],
  };
}

/** Test embed — confirms the webhook is connected. */
export function buildTestEmbed(campaignName) {
  return {
    embeds: [{
      title:       '✦ BattleSphere Connected',
      description: 'This campaign is now linked to Discord. Battle results, bulletin dispatches, and new events will appear here automatically.',
      color:       GOLD,
      footer:      { text: `BattleSphere · ${campaignName}` },
      timestamp:   new Date().toISOString(),
    }],
  };
}
