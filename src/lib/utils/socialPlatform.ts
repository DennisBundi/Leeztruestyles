/**
 * Utility functions for social platform data
 */

export type SocialPlatform = 'tiktok' | 'instagram' | 'whatsapp' | 'walkin';

export function getPlatformDisplayName(platform: string): string {
  const mapping: Record<string, string> = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    walkin: 'Walk-in',
  };
  return mapping[platform.toLowerCase()] || platform;
}

export function getPlatformColor(platform: string): string {
  const mapping: Record<string, string> = {
    tiktok: '#000000', // Black (TikTok brand)
    instagram: '#E4405F', // Instagram pink/red gradient
    whatsapp: '#25D366', // WhatsApp green
    walkin: '#6366F1', // Indigo/blue for walk-in
  };
  return mapping[platform.toLowerCase()] || '#6B7280';
}

export function getPlatformGradient(platform: string): string {
  const mapping: Record<string, string> = {
    tiktok: 'linear-gradient(135deg, #000000 0%, #FF0050 100%)', // Black to pink
    instagram: 'linear-gradient(135deg, #833AB4 0%, #E4405F 50%, #FCAF45 100%)', // Instagram gradient
    whatsapp: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', // WhatsApp green gradient
    walkin: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', // Indigo to purple
  };
  return mapping[platform.toLowerCase()] || 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)';
}




