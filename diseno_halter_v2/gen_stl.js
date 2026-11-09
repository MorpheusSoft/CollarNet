const fs = require("fs");
const path = require("path");

// ============================================================================
// HIGH-LEGIBILITY VECTOR STROKE GLYPHS (0..1 x 0..1)
// Calibrated with strokeW = 0.40 mm (full 0.4mm nozzle width!) and charW = 0.94 mm,
// charH = 1.44 mm — Bottom-face only ("cara de abajo"), protruding 0.40 mm
// outward ("sobresalidas sobre la base normal sin hundirla").
// ============================================================================
const ORTHO_GLYPHS = {
  '0': [[[0,0],[1,0]], [[1,0],[1,1]], [[1,1],[0,1]], [[0,1],[0,0]]],
  '1': [[[0.5,0],[0.5,1]], [[0.15,1],[0.5,1]], [[0.15,0],[0.85,0]]],
  '2': [[[0,1],[1,1]], [[1,1],[1,0.5]], [[1,0.5],[0,0.5]], [[0,0.5],[0,0]], [[0,0],[1,0]]],
  '3': [[[0,1],[1,1]], [[1,1],[1,0]], [[0,0],[1,0]], [[0.2,0.5],[1,0.5]]],
  '4': [[[0,1],[0,0.45]], [[0,0.45],[1,0.45]], [[0.78,1],[0.78,0]]],
  '5': [[[1,1],[0,1]], [[0,1],[0,0.5]], [[0,0.5],[1,0.5]], [[1,0.5],[1,0]], [[1,0],[0,0]]],
  '6': [[[1,1],[0,1]], [[0,1],[0,0]], [[0,0],[1,0]], [[1,0],[1,0.5]], [[1,0.5],[0,0.5]]],
  '7': [[[0,1],[1,1]], [[1,1],[1,0]]],
  '8': [[[0,0],[1,0]], [[1,0],[1,1]], [[1,1],[0,1]], [[0,1],[0,0]], [[0,0.5],[1,0.5]]],
  '9': [[[0,0],[1,0]], [[1,0],[1,1]], [[1,1],[0,1]], [[0,1],[0,0.5]], [[0,0.5],[1,0.5]]],
  'A': [[[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0]], [[0,0.45],[1,0.45]]],
  'B': [[[0,0],[0,1]], [[0,1],[0.85,1]], [[0.85,1],[0.85,0.5]], [[0,0.5],[1,0.5]], [[1,0.5],[1,0]], [[1,0],[0,0]]],
  'C': [[[1,1],[0,1]], [[0,1],[0,0]], [[0,0],[1,0]]],
  'D': [[[0,0],[0,1]], [[0,1],[0.8,1]], [[0.8,1],[0.8,0.85]], [[1,0.85],[1,0.15]], [[0.8,0],[0,0]]],
  'E': [[[1,1],[0,1]], [[0,1],[0,0]], [[0,0],[1,0]], [[0,0.5],[0.8,0.5]]],
  'F': [[[0,0],[0,1]], [[0,1],[1,1]], [[0,0.5],[0.8,0.5]]],
  'G': [[[1,1],[0,1]], [[0,1],[0,0]], [[0,0],[1,0]], [[1,0],[1,0.5]], [[0.45,0.5],[1,0.5]]],
  'I': [[[0.15,1],[0.85,1]], [[0.5,1],[0.5,0]], [[0.15,0],[0.85,0]]],
  'K': [[[0,0],[0,1]], [[0,0.5],[0.7,0.5]], [[0.7,1],[0.7,0.5]], [[0.85,0.5],[0.85,0]]],
  'L': [[[0,1],[0,0]], [[0,0],[1,0]]],
  'M': [[[0,0],[0,1]], [[0,1],[1,1]], [[0.5,1],[0.5,0.2]], [[1,1],[1,0]]],
  'N': [[[0,0],[0,1]], [[0,1],[0.5,1]], [[0.5,1],[0.5,0]], [[0.5,0],[1,0]], [[1,0],[1,1]]],
  'O': [[[0,0],[1,0]], [[1,0],[1,1]], [[1,1],[0,1]], [[0,1],[0,0]]],
  'P': [[[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0.5]], [[1,0.5],[0,0.5]]],
  'R': [[[0,0],[0,1]], [[0,1],[1,1]], [[1,1],[1,0.5]], [[1,0.5],[0,0.5]], [[0.6,0.5],[0.6,0]], [[0.6,0],[1,0]]],
  'S': [[[1,1],[0,1]], [[0,1],[0,0.5]], [[0,0.5],[1,0.5]], [[1,0.5],[1,0]], [[1,0],[0,0]]],
  'T': [[[0,1],[1,1]], [[0.5,1],[0.5,0]]],
  'U': [[[0,1],[0,0]], [[0,0],[1,0]], [[1,0],[1,1]]],
  'V': [[[0,1],[0,0.25]], [[0,0.25],[0.25,0.25]], [[0.25,0.25],[0.25,0]], [[0.25,0],[0.75,0]], [[0.75,0],[0.75,0.25]], [[0.75,0.25],[1,0.25]], [[1,0.25],[1,1]]],
  'X': [[[0,1],[0,0.6]], [[1,1],[1,0.6]], [[0,0.4],[0,0]], [[1,0.4],[1,0]], [[0,0.5],[1,0.5]], [[0.5,0.75],[0.5,0.25]]],
  '+': [[[0.1,0.5],[0.9,0.5]], [[0.5,0.1],[0.5,0.9]]],
  '-': [[[0.15,0.5],[0.85,0.5]]]
};

