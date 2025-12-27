// Product color definitions with hex codes for color swatches
export interface ProductColor {
  name: string;
  hex: string;
}

export const PRODUCT_COLORS: ProductColor[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Green', hex: '#008000' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Brown', hex: '#A52A2A' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Teal', hex: '#008080' },
];

// Helper function to get color by name
export function getColorByName(name: string): ProductColor | undefined {
  return PRODUCT_COLORS.find(color => color.name.toLowerCase() === name.toLowerCase());
}

// Helper function to get color hex by name
export function getColorHex(name: string): string {
  const color = getColorByName(name);
  return color?.hex || '#CCCCCC'; // Default gray if not found
}


