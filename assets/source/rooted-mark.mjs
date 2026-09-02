// Rooted app mark: a stylised sunflower over two leaves.
// Drawn once here and rendered to every size the app needs.

export const CREAM = '#FBF5E4';
const PETAL_LIGHT = '#F4D473';
const PETAL_DEEP = '#E7B93F';
const CENTRE = '#4A3721';
const CENTRE_RIM = '#3C2C19';
const LEAF_DEEP = '#4E9B3C';
const LEAF_LIGHT = '#78C158';

/// One petal, pointing up from the disc centre: a rounded blade, slightly asymmetric
/// so the ring reads as hand-drawn rather than machined.
function petal(index, total, rInner, rOuter, halfWidth) {
  const angle = (index / total) * 360;
  const d = [
    `M 0 ${-rInner}`,
    `C ${halfWidth} ${-rInner - (rOuter - rInner) * 0.25}, ${halfWidth * 0.95} ${-rOuter + halfWidth * 0.9}, 0 ${-rOuter}`,
    `C ${-halfWidth * 0.95} ${-rOuter + halfWidth * 0.9}, ${-halfWidth} ${-rInner - (rOuter - rInner) * 0.25}, 0 ${-rInner}`,
    'Z',
  ].join(' ');
  return { d, angle };
}

/// A leaf standing on its base, pointing up: two mirrored curves, fatter on the
/// outer edge. Returned with the midrib that gets punched out of it.
function leafPaths(length, width) {
  const w = width / 2;
  const blade = [
    `M 0 0`,
    `C ${-w * 1.02} ${-length * 0.26}, ${-w * 0.92} ${-length * 0.72}, 0 ${-length}`,
    `C ${w * 0.86} ${-length * 0.7}, ${w * 0.98} ${-length * 0.24}, 0 0`,
    'Z',
  ].join(' ');
  const midrib = `M 0 ${-length * 0.03} C ${-w * 0.16} ${-length * 0.35}, ${-w * 0.1} ${-length * 0.7}, 0 ${-length * 0.97}`;
  return { blade, midrib };
}

/// The whole mark on a 1024 grid. `mono` flattens it to a single-colour silhouette
/// for Android's themed icon; `background` fills the square with cream.
export function mark({ background = true, mono = false, scale = 0.9 } = {}) {
  const S = 1024;
  const petals = [];
  const TOTAL = 16;
  for (let i = 0; i < TOTAL; i += 1) {
    const p = petal(i, TOTAL, 118, 258, 62);
    const fill = mono ? '#000' : (i % 2 === 0 ? PETAL_LIGHT : PETAL_DEEP);
    petals.push(`<path d="${p.d}" transform="rotate(${p.angle})" fill="${fill}" />`);
  }

  const { blade, midrib } = leafPaths(470, 300);
  const leafFillL = mono ? '#000' : LEAF_DEEP;
  const leafFillR = mono ? '#000' : LEAF_LIGHT;
  const ribColour = mono ? '#000' : CREAM;

  // In mono the midrib is punched out so the silhouette still reads as two leaves.
  // The themed Android icon is one flat colour, so the midribs and the ring around the
  // seed head are punched out of the silhouette - otherwise it reads as a blob.
  const ribMask = mono
    ? `<mask id="ribs" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}">
         <rect x="0" y="0" width="${S}" height="${S}" fill="#fff" />
         <g transform="translate(512 958)">
           <g transform="rotate(-40)"><path d="${midrib}" fill="none" stroke="#000" stroke-width="30" stroke-linecap="round" /></g>
           <g transform="rotate(37) scale(1.04)"><path d="${midrib}" fill="none" stroke="#000" stroke-width="30" stroke-linecap="round" /></g>
         </g>
         <circle cx="512" cy="362" r="154" fill="none" stroke="#000" stroke-width="20" />
       </mask>`
    : '';

  const leaves = `
    <g transform="translate(512 958)">
      <g transform="rotate(-40)">
        <path d="${blade}" fill="${leafFillL}" />
        ${mono ? '' : `<path d="${midrib}" fill="none" stroke="${ribColour}" stroke-width="22" stroke-linecap="round" />`}
      </g>
      <g transform="rotate(37) scale(1.04)">
        <path d="${blade}" fill="${leafFillR}" />
        ${mono ? '' : `<path d="${midrib}" fill="none" stroke="${ribColour}" stroke-width="22" stroke-linecap="round" />`}
      </g>
    </g>`;

  const head = `
    <g transform="translate(512 362)">
      ${petals.join('\n      ')}
      <circle r="146" fill="${mono ? '#000' : CENTRE_RIM}" />
      <circle r="138" fill="${mono ? '#000' : CENTRE}" />
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  ${ribMask}
  ${background ? `<rect x="0" y="0" width="${S}" height="${S}" fill="${CREAM}" />` : ''}
  <g transform="translate(512 512) scale(${scale}) translate(-520 -531)">
    <g${mono ? ' mask="url(#ribs)"' : ''}>
      ${leaves}
      ${head}
    </g>
  </g>
</svg>`;
}
