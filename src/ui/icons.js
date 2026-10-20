export function icon(name, cls = "") {
  const paths = {
    jar: '<path d="M8 3h16M10 3c0 9-6 13-6 20 0 8 24 8 24 0 0-7-6-11-6-20M5 22c5-3 17-3 22 0M16 23V12m0 6c-6 0-7-7-7-7 6-1 7 4 7 4m0 0c1-6 7-6 7-6 1 5-3 8-7 8"/>',
    drop: '<path d="M12 3C10 7 5 12 5 16a7 7 0 0 0 14 0c0-4-5-9-7-13Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    leaf: '<path d="M20 3C9 2 3 7 4 14c1 6 9 8 13 2 3-4 3-9 3-13ZM4 21 16 8M8 16v-5m4 2h5"/>',
    rotate:
      '<path d="M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5m-3 9a9 9 0 0 0 15 2l3-3m0 5v-5h-5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    reset: '<path d="M4 4v6h6M4 10a8 8 0 1 1-1 6"/>',
    trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    hand: '<path d="M8 13V6a2 2 0 0 1 4 0v7-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v10c0 9-9 11-13 5l-4-6c-2-3 0-5 2-3l3 3"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 ${name === "jar" ? "32 32" : "24 24"}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
}
