const fs = require('fs');
const path = require('path');

const gitDir = 'c:/Desarrollo/CollarNet/diseno_halter_v2';

// ============================================================================
// 1. CRISP ORTHOGONAL VECTOR GLYPHS (100% MANIFOLD 2D GRID PARTITIONING)
// ============================================================================
const ORTHO_GLYPHS = {
  '0': [[[0,0],[1,0]], [[1,0],[1,1]], [[1,1],[0,1]], [[0,1],[0,0]]],
  '1': [[[0.5,0],[0.5,1]], [[0.18,1],[0.5,1]], [[0.15,0],[0.85,0]]],
  '2': [[[0,1],[1,1]], [[1,1],[1,0.5]], [[1,0.5],[0,0.5]], [[0,0.5],[0,0]], [[0,0],[1,0]]],
  '3': [[[0,1],[1,1]], [[1,1],[1,0]], [[0,0],[1,0]], [[0.22,0.5],[1,0.5]]],
  '4': [[[0,1],[0,0.45]], [[0,0.45],[1,0.45]], [[0.78,1],[0.78,0]]],
  '5': [[[1,1],[0,1]], [[0,1],[0,0.5]], [[0,0.5],[1,0.5]], [[1,0.5],[1,0]], [[1,0],[0,0]]],
  '6': [[[1,1],[0,1]], [[0,1],[0,0]], [[0,0],[1,0]], [[1,0],[1,0.5]], [[1,0.5],[0,0.5]]],
  '7': [[[0,1],[1,1]], [[1,1],[1,0]]],
  '8': [[[0,0],[1,0]], [[1,0],[1,1]], [[1,1],[0,1]], [[0,1],[0,0]], [[0,0.5],[1,0.5]]],
  '9': [[[0,0],[1,0]], [[1,0],[1,1]], [[1,1],[0,1]], [[0,1],[0,0.5]], [[0,0.5],[1,0.5]]],
  'A': [[[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0]], [[0,0.45],[1,0.45]]],
  'B': [[[0,0],[0,1]], [[0,1],[0.82,1]], [[0.82,1],[0.82,0.5]], [[0,0.5],[1,0.5]], [[1,0.5],[1,0]], [[1,0],[0,0]]],
  'C': [[[1,1],[0,1]], [[0,1],[0,0]], [[0,0],[1,0]]],
  'D': [[[0,0],[0,1]], [[0,1],[0.78,1]], [[0.78,1],[0.78,0.82]], [[0.78,0.82],[1,0.82]], [[1,0.82],[1,0.18]], [[1,0.18],[0.78,0.18]], [[0.78,0.18],[0.78,0]], [[0.78,0],[0,0]]],
  'E': [[[1,1],[0,1]], [[0,1],[0,0]], [[0,0],[1,0]], [[0,0.5],[0.82,0.5]]],
  'F': [[[0,0],[0,1]], [[0,1],[1,1]], [[0,0.5],[0.82,0.5]]],
  'G': [[[1,1],[0,1]], [[0,1],[0,0]], [[0,0],[1,0]], [[1,0],[1,0.5]], [[0.48,0.5],[1,0.5]]],
  'I': [[[0.15,1],[0.85,1]], [[0.5,1],[0.5,0]], [[0.15,0],[0.85,0]]],
  'L': [[[0,1],[0,0]], [[0,0],[1,0]]],
  'M': [[[0,0],[0,1]], [[0,1],[1,1]], [[0.5,1],[0.5,0.25]], [[1,1],[1,0]]],
  'N': [[[0,0],[0,1]], [[0,0.82],[0.35,0.82]], [[0.35,0.82],[0.35,0.5]], [[0.35,0.5],[0.65,0.5]], [[0.65,0.5],[0.65,0.18]], [[0.65,0.18],[1,0.18]], [[1,0],[1,1]]],
  'O': [[[0,0],[1,0]], [[1,0],[1,1]], [[1,1],[0,1]], [[0,1],[0,0]]],
  'P': [[[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0.5]], [[1,0.5],[0,0.5]]],
  'R': [[[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0.5]], [[1,0.5],[0,0.5]], [[0.62,0.5],[0.62,0.2]], [[0.62,0.2],[1,0.2]], [[1,0.2],[1,0]]],
  'S': [[[1,1],[0,1]], [[0,1],[0,0.5]], [[0,0.5],[1,0.5]], [[1,0.5],[1,0]], [[1,0],[0,0]]],
  'T': [[[0,1],[1,1]], [[0.5,1],[0.5,0]]],
  'U': [[[0,1],[0,0]], [[0,0],[1,0]], [[1,0],[1,1]]],
  'V': [[[0,1],[0,0.28]], [[0,0.28],[0.28,0.28]], [[0.28,0.28],[0.28,0]], [[0.28,0],[0.72,0]], [[0.72,0],[0.72,0.28]], [[0.72,0.28],[1,0.28]], [[1,0.28],[1,1]]],
  'X': [[[0,1],[0,0.68]], [[1,1],[1,0.68]], [[0,0.32],[0,0]], [[1,0.32],[1,0]], [[0,0.68],[0.5,0.68]], [[0.5,0.68],[1,0.68]], [[0,0.32],[0.5,0.32]], [[0.5,0.32],[1,0.32]], [[0.5,0.68],[0.5,0.32]]],
  'Z': [[[0,1],[1,1]], [[1,1],[1,0.5]], [[1,0.5],[0,0.5]], [[0,0.5],[0,0]], [[0,0],[1,0]]],
  '+': [[[0.1,0.5],[0.9,0.5]], [[0.5,0.15],[0.5,0.85]]],
  '-': [[[0.15,0.5],[0.85,0.5]]]
};

