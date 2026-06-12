import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const LOGO_RATIO = 0.70
const BG = { r: 13, g: 27, b: 42, alpha: 1 } // #0D1B2A

const svgPath = path.join(process.cwd(), 'public/images/logo.svg')
const outDir = path.join(process.cwd(), 'public/icons')

if (!fs.existsSync(svgPath)) {
  console.error('No se encontró public/images/logo.svg')
  process.exit(1)
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

const svgBuffer = fs.readFileSync(svgPath)

async function main() {
  for (const size of SIZES) {
    const logoSize = Math.round(size * LOGO_RATIO)
    const offset = Math.round((size - logoSize) / 2)

    const logoBuffer = await sharp(svgBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

    await sharp({
      create: { width: size, height: size, channels: 4, background: BG },
    })
      .composite([{ input: logoBuffer, top: offset, left: offset }])
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`))

    console.log(`✓ icon-${size}.png`)
  }
  console.log(`\nGenerados ${SIZES.length} iconos en public/icons/`)
}

main().catch(err => { console.error(err); process.exit(1) })
