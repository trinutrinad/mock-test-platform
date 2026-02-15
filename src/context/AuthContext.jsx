import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Loading from '../components/Loading'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [session, setSession] = useState(null)
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let timeout = setTimeout(() => {
            console.warn("Auth timeout fallback triggered");
            setLoading(false);
        }, 2000); // ⏱ force unlock UI

        if (!supabase) {
            console.error("Supabase not initialized");
            setLoading(false);
            return;
        }

        supabase.auth.getSession()
            .then(({ data }) => {
                setUser(data?.session?.user ?? null);
                setSession(data?.session ?? null);
                if (data?.session?.user) {
                    // We can fetch role here if needed, or rely on the other logic. 
                    // For safety based on user snippet, I'll keep it simple or integrate existing role fetch?
                    // User's snippet was simple. I will stick to their snippet but ensure role fetching isn't lost if it was critical.
                    // The original code passed `session` and `user`. 
                    // The user's snippet only sets `user`. 
                    // My previous code also fetched role. 
                    // I should probably keep the role fetching if I can, OR just follow the user's snippet exactly to fix the blocking issue. 
                    // The user said "Replace useEffect COMPLETELY with this". 
                    // However, if I lose role fetching, admin routes might break.
                    // I will try to merge the role fetching logic back in if possible, OR just assume the user wants to fix the blocker first.
                    // Let's look at the user request again. "Replace useEffect COMPLETELY with this".
                    // If I drop role fetching, `useAuth` will have role=null. 
                    // `ProtectedRoute` uses `role`. 
                    // So I MUST fetch role. 
                    // I will add role fetching back into the user's snippet structure.
                }
                setLoading(false);
                clearTimeout(timeout);
            })
            .catch((err) => {
                console.error("Auth session error:", err);
                setLoading(false);
                clearTimeout(timeout);
            });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setSession(session);
            // Re-fetch role if user exists
            // To avoid complex code in this snippet, I'll rely on the existing fetchRole function if it was defined outside, but it was defined INSIDE useEffect in previous version.
            // I should define fetchRole inside this new useEffect or outside.
            // To be safe and fast, I will just set role to 'user' by default for now if I can't fetch it easily, OR I will just copy the fetch logic.
            // Actually, best to just render the app. The user wants to unlock the UI.
        });

        return () => {
            listener?.subscription?.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    // Re-adding role fetching as a separate effect to keep the main auth logic clean and robust as requested, 
    // OR just integrating it.
    // Let's do a separate effect for role to avoid cluttering the critical path? 
    // No, `useEffect` depends on `user`.
    useEffect(() => {
        if (user) {
            supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()
                .then(({ data }) => setRole(data?.role || 'user'))
                .catch(() => setRole('user'))
        } else {
            setRole(null)
        }
    }, [user])

    const value = {
        signUp: async (data) => supabase?.auth?.signUp(data),
        signIn: async (data) => supabase?.auth?.signInWithPassword(data),
        signOut: async () => supabase?.auth?.signOut(),
        user,
        session,
        role,
        loading
    }

    // Loading handling moved to consumer (App.jsx)
    // if (loading) {
    //    return <Loading />
    // }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
