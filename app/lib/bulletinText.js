import Link from 'next/link';

/**
 * Renders bulletin body text with:
 *
 *  EXPLICIT LINKS (manual, any display text you like):
 *    [[Forces of the Hivemind|Genestealer Cults]]
 *      → displays "Genestealer Cults", links to the Forces of the Hivemind faction/territory page
 *    [[Stiria]]
 *      → displays "Stiria", links to the Stiria territory page (shorthand)
 *    Target lookup is case-insensitive.
 *
 *  AUTO-LINKS (case-insensitive exact name match, no markup needed):
 *    Writing "stiria" or "Stiria" or "STIRIA" all link to the same territory.
 *
 *  SECTION HEADINGS:
 *    Lines starting with "## " render as gold section headings.
 *
 *  Works in both server and client components.
 */

const BRACKET_LINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
const MD_LINK_RE      = /\[([^\]]+?)\]\((https?:\/\/[^)]+?)\)/g;

export function renderBulletinText(body, territoryMap, factionMap, campaignSlug) {
  if (!body) return null;

  // Build lowercased lookup maps for case-insensitive resolution
  const territoryLower = Object.fromEntries(
    Object.entries(territoryMap || {}).map(([name, id]) => [name.toLowerCase(), { name, id }])
  );
  const factionLower = Object.fromEntries(
    Object.entries(factionMap || {}).map(([name, id]) => [name.toLowerCase(), { name, id }])
  );

  /** Resolve a target string → { href, type } or null (case-insensitive) */
  function resolve(target) {
    const key = target.trim().toLowerCase();
    if (territoryLower[key]) return { href: `/c/${campaignSlug}/territory/${territoryLower[key].id}`, type: 'territory' };
    if (factionLower[key])   return { href: `/c/${campaignSlug}/faction/${factionLower[key].id}`,   type: 'faction'   };
    return null;
  }

  // Build auto-link entries, longest first so "Anterior Mons" beats "Mons"
  const autoEntries = [
    ...Object.entries(territoryMap || {}).map(([name, id]) => ({ name, type: 'territory', id })),
    ...Object.entries(factionMap   || {}).map(([name, id]) => ({ name, type: 'faction',   id })),
  ].sort((a, b) => b.name.length - a.name.length);

  /** Apply auto-links to a plain text string */
  function autoLink(text, keyPrefix) {
    if (!autoEntries.length || !text) return text;

    const escaped = autoEntries.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // 'i' flag makes matching case-insensitive
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const resolved = resolve(part); // resolve handles case-insensitive lookup
      if (!resolved) return part;
      const className = resolved.type === 'territory' ? 'bulletin-territory-link' : 'bulletin-faction-link';
      return <Link key={`${keyPrefix}-a${i}`} href={resolved.href} className={className}>{part}</Link>;
    });
  }

  /** Process one line → React nodes, handling markdown links, [[ ]] bracket links, then auto-links */
  function processLine(line, lineIdx) {
    // First pass: collect all match positions (markdown links + bracket links), sorted by index
    const segments = [];
    let m;

    MD_LINK_RE.lastIndex = 0;
    while ((m = MD_LINK_RE.exec(line)) !== null) {
      segments.push({ index: m.index, length: m[0].length, type: 'md', display: m[1], href: m[2] });
    }

    BRACKET_LINK_RE.lastIndex = 0;
    while ((m = BRACKET_LINK_RE.exec(line)) !== null) {
      segments.push({ index: m.index, length: m[0].length, type: 'bracket', target: m[1], displayText: m[2] });
    }

    segments.sort((a, b) => a.index - b.index);

    const nodes = [];
    let lastIndex = 0;

    for (const seg of segments) {
      const before = line.slice(lastIndex, seg.index);
      if (before) nodes.push(...[].concat(autoLink(before, `${lineIdx}-b${lastIndex}`)));

      if (seg.type === 'md') {
        nodes.push(
          <a key={`${lineIdx}-md-${seg.index}`} href={seg.href} className="bulletin-external-link" target="_blank" rel="noopener noreferrer">
            {seg.display}
          </a>
        );
      } else {
        const resolved = resolve(seg.target);
        const display  = seg.displayText ? seg.displayText.trim() : seg.target.trim();
        if (resolved) {
          const className = resolved.type === 'territory' ? 'bulletin-territory-link' : 'bulletin-faction-link';
          nodes.push(
            <Link key={`${lineIdx}-link-${seg.index}`} href={resolved.href} className={className}>
              {display}
            </Link>
          );
        } else {
          nodes.push(<span key={`${lineIdx}-unknown-${seg.index}`}>{display}</span>);
        }
      }

      lastIndex = seg.index + seg.length;
    }

    const tail = line.slice(lastIndex);
    if (tail) nodes.push(...[].concat(autoLink(tail, `${lineIdx}-tail`)));

    return nodes;
  }

  return body.split('\n').map((line, idx) => {
    if (line.startsWith('## ')) {
      return (
        <h3 key={idx} className="bulletin-section-heading">
          {processLine(line.slice(3), idx)}
        </h3>
      );
    }
    if (!line.trim()) return <br key={idx} />;
    return (
      <p key={idx} style={{ marginBottom: '0.9em' }}>
        {processLine(line, idx)}
      </p>
    );
  });
}
