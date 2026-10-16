import { strToU8, zipSync } from "fflate";

export type ImageClickerMode = "relief" | "silhouette";
export type ClickerBaseShape = "rounded" | "circle" | "heart";
export type ClickerModelOptions = {
  widthMm: number;
  bodyHeightMm: number;
  capHeightMm: number;
  switchToleranceMm: number;
  stemToleranceMm: number;
  baseShape: ClickerBaseShape;
  keychainLoop: boolean;
  buttonCount: number;
};

export type GeneratedClickerModel = {
  model3mf: Blob;
  capPositions: Float32Array;
  capParts: Float32Array[];
  palette: string[];
  platePositions: Float32Array;
  options: ClickerModelOptions;
};

// A finer raster keeps outlines close to the source PNG and closer to a typical nozzle width.
const GRID = 320;
const LAYERS = 80;
const DEFAULT_OPTIONS: ClickerModelOptions = {
  widthMm: 42, bodyHeightMm: 14, capHeightMm: 5,
  switchToleranceMm: 0.25, stemToleranceMm: 0.25, baseShape: "rounded", keychainLoop: true,
  buttonCount: 1,
};

const FACE_DEFS = [
  { dx: 1, dy: 0, dz: 0, v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { dx: -1, dy: 0, dz: 0, v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dx: 0, dy: 1, dz: 0, v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { dx: 0, dy: -1, dz: 0, v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dx: 0, dy: 0, dz: 1, v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { dx: 0, dy: 0, dz: -1, v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
] as const;

function indexOf(x: number, y: number, z: number) {
  return z * GRID * GRID + y * GRID + x;
}

function addQuad(out: number[], points: number[][]) {
  for (const idx of [[0, 1, 2], [0, 2, 3]]) {
    for (const pointIndex of idx) out.push(...points[pointIndex]);
  }
}

function smoothSideContours(positions: number[]) {
  const vertices: number[][] = [];
  const vertexMap = new Map<string, number>();
  const triangles: number[][] = [];
  const sideNeighbors: Set<number>[] = [];
  const vertexId = (offset: number) => {
    const point = [positions[offset], positions[offset + 1], positions[offset + 2]];
    const key = point.map((value) => Math.round(value * 10000)).join(":");
    let id = vertexMap.get(key);
    if (id === undefined) {
      id = vertices.length;
      vertexMap.set(key, id);
      vertices.push(point);
      sideNeighbors.push(new Set());
    }
    return id;
  };
  for (let offset = 0; offset < positions.length; offset += 9) {
    const ids = [vertexId(offset), vertexId(offset + 3), vertexId(offset + 6)];
    triangles.push(ids);
    const a = vertices[ids[0]]; const b = vertices[ids[1]]; const c = vertices[ids[2]];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normalZ = ab[0] * ac[1] - ab[1] * ac[0];
    if (Math.abs(normalZ) > 1e-8) continue;
    for (let i = 0; i < 3; i += 1) {
      const left = ids[i]; const right = ids[(i + 1) % 3];
      sideNeighbors[left].add(right); sideNeighbors[right].add(left);
    }
  }
  // A few restrained Laplacian passes soften the raster stair-steps on vertical edges.
  for (let pass = 0; pass < 2; pass += 1) {
    const next = vertices.map((point) => [...point]);
    for (let i = 0; i < vertices.length; i += 1) {
      const neighbors = sideNeighbors[i];
      if (!neighbors.size) continue;
      let x = 0; let y = 0;
      for (const neighbor of neighbors) { x += vertices[neighbor][0]; y += vertices[neighbor][1]; }
      const amount = 0.22 / neighbors.size;
      next[i][0] = vertices[i][0] * (1 - 0.22) + x * amount;
      next[i][1] = vertices[i][1] * (1 - 0.22) + y * amount;
    }
    for (let i = 0; i < vertices.length; i += 1) vertices[i] = next[i];
  }
  const smoothed: number[] = [];
  for (const triangle of triangles) for (const id of triangle) smoothed.push(...vertices[id]);
  return smoothed;
}

function surfacePositions(voxels: Uint8Array, height: number, xyStepX: number, xyStepY: number, zStepMm: number, materialIds?: Uint8Array, materialCount = 1) {
  const grouped = Array.from({ length: materialCount }, () => [] as number[]);
  for (let z = 0; z < height; z += 1) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        if (!voxels[indexOf(x, y, z)]) continue;
        const currentIndex = indexOf(x, y, z);
        const material = materialIds?.[currentIndex] ?? 0;
        for (const face of FACE_DEFS) {
          const nx = x + face.dx;
          const ny = y + face.dy;
          const nz = z + face.dz;
          const neighbor = nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && nz >= 0 && nz < height
            ? voxels[indexOf(nx, ny, nz)]
            : 0;
          if (neighbor) continue;
          const points = face.v.map(([vx, vy, vz]) => [
            (x + vx - GRID / 2) * xyStepX,
            (y + vy - GRID / 2) * xyStepY,
            (z + vz) * zStepMm,
          ]);
          addQuad(grouped[material] ?? grouped[0], points);
        }
      }
    }
  }
  return grouped.map((positions) => new Float32Array(smoothSideContours(positions)));
}

function inStemSocket(x: number, y: number, toleranceMm: number, pixelMm: number) {
  const center = GRID / 2;
  const dx = Math.abs(x + 0.5 - center);
  const dy = Math.abs(y + 0.5 - center);
  const armHalfWidth = (0.65 + toleranceMm) / pixelMm;
  const armLength = (2.2 + toleranceMm) / pixelMm;
  return (dx <= armHalfWidth && dy <= armLength) || (dy <= armHalfWidth && dx <= armLength);
}

async function drawImageGrid(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = GRID;
  canvas.height = GRID;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Browser tidak dapat membaca gambar ini.");
  ctx.clearRect(0, 0, GRID, GRID);
  const scale = Math.min(GRID / bitmap.width, GRID / bitmap.height) * 0.82;
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  ctx.drawImage(bitmap, (GRID - width) / 2, (GRID - height) / 2, width, height);
  bitmap.close();
  const data = ctx.getImageData(0, 0, GRID, GRID).data;
  const hasAlpha = Array.from({ length: GRID * GRID }, (_, i) => data[i * 4 + 3]).some((alpha) => alpha < 250);
  if (!hasAlpha) {
    // Remove only the edge-connected background. White face/details enclosed by an outline stay intact.
    const edge: number[] = [];
    for (let x = 0; x < GRID; x += 1) edge.push(x, (GRID - 1) * GRID + x);
    for (let y = 1; y < GRID - 1; y += 1) edge.push(y * GRID, y * GRID + GRID - 1);
    const background = [0, 0, 0];
    for (const pixel of edge) for (let channel = 0; channel < 3; channel += 1) background[channel] += data[pixel * 4 + channel] / edge.length;
    const queued = new Uint8Array(GRID * GRID);
    const queue = edge.filter((pixel) => {
      const p = pixel * 4;
      return Math.hypot(data[p] - background[0], data[p + 1] - background[1], data[p + 2] - background[2]) < 44;
    });
    queue.forEach((pixel) => { queued[pixel] = 1; });
    for (let head = 0; head < queue.length; head += 1) {
      const pixel = queue[head]; const x = pixel % GRID; const y = Math.floor(pixel / GRID);
      for (const next of [x > 0 ? pixel - 1 : -1, x + 1 < GRID ? pixel + 1 : -1, y > 0 ? pixel - GRID : -1, y + 1 < GRID ? pixel + GRID : -1]) {
        if (next < 0 || queued[next]) continue;
        const p = next * 4;
        if (Math.hypot(data[p] - background[0], data[p + 1] - background[1], data[p + 2] - background[2]) >= 44) continue;
        queued[next] = 1; queue.push(next);
      }
    }
    for (let pixel = 0; pixel < queued.length; pixel += 1) if (queued[pixel]) data[pixel * 4 + 3] = 0;
  }
  return data;
}

function isVisible(data: Uint8ClampedArray, pixel: number, hasTransparency: boolean) {
  const alpha = data[pixel + 3];
  if (alpha < 32) return false;
  if (hasTransparency) return true;
  const brightness = (data[pixel] + data[pixel + 1] + data[pixel + 2]) / 3;
  return brightness < 246;
}

function hexFromRgb(rgb: [number, number, number]) {
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function imagePalette(data: Uint8ClampedArray, hasTransparency: boolean) {
  const samples: [number, number, number][] = [];
  for (let i = 0; i < GRID * GRID; i += 1) {
    const p = i * 4;
    if (isVisible(data, p, hasTransparency) && i % 3 === 0) samples.push([data[p], data[p + 1], data[p + 2]]);
  }
  if (!samples.length) throw new Error("Gambar tidak memiliki bagian yang bisa dibaca.");
  const count = Math.min(4, Math.max(1, samples.length >= 12 ? 4 : samples.length));
  const centers = Array.from({ length: count }, (_, i) => [...samples[Math.floor(i * (samples.length - 1) / Math.max(1, count - 1))]] as [number, number, number]);
  for (let iteration = 0; iteration < 7; iteration += 1) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const rgb of samples) {
      let best = 0; let distance = Infinity;
      centers.forEach((center, index) => { const d = (rgb[0]-center[0])**2 + (rgb[1]-center[1])**2 + (rgb[2]-center[2])**2; if (d < distance) { best = index; distance = d; } });
      for (let ch = 0; ch < 3; ch += 1) sums[best][ch] += rgb[ch]; sums[best][3] += 1;
    }
    centers.forEach((center, index) => { if (sums[index][3]) for (let ch = 0; ch < 3; ch += 1) center[ch] = sums[index][ch] / sums[index][3]; });
  }
  return centers.map((center) => hexFromRgb(center));
}

