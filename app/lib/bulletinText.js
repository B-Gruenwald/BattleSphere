import Link from 'next/link';

/**
 * Renders bulletin body text with:
 *  - Lines starting with "## " → section headings (<h3 className="bulletin-section-heading">)
 *  - Territory names           → gold Cinzel links to /territory/[id]
 *  - Faction names             → italic links to /factions/[id]
 *  - Blank lines               → <br> spacers
 *  - Everything else           → plain <p>
 *
 * Works in both server and client components.
 */
export function renderBulletinText(body, territoryMap, factionMap, campaignSlug) {
  if (!body) return null;

  // Build name→link list, longest first so "Anterior Mons" beats "Mons".
  const entries = [
    ...Object.entries(territoryMap || {}).map(([name, id]) => ({ name, type: 'territory', id })),
    ...Object.entries(factionMap   || {}).map(([name, id]) => ({ name, type: 'faction',   id })),
  ].sort((a, b) => b.name.length - a.name.length);

  function inlineNodes(line) {
    if (entries.length === 0) return line;

    const escaped = entries.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex   = new RegExp(`(${escaped.join('|')})`, 'g');
    const parts   = line.split(regex);

    return parts.map((part, i) => {
      const match = entries.find(e => e.name === part);
      if (!match) return part;

      if (match.type === 'territory') {
        return (
          <Link key={i} href={`/c/${campaignSlug}/territory/${match.id}`} className="bulletin-territory-link">
            {part}
          </Link>
        );
      }
      return (
        <Link key={i} href={`/c/${campaignSlug}/factions/${match.id}`} className="bulletin-faction-link">
          {part}
        </Link>
      );
    });
  }

  return body.split('\n').map((line, idx) => {
    // Section heading: lines starting with "## "
    if (line.startsWith('## ')) {
      return (
        <h3 key={idx} className="bulletin-section-heading">
          {inlineNodes(line.slice(3))}
        </h3>
      );
    }

    // Blank line → breathing room
    if (!line.trim()) return <br key={idx} />;

    // Normal paragraph with inline links
    return (
      <p key={idx} style={{ marginBottom: '0.9em' }}>
        {inlineNodes(line)}
      </p>
    );
  });
}
