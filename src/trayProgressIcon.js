// The tray icon as a progress meter: the logo's four drops, dimmed, filling
// up in turn (clockwise from the top right) as today's goal gets closer. A
// quarter of the goal fills one drop; the drop being filled fills by area
// from its tip towards its round end, which is clockwise too. Drawn on
// demand from the logo's own shape (assets/logo.svg), so any fill level is
// possible.
import logoSvg from '../assets/logo.svg?raw';
import { dropFills } from './dailyProgress';

const VIEWBOX = 512;
const CENTER = VIEWBOX / 2;
const ICON_SIZE = 128; // pixels; the system scales it to the tray
const PADDING = 0.1; // air around the logo, as a share of its size on each side
const DIM_OPACITY = 0.32; // the drops not filled yet (in their own color, or the tint)

// The logo is one drop (an outline and a fold on top) rotated in 90° steps;
// each group carries its colors
const groups = [...logoSvg.matchAll(/<g transform="rotate\((\d+)[^"]*">(.*?)<\/g>/gs)].map(([, angle, body]) => ({
  angle: Number(angle),
  paths: [...body.matchAll(/<path fill="([^"]+)" d="([^"]+)"/g)].map(([, fill, d]) => ({ fill, d }))
}));
const DROP_PATH = groups[0].paths[0].d;
const FOLD_PATH = groups[0].paths[1].d;

let geometry = null;

// Measured once: where the drops are (to crop to them), and how far along the
// drop's length each share of its area reaches (to fill it by area)
const measure = () => {
  if (geometry) return geometry;
  const context = document.createElement('canvas').getContext('2d');
  const drop = new Path2D(DROP_PATH);
  const points = [];
  for (let y = 0; y < VIEWBOX; y += 2) {
    for (let x = 0; x < VIEWBOX; x += 2) {
      if (context.isPointInPath(drop, x, y)) points.push([x, y]);
    }
  }
  // The drop's tip is where its outline starts ("M x,y"); its round end is the
  // point farthest from the tip
  const [tipX, tipY] = DROP_PATH.match(/M\s*([\d.]+)[ ,]([\d.]+)/).slice(1).map(Number);
  const distance = ([x, y]) => Math.hypot(x - tipX, y - tipY);
  const end = points.reduce((far, point) => (distance(point) > distance(far) ? point : far));
  const length = distance(end);
  const tip = [tipX, tipY];
  const axis = [(end[0] - tipX) / length, (end[1] - tipY) / length]; // from the tip to the round end
  const along = points.map(([x, y]) => (x - tipX) * axis[0] + (y - tipY) * axis[1]).sort((a, b) => a - b);

  // Bounds of all four drops (the others are this one turned around the center)
  let [left, top, right, bottom] = [VIEWBOX, VIEWBOX, 0, 0];
  for (const [x, y] of points) {
    for (const [px, py] of [[x, y], [VIEWBOX - y, x], [VIEWBOX - x, VIEWBOX - y], [y, VIEWBOX - x]]) {
      left = Math.min(left, px); right = Math.max(right, px);
      top = Math.min(top, py); bottom = Math.max(bottom, py);
    }
  }
  const content = Math.max(right - left, bottom - top);
  const size = content * (1 + 2 * PADDING);
  const crop = { x: (left + right) / 2 - size / 2, y: (top + bottom) / 2 - size / 2, size };

  geometry = { drop, fold: new Path2D(FOLD_PATH), tip, axis, along, length, crop };
  return geometry;
};

// Clip to the part of the drop (in its own, unrotated position) that holds
// `share` of its area, starting from the tip
const clipToShare = (context, share, { tip, axis, along, length }) => {
  const reach = along[Math.min(along.length - 1, Math.floor(share * along.length))];
  const across = [-axis[1], axis[0]];
  const point = (a, c) => [tip[0] + axis[0] * a + across[0] * c, tip[1] + axis[1] * a + across[1] * c];
  const span = length * 2;
  const corners = [point(-span, -span), point(reach, -span), point(reach, span), point(-span, span)];
  context.beginPath();
  context.moveTo(...corners[0]);
  corners.slice(1).forEach((corner) => context.lineTo(...corner));
  context.closePath();
  context.clip();
};

// tint: one color for the whole logo, or null for the logo's own colors.
// fraction: the share of today's goal done (0–1).
// Returns the icon as PNG bytes.
export const progressIcon = async (fraction, tint) => {
  const shape = measure();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ICON_SIZE;
  const context = canvas.getContext('2d');
  const scale = ICON_SIZE / shape.crop.size;
  const fills = dropFills(fraction);

  groups.forEach(({ angle, paths }, i) => {
    context.setTransform(scale, 0, 0, scale, -shape.crop.x * scale, -shape.crop.y * scale);
    context.translate(CENTER, CENTER);
    context.rotate((angle * Math.PI) / 180);
    context.translate(-CENTER, -CENTER);

    // Not filled yet: the whole drop, dimmed
    context.globalAlpha = DIM_OPACITY;
    context.fillStyle = tint ?? paths[0].fill;
    context.fill(shape.drop);
    context.globalAlpha = 1;

    // Filled: in full, its fold too when in color
    if (fills[i] > 0) {
      context.save();
      if (fills[i] < 1) clipToShare(context, fills[i], shape);
      context.fillStyle = tint ?? paths[0].fill;
      context.fill(shape.drop);
      if (!tint) {
        context.fillStyle = paths[1].fill;
        context.fill(shape.fold);
      }
      context.restore();
    }
  });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
};
