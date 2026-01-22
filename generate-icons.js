const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// This looks for your 1024x1024 logo in the assets folder
const sourceFile = path.join(__dirname, 'assets', 'Track Trimmer Pro Logo.png');
const outputDir = path.join(__dirname, 'assets');

const sizes = [
  { name: 'StoreLogo.png', width: 50, height: 50 },
  { name: 'Square44x44Logo.png', width: 44, height: 44 },
  { name: 'Square150x150Logo.png', width: 150, height: 150 },
  // Wide tile needs the logo centered on a 310x150 transparent background
  { name: 'Wide310x150Logo.png', width: 310, height: 150, isWide: true }
];

async function generateIcons() {
  console.log('🚀 Generating Windows assets...');

  // Check if source file exists first
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Error: Could not find "${sourceFile}". Please make sure your logo is named exactly "Track Trimmer Pro Logo.png" and is in the assets folder.`);
    return;
  }

  for (const size of sizes) {
    if (size.isWide) {
      // Create wide tile: 310x150 with logo centered
      await sharp(sourceFile)
        .resize({
          width: 120,
          height: 120,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: 15,
          bottom: 15,
          left: 95,
          right: 95,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toFile(path.join(outputDir, size.name));
    } else {
      await sharp(sourceFile)
        .resize(size.width, size.height)
        .toFile(path.join(outputDir, size.name));
    }
    console.log(`✅ Created ${size.name}`);
  }
  console.log('✨ All assets ready! You can now run npm run dist');
}

generateIcons().catch(err => console.error('❌ Error:', err));