/**
 * Generates clean, well-proportioned text stroke rectangles with guaranteed inter-character gap.
 * `align`: 'center' | 'start' (left/bottom edge at cx/cy) | 'end' (right/top edge at cx/cy)
 */
function makeTextRects(text, anchorX, anchorY, opts = {}) {
  const charW   = opts.charW   !== undefined ? opts.charW   : 0.72;
  const charH   = opts.charH   !== undefined ? opts.charH   : 1.18;
  const strokeW = opts.strokeW !== undefined ? opts.strokeW : 0.22;
  const charGap = opts.charGap !== undefined ? opts.charGap : 0.26;
  const vertical = !!opts.vertical;
  const align    = opts.align || 'center';

  const rects = [];
  const str = String(text).toUpperCase();
  const stepU = charW + strokeW + charGap;
  const totalCenterSpan = str.length * charW + Math.max(0, str.length - 1) * (strokeW + charGap);
  const totalOuterSpan  = totalCenterSpan + strokeW;

  let uStart = -totalCenterSpan / 2;
  if (align === 'start') {
    uStart = strokeW / 2; // Outer edge starts right at anchor!
  } else if (align === 'end') {
    uStart = -totalOuterSpan + strokeW / 2; // Outer end ends right at anchor!
  }
  const vStart = -charH / 2;

  function mapUV(u, v) {
    if (!vertical) {
      return [anchorX + u, anchorY + v];
    } else {
      return [anchorX - v, anchorY + u];
    }
  }

  for (let i = 0; i < str.length; i++) {
    const segs = ORTHO_GLYPHS[str[i]];
    if (!segs) continue;
    const u0Char = uStart + i * stepU;
    for (const [[gx0, gy0], [gx1, gy1]] of segs) {
      const uA = u0Char + gx0 * charW;
      const vA = vStart + gy0 * charH;
      const uB = u0Char + gx1 * charW;
      const vB = vStart + gy1 * charH;
      const [xA, yA] = mapUV(uA, vA);
      const [xB, yB] = mapUV(uB, vB);
      const minX = Math.min(xA, xB) - strokeW / 2;
      const maxX = Math.max(xA, xB) + strokeW / 2;
      const minY = Math.min(yA, yB) - strokeW / 2;
      const maxY = Math.max(yA, yB) + strokeW / 2;
      rects.push({
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        w: maxX - minX,
        d: maxY - minY
      });
    }
  }
  return rects;
}

// ============================================================================
// 2. 3D POST GENERATORS (SMOOTH PIN + SNAP-FIT BIFURCATED HOOK)
// ============================================================================
function calcNormal(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
}

function makeSmoothPinPostTris(cx, cy, opts = {}) {
  const zBase     = opts.zBase     !== undefined ? opts.zBase     : 1.60;
  const zShoulder = opts.zShoulder !== undefined ? opts.zShoulder : 3.60;
  const rShoulder = opts.rShoulder !== undefined ? opts.rShoulder : 1.85;
  const rPin      = opts.rPin      !== undefined ? opts.rPin      : 0.95;
  const hPin      = opts.hPin      !== undefined ? opts.hPin      : 3.20;
  const zTop      = zShoulder + hPin;

  const tris = [];
  const N_CIRC = 32;
  const addT = (a, b, c) => {
    const ab = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const bc = Math.hypot(c[0]-b[0], c[1]-b[1], c[2]-b[2]);
    const ca = Math.hypot(a[0]-c[0], a[1]-c[1], a[2]-c[2]);
    if (ab < 1e-5 || bc < 1e-5 || ca < 1e-5) return;
    const n = calcNormal(a, b, c);
    tris.push([n[0], n[1], n[2], a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]]);
  };
  const addQ = (a, b, c, d) => { addT(a, b, c); addT(a, c, d); };

  const profile = [
    [zBase,          rShoulder],
    [zShoulder,      rShoulder],
    [zShoulder,      rPin],
    [zTop - 0.35,    rPin],
    [zTop,           rPin * 0.72]
  ];

  for (let i = 0; i < N_CIRC; i++) {
    const a0 = (i / N_CIRC) * Math.PI * 2;
    const a1 = ((i + 1) / N_CIRC) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * rShoulder, cy + Math.sin(a0) * rShoulder, zBase];
    const p1 = [cx + Math.cos(a1) * rShoulder, cy + Math.sin(a1) * rShoulder, zBase];
    addT([cx, cy, zBase], p1, p0);
  }

  for (let s = 0; s < profile.length - 1; s++) {
    const [z0, r0] = profile[s];
    const [z1, r1] = profile[s + 1];
    for (let i = 0; i < N_CIRC; i++) {
      const a0 = (i / N_CIRC) * Math.PI * 2;
      const a1 = ((i + 1) / N_CIRC) * Math.PI * 2;
      const p00 = [cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, z0];
      const p10 = [cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0, z0];
      const p11 = [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, z1];
      const p01 = [cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1, z1];
      addQ(p00, p10, p11, p01);
    }
  }

  const rTop = profile[profile.length - 1][1];
  for (let i = 0; i < N_CIRC; i++) {
    const a0 = (i / N_CIRC) * Math.PI * 2;
    const a1 = ((i + 1) / N_CIRC) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * rTop, cy + Math.sin(a0) * rTop, zTop];
    const p1 = [cx + Math.cos(a1) * rTop, cy + Math.sin(a1) * rTop, zTop];
    addT([cx, cy, zTop], p0, p1);
  }
  return tris;
}

