import chinaCityData from './china-city.json';
import chinaData from './china.json';

/** 中国地理范围 [minLon, minLat, maxLon, maxLat] */
const CHINA_EXTENT: [number, number, number, number] = [73.5, 3, 136, 54];
const CANVAS_WIDTH = 4096;

/** 按 projection 缓存：projection → dataURL */
const cacheMap = new Map<string, string>();

function toCanvasXY(lon: number, lat: number, scaleX: number, scaleY: number): [number, number] {
  return [
    (lon - CHINA_EXTENT[0]) * scaleX,
    (CHINA_EXTENT[3] - lat) * scaleY,
  ];
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  scaleX: number,
  scaleY: number,
) {
  if (ring.length < 2) return;
  const [x0, y0] = toCanvasXY(ring[0][0], ring[0][1], scaleX, scaleY);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < ring.length; i++) {
    const [x, y] = toCanvasXY(ring[i][0], ring[i][1], scaleX, scaleY);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * 绘制单个 Feature 的几何（支持 Polygon / MultiPolygon）
 */
function drawGeometry(
  ctx: CanvasRenderingContext2D,
  coordinates: unknown,
  scaleX: number,
  scaleY: number,
) {
  const coords = coordinates as number[][][] | number[][][][];
  if (!Array.isArray(coords) || coords.length === 0) return;

  const first = coords[0];
  if (!Array.isArray(first) || first.length === 0) return;

  const second = first[0];
  if (!Array.isArray(second)) return;

  // Polygon: coordinates = number[][][]  (array of rings)
  if (typeof second[0] === 'number') {
    for (const ring of coords as number[][][]) {
      drawRing(ctx, ring, scaleX, scaleY);
    }
  }
  // MultiPolygon: coordinates = number[][][][]  (array of polygons)
  else {
    for (const polygon of coords as number[][][][]) {
      for (const ring of polygon) {
        drawRing(ctx, ring, scaleX, scaleY);
      }
    }
  }
}

/**
 * 将 china + china-city 渲染到离屏 canvas 并返回 dataURL。
 * 同一 projection 只生成一次，后续直接取缓存。
 */
export function getChinaBoundaryImage(projection: string): {
  url: string;
  extent: [number, number, number, number];
} {
  const cached = cacheMap.get(projection);
  if (cached) {
    return { url: cached, extent: CHINA_EXTENT };
  }

  const scaleX = CANVAS_WIDTH / (CHINA_EXTENT[2] - CHINA_EXTENT[0]);
  const scaleY = scaleX; // 等比例，避免形变
  const canvasHeight = Math.round((CHINA_EXTENT[3] - CHINA_EXTENT[1]) * scaleY);

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, CANVAS_WIDTH, canvasHeight);

  // 1) 市界（底层，更浅）
  ctx.fillStyle = 'rgba(220, 230, 240, 0.1)';
  ctx.strokeStyle = 'rgba(140, 160, 180, 0.35)';
  ctx.lineWidth = 1;
  for (const feature of chinaCityData.features) {
    ctx.beginPath();
    drawGeometry(ctx, feature.geometry.coordinates, scaleX, scaleY);
    ctx.fill();
    ctx.stroke();
  }

  // 2) 省界（上层，更深）
  ctx.fillStyle = 'rgba(220, 230, 240, 0.3)';
  ctx.strokeStyle = 'rgba(100, 120, 140, 0.6)';
  ctx.lineWidth = 2.5;
  for (const feature of chinaData.features) {
    ctx.beginPath();
    drawGeometry(ctx, feature.geometry.coordinates, scaleX, scaleY);
    ctx.fill();
    ctx.stroke();
  }

  const url = canvas.toDataURL('image/png');
  cacheMap.set(projection, url);
  return { url, extent: CHINA_EXTENT };
}

/** 切换坐标系时清除缓存，强制重新生成 */
export function clearChinaBoundaryCache(projection?: string) {
  if (projection) {
    cacheMap.delete(projection);
  } else {
    cacheMap.clear();
  }
}
