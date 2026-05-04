export const difficultyIcons = {
  easy: `<svg viewBox="0 0 100 100" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="mask-easy">
        <rect width="100" height="100" fill="black" />
        <circle cx="50" cy="50" r="45" fill="white" />
        <circle cx="33" cy="36" r="6" fill="black"/>
        <circle cx="67" cy="36" r="6" fill="black"/>
        <path d="M 22 55 C 22 88 78 88 78 55 L 22 55 Z" fill="black"/>
      </mask>
    </defs>
    <rect width="100" height="100" fill="white" mask="url(#mask-easy)" />
  </svg>`,

  medium: `<svg viewBox="0 0 100 100" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="mask-medium">
        <rect width="100" height="100" fill="black" />
        <circle cx="50" cy="50" r="45" fill="white" />
        <circle cx="33" cy="40" r="6" fill="black"/>
        <circle cx="67" cy="40" r="6" fill="black"/>
        <path d="M 30 65 Q 50 82 70 65" stroke="black" stroke-width="8" fill="none" stroke-linecap="round"/>
      </mask>
    </defs>
    <rect width="100" height="100" fill="white" mask="url(#mask-medium)" />
  </svg>`,

  hard: `<svg viewBox="0 0 100 100" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="mask-hard">
        <rect width="100" height="100" fill="black" />
        <circle cx="50" cy="50" r="45" fill="white" />
        <circle cx="33" cy="40" r="6" fill="black"/>
        <circle cx="67" cy="40" r="6" fill="black"/>
        <line x1="30" y1="68" x2="70" y2="68" stroke="black" stroke-width="8" stroke-linecap="round"/>
      </mask>
    </defs>
    <rect width="100" height="100" fill="white" mask="url(#mask-hard)" />
  </svg>`,

  expert: `<svg viewBox="0 0 100 100" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="mask-expert">
        <rect width="100" height="100" fill="black" />
        <circle cx="50" cy="50" r="45" fill="white" />
        <circle cx="33" cy="48" r="6" fill="black"/>
        <circle cx="67" cy="48" r="6" fill="black"/>
        <line x1="26" y1="32" x2="40" y2="38" stroke="black" stroke-width="7" stroke-linecap="round"/>
        <line x1="74" y1="32" x2="60" y2="38" stroke="black" stroke-width="7" stroke-linecap="round"/>
        <path d="M 30 75 Q 50 62 70 75" stroke="black" stroke-width="8" fill="none" stroke-linecap="round"/>
      </mask>
    </defs>
    <rect width="100" height="100" fill="white" mask="url(#mask-expert)" />
  </svg>`,

  impossible: `<svg viewBox="0 0 100 100" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="mask-impossible">
        <rect width="100" height="100" fill="black" />
        <circle cx="50" cy="50" r="45" fill="white" />
        <circle cx="33" cy="44" r="6" fill="black"/>
        <circle cx="67" cy="44" r="6" fill="black"/>
        <line x1="24" y1="26" x2="40" y2="34" stroke="black" stroke-width="7" stroke-linecap="round"/>
        <line x1="76" y1="26" x2="60" y2="34" stroke="black" stroke-width="7" stroke-linecap="round"/>
        <path d="M 25 82 L 75 82 C 75 54 25 54 25 82 Z" fill="black"/>
      </mask>
    </defs>
    <rect width="100" height="100" fill="white" mask="url(#mask-impossible)" />
  </svg>`,
};