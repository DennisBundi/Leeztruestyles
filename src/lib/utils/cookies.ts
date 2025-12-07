/**
 * Client-side utility to clear old Supabase cookies from different projects
 */
export function clearOldSupabaseCookies() {
  if (typeof window === 'undefined') return;

  const currentProjectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https?:\/\/([^.]+)\.supabase\.co/
  )?.[1];

  if (!currentProjectId) return;

  // Get all cookies
  const cookies = document.cookie.split(';');

  cookies.forEach((cookie) => {
    const [name] = cookie.trim().split('=');
    
    // Check if it's a Supabase cookie
    if (name.startsWith('sb-') || name.includes('supabase')) {
      // Extract project ID from cookie name
      const match = name.match(/sb-([^-]+)-/);
      const cookieProjectId = match ? match[1] : null;

      // If it's from a different project, delete it
      if (cookieProjectId && cookieProjectId !== currentProjectId) {
        // Delete cookie by setting it to expire in the past
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        console.log(`🗑️ Cleared old cookie: ${name}`);
      }
    }
  });
}