function makeSnapHookPostTris(cx, cy, opts = {}) {
  const zBase     = opts.zBase     !== undefined ? opts.zBase     : 1.60;
  const zShoulder = opts.zShoulder !== undefined ? opts.zShoulder : 3.60;
  const rFlange   = opts.rFlange   !== undefined ? opts.rFlange   : 2.10;
  const rShoulder = opts.rShoulder !== undefined ? opts.rShoulder : 1.80;
  const rNeck     = opts.rNeck     !== undefined ? opts.rNeck     : 0.96;
  const hNeck     = opts.hNeck     !== undefined ? opts.hNeck     : 1.65;
  const rBarb     = opts.rBarb     !== undefined ? opts.rBarb     : 1.42;
  const rTip      = opts.rTip      !== undefined ? opts.rTip      : 0.78;
  const hHead     = opts.hHead     !== undefined ? opts.hHead     : 3.15;
  const slotW     = opts.slotW     !== undefined ? opts.slotW     : 0.72;
  const zSlotBot  = zShoulder - 0.65;

  const tris = [];
  const N_CIRC = 32;
  const addT = (a, b, c) => {
    const ab = Math.hypot(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const bc = Math.hypot(c[0]-b[0], c[1]-b[1], c[2]-b[2]);
    const ca = Math.hypot(a[0]-c[0], a[1]-c[1], a[2]-c[2]);
    if (ab < 1e-5 || bc < 1e-5 || ca < 1e-5) return;
    const n = calcNormal(a, b, c);
    tris.push([n[0], n[1], n[2], a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]]);
  };
  const addQ = (a, b, c, d) => { addT(a, b, c); addT(a, c, d); };

  const zFlangeTop = Math.min(zBase + 0.65, zSlotBot - 0.2);
  const baseProfile = [
    [zBase,      rFlange],
    [zFlangeTop, rFlange],
    [zFlangeTop, rShoulder],
    [zSlotBot,   rShoulder]
  ];

  for (let i = 0; i < N_CIRC; i++) {
    const a0 = (i / N_CIRC) * Math.PI * 2;
    const a1 = ((i + 1) / N_CIRC) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * rFlange, cy + Math.sin(a0) * rFlange, zBase];
    const p1 = [cx + Math.cos(a1) * rFlange, cy + Math.sin(a1) * rFlange, zBase];
    addT([cx, cy, zBase], p1, p0);
  }

  for (let s = 0; s < baseProfile.length - 1; s++) {
    const [z0, r0] = baseProfile[s];
    const [z1, r1] = baseProfile[s + 1];
    for (let i = 0; i < N_CIRC; i++) {
      const a0 = (i / N_CIRC) * Math.PI * 2;
      const a1 = ((i + 1) / N_CIRC) * Math.PI * 2;
      const p00 = [cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0, z0];
      const p10 = [cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0, z0];
      const p11 = [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, z1];
      const p01 = [cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1, z1];
      addQ(p00, p10, p11, p01);
    }
  }

  const halfSlot = slotW / 2;
  const ySlotFloor = Math.sqrt(Math.max(0.01, rShoulder * rShoulder - halfSlot * halfSlot));
  addQ(
    [cx - halfSlot, cy - ySlotFloor, zSlotBot],
    [cx + halfSlot, cy - ySlotFloor, zSlotBot],
    [cx + halfSlot, cy + ySlotFloor, zSlotBot],
    [cx - halfSlot, cy + ySlotFloor, zSlotBot]
  );

  const zNeckTop  = zShoulder + hNeck;
  const zBarbRamp = zNeckTop + 0.22;
  const zConeTop  = zNeckTop + hHead * 0.78;
  const zDomeMid  = zNeckTop + hHead * 0.92;
  const zTip      = zNeckTop + hHead;

  const prongLevels = [
    [zSlotBot,  rShoulder],
    [zShoulder, rShoulder],
    [zShoulder, rNeck],
    [zNeckTop,  rNeck],
    [zBarbRamp, rBarb],
    [zConeTop,  rTip + 0.14],
    [zDomeMid,  rTip * 0.85],
    [zTip,      rTip * 0.58]
  ];

  const M_ARC = 16;
  function buildProngLoop(z, r, side) {
    const rEff = Math.max(r, halfSlot + 0.22);
    const maxAng = Math.acos(Math.min(0.95, halfSlot / rEff));
    const pts = [];
    for (let i = 0; i <= M_ARC; i++) {
      const t = -maxAng + (i / M_ARC) * (2 * maxAng);
      const ang = side === 1 ? t : Math.PI + t;
      pts.push([cx + Math.cos(ang) * rEff, cy + Math.sin(ang) * rEff, z]);
    }
    return pts;
  }

  for (const side of [-1, 1]) {
    const loops = prongLevels.map(([z, r]) => buildProngLoop(z, r, side));
    for (let l = 0; l < loops.length - 1; l++) {
      const L0 = loops[l];
      const L1 = loops[l + 1];
      const len = L0.length;
      for (let i = 0; i < len; i++) {
        const nxt = (i + 1) % len;
        addQ(L0[i], L0[nxt], L1[nxt], L1[i]);
      }
    }
    const topLoop = loops[loops.length - 1];
    const centerTop = topLoop.reduce(
      (acc, p) => [acc[0] + p[0] / topLoop.length, acc[1] + p[1] / topLoop.length, zTip],
      [0, 0, 0]
    );
    for (let i = 0; i < topLoop.length; i++) {
      const nxt = (i + 1) % topLoop.length;
      addT(centerTop, topLoop[i], topLoop[nxt]);
    }
  }
  return tris;
}

