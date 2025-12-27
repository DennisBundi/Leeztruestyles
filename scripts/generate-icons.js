const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../public/images/leeztruelogo.jpeg');
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    console.log('🖼️  Generating PWA icons from logo...\n');

    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo file not found at:', logoPath);
      process.exit(1);
    }

    // Generate each icon size
    for (const size of iconSizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      // Create fully circular mask (50% radius = perfect circle)
      const radius = size / 2;
      
      // Create circular mask
      const roundedCorners = Buffer.from(
        `<svg><circle cx="${radius}" cy="${radius}" r="${radius}"/></svg>`
      );
      
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
        })
        .composite([
          {
            input: roundedCorners,
            blend: 'dest-in'
          }
        ])
        .png()
        .toFile(outputPath);

      console.log(`✅ Created rounded icon-${size}x${size}.png`);
    }

    console.log('\n✨ All icons generated successfully!');
    console.log(`📁 Icons saved to: ${iconsDir}`);
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