function createCap(data: Uint8ClampedArray, mode: ImageClickerMode, options: ClickerModelOptions) {
  const zStepMm = 0.4;
  const height = Math.min(LAYERS, Math.max(8, Math.ceil(options.capHeightMm / zStepMm)));
  const voxels = new Uint8Array(GRID * GRID * LAYERS);
  const materialIds = new Uint8Array(GRID * GRID * LAYERS);
  const hasTransparency = Array.from({ length: GRID * GRID }, (_, i) => data[i * 4 + 3]).some((a) => a < 250);
  const palette = imagePalette(data, hasTransparency);
  const paletteRgb = palette.map((hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16)) as [number, number, number]);
  let occupied = 0;
  const count = Math.min(4, Math.max(1, Math.floor(options.buttonCount)));
  const cols = count === 1 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const tileW = GRID / cols; const tileH = GRID / rows;
  for (let button = 0; button < count; button += 1) {
    const col = button % cols; const row = Math.floor(button / cols);
    for (let localY = 0; localY < tileH; localY += 1) {
      for (let localX = 0; localX < tileW; localX += 1) {
        const sx = Math.min(GRID - 1, Math.floor(localX / tileW * GRID));
        const sy = Math.min(GRID - 1, Math.floor(localY / tileH * GRID));
        const pixel = (sy * GRID + sx) * 4;
        const visible = isVisible(data, pixel, hasTransparency);
        if (!visible) continue;
        const r = data[pixel]; const g = data[pixel + 1]; const b = data[pixel + 2];
        const x = Math.floor(col * tileW + localX); const y = Math.floor(row * tileH + localY);
        let material = 0; let nearest = Infinity;
        paletteRgb.forEach((rgb, index) => { const distance = (r-rgb[0])**2 + (g-rgb[1])**2 + (b-rgb[2])**2; if (distance < nearest) { nearest = distance; material = index; } });
        const maxHeight = mode === "relief" ? Math.max(7, height - Math.round(((r + g + b) / 765) * Math.max(1, options.capHeightMm * 0.3 / zStepMm))) : height;
        for (let z = 0; z < maxHeight; z += 1) {
          if (z < 6 && inStemSocket(Math.round(localX - tileW / 2 + GRID / 2), Math.round(localY - tileH / 2 + GRID / 2), options.stemToleranceMm, options.widthMm / tileW)) continue;
          const voxelIndex = indexOf(x, y, z);
          voxels[voxelIndex] = 1;
          materialIds[voxelIndex] = material;
        }
        occupied += 1;
      }
    }
  }

  // A solid boss on the underside gives the MX cross socket enough material to grip.
  // The cross is intentionally a little generous; final fit depends on printer calibration.
  const colsCount = count === 1 ? 1 : 2;
  const rowsCount = Math.ceil(count / colsCount);
  const pixelMm = options.widthMm / (GRID / colsCount);
  for (let button = 0; button < count; button += 1) {
    const col = button % colsCount; const row = Math.floor(button / colsCount);
    const tileW = GRID / colsCount; const tileH = GRID / rowsCount;
    const bossRadius = Math.ceil(4 / pixelMm);
    const cx = (col + 0.5) * tileW; const cy = (row + 0.5) * tileH;
    for (let y = Math.max(0, Math.floor(cy - bossRadius)); y < Math.min(GRID, Math.ceil(cy + bossRadius)); y += 1) {
      for (let x = Math.max(0, Math.floor(cx - bossRadius)); x < Math.min(GRID, Math.ceil(cx + bossRadius)); x += 1) {
        if (Math.abs(x + 0.5 - cx) * pixelMm > 4 || Math.abs(y + 0.5 - cy) * pixelMm > 4) continue;
        for (let z = 0; z < Math.min(height, Math.ceil(2.4 / zStepMm)); z += 1) {
          const i = indexOf(x, y, z);
          voxels[i] = 1; materialIds[i] = 0;
        }
      }
    }
    const socketTolerance = options.stemToleranceMm;
    for (let y = Math.floor(cy - bossRadius); y < Math.ceil(cy + bossRadius); y += 1) for (let x = Math.floor(cx - bossRadius); x < Math.ceil(cx + bossRadius); x += 1) {
      if (!inStemSocket(Math.round(x - col * tileW + GRID / 2), Math.round(y - row * tileH - tileH / 2 + GRID / 2), socketTolerance, pixelMm)) continue;
      for (let z = 0; z < Math.min(height, Math.ceil(3.6 / zStepMm)); z += 1) voxels[indexOf(x, y, z)] = 0;
    }
  }

  if (occupied < 30) throw new Error("Gambar terlalu tipis atau transparan. Coba PNG dengan bentuk yang lebih jelas.");
  return { parts: surfacePositions(voxels, height, options.widthMm * cols / GRID, options.widthMm * rows / GRID, zStepMm, materialIds, palette.length), palette };
}

