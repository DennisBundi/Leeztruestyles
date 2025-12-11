import { createClient } from '@/lib/supabase/server';

export default async function TestSessionPage() {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Session Test</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">getUser() Result:</h2>
            {user ? (
              <pre className="bg-gray-100 p-2 rounded text-sm">
                {JSON.stringify({ id: user.id, email: user.email }, null, 2)}
              </pre>
            ) : (
              <p className="text-red-600">No user found</p>
            )}
            {userError && (
              <p className="text-red-600 text-sm">Error: {userError.message}</p>
            )}
          </div>
          
          <div>
            <h2 className="font-semibold">getSession() Result:</h2>
            {session ? (
              <pre className="bg-gray-100 p-2 rounded text-sm">
                {JSON.stringify({ 
                  user_id: session.user?.id, 
                  email: session.user?.email,
                  expires_at: session.expires_at 
                }, null, 2)}
              </pre>
            ) : (
              <p className="text-red-600">No session found</p>
            )}
            {sessionError && (
              <p className="text-red-600 text-sm">Error: {sessionError.message}</p>
            )}
          </div>
          
          <div>
            <a 
              href="/signin" 
              className="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              Go to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}








