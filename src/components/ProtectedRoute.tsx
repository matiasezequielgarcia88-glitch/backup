import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, RouteSection } from '@/contexts/AuthContext';
import { Leaf } from 'lucide-react';

type Props = {
  children: ReactNode;
  section?: RouteSection;
};

export function ProtectedRoute({ children, section }: Props) {
  const { user, profile, loading, canAccess } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Leaf className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (section && !canAccess(section)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
