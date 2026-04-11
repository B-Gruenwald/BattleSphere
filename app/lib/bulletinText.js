import Link from 'next/link';

/**
 * Renders bulletin body text with:
 *
 *  EXPLICIT LINKS (manual, any display text you like):
 *    [[Forces of the Hivemind|Genestealer Cults]]
 *      → displays "Genestealer Cults", links to the Forces of the Hivemind faction page
 *    [[Stiria|the ruined outpost]]
 *      → displays "the ruined outpost", links to the Stiria territory page
 *    [[Stiria]]
 *      → displays "Stiria", links to the Stiria territory page (shorthand, no alias)
 *    The target (part before |) is looked up in territories first, then factions.
 *
 *  AUTO-LINKS (exact name match, no markup needed):
 *    Writing "Stiria" anywhere in the text automatically becomes a territory link.
 *    Writing "Forces of the Hivemind" becomes a faction link.
 *
 *  SECTION HEADINGS:
 *    Lines starting with "## " render as gold section headings.
 *
 *  Works in both server and client components.
 */

// Regex for [[target]] or [[target|display text]]
const BRACKET_LINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

export function renderBulletinText(body, territoryMap, factionMap, campaignSlug) {
  if (!body) return null;

  // Build auto-link entries — longest name first so "Anterior Mons" beats "Mons"
  const autoEntries = [
    ...Object.entries(territoryMap || {}).map(([name, id]) => ({ name, type: 'territory', id })),
    ...Object.entries(factionMap   || {}).map(([name, id]) => ({ name, type: 'faction',   id })),
  ].sort((a, b) => b.name.length - a.name.length);

  /** Resolve a target name → { href, type } or null */
  function resolve(target) {
    const t = target.trim();
    if (territoryMap?.[t]) return { href: `/c/${campaignSlug}/territory/${territoryMap[t]}`, type: 'territory' };
    if (factionMap?.[t])   return { href: `/c/${campaignSlug}/factions/${factionMap[t]}`,   type: 'faction'   };
    return null;
  }

  /** Turn a plain-text segment into nodes, applying auto-links */
  function autoLink(text, keyPrefix) {
    if (!autoEntries.length) return text;

    const escaped = autoEntries.map(e => e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex   = new RegExp(`(${escaped.join('|')})`, 'g');
    const parts   = text.split(regex);

    return parts.map((part, i) => {
      const match = autoEntries.find(e => e.name === part);
      if (!match) return part;
      const className = match.type === 'territory' ? 'bulletin-territory-link' : 'bulletin-faction-link';
      const href = match.type === 'territory'
        ? `/c/${campaignSlug}/territory/${match.id}`
        : `/c/${campaignSlug}/factions/${match.id}`;
      return <Link key={`${keyPrefix}-a${i}`} href={href} className={className}>{part}</Link>;
    });
  }

  /** Process one line of text → array of React nodes, handling [[ ]] and auto-links */
  function processLine(line, lineIdx) {
    const nodes = [];
    let lastIndex = 0;
    let match;

    BRACKET_LINK_RE.lastIndex = 0; // reset stateful regex

    while ((match = BRACKET_LINK_RE.exec(line)) !== null) {
      const [fullMatch, target, displayText] = match;
      const before = line.slice(lastIndex, match.index);

      // Plain text before this bracket link → auto-link pass
      if (before) nodes.push(...[].concat(autoLink(before, `${lineIdx}-b${lastIndex}`)));

      // Resolve the bracket target
      const resolved = resolve(target);
      const display  = displayText ? displayText.trim() : target.trim();

      if (resolved) {
        const className = resolved.type === 'territory' ? 'bulletin-territory-link' : 'bulletin-faction-link';
        nodes.push(
          <Link key={`${lineIdx}-link-${match.index}`} href={resolved.href} className={className}>
            {display}
          </Link>
        );
      } else {
        // Target not found — render display text as plain (fail gracefully)
        nodes.push(<span key={`${lineIdx}-unknown-${match.index}`}>{display}</span>);
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Remaining text after last bracket link
    const tail = line.slice(lastIndex);
    if (tail) nodes.push(...[].concat(autoLink(tail, `${lineIdx}-tail`)));

    return nodes;
  }

  return body.split('\n').map((line, idx) => {
    // Section heading: lines starting with "## "
    if (line.startsWith('## ')) {
      return (
        <h3 key={idx} className="bulletin-section-heading">
          {processLine(line.slice(3), idx)}
        </h3>
      );
    }

    // Blank line → breathing room
    if (!line.trim()) return <br key={idx} />;

    // Normal paragraph
    return (
      <p key={idx} style={{ marginBottom: '0.9em' }}>
        {processLine(line, idx)}
      </p>
    );
  });
}