// ============================================================================
// 3. MANIFOLD STL BUILDER WITH DUAL-FACE (TOP + BOTTOM) PIN LABELS
// ============================================================================
function createSTLBuilder(solidName) {
  const tris = [];

  function addTri(v1, v2, v3) {
    const n = calcNormal(v1, v2, v3);
    tris.push([n[0], n[1], n[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]]);
  }

  function addQuad(a, b, c, d) {
    addTri(a, b, c);
    addTri(a, c, d);
  }

  function addRawTris(rawList) {
    for (const t of rawList) tris.push(t);
  }

  function addBox(cx, cy, z0, w, d, h) {
    const x0 = cx - w / 2, x1 = cx + w / 2;
    const y0 = cy - d / 2, y1 = cy + d / 2;
    const z1 = z0 + h;
    const p = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]
    ];
    addQuad(p[0], p[3], p[2], p[1]);
    addQuad(p[4], p[5], p[6], p[7]);
    addQuad(p[0], p[1], p[5], p[4]);
    addQuad(p[2], p[3], p[7], p[6]);
    addQuad(p[1], p[2], p[6], p[5]);
    addQuad(p[3], p[0], p[4], p[7]);
  }

  function addHollowRing(cx, cy, z0, rInner, rOuter, h, segs = 28) {
    const z1 = z0 + h;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);
      const i0b = [cx + c0 * rInner, cy + s0 * rInner, z0];
      const i1b = [cx + c1 * rInner, cy + s1 * rInner, z0];
      const i0t = [cx + c0 * rInner, cy + s0 * rInner, z1];
      const i1t = [cx + c1 * rInner, cy + s1 * rInner, z1];
      const o0b = [cx + c0 * rOuter, cy + s0 * rOuter, z0];
      const o1b = [cx + c1 * rOuter, cy + s1 * rOuter, z0];
      const o0t = [cx + c0 * rOuter, cy + s0 * rOuter, z1];
      const o1t = [cx + c1 * rOuter, cy + s1 * rOuter, z1];
      addQuad(o0b, o1b, o1t, o0t);
      addQuad(i1b, i0b, i0t, i1t);
      addQuad(i0t, o0t, o1t, i1t);
      addQuad(o0b, i0b, i1b, o1b);
    }
  }

  // Dual-face engraving: pockets on BOTH Bottom (Z=0.0..zEngrave) AND Top (Z=hPlate-zEngrave..hPlate)
  // so the pin names are visible from above when placing components AND from below when soldering!
  function addPlateWithDualEngraving(w, d, hPlate, zEngrave, throughHoles, labelGrooves) {
    const xSet = new Set([-w / 2, w / 2]);
    const ySet = new Set([-d / 2, d / 2]);

    for (const r of [...throughHoles, ...labelGrooves]) {
      xSet.add(Number((r.cx - r.w / 2).toFixed(3)));
      xSet.add(Number((r.cx + r.w / 2).toFixed(3)));
      ySet.add(Number((r.cy - r.d / 2).toFixed(3)));
      ySet.add(Number((r.cy + r.d / 2).toFixed(3)));
    }

    const xs = Array.from(xSet).filter(x => x >= -w / 2 && x <= w / 2).sort((a, b) => a - b);
    const ys = Array.from(ySet).filter(y => y >= -d / 2 && y <= d / 2).sort((a, b) => a - b);
    const nx = xs.length - 1;
    const ny = ys.length - 1;

    const state = Array.from({ length: nx }, () => new Uint8Array(ny).fill(2));

    for (let ix = 0; ix < nx; ix++) {
      const mx = (xs[ix] + xs[ix + 1]) / 2;
      for (let iy = 0; iy < ny; iy++) {
        const my = (ys[iy] + ys[iy + 1]) / 2;
        let isHole = false;
        for (const h of throughHoles) {
          if (
            mx > h.cx - h.w / 2 + 1e-4 &&
            mx < h.cx + h.w / 2 - 1e-4 &&
            my > h.cy - h.d / 2 + 1e-4 &&
            my < h.cy + h.d / 2 - 1e-4
          ) {
            isHole = true;
            break;
          }
        }
        if (isHole) {
          state[ix][iy] = 0;
          continue;
        }
        for (const g of labelGrooves) {
          if (
            mx > g.cx - g.w / 2 + 1e-4 &&
            mx < g.cx + g.w / 2 - 1e-4 &&
            my > g.cy - g.d / 2 + 1e-4 &&
            my < g.cy + g.d / 2 - 1e-4
          ) {
            state[ix][iy] = 1;
            break;
          }
        }
      }
    }

    const zTopPocket = hPlate - zEngrave;

    for (let ix = 0; ix < nx; ix++) {
      const x0 = xs[ix], x1 = xs[ix + 1];
      for (let iy = 0; iy < ny; iy++) {
        const s = state[ix][iy];
        if (s === 0) continue;
        const y0 = ys[iy], y1 = ys[iy + 1];
        const zB = s === 2 ? 0.0 : zEngrave;
        const zT = s === 2 ? hPlate : zTopPocket;

        addQuad([x0, y0, zT], [x1, y0, zT], [x1, y1, zT], [x0, y1, zT]);
        addQuad([x0, y0, zB], [x0, y1, zB], [x1, y1, zB], [x1, y0, zB]);

        function emitWall(p0, p1, sN) {
          if (sN === 0) {
            addQuad([p0[0], p0[1], zB], [p1[0], p1[1], zB], [p1[0], p1[1], zT], [p0[0], p0[1], zT]);
          } else if (s === 2 && sN === 1) {
            // Bottom pocket wall (0.0 to zEngrave)
            addQuad([p0[0], p0[1], 0.0], [p1[0], p1[1], 0.0], [p1[0], p1[1], zEngrave], [p0[0], p0[1], zEngrave]);
            // Top pocket wall (zTopPocket to hPlate)
            addQuad([p0[0], p0[1], zTopPocket], [p1[0], p1[1], zTopPocket], [p1[0], p1[1], hPlate], [p0[0], p0[1], hPlate]);
          }
        }

        emitWall([x0, y0], [x1, y0], iy === 0 ? 0 : state[ix][iy - 1]);
        emitWall([x1, y1], [x0, y1], iy === ny - 1 ? 0 : state[ix][iy + 1]);
        emitWall([x0, y1], [x0, y0], ix === 0 ? 0 : state[ix - 1][iy]);
        emitWall([x1, y0], [x1, y1], ix === nx - 1 ? 0 : state[ix + 1][iy]);
      }
    }
  }

  function addDualTextInlay(w, d, hPlate, zEngrave, throughHoles, labelGrooves) {
    const xSet = new Set([-w / 2, w / 2]);
    const ySet = new Set([-d / 2, d / 2]);

    for (const r of [...throughHoles, ...labelGrooves]) {
      xSet.add(Number((r.cx - r.w / 2).toFixed(3)));
      xSet.add(Number((r.cx + r.w / 2).toFixed(3)));
      ySet.add(Number((r.cy - r.d / 2).toFixed(3)));
      ySet.add(Number((r.cy + r.d / 2).toFixed(3)));
    }

    const xs = Array.from(xSet).filter(x => x >= -w / 2 && x <= w / 2).sort((a, b) => a - b);
    const ys = Array.from(ySet).filter(y => y >= -d / 2 && y <= d / 2).sort((a, b) => a - b);
    const nx = xs.length - 1;
    const ny = ys.length - 1;

    const state = Array.from({ length: nx }, () => new Uint8Array(ny).fill(2));

    for (let ix = 0; ix < nx; ix++) {
      const mx = (xs[ix] + xs[ix + 1]) / 2;
      for (let iy = 0; iy < ny; iy++) {
        const my = (ys[iy] + ys[iy + 1]) / 2;
        let isHole = false;
        for (const h of throughHoles) {
          if (
            mx > h.cx - h.w / 2 + 1e-4 &&
            mx < h.cx + h.w / 2 - 1e-4 &&
            my > h.cy - h.d / 2 + 1e-4 &&
            my < h.cy + h.d / 2 - 1e-4
          ) {
            isHole = true;
            break;
          }
        }
        if (isHole) {
          state[ix][iy] = 0;
          continue;
        }
        for (const g of labelGrooves) {
          if (
            mx > g.cx - g.w / 2 + 1e-4 &&
            mx < g.cx + g.w / 2 - 1e-4 &&
            my > g.cy - g.d / 2 + 1e-4 &&
            my < g.cy + g.d / 2 - 1e-4
          ) {
            state[ix][iy] = 1;
            break;
          }
        }
      }
    }

    const zTopPocket = hPlate - zEngrave;

    for (let ix = 0; ix < nx; ix++) {
      const x0 = xs[ix], x1 = xs[ix + 1];
      for (let iy = 0; iy < ny; iy++) {
        if (state[ix][iy] !== 1) continue;
        const y0 = ys[iy], y1 = ys[iy + 1];

        // 1. Bottom flush inlay (Z = 0.0 to zEngrave)
        addQuad([x0, y0, zEngrave], [x1, y0, zEngrave], [x1, y1, zEngrave], [x0, y1, zEngrave]);
        addQuad([x0, y0, 0.0], [x0, y1, 0.0], [x1, y1, 0.0], [x1, y0, 0.0]);

        // 2. Top flush inlay (Z = zTopPocket to hPlate)
        addQuad([x0, y0, hPlate], [x1, y0, hPlate], [x1, y1, hPlate], [x0, y1, hPlate]);
        addQuad([x0, y0, zTopPocket], [x0, y1, zTopPocket], [x1, y1, zTopPocket], [x1, y0, zTopPocket]);

        function emitInlayWall(p0, p1, sN) {
          if (sN !== 1) {
            addQuad([p0[0], p0[1], 0.0], [p1[0], p1[1], 0.0], [p1[0], p1[1], zEngrave], [p0[0], p0[1], zEngrave]);
            addQuad([p0[0], p0[1], zTopPocket], [p1[0], p1[1], zTopPocket], [p1[0], p1[1], hPlate], [p0[0], p0[1], hPlate]);
          }
        }

        emitInlayWall([x0, y0], [x1, y0], iy === 0 ? 0 : state[ix][iy - 1]);
        emitInlayWall([x1, y1], [x0, y1], iy === ny - 1 ? 0 : state[ix][iy + 1]);
        emitInlayWall([x0, y1], [x0, y0], ix === 0 ? 0 : state[ix - 1][iy]);
        emitInlayWall([x1, y0], [x1, y1], ix === nx - 1 ? 0 : state[ix + 1][iy]);
      }
    }
  }

  function toSTL() {
    const buf = Buffer.alloc(84 + tris.length * 50);
    buf.write(`Binary STL - ${solidName}`.slice(0, 80), 0, 'ascii');
    buf.writeUInt32LE(tris.length, 80);
    let offset = 84;
    for (let i = 0; i < tris.length; i++) {
      const t = tris[i];
      for (let j = 0; j < 12; j++) {
        buf.writeFloatLE(t[j], offset);
        offset += 4;
      }
      buf.writeUInt16LE(0, offset);
      offset += 2;
    }
    return buf;
  }

  return { addBox, addHollowRing, addRawTris, addPlateWithDualEngraving, addDualTextInlay, toSTL, getCount: () => tris.length };
}

