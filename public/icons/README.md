# PWA Icons

This directory should contain the app icons for the Progressive Web App.

## Required Icon Sizes

Please create PNG icons in the following sizes (all square, 1:1 aspect ratio):

- `icon-72x72.png` - 72x72px
- `icon-96x96.png` - 96x96px
- `icon-128x128.png` - 128x128px
- `icon-144x144.png` - 144x144px (Windows)
- `icon-152x152.png` - 152x152px (iOS)
- `icon-192x192.png` - 192x192px (Android)
- `icon-384x384.png` - 384x384px (Android)
- `icon-512x512.png` - 512x512px (Android, iOS splash)

## Creating Icons

You can create these icons from your existing logo (`/images/leeztruelogo.jpeg`):

1. **Using Online Tools:**

   - Visit https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
   - Upload your logo
   - Generate all required sizes
   - Download and place in this directory

2. **Using Image Editing Software:**

   - Open your logo in Photoshop, GIMP, or similar
   - Create a square canvas (use the largest size needed: 512x512)
   - Resize/center your logo with padding
   - Export as PNG
   - Resize to create all required sizes

3. **Using Command Line (ImageMagick):**
   ```bash
   # If you have ImageMagick installed
   convert images/leeztruelogo.jpeg -resize 512x512 -background white -gravity center -extent 512x512 icons/icon-512x512.png
   convert images/leeztruelogo.jpeg -resize 192x192 -background white -gravity center -extent 192x192 icons/icon-192x192.png
   # Repeat for other sizes
   ```

## Icon Requirements

- **Format:** PNG
- **Aspect Ratio:** 1:1 (square)
- **Background:** Transparent or solid color (preferably white or brand color)
- **Quality:** High resolution, no pixelation
- **Purpose:** Icons should be recognizable at small sizes

## Temporary Placeholder

Until you create proper icons, you can use a simple colored square or your logo resized to these dimensions. The app will still work, but users may see placeholder icons when installing.
