import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, setActiveOrg } from '@/integrations/supabase/client';

type Profile = {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'cultivo' | 'entregas' | 'readonly';
};

type Organization = {
  id: string;
  name: string;
  slug: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  allOrganizations: Organization[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  canAccess: (section: RouteSection) => boolean;
  selectOrganization: (orgId: string) => Promise<void>;
  reloadOrganizations: () => Promise<void>;
};

export type RouteSection =
  | 'dashboard'
  | 'plantas'
  | 'geneticas'
  | 'locaciones'
  | 'esquejado'
  | 'cosecha'
  | 'materia-vegetal'
  | 'bitacora'
  | 'reportes'
  | 'etiquetas'
  | 'pacientes'
  | 'entregas'
  | 'reportes-entregas'
  | 'calendario'
  | 'admin-usuarios'
  | 'auditoria';

// Permission matrix per role
const PERMISSIONS: Record<string, RouteSection[]> = {
  superadmin: ['dashboard','plantas','geneticas','locaciones','esquejado','cosecha','materia-vegetal','bitacora','reportes','etiquetas','pacientes','entregas','reportes-entregas','calendario','admin-usuarios','auditoria'],
  admin:      ['dashboard','plantas','geneticas','locaciones','esquejado','cosecha','materia-vegetal','bitacora','reportes','etiquetas','pacientes','entregas','reportes-entregas','calendario','admin-usuarios','auditoria'],
  cultivo:    ['dashboard','plantas','geneticas','locaciones','esquejado','cosecha','materia-vegetal','bitacora','etiquetas','calendario'],
  entregas:   ['dashboard','pacientes','entregas','reportes-entregas','materia-vegetal'],
  readonly:   ['dashboard','plantas','geneticas','locaciones','bitacora','reportes','reportes-entregas'],
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !profileData) return;
    setProfile(profileData as Profile);

    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profileData.organization_id)
      .single();

    if (orgData) setOrganization(orgData as Organization);

    // If superadmin, load all organizations via secure function
    if (profileData.role === 'superadmin') {
      const { data: allOrgs } = await supabase.rpc('get_all_organizations');
      if (allOrgs) setAllOrganizations(allOrgs as Organization[]);

      // Restore previously selected org if any
      const savedOrgId = sessionStorage.getItem('selected_org_id');
      if (savedOrgId && savedOrgId !== profileData.organization_id) {
        const { data: savedOrg } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', savedOrgId)
          .single();
        if (savedOrg) {
          setOrganization(savedOrg as Organization);
          setProfile({ ...profileData, organization_id: savedOrgId } as Profile);
          await setActiveOrg(savedOrgId);
          return;
        }
      }
    }

    // Setear org activa en Postgres para RLS
    await setActiveOrg(profileData.organization_id);
  };

  const selectOrganization = async (orgId: string) => {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    if (orgData) setOrganization(orgData as Organization);

    if (profile) {
      setProfile({ ...profile, organization_id: orgId });
    }

    await setActiveOrg(orgId);
    sessionStorage.setItem('selected_org_id', orgId);
  };

  const reloadOrganizations = async () => {
    const { data: allOrgs } = await supabase.rpc('get_all_organizations');
    if (allOrgs) setAllOrganizations(allOrgs as Organization[]);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setOrganization(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      // Wait for profile to load before returning
      await fetchProfile(data.user.id);
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOrganization(null);
  };

  const canAccess = (section: RouteSection): boolean => {
    if (!profile) return false;
    return PERMISSIONS[profile.role]?.includes(section) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, organization, allOrganizations, loading, signIn, signOut, canAccess, selectOrganization, reloadOrganizations }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