// ============================================================================
// 4. GROUP A: LOGIC BOARD (107.0 x 70.0 x 1.6 mm)
// ============================================================================
function buildLogicBoardAll() {
  const BOARD_L = 107.0;
  const BOARD_W = 70.0;
  const BOARD_H = 1.6;
  const ENGRAVE_DEPTH = 0.4;
  const pinHole = 1.48;

  const holes = [];
  const grooves = [];

  // 1) 4 Corner Square Mounting Holes (DX = 98.0 -> ±49.0, DY = 61.0 -> ±30.5)
  const cornerHoleSize = 3.15;
  [[-49.0, 30.5], [49.0, 30.5], [49.0, -30.5], [-49.0, -30.5]].forEach(([mx, my]) => {
    holes.push({ cx: mx, cy: my, w: cornerHoleSize, d: cornerHoleSize });
  });

  // 2) SIM800L EVB (7 pins along Y at X = -9.5, centered at Y = +16.50 so RST clears bottom-right post!)
  //    Component right edge is at X = -7.70.
  //    Labels start at X = -6.10 (align: 'start') -> +2.66 mm away from hole edge (-8.76) and +1.60 mm outside component edge (-7.70)!
  const simPinX = -9.5;
  const simPinCenterY = 16.5;
  const simLabels = ['RST', 'GND', 'RXD', 'TXD', 'VDD', 'GND', '5V'];
  for (let i = 0; i < 7; i++) {
    const py = simPinCenterY + (i - 3) * 2.54;
    holes.push({ cx: simPinX, cy: py, w: pinHole, d: pinHole });
    grooves.push(...makeTextRects(simLabels[i], simPinX + 3.40, py, {
      charW: 0.72, charH: 1.22, strokeW: 0.22, charGap: 0.26, vertical: false, align: 'start'
    }));
  }

  // 3) GY-GPS6MV2 (4 pins along Y at X = +10.5, centered at Y = +16.30)
  //    Hole left edge is at X = +9.76.
  //    Labels end at X = +8.10 (align: 'end') -> +1.66 mm away from hole edge (+9.76) and outside GPS component!
  const gpsPinX = 10.5;
  const gpsPinCenterY = 16.3;
  const gpsLabels = ['VCC', 'RX', 'TX', 'GND'];
  for (let i = 0; i < 4; i++) {
    const py = gpsPinCenterY + (i - 1.5) * 2.54;
    holes.push({ cx: gpsPinX, cy: py, w: pinHole, d: pinHole });
    grooves.push(...makeTextRects(gpsLabels[i], gpsPinX - 2.40, py, {
      charW: 0.72, charH: 1.22, strokeW: 0.22, charGap: 0.26, vertical: false, align: 'end'
    }));
  }

  // 4) ITG/MPU6050 (8 pins along X at Y = -10.5, centered at X = -26.0)
  //    Hole top edge is at Y = -9.76.
  //    Labels start at Y = -8.10 (align: 'start', vertical: true) -> +1.66 mm away from hole edge (-9.76) and outside MPU component!
  const mpuPinY = -10.5;
  const mpuPinCenterX = -26.0;
  const mpuLabels = ['INT', 'AD0', 'XCL', 'XDA', 'SDA', 'SCL', 'GND', 'VCC'];
  for (let i = 0; i < 8; i++) {
    const px = mpuPinCenterX + (i - 3.5) * 2.54;
    holes.push({ cx: px, cy: mpuPinY, w: pinHole, d: pinHole });
    grooves.push(...makeTextRects(mpuLabels[i], px, mpuPinY + 2.40, {
      charW: 0.72, charH: 1.22, strokeW: 0.22, charGap: 0.26, vertical: true, align: 'start'
    }));
  }

  // 5) ESP-32 (30 Pins: 2 rows of 15 pins along X, centered at X = +17.5, Y = -28.0 and Y = -2.6)
  //    - Top row (Y = -2.6, hole top edge -1.86, ESP32 top edge -1.30):
  //      Labels start at Y = -0.35 (align: 'start', vertical: true) -> +1.51 mm from hole edge and completely outside ESP32!
  //    - Bottom row (Y = -28.0, hole bottom edge -28.74, ESP32 bottom edge -29.30):
  //      Labels end at Y = -30.25 (align: 'end', vertical: true) -> +1.51 mm from hole edge and completely outside ESP32!
  const espCenterX = 17.5;
  const espLeftRowY = -28.0;
  const espRightRowY = -2.6;
  const espLeftLabels  = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GND', 'VIN'];
  const espRightLabels = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND', '3V3'];

  for (let i = 0; i < 15; i++) {
    const px = espCenterX + (i - 7) * 2.54;
    holes.push({ cx: px, cy: espLeftRowY, w: pinHole, d: pinHole });
    holes.push({ cx: px, cy: espRightRowY, w: pinHole, d: pinHole });

    grooves.push(...makeTextRects(espRightLabels[i], px, espRightRowY + 2.25, {
      charW: 0.68, charH: 1.18, strokeW: 0.22, charGap: 0.25, vertical: true, align: 'start'
    }));
    grooves.push(...makeTextRects(espLeftLabels[i], px, espLeftRowY - 2.25, {
      charW: 0.68, charH: 1.18, strokeW: 0.22, charGap: 0.25, vertical: true, align: 'end'
    }));
  }

  // 6) 4 tiny corner registration fiducials (0.5 x 0.5 mm inside the plate border so they never touch the outer perimeter!)
  [[-52.8, 34.3], [52.8, 34.3], [52.8, -34.3], [-52.8, -34.3]].forEach(([fx, fy]) => {
    grooves.push({ cx: fx, cy: fy, w: 0.5, d: 0.5 });
  });

  // 7) 14 Mixed Diagonal Support Posts (7 Snap-Fit Hooks + 7 Smooth Support Pins)
  const postConfigs = [
    // SIM800L (2 diagonal hooks + 2 diagonal smooth pins)
    { cx: -45.00, cy:   5.30, type: 'hook', zShoulder: 3.80, rFlange: 2.10, rShoulder: 1.85 },
    { cx:  -9.50, cy:  27.70, type: 'hook', zShoulder: 3.80, rFlange: 2.10, rShoulder: 1.85 },
    { cx: -45.00, cy:  27.70, type: 'pin',  zShoulder: 3.80, rFlange: 1.72, rShoulder: 1.70 },
    { cx:  -9.50, cy:   5.30, type: 'pin',  zShoulder: 3.80, rFlange: 1.85, rShoulder: 1.80 },
    // GY-GPS6MV2 (2 diagonal hooks + 2 diagonal smooth pins)
    { cx:  15.00, cy:  25.80, type: 'hook', zShoulder: 3.60, rFlange: 2.10, rShoulder: 1.85 },
    { cx:  45.00, cy:   6.80, type: 'hook', zShoulder: 3.60, rFlange: 2.10, rShoulder: 1.85 },
    { cx:  15.00, cy:   6.80, type: 'pin',  zShoulder: 3.60, rFlange: 1.90, rShoulder: 1.85 },
    { cx:  45.00, cy:  25.80, type: 'pin',  zShoulder: 3.60, rFlange: 1.85, rShoulder: 1.80 },
    // ITG/MPU6050 (1 hook left + 1 smooth pin right)
    { cx: -34.20, cy: -25.80, type: 'hook', zShoulder: 3.60, rFlange: 2.00, rShoulder: 1.80 },
    { cx: -17.80, cy: -25.80, type: 'pin',  zShoulder: 3.60, rFlange: 1.85, rShoulder: 1.80 },
    // ESP-32 (2 diagonal hooks + 2 diagonal smooth pins)
    { cx:  -3.50, cy:  -2.80, type: 'hook', zShoulder: 3.60, rFlange: 2.00, rShoulder: 1.80 },
    { cx:  40.50, cy: -27.80, type: 'hook', zShoulder: 3.60, rFlange: 2.00, rShoulder: 1.80 },
    { cx:  -3.50, cy: -27.80, type: 'pin',  zShoulder: 3.60, rFlange: 1.85, rShoulder: 1.80 },
    { cx:  40.50, cy:  -2.80, type: 'pin',  zShoulder: 3.60, rFlange: 1.85, rShoulder: 1.80 }
  ];

  const postTris = [];
  for (const cfg of postConfigs) {
    if (cfg.type === 'hook') {
      postTris.push(...makeSnapHookPostTris(cfg.cx, cfg.cy, {
        zBase: BOARD_H, zShoulder: cfg.zShoulder, rFlange: cfg.rFlange, rShoulder: cfg.rShoulder,
        rNeck: 0.96, hNeck: 1.65, rBarb: 1.42, rTip: 0.78, hHead: 3.15, slotW: 0.72
      }));
    } else {
      postTris.push(...makeSmoothPinPostTris(cfg.cx, cfg.cy, {
        zBase: BOARD_H, zShoulder: cfg.zShoulder, rShoulder: cfg.rShoulder, rPin: 0.95, hPin: 3.20
      }));
    }
  }

  // Write Grey Base STL
  const bGrey = createSTLBuilder('baquelita_base_petg_gris');
  bGrey.addPlateWithDualEngraving(BOARD_L, BOARD_W, BOARD_H, ENGRAVE_DEPTH, holes, grooves);
  fs.writeFileSync(path.join(gitDir, 'baquelita_logica_108mm_base_petg_gris.stl'), bGrey.toSTL());

  // Write Green Inlay + Posts STL
  const bGreen = createSTLBuilder('baquelita_soportes_y_nombres_petg_verde');
  bGreen.addDualTextInlay(BOARD_L, BOARD_W, BOARD_H, ENGRAVE_DEPTH, holes, grooves);
  bGreen.addRawTris(postTris);
  fs.writeFileSync(path.join(gitDir, 'baquelita_logica_108mm_cunas_petg_verde.stl'), bGreen.toSTL());

  // Write Complete Single-Color STL
  const bFull = createSTLBuilder('baquelita_logica_108mm_completa');
  bFull.addPlateWithDualEngraving(BOARD_L, BOARD_W, BOARD_H, ENGRAVE_DEPTH, holes, grooves);
  bFull.addRawTris(postTris);
  fs.writeFileSync(path.join(gitDir, 'baquelita_logica_108mm_completa.stl'), bFull.toSTL());

  console.log(`Logic Board STLs rebuilt! Base=${bGrey.getCount()} tris, Green=${bGreen.getCount()} tris, Full=${bFull.getCount()} tris`);
}

