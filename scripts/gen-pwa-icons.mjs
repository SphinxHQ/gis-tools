import sharp from 'sharp'
import fs from 'fs'

const sizes = [192, 512]

// 五边形 SVG（与 favicon.svg 保持一致的设计）
function makeSvg(size) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const sw = size * 0.04
  let points = ''
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const x = (cx + Math.cos(a) * r).toFixed(2)
    const y = (cy + Math.sin(a) * r).toFixed(2)
    points += `${x},${y} `
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1d1e1f"/>
  <polygon points="${points.trim()}" fill="rgba(234,88,12,0.18)" stroke="#ea580c" stroke-width="${sw}" stroke-linejoin="round"/>
</svg>`
}

for (const s of sizes) {
  const svg = makeSvg(s)
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  fs.writeFileSync(`public/pwa-${s}x${s}.png`, png)
  console.log(`Generated pwa-${s}x${s}.png`)
}
