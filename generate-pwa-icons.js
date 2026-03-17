import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import process from 'process'

const INPUT_FILE = process.argv[2]
const SIZES = [192, 512] // Dimensioni essenziali per PWA

if (!INPUT_FILE) {
  console.error('❌ Uso: node generate-pwa-icons.mjs <tuo-logo.png>')
  console.error('')
  console.error('Esempio:')
  console.error('  node generate-pwa-icons.mjs logo.png')
  process.exit(1)
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ File non trovato: ${INPUT_FILE}`)
  process.exit(1)
}

// Crea cartella public/icons se non esiste
const publicDir = path.join(process.cwd(), 'public')
const iconsDir = path.join(publicDir, 'icons')

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir)
}

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir)
}

console.log('🎨 Generazione icone PWA...\n')

// Genera le icone
await Promise.all(
  SIZES.map(size => {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`)

    return sharp(INPUT_FILE)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 15, g: 15, b: 15, alpha: 1 }
      })
      .png()
      .toFile(outputPath)
      .then(() => {
        console.log(`✅ Creato: public/icons/icon-${size}x${size}.png`)
      })
      .catch(err => {
        console.error(
          `❌ Errore creando icon-${size}x${size}.png:`,
          err.message
        )
      })
  })
)

console.log('\n🎉 Icone PWA generate con successo!')
console.log('\n📋 Prossimi passi:')
console.log('1. Modifica vite.config.js')
console.log('2. Aggiungi meta tags in index.html')
console.log('3. npm run build')
console.log('4. Deploy su Netlify/Vercel')
