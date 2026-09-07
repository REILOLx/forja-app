// Small inline stroke-icon library, 24x24 viewbox, stroke=currentColor.
const wrap = (inner, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;

export const icon = {
  home: () => wrap('<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h5v-5h2v5h5v-9"/>'),
  clock: () => wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.5 2"/>'),
  dumbbell: () => wrap('<path d="M4 12h16"/><rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/><rect x="6" y="7" width="2.5" height="10" rx="1"/><rect x="15.5" y="7" width="2.5" height="10" rx="1"/>'),
  book: () => wrap('<path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5C4.7 20 4 19.3 4 18.5z"/><path d="M20 5.5C20 4.7 19.3 4 18.5 4H12v16h6.5c.8 0 1.5-.7 1.5-1.5z"/>'),
  target: () => wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>'),
  wallet: () => wrap('<path d="M4 8a2.5 2.5 0 0 1 2.5-2.5h10A2.5 2.5 0 0 1 19 8v1"/><rect x="3.5" y="8.5" width="17" height="10.5" rx="2"/><circle cx="15.5" cy="13.5" r="1.1" fill="currentColor" stroke="none"/>'),
  lock: () => wrap('<rect x="5" y="10.5" width="14" height="9.5" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  flame: () => `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2c1 3-3 4-3 7.5A3.5 3.5 0 0 0 12.5 13 3 3 0 0 0 15 10c1.5 1 2 3 2 4.5A5 5 0 0 1 12 19.5 5 5 0 0 1 7 14.5c0-3 2-4.5 2-7C9 5 10.5 3 12 2z"/></svg>`,
  check: () => wrap('<path d="M5 13l4 4L19 7"/>', 'stroke-width="2.4"'),
  chevronRight: () => wrap('<path d="M9 5l7 7-7 7"/>'),
  back: () => wrap('<path d="M15 5l-7 7 7 7"/>', 'stroke-width="2"'),
  plus: () => wrap('<path d="M12 5v14M5 12h14"/>'),
  card: () => wrap('<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19"/>'),
  pix: () => wrap('<path d="M8 4l4 4-4 4M16 20l-4-4 4-4"/><path d="M4 12h4M16 12h4"/>'),
  cash: () => wrap('<path d="M6 19V7a2 2 0 0 1 2-2h4l6 6v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M12 5v6h6"/>'),
};
