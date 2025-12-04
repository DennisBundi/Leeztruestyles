# Logo Setup Instructions

## Adding Your Logo

1. **Place your logo file here** as `logo.png`
   - The logo should be a PNG file
   - Recommended dimensions: 400x150px or similar aspect ratio
   - The logo will automatically scale to fit different screen sizes

## Logo Specifications

- **File name**: `logo.png` (must be exactly this name)
- **Format**: PNG (supports transparency)
- **Recommended size**: 400x150px or similar aspect ratio
- **Background**: Transparent or black (will work on both light and dark backgrounds)

## Where the Logo Appears

The logo is used in:
- **Header** (main navigation) - displays at full color
- **Footer** - displays in white/inverted color for dark background
- **Admin Dashboard** - displays in the admin navigation bar

## Alternative Formats

If you have your logo in a different format:
- **SVG**: Rename to `logo.svg` and update the image paths in:
  - `src/components/navigation/Header.tsx`
  - `src/components/navigation/Footer.tsx`
  - `src/components/admin/AdminNav.tsx`
- **JPG/JPEG**: Rename to `logo.jpg` and update the image paths accordingly

## Testing

After adding your logo:
1. Restart your development server (`npm run dev`)
2. Check the header on the homepage
3. Scroll down to see the footer
4. Visit `/dashboard` to see the admin logo



