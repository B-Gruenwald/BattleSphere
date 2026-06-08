// Shared game systems list — used in profile settings and army forms.
// Grouped by universe for the profile checkboxes; flattened for army dropdowns.

export const GAME_SYSTEMS = [
  {
    universe: 'Warhammer 40,000',
    games: ['Warhammer 40,000', 'Kill Team', 'Necromunda', 'Horus Heresy (30K)', 'Aeronautica Imperialis'],
  },
  {
    universe: 'Age of Sigmar',
    games: ['Age of Sigmar', 'Warcry', 'Warhammer Underworlds'],
  },
  {
    universe: 'The Old World',
    games: ['The Old World'],
  },
  {
    universe: 'Blood Bowl',
    games: ['Blood Bowl'],
  },
  {
    universe: 'Star Wars',
    games: ['Star Wars: Legion', 'Star Wars: X-Wing', 'Star Wars: Armada', 'Star Wars: Shatterpoint'],
  },
  {
    universe: 'Other',
    games: ['Infinity', 'Bolt Action', 'Marvel Crisis Protocol', 'Malifaux', 'One Page Rules', 'Other'],
  },
];

// Flat list of every game, in display order — use this for <select> dropdowns.
export const GAME_SYSTEMS_FLAT = GAME_SYSTEMS.flatMap(g => g.games);
