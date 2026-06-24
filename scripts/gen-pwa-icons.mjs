import sharp from 'sharp'
import fs from 'fs'

const sizes = [192, 512]
const svgBuffer = fs.readFileSync('public/pwa-icon.svg')

for (const s of sizes) {
  const png = await sharp(svgBuffer).resize(s, s).png().toBuffer()
  fs.writeFileSync(`public/pwa-${s}x${s}.png`, png)
  console.log(`Generated pwa-${s}x${s}.png`)
}
