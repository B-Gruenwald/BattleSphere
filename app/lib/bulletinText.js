import Link from 'next/link';

/**
 * Renders bulletin body text, turning territory and faction names into
 * styled <Link> components. Works in both server and client components.
 *
 * @param {string} body            - Plain text bulletin body (newlines = paragraph breaks)
 * @param {Object} territoryMap    - { "Territory Name": "uuid", ... }
 * @param {Object} factionMap      - { "Faction Name": "uuid", ... }
 * @param {string} campaignSlug    - e.g. "austriacus-subsector"
 * @returns {JSX.Element[]}        - Array of <p> elements with inline links
 */
export function renderBulletinText(body, territoryMap, factionMap, campaignSlug) {
  if (!body) return null;

  // Build a flat list of name→link targets, sorted longest-first so
  // "Anterior Mons" matches before "Mons" if both exist.
  const entries = [
    ...Object.entries(territoryMap || {}).map(([name, id]) => ({ name, type: 'territory', id })),
    ...Object.entries(factionMap  || {}).map(([name, id]) => ({ name, type: 'faction',   id })),
  ].sort((a, b) => b.name.length - a.name.length);

  // If no named entities, just render plain paragraphs.
  if (entries.length === 0) {
    return body.split('\n').map((line, i) =>
      line.trim()
        ? <p key={i} style={{ marginBottom: '0.9em' }}>{line}</p>
        : <br key={i} />
    );
  }

  // Escape special regex characters in each name.
  const escaped = entries.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');

  return body.split('\n').map((line, lineIdx) => {
    if (!line.trim()) return <br key={lineIdx} />;

    const parts = line.split(regex);

    const nodes = parts.map((part, partIdx) => {
      const match = entries.find(e => e.name === part);
      if (!match) return part;

      if (match.type === 'territory') {
        return (
          <Link
            key={partIdx}
            href={`/c/${campaignSlug}/territory/${match.id}`}
            className="bulletin-territory-link"
          >
            {part}
          </Link>
        );
      }

      return (
        <Link
          key={partIdx}
          href={`/c/${campaignSlug}/factions/${match.id}`}
          className="bulletin-faction-link"
        >
          {part}
        </Link>
      );
    });

    return (
      <p key={lineIdx} style={{ marginBottom: '0.9em' }}>
        {nodes}
      </p>
    );
  });
}