function createPlate(options: ClickerModelOptions, imageData: Uint8ClampedArray) {
  const voxels = new Uint8Array(GRID * GRID * LAYERS);
  const center = GRID / 2;
  const height = Math.min(LAYERS, Math.max(8, Math.ceil(options.bodyHeightMm / 0.4)));
  const count = Math.min(4, Math.max(1, Math.floor(options.buttonCount)));
  const cols = count === 1 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const totalW = options.widthMm * cols; const totalH = options.widthMm * rows;
  const xyStepX = totalW / GRID; const xyStepY = totalH / GRID;
  const tileW = GRID / cols; const tileH = GRID / rows;
  const outline = new Uint8Array(GRID * GRID);
  for (let button = 0; button < count; button += 1) {
    const col = button % cols; const row = Math.floor(button / cols);
    for (let localY = 0; localY < tileH; localY += 1) for (let localX = 0; localX < tileW; localX += 1) {
      const sx = Math.min(GRID - 1, Math.floor(localX / tileW * GRID));
      const sy = Math.min(GRID - 1, Math.floor(localY / tileH * GRID));
      if (imageData[(sy * GRID + sx) * 4 + 3] >= 32) outline[Math.floor(row * tileH + localY) * GRID + Math.floor(col * tileW + localX)] = 1;
    }
  }
  // Expand the common body beyond the artwork so the caps have a protective rim.
  const expandedOutline = new Uint8Array(outline.length);
  const radiusX = Math.max(1, Math.ceil(2.2 / xyStepX)); const radiusY = Math.max(1, Math.ceil(2.2 / xyStepY));
  for (let y = 0; y < GRID; y += 1) for (let x = 0; x < GRID; x += 1) {
    if (!outline[y * GRID + x]) continue;
    for (let dy = -radiusY; dy <= radiusY; dy += 1) for (let dx = -radiusX; dx <= radiusX; dx += 1) {
      if ((dx * xyStepX) ** 2 + (dy * xyStepY) ** 2 > 2.2 ** 2) continue;
      const nx = x + dx; const ny = y + dy;
      if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) expandedOutline[ny * GRID + nx] = 1;
    }
  }
  // Join the outline islands with a narrow shared spine so multi-button designs print as one body.
  if (count > 1) {
    for (let button = 0; button < count - 1; button += 1) {
      const ax = ((button % cols) + 0.5) * tileW; const ay = (Math.floor(button / cols) + 0.5) * tileH;
      const nextButton = button + 1;
      const bx = ((nextButton % cols) + 0.5) * tileW; const by = (Math.floor(nextButton / cols) + 0.5) * tileH;
      for (let y = 0; y < GRID; y += 1) for (let x = 0; x < GRID; x += 1) {
        const dx = bx - ax; const dy = by - ay;
        const t = Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / Math.max(1, dx * dx + dy * dy)));
        const distanceX = (x + 0.5 - (ax + t * dx)) * xyStepX;
        const distanceY = (y + 0.5 - (ay + t * dy)) * xyStepY;
        if (distanceX * distanceX + distanceY * distanceY <= 2.5 ** 2) expandedOutline[y * GRID + x] = 1;
      }
    }
  }
  // Hollow the body while leaving a ~1.2 mm floor and a narrow retaining rim.
  const cavityMask = new Uint8Array(expandedOutline.length);
  const insetX = Math.max(1, Math.ceil(1.2 / xyStepX)); const insetY = Math.max(1, Math.ceil(1.2 / xyStepY));
  for (let y = insetY; y < GRID - insetY; y += 1) for (let x = insetX; x < GRID - insetX; x += 1) {
    if (!expandedOutline[y * GRID + x]) continue;
    let interior = true;
    for (let dy = -insetY; dy <= insetY && interior; dy += 1) for (let dx = -insetX; dx <= insetX; dx += 1) {
      if ((dx * xyStepX) ** 2 + (dy * xyStepY) ** 2 > 1.2 ** 2) continue;
      if (!expandedOutline[(y + dy) * GRID + x + dx]) { interior = false; break; }
    }
    if (interior) cavityMask[y * GRID + x] = 1;
  }
  const centers = Array.from({length: count}, (_, i) => ({ x: (i % cols + 0.5) * GRID / cols, y: (Math.floor(i / cols) + 0.5) * GRID / rows }));
  const loopCenterY = 4.2 / xyStepY;
  const loopCenterX = count === 1 ? center : GRID / (2 * cols);
  const loopRadius = 4.2 / xyStepX;
  const loopThickness = Math.max(1.2 / xyStepX, 1.5);
  for (let z = 0; z < height; z += 1) {
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const inside = expandedOutline[y * GRID + x] === 1;
        const removeForHousing = z >= 3 && cavityMask[y * GRID + x] === 1;
        const dx = x + 0.5 - loopCenterX; const dy = y + 0.5 - loopCenterY;
        const loopDistance = Math.hypot(dx * xyStepX, dy * xyStepY);
        const loopRadiusMm = loopRadius * xyStepX;
        const loop = options.keychainLoop && Math.abs(loopDistance - loopRadiusMm) <= loopThickness * xyStepX;
        const loopHole = options.keychainLoop && loopDistance < loopRadiusMm - loopThickness * xyStepX;
        let switchSeat = false;
        // Four low rails create a shallow locating pocket for the 15.6 mm MX housing;
        // the 1.2 mm floor remains closed beneath the switch.
        if (z >= 3) for (const c of centers) {
          const halfX = (15.6 + options.switchToleranceMm * 2) / 2 / xyStepX;
          const halfY = (15.6 + options.switchToleranceMm * 2) / 2 / xyStepY;
          const dxSeat = Math.abs(x + 0.5 - c.x); const dySeat = Math.abs(y + 0.5 - c.y);
          const outerX = halfX + 1.2 / xyStepX; const outerY = halfY + 1.2 / xyStepY;
          if (dxSeat <= outerX && dySeat <= outerY && (dxSeat >= halfX || dySeat >= halfY)) switchSeat = true;
        }
        if (!loopHole && ((inside && !removeForHousing) || loop || switchSeat)) voxels[indexOf(x, y, z)] = 1;
      }
    }
  }
  return surfacePositions(voxels, height, xyStepX, xyStepY, 0.4);
}