// ============================================================================
// 5. GROUP B: POWER BOARD (24.0 x 48.0 x 1.6 mm)
// ============================================================================
function buildPowerBoardAll() {
  const BOARD_L = 24.0;
  const BOARD_W = 48.0;
  const BOARD_H = 1.6;
  const ENGRAVE_DEPTH = 0.4;
  const pinHole = 1.48;

  const holes = [];
  const grooves = [];

  const cornerHoleSize = 3.15;
  [[-7.5, 19.5], [7.5, 19.5], [7.5, -19.5], [-7.5, -19.5]].forEach(([mx, my]) => {
    holes.push({ cx: mx, cy: my, w: cornerHoleSize, d: cornerHoleSize });
  });

  // Top Row (Y = +20.2): S+, S-, L+, L- (rotated vertically so each 2-char label fits cleanly in 2.54mm pitch!)
  const topRowY = 20.2;
  const topPins = [
    { x: -3.81, label: 'S+' },
    { x: -1.27, label: 'S-' },
    { x:  1.27, label: 'L+' },
    { x:  3.81, label: 'L-' }
  ];
  for (const p of topPins) {
    holes.push({ cx: p.x, cy: topRowY, w: pinHole, d: pinHole });
    grooves.push(...makeTextRects(p.label, p.x, topRowY + 1.45, {
      charW: 0.62, charH: 1.05, strokeW: 0.20, charGap: 0.22, vertical: true, align: 'start'
    }));
  }

  // HW-373 V1.2.1 Input pads (Y = +15.7): IN+, IN-
  holes.push({ cx: -7.25, cy: 15.7, w: 1.6, d: 1.6 });
  holes.push({ cx:  7.25, cy: 15.7, w: 1.6, d: 1.6 });
  grooves.push(...makeTextRects('IN+', -7.25, 13.2, { charW: 0.65, charH: 1.10, strokeW: 0.20, charGap: 0.22, vertical: false }));
  grooves.push(...makeTextRects('IN-',  7.25, 13.2, { charW: 0.65, charH: 1.10, strokeW: 0.20, charGap: 0.22, vertical: false }));

  // HW-373 Output & Battery pads (Y = -7.3): O+, B+, B-, O-
  const tpBotY = -7.3;
  const tpBotPins = [
    { x: -7.25, label: 'O+' },
    { x: -2.54, label: 'B+' },
    { x:  2.54, label: 'B-' },
    { x:  7.25, label: 'O-' }
  ];
  for (const p of tpBotPins) {
    holes.push({ cx: p.x, cy: tpBotY, w: 1.6, d: 1.6 });
    grooves.push(...makeTextRects(p.label, p.x, tpBotY + 2.4, { charW: 0.68, charH: 1.12, strokeW: 0.20, charGap: 0.24, vertical: false }));
  }

  // Piezo Buzzer (Y = -14.0): BZ+, BZ-
  const buzY = -14.0;
  holes.push({ cx: -3.25, cy: buzY, w: 2.4, d: 1.5 });
  holes.push({ cx:  3.25, cy: buzY, w: 2.4, d: 1.5 });
  grooves.push(...makeTextRects('BZ+', -8.2, buzY, { charW: 0.62, charH: 1.08, strokeW: 0.20, charGap: 0.22, vertical: false }));
  grooves.push(...makeTextRects('BZ-',  8.2, buzY, { charW: 0.62, charH: 1.08, strokeW: 0.20, charGap: 0.22, vertical: false }));

  // Bottom Row (Y = -20.2): V+, GD, BZ, LD
  const botRowY = -20.2;
  const botPins = [
    { x: -3.81, label: 'V+' },
    { x: -1.27, label: 'GD' },
    { x:  1.27, label: 'BZ' },
    { x:  3.81, label: 'LD' }
  ];
  for (const p of botPins) {
    holes.push({ cx: p.x, cy: botRowY, w: pinHole, d: pinHole });
    grooves.push(...makeTextRects(p.label, p.x, botRowY - 1.45, {
      charW: 0.62, charH: 1.05, strokeW: 0.20, charGap: 0.22, vertical: true, align: 'end'
    }));
  }

  [[-11.4, 23.4], [11.4, 23.4], [11.4, -23.4], [-11.4, -23.4]].forEach(([fx, fy]) => {
    grooves.push({ cx: fx, cy: fy, w: 0.5, d: 0.5 });
  });

  const bGrey = createSTLBuilder('baquelita_potencia_24x48_base_petg_gris');
  bGrey.addPlateWithDualEngraving(BOARD_L, BOARD_W, BOARD_H, ENGRAVE_DEPTH, holes, grooves);
  fs.writeFileSync(path.join(gitDir, 'baquelita_potencia_24x48_base_petg_gris.stl'), bGrey.toSTL());

  const bGreen = createSTLBuilder('baquelita_potencia_24x48_cunas_petg_verde');
  bGreen.addDualTextInlay(BOARD_L, BOARD_W, BOARD_H, ENGRAVE_DEPTH, holes, grooves);
  bGreen.addBox(-9.3, 4.2, BOARD_H, 1.4, 18.0, 2.0);
  bGreen.addBox( 9.3, 4.2, BOARD_H, 1.4, 18.0, 2.0);
  bGreen.addHollowRing(0.0, -14.0, BOARD_H, 6.2, 7.2, 2.2, 28);
  fs.writeFileSync(path.join(gitDir, 'baquelita_potencia_24x48_cunas_petg_verde.stl'), bGreen.toSTL());

  const bFull = createSTLBuilder('baquelita_potencia_24x48_completa');
  bFull.addPlateWithDualEngraving(BOARD_L, BOARD_W, BOARD_H, ENGRAVE_DEPTH, holes, grooves);
  bFull.addBox(-9.3, 4.2, BOARD_H, 1.4, 18.0, 2.0);
  bFull.addBox( 9.3, 4.2, BOARD_H, 1.4, 18.0, 2.0);
  bFull.addHollowRing(0.0, -14.0, BOARD_H, 6.2, 7.2, 2.2, 28);
  fs.writeFileSync(path.join(gitDir, 'baquelita_potencia_24x48_completa.stl'), bFull.toSTL());

  console.log(`Power Board STLs rebuilt! Base=${bGrey.getCount()} tris, Green=${bGreen.getCount()} tris, Full=${bFull.getCount()} tris`);
}

buildLogicBoardAll();
buildPowerBoardAll();