function makeBottomTextRects(text, anchorX, anchorY, opts = {}) {
  const {
    charW = 0.94,
    charH = 1.44,
    strokeW = 0.40,
    charGap = 0.36,
    vertical = false,
    align = 'center'
  } = opts;

  const rects = [];
  const str = String(text).toUpperCase();
  const n = str.length;
  if (n === 0) return rects;

  const stepU = charW + strokeW + charGap;
  const totalCenterSpan = (n - 1) * stepU + charW;

  let uStart;
  if (align === 'start') {
    uStart = strokeW / 2;
  } else if (align === 'end') {
    uStart = -totalCenterSpan - strokeW / 2;
  } else {
    uStart = -totalCenterSpan / 2;
  }
  const vStart = -charH / 2;

  function mapUV(u, v) {
    if (!vertical) {
      return [anchorX - u, anchorY + v];
    } else {
      return [anchorX + v, anchorY + u];
    }
  }

  for (let i = 0; i < n; i++) {
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

function createSTLBuilder(solidName) {
  const tris = [];

  function addTri(v1, v2, v3) {
    const ux = v2[0] - v1[0], uy = v2[1] - v1[1], uz = v2[2] - v1[2];
    const vx = v3[0] - v1[0], vy = v3[1] - v1[1], vz = v3[2] - v1[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    tris.push([nx, ny, nz, v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]]);
  }

  function addQuad(a, b, c, d) {
    addTri(a, b, c);
    addTri(a, c, d);
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

  // ==========================================================================
  // FLAT UN-SUNKEN BASE PLATE ("base normal sin hundirla")
  // - Spans from zPlateBot (0.40 mm) to zPlateTop (2.00 mm) -> 1.60 mm thick!
  // - Bottom face at zPlateBot (0.40 mm) is 100% FLAT (ZERO sunken windows!).
  // - Has 13 top-face support root sockets (zSocketFloor = 1.00..2.00 mm) so
  //   the 13 green supports are deeply anchored INSIDE the white base plate.
  // ==========================================================================
  function addFlatBasePlate(w, d, zPlateBot, zPlateTop, zSocketFloor, throughHoles, topRootSockets = [], bottomFlushGrooves = []) {
    const xSet = new Set([-w / 2, w / 2]);
    const ySet = new Set([-d / 2, d / 2]);

    for (const r of [...throughHoles, ...topRootSockets, ...bottomFlushGrooves]) {
      xSet.add(Number((r.cx - r.w / 2).toFixed(3)));
      xSet.add(Number((r.cx + r.w / 2).toFixed(3)));
      ySet.add(Number((r.cy - r.d / 2).toFixed(3)));
      ySet.add(Number((r.cy + r.d / 2).toFixed(3)));
    }

    const xs = Array.from(xSet).filter(x => x >= -w / 2 && x <= w / 2).sort((a, b) => a - b);
    const ys = Array.from(ySet).filter(y => y >= -d / 2 && y <= d / 2).sort((a, b) => a - b);
    const nx = xs.length - 1;
    const ny = ys.length - 1;

    const zBotArr = Array.from({ length: nx }, () => new Float32Array(ny).fill(zPlateBot));
    const zTopArr = Array.from({ length: nx }, () => new Float32Array(ny).fill(zPlateTop));
    const isHoleArr = Array.from({ length: nx }, () => new Uint8Array(ny).fill(0));

    for (let ix = 0; ix < nx; ix++) {
      const mx = (xs[ix] + xs[ix + 1]) / 2;
      for (let iy = 0; iy < ny; iy++) {
        const my = (ys[iy] + ys[iy + 1]) / 2;
        let hole = false;
        for (const h of throughHoles) {
          if (
            mx > h.cx - h.w / 2 + 1e-4 &&
            mx < h.cx + h.w / 2 - 1e-4 &&
            my > h.cy - h.d / 2 + 1e-4 &&
            my < h.cy + h.d / 2 - 1e-4
          ) {
            hole = true;
            break;
          }
        }
        if (hole) {
          isHoleArr[ix][iy] = 1;
          continue;
        }
        for (const bg of bottomFlushGrooves) {
          if (
            mx > bg.cx - bg.w / 2 + 1e-4 &&
            mx < bg.cx + bg.w / 2 - 1e-4 &&
            my > bg.cy - bg.d / 2 + 1e-4 &&
            my < bg.cy + bg.d / 2 - 1e-4
          ) {
            zBotArr[ix][iy] = bg.zFloor !== undefined ? bg.zFloor : (zPlateBot + 0.40);
            break;
          }
        }
        for (const ts of topRootSockets) {
          if (
            mx > ts.cx - ts.w / 2 + 1e-4 &&
            mx < ts.cx + ts.w / 2 - 1e-4 &&
            my > ts.cy - ts.d / 2 + 1e-4 &&
            my < ts.cy + ts.d / 2 - 1e-4
          ) {
            zTopArr[ix][iy] = zSocketFloor;
            break;
          }
        }
      }
    }

    for (let ix = 0; ix < nx; ix++) {
      const x0 = xs[ix], x1 = xs[ix + 1];
      for (let iy = 0; iy < ny; iy++) {
        if (isHoleArr[ix][iy]) continue;
        const y0 = ys[iy], y1 = ys[iy + 1];
        const zB = zBotArr[ix][iy];
        const zT = zTopArr[ix][iy];

        addQuad([x0, y0, zT], [x1, y0, zT], [x1, y1, zT], [x0, y1, zT]);
        addQuad([x0, y0, zB], [x0, y1, zB], [x1, y1, zB], [x1, y0, zB]);

        function emitEdgeWalls(p0, p1, nHole, nZB, nZT) {
          if (nHole) {
            addQuad([p0[0], p0[1], zB], [p1[0], p1[1], zB], [p1[0], p1[1], zT], [p0[0], p0[1], zT]);
          } else {
            if (zB < nZB - 1e-5) {
              addQuad([p0[0], p0[1], zB], [p1[0], p1[1], zB], [p1[0], p1[1], nZB], [p0[0], p0[1], nZB]);
            }
            if (zT > nZT + 1e-5) {
              addQuad([p0[0], p0[1], nZT], [p1[0], p1[1], nZT], [p1[0], p1[1], zT], [p0[0], p0[1], zT]);
            }
          }
        }

        emitEdgeWalls(
          [x0, y0], [x1, y0],
          iy === 0 ? 1 : isHoleArr[ix][iy - 1],
          iy === 0 ? 0 : zBotArr[ix][iy - 1],
          iy === 0 ? 0 : zTopArr[ix][iy - 1]
        );
        emitEdgeWalls(
          [x1, y1], [x0, y1],
          iy === ny - 1 ? 1 : isHoleArr[ix][iy + 1],
          iy === ny - 1 ? 0 : zBotArr[ix][iy + 1],
          iy === ny - 1 ? 0 : zTopArr[ix][iy + 1]
        );
        emitEdgeWalls(
          [x0, y1], [x0, y0],
          ix === 0 ? 1 : isHoleArr[ix - 1][iy],
          ix === 0 ? 0 : zBotArr[ix - 1][iy],
          ix === 0 ? 0 : zTopArr[ix - 1][iy]
        );
        emitEdgeWalls(
          [x1, y0], [x1, y1],
          ix === nx - 1 ? 1 : isHoleArr[ix + 1][iy],
          ix === nx - 1 ? 0 : zBotArr[ix + 1][iy],
          ix === nx - 1 ? 0 : zTopArr[ix + 1][iy]
        );
      }
    }
  }

  // Green raised letters protruding on the bottom face (from zBot to zTop)
  function addBottomRaisedTextGreen(w, d, zBot, zTop, throughHoles, letterGrooves) {
    const xSet = new Set([-w / 2, w / 2]);
    const ySet = new Set([-d / 2, d / 2]);

    for (const r of [...throughHoles, ...letterGrooves]) {
      xSet.add(Number((r.cx - r.w / 2).toFixed(3)));
      xSet.add(Number((r.cx + r.w / 2).toFixed(3)));
      ySet.add(Number((r.cy - r.d / 2).toFixed(3)));
      ySet.add(Number((r.cy + r.d / 2).toFixed(3)));
    }

    const xs = Array.from(xSet).filter(x => x >= -w / 2 && x <= w / 2).sort((a, b) => a - b);
    const ys = Array.from(ySet).filter(y => y >= -d / 2 && y <= d / 2).sort((a, b) => a - b);
    const nx = xs.length - 1;
    const ny = ys.length - 1;

    const state = Array.from({ length: nx }, () => new Uint8Array(ny).fill(0));

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
        if (isHole) continue;
        for (const g of letterGrooves) {
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

    for (let ix = 0; ix < nx; ix++) {
      const x0 = xs[ix], x1 = xs[ix + 1];
      for (let iy = 0; iy < ny; iy++) {
        if (state[ix][iy] !== 1) continue;
        const y0 = ys[iy], y1 = ys[iy + 1];

        addQuad([x0, y0, zTop], [x1, y0, zTop], [x1, y1, zTop], [x0, y1, zTop]);
        addQuad([x0, y0, zBot], [x0, y1, zBot], [x1, y1, zBot], [x1, y0, zBot]);

        function emitInlayWall(p0, p1, sN) {
          if (sN !== 1) {
            addQuad([p0[0], p0[1], zBot], [p1[0], p1[1], zBot], [p1[0], p1[1], zTop], [p0[0], p0[1], zTop]);
          }
        }

        emitInlayWall([x0, y0], [x1, y0], iy === 0 ? 0 : state[ix][iy - 1]);
        emitInlayWall([x1, y1], [x0, y1], iy === ny - 1 ? 0 : state[ix][iy + 1]);
        emitInlayWall([x0, y1], [x0, y0], ix === 0 ? 0 : state[ix - 1][iy]);
        emitInlayWall([x1, y0], [x1, y1], ix === nx - 1 ? 0 : state[ix + 1][iy]);
      }
    }
  }

  // ==========================================================================
  // DEEP-ROOTED REINFORCED LOCATOR PIN ("Palito de soporte empotrado")
  // ==========================================================================
  function addSteppedPin(cx, cy, zPlateTop, opts = {}) {
    const holeD       = opts.holeD       || 3.20;
    const rootSize    = opts.rootSize    || 3.50;
    const zRootBot    = opts.zRootBot    !== undefined ? opts.zRootBot : (zPlateTop - 1.00);
    const rBase       = opts.rBase       || 2.12;
    const hBase       = opts.hBase       || 2.50; // Matches 2.50 mm male pin header insulator height!
    const rPin        = opts.rPin        || ((holeD - 0.38) / 2);
    const hPin        = opts.hPin        || 3.40;
    const segs        = 32;

    if (zRootBot < zPlateTop) {
      addBox(cx, cy, zRootBot, rootSize, rootSize, zPlateTop - zRootBot);
    }

    const zMid    = zPlateTop + hBase;
    const zFillet = zMid + 0.35;
    const zTaper  = zMid + 1.85;
    const zTop    = zMid + hPin;
    const rFillet = Math.min(rBase, rPin + 0.22);
    const rTip    = rPin * 0.66;

    const profile = [
      [zPlateTop, rBase],
      [zMid,      rBase],
      [zMid,      rFillet],
      [zFillet,   rPin],
      [zTaper,    rPin],
      [zTop,      rTip]
    ];

    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);

      addTri(
        [cx, cy, zPlateTop],
        [cx + c1 * rBase, cy + s1 * rBase, zPlateTop],
        [cx + c0 * rBase, cy + s0 * rBase, zPlateTop]
      );

      for (let li = 0; li < profile.length - 1; li++) {
        const [zA, rA] = profile[li];
        const [zB, rB] = profile[li + 1];
        const p0A = [cx + c0 * rA, cy + s0 * rA, zA];
        const p1A = [cx + c1 * rA, cy + s1 * rA, zA];
        const p0B = [cx + c0 * rB, cy + s0 * rB, zB];
        const p1B = [cx + c1 * rB, cy + s1 * rB, zB];
        addQuad(p0A, p1A, p1B, p0B);
      }

      addTri(
        [cx, cy, zTop],
        [cx + c0 * rTip, cy + s0 * rTip, zTop],
        [cx + c1 * rTip, cy + s1 * rTip, zTop]
      );
    }
  }

  // ==========================================================================
  // DEEP-ROOTED REINFORCED SNAP-FIT HOOK ("Gancho elástico irrompible")
  // ==========================================================================
  function addSnapFitPinchHook(cx, cy, zPlateTop, opts = {}) {
    const holeD     = opts.holeD     || 3.20;
    const rootSize  = opts.rootSize  || 3.50;
    const zRootBot  = opts.zRootBot  !== undefined ? opts.zRootBot : (zPlateTop - 1.00);
    const rBase     = opts.rBase     || 2.12;
    const hBase     = opts.hBase     || 2.50; // Matches 2.50 mm pin header plastic!
    const rShaft    = opts.rShaft    || ((holeD - 0.34) / 2);
    const hPcb      = opts.hPcb      || 1.85; // 1.60 mm PCB + 0.25 mm vertical clearance
    const rHead     = opts.rHead     || ((holeD + 0.16) / 2);
    const hRamp     = opts.hRamp     || 0.60;
    const hLand     = opts.hLand     || 0.40;
    const hTip      = opts.hTip      || 1.45;
    const rTip      = opts.rTip      || ((holeD - 0.95) / 2);
    const slotHalfW = opts.slotHalfW || 0.42;

    if (zRootBot < zPlateTop) {
      addBox(cx, cy, zRootBot, rootSize, rootSize, zPlateTop - zRootBot);
    }

    const zShoulder     = zPlateTop + hBase;
    const zSolidNeckTop = zShoulder + 0.35;
    const zNeckTop      = zShoulder + hPcb;
    const zBarbPeak     = zNeckTop + hRamp;
    const zBarbTop      = zBarbPeak + hLand;
    const zTop          = zBarbTop + hTip;
    const rNeckRoot     = Math.min(rBase, rShaft + 0.22);

    const solidProfile = [
      [zPlateTop,     rBase],
      [zShoulder,     rBase],
      [zShoulder,     rNeckRoot],
      [zSolidNeckTop, rShaft]
    ];

    const segs = 32;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);

      addTri(
        [cx, cy, zPlateTop],
        [cx + c1 * rBase, cy + s1 * rBase, zPlateTop],
        [cx + c0 * rBase, cy + s0 * rBase, zPlateTop]
      );

      for (let li = 0; li < solidProfile.length - 1; li++) {
        const [zA, rA] = solidProfile[li];
        const [zB, rB] = solidProfile[li + 1];
        addQuad(
          [cx + c0 * rA, cy + s0 * rA, zA],
          [cx + c1 * rA, cy + s1 * rA, zA],
          [cx + c1 * rB, cy + s1 * rB, zB],
          [cx + c0 * rB, cy + s0 * rB, zB]
        );
      }

      addTri(
        [cx, cy, zSolidNeckTop],
        [cx + c0 * rShaft, cy + s0 * rShaft, zSolidNeckTop],
        [cx + c1 * rShaft, cy + s1 * rShaft, zSolidNeckTop]
      );
    }

    const levels = [
      [zSolidNeckTop - 0.05, rShaft],
      [zNeckTop,             rShaft],
      [zBarbPeak,            rHead],
      [zBarbTop,             rHead],
      [zTop,                 rTip]
    ];

    const arcSteps = 18;
    for (const side of [1, -1]) {
      const rings = [];
      for (let li = 0; li < levels.length; li++) {
        const [z, R] = levels[li];
        const ratio = Math.min(0.88, slotHalfW / R);
        const aMin = Math.asin(ratio);
        const aMax = Math.PI - aMin;
        const ring = [];
        for (let k = 0; k <= arcSteps; k++) {
          const a = side === 1
            ? (aMin + (k / arcSteps) * (aMax - aMin))
            : (Math.PI + aMin + (k / arcSteps) * (aMax - aMin));
          ring.push([cx + R * Math.cos(a), cy + R * Math.sin(a), z]);
        }
        rings.push(ring);
      }

      for (let li = 0; li < rings.length - 1; li++) {
        const rA = rings[li];
        const rB = rings[li + 1];
        const n = rA.length - 1;
        for (let k = 0; k < n; k++) {
          addQuad(rA[k], rA[k + 1], rB[k + 1], rB[k]);
        }
        addQuad(rA[n], rA[0], rB[0], rB[n]);
      }

      const bRing = rings[0];
      const bMid = [(bRing[0][0] + bRing[arcSteps][0]) / 2, (bRing[0][1] + bRing[arcSteps][1]) / 2, bRing[0][2]];
      for (let k = 0; k < arcSteps; k++) {
        addTri(bMid, bRing[k + 1], bRing[k]);
      }

      const tRing = rings[rings.length - 1];
      const tMid = [(tRing[0][0] + tRing[arcSteps][0]) / 2, (tRing[0][1] + tRing[arcSteps][1]) / 2, tRing[0][2]];
      for (let k = 0; k < arcSteps; k++) {
        addTri(tMid, tRing[k], tRing[k + 1]);
      }
    }
  }

  function toSTL() {
    const buf = Buffer.alloc(84 + tris.length * 50);
    buf.write(`Binary STL - ${solidName}`.slice(0, 80), 0, "ascii");
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

  return {
    addBox,
    addFlatBasePlate,
    addBottomRaisedTextGreen,
    addSteppedPin,
    addSnapFitPinchHook,
    toSTL
  };
}

// ============================================================================
// EXACT BOARD DIMENSIONS & VERNIER-CALIBRATED MODULE COORDINATES
// ============================================================================
const LOGIC_L = 107.0;
const LOGIC_W = 70.0;
const LOGIC_H = 1.60;
const ROOT_SOCKET_SIZE = 3.50;

const MODULE_SUPPORTS = [
  // SIM800L (3 supports, D = 3.65 mm)
  { cx: -43.575, cy:  29.000, type: 'pin',  holeD: 3.65 },
  { cx: -43.575, cy:   6.650, type: 'hook', holeD: 3.65 },
  { cx:  -9.425, cy:  29.000, type: 'hook', holeD: 3.65 },

  // GY-GPS6MV2 (4 supports, D = 3.35 mm)
  { cx:  12.325, cy:  28.413, type: 'hook', holeD: 3.35 },
  { cx:  12.325, cy:   8.088, type: 'pin',  holeD: 3.35 },
  { cx:  43.225, cy:  28.413, type: 'pin',  holeD: 3.35 },
  { cx:  43.225, cy:   8.088, type: 'hook', holeD: 3.35 },

  // Acelerómetro ITG/MPU6050 (2 supports, D = 3.225 mm)
  { cx: -36.038, cy: -23.175, type: 'hook', holeD: 3.225 },
  { cx: -19.963, cy: -23.175, type: 'pin',  holeD: 3.225 },

  // ESP-32 (4 supports, D = 3.15 mm)
  { cx:  -4.150, cy:  -2.675, type: 'hook', holeD: 3.15 },
  { cx:  -4.150, cy: -26.325, type: 'pin',  holeD: 3.15 },
  { cx:  41.600, cy:  -2.675, type: 'pin',  holeD: 3.15 },
  { cx:  41.600, cy: -26.325, type: 'hook', holeD: 3.15 }
];

function getLogicFeatures() {
  const holes = [];
  const letterGrooves = [];
  const topRootSockets = [];
  const fiducials = [];
  const pinHole = 1.50;

  // 1) 4 Corner Square Mounting Holes for Capsule Pillars (UNTOUCHED: DX = 98.0 -> ±49.0, DY = 61.0 -> ±30.5)
  const cornerHoleSize = 3.15;
  [[-49.0, 30.5], [49.0, 30.5], [49.0, -30.5], [-49.0, -30.5]].forEach(([mx, my]) => {
    holes.push({ cx: mx, cy: my, w: cornerHoleSize, d: cornerHoleSize });
  });

  // 2) SIM800L EVB (7 pins along Y at X = -8.50, Pin 0 '5V' at Y = +23.78 down to Pin 6 'RST' at Y = +8.54)
  const simPinX = -8.50;
  const simTopPinY = 23.78;
  const simLabels = ["5V", "GND", "VDD", "TXD", "RXD", "GND", "RST"];
  for (let i = 0; i < 7; i++) {
    const py = simTopPinY - i * 2.54;
    holes.push({ cx: simPinX, cy: py, w: pinHole, d: pinHole });
    letterGrooves.push(...makeBottomTextRects(simLabels[i], simPinX + 2.10, py, {
      charW: 0.94, charH: 1.44, strokeW: 0.40, charGap: 0.36, vertical: false, align: 'end'
    }));
  }

  // 3) GY-GPS6MV2 (4 pins along Y at X = +11.50, centered at Y = +18.25)
  const gpsPinX = 11.50;
  const gpsPinCenterY = 18.25;
  const gpsLabels = ["VCC", "RX", "TX", "GND"];
  for (let i = 0; i < 4; i++) {
    const py = gpsPinCenterY + (i - 1.5) * 2.54;
    holes.push({ cx: gpsPinX, cy: py, w: pinHole, d: pinHole });
    letterGrooves.push(...makeBottomTextRects(gpsLabels[i], gpsPinX - 2.10, py, {
      charW: 0.94, charH: 1.44, strokeW: 0.40, charGap: 0.36, vertical: false, align: 'start'
    }));
  }

  // 4) ITG/MPU6050 (8 pins along X at Y = -12.00, centered at X = -28.00)
  const mpuPinY = -12.00;
  const mpuPinCenterX = -28.00;
  const mpuLabels = ["INT", "AD0", "XCL", "XDA", "SDA", "SCL", "GND", "VCC"];
  for (let i = 0; i < 8; i++) {
    const px = mpuPinCenterX + (i - 3.5) * 2.54;
    holes.push({ cx: px, cy: mpuPinY, w: pinHole, d: pinHole });
    letterGrooves.push(...makeBottomTextRects(mpuLabels[i], px, mpuPinY + 2.10, {
      charW: 0.94, charH: 1.44, strokeW: 0.40, charGap: 0.36, vertical: true, align: 'start'
    }));
  }

  // 5) ESP-32 (30 Pins: 2 rows of 15 pins along X, Pin 0 at X = -1.19 to Pin 14 at X = +34.37)
  const espPinStartX = -1.19;
  const espTopRowY   = -1.80;
  const espBotRowY   = -27.20;
  const espTopLabels = ["D23", "D22", "TX0", "RX0", "D21", "D19", "D18", "D5", "TX2", "RX2", "D4", "D2", "D15", "GND", "3V3"];
  const espBotLabels = ["EN", "VP", "VN", "D34", "D35", "D32", "D33", "D25", "D26", "D27", "D14", "D12", "D13", "GND", "VIN"];

  for (let i = 0; i < 15; i++) {
    const px = espPinStartX + i * 2.54;
    holes.push({ cx: px, cy: espTopRowY, w: pinHole, d: pinHole });
    holes.push({ cx: px, cy: espBotRowY, w: pinHole, d: pinHole });

    letterGrooves.push(...makeBottomTextRects(espTopLabels[i], px, espTopRowY - 2.10, {
      charW: 0.94, charH: 1.44, strokeW: 0.40, charGap: 0.36, vertical: true, align: 'end'
    }));
    letterGrooves.push(...makeBottomTextRects(espBotLabels[i], px, espBotRowY + 2.10, {
      charW: 0.94, charH: 1.44, strokeW: 0.40, charGap: 0.36, vertical: true, align: 'start'
    }));
  }

  // 6) 13 Top-face root sockets so every green support is rooted 1.00 mm deep inside the plate
  for (const sup of MODULE_SUPPORTS) {
    topRootSockets.push({ cx: sup.cx, cy: sup.cy, w: ROOT_SOCKET_SIZE, d: ROOT_SOCKET_SIZE });
  }

  // 7) 4 tiny corner alignment fiducials (0.6 x 0.6 mm) so Base & Green STL share the exact bounding box in Bambu Studio
  [[-53.2, 34.7], [53.2, 34.7], [53.2, -34.7], [-53.2, -34.7]].forEach(([fx, fy]) => {
    fiducials.push({ cx: fx, cy: fy, w: 0.6, d: 0.6 });
  });

  return { holes, letterGrooves, topRootSockets, fiducials };
}

// ============================================================================
// BUILD MODE:
// - Base plate is 100% FLAT ("sin hundirla", zero rectangular pits!):
//   * Bottom face at Z = 0.00 mm, Top face at Z = 1.60 mm.
//   * Green letters are on the BOTTOM FACE ONLY ("cara de abajo"), protruding
//     outward 0.40 mm below the flat base (Z = -0.40 mm to Z = 0.00 mm) AND
//     anchored 0.40 mm into the flat base (Z = 0.00 to Z = +0.40 mm) so they
//     stand proud ("sobresalidas sobre la base normal sin hundirla")!
//   * 13 Green supports & hooks are on the TOP FACE ONLY ("cara de arriba"),
//     anchored from Z = 0.60 mm to Z = 1.60 mm inside the plate and rising upward!
// ============================================================================
const Z_PROTRUDE_BOT = -0.40; // Letters protrude 0.40 mm outward from the flat bottom face (Z = 0.00)!
const Z_INLAY_TOP    =  0.40; // Anchored 0.40 mm inside the flat bottom face
const Z_SOCKET_FLOOR =  0.60; // Top support roots start at Z = 0.60 mm inside the 1.60 mm plate

function buildLogicBase(builder) {
  const { holes, letterGrooves, topRootSockets, fiducials } = getLogicFeatures();
  // Notice: ZERO reliefWindows (no sunken rectangular pits!).
  // Only the exact letter strokes have a 0.40mm anchor socket so the flat base around every letter is 100% un-sunken at Z = 0.00!
  builder.addFlatBasePlate(
    LOGIC_L,
    LOGIC_W,
    0.00,
    LOGIC_H,
    Z_SOCKET_FLOOR,
    holes,
    topRootSockets,
    [...letterGrooves, ...fiducials]
  );
}

function buildLogicGreen(builder, includeText = true) {
  if (includeText) {
    const { holes, letterGrooves, fiducials } = getLogicFeatures();
    // Letters protrude outward on the BOTTOM face from Z = -0.40 mm to Z = +0.40 mm!
    builder.addBottomRaisedTextGreen(
      LOGIC_L,
      LOGIC_W,
      Z_PROTRUDE_BOT,
      Z_INLAY_TOP,
      holes,
      [...letterGrooves, ...fiducials]
    );
  }

  for (const sup of MODULE_SUPPORTS) {
    if (sup.type === 'hook') {
      builder.addSnapFitPinchHook(sup.cx, sup.cy, LOGIC_H, {
        holeD: sup.holeD,
        rootSize: ROOT_SOCKET_SIZE,
        zRootBot: Z_SOCKET_FLOOR
      });
    } else {
      builder.addSteppedPin(sup.cx, sup.cy, LOGIC_H, {
        holeD: sup.holeD,
        rootSize: ROOT_SOCKET_SIZE,
        zRootBot: Z_SOCKET_FLOOR
      });
    }
  }
}

const outDir = "c:/Desarrollo/CollarNet/diseno_halter_v2";

const bLogicGrey = createSTLBuilder("baquelita_logica_base_petg_gris");
buildLogicBase(bLogicGrey);
const bufLogicGrey = bLogicGrey.toSTL();
fs.writeFileSync(path.join(outDir, "baquelita_logica_108mm_base_petg_gris.stl"), bufLogicGrey);

const bLogicGreen = createSTLBuilder("baquelita_logica_cunas_petg_verde");
buildLogicGreen(bLogicGreen, true);
const bufLogicGreen = bLogicGreen.toSTL();
fs.writeFileSync(path.join(outDir, "baquelita_logica_108mm_cunas_petg_verde.stl"), bufLogicGreen);

const bLogicFull = createSTLBuilder("baquelita_logica_108mm_completa");
buildLogicBase(bLogicFull);
buildLogicGreen(bLogicFull, true);
const bufLogicFull = bLogicFull.toSTL();
fs.writeFileSync(path.join(outDir, "baquelita_logica_108mm_completa.stl"), bufLogicFull);

fs.copyFileSync(__filename, path.join(outDir, "gen_stl.js"));

console.log(`Logic Board STLs generated (Flat un-sunken base + Bottom protruding letters + Deep-rooted supports):`);
console.log(`  - base_petg_gris.stl:   ${bufLogicGrey.readUInt32LE(80)} tris (${(bufLogicGrey.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  - cunas_petg_verde.stl: ${bufLogicGreen.readUInt32LE(80)} tris (${(bufLogicGreen.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  - completa.stl:         ${bufLogicFull.readUInt32LE(80)} tris (${(bufLogicFull.length / 1024 / 1024).toFixed(2)} MB)`);