export async function generateClickerModel(file: File, mode: ImageClickerMode, options: Partial<ClickerModelOptions> = {}): Promise<GeneratedClickerModel> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const pixels = await drawImageGrid(file);
  const { parts: capParts, palette } = createCap(pixels, mode, config);
  const capPositions = new Float32Array(capParts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of capParts) { capPositions.set(part, offset); offset += part.length; }
  const platePositions = createPlate(config, pixels)[0];
  const generated = { capPositions, capParts, palette, platePositions, options: config, model3mf: new Blob() };
  generated.model3mf = createClicker3mf(generated, "#f2f2f2", palette);
  return generated;
}

function meshXml(id: number, name: string, positions: Float32Array, materialIndex: number) {
  let vertices = ""; let triangles = "";
  for (let i = 0; i < positions.length; i += 3) vertices += `<vertex x="${positions[i]}" y="${positions[i + 1]}" z="${positions[i + 2]}"/>`;
  for (let i = 0; i < positions.length / 3; i += 3) triangles += `<triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" pid="1" p1="${materialIndex}"/>`;
  return `<object id="${id}" type="model" name="${name}"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>`;
}

export function createClicker3mf(model: Pick<GeneratedClickerModel, "capParts" | "palette" | "platePositions" | "options">, bodyColor: string, palette: string[]) {
  const usedPalette = model.palette.map((color, index) => /^#[\da-f]{6}$/i.test(palette[index] ?? "") ? palette[index] : color);
  const materials = [bodyColor, ...usedPalette].map((color, index) => `<base name="filament-${index + 1}" displaycolor="${/^#[\da-f]{6}$/i.test(color) ? color : "#FFFFFF"}"/>`).join("");
  const objects = [meshXml(2, "Clicker body", model.platePositions, 0)];
  const capObjectIds: number[] = [];
  for (let i = 0; i < model.capParts.length; i += 1) {
    if (model.capParts[i].length) {
      const id = i + 3;
      capObjectIds.push(id);
      objects.push(meshXml(id, `Image color ${i + 1}`, model.capParts[i], i + 1));
    }
  }
  const transform = `1 0 0 0 1 0 0 0 1 0 0 ${model.options.bodyHeightMm}`;
  const build = `<item objectid="2"/>${capObjectIds.map((id) => `<item objectid="${id}" transform="${transform}"/>`).join("")}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">KEILAB Clicker Generator</metadata><resources><basematerials id="1">${materials}</basematerials>${objects.join("")}</resources><build>${build}</build></model>`;
  const archive = zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`),
    "3D/3dmodel.model": strToU8(xml),
  });
  return new Blob([archive], { type: "model/3mf" });
}

