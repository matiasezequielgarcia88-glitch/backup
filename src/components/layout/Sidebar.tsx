import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Leaf, Dna, MapPin, Scissors, ScrollText,
  FileText, Settings, QrCode, Users, Package, BarChart3,
  CalendarDays, Wheat, UserCog, LogOut, ShieldCheck, Building2, FlameKindling,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { useAuth, RouteSection } from '@/contexts/AuthContext';

type NavItem = { name: string; href: string; icon: any; section: RouteSection };

const navigation: NavItem[] = [
  { name: 'Dashboard',         href: '/',                  icon: LayoutDashboard, section: 'dashboard' },
  { name: 'Calendario',        href: '/calendario',        icon: CalendarDays,    section: 'calendario' },
  { name: 'Plantas',           href: '/plantas',           icon: Leaf,            section: 'plantas' },
  { name: 'Genéticas',         href: '/geneticas',         icon: Dna,             section: 'geneticas' },
  { name: 'Locaciones',        href: '/locaciones',        icon: MapPin,          section: 'locaciones' },
  { name: 'Esquejado',         href: '/esquejado',         icon: Scissors,        section: 'esquejado' },
  { name: 'Cosecha',           href: '/cosecha',           icon: FlameKindling,   section: 'cosecha' },
  { name: 'Materia Vegetal',   href: '/materia-vegetal',   icon: Wheat,           section: 'materia-vegetal' },
  { name: 'Bitácora',          href: '/bitacora',          icon: ScrollText,      section: 'bitacora' },
  { name: 'Reportes',          href: '/reportes',          icon: FileText,        section: 'reportes' },
  { name: 'Etiquetas',         href: '/etiquetas',         icon: QrCode,          section: 'etiquetas' },
  { name: 'Pacientes',         href: '/pacientes',         icon: Users,           section: 'pacientes' },
  { name: 'Entregas',          href: '/entregas',          icon: Package,         section: 'entregas' },
  { name: 'Rep. Entregas',     href: '/reportes-entregas', icon: BarChart3,       section: 'reportes-entregas' },
  { name: 'Usuarios',          href: '/admin-usuarios',    icon: UserCog,         section: 'admin-usuarios' },
  { name: 'Auditoría',         href: '/auditoria',         icon: ShieldCheck,     section: 'auditoria' },
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  cultivo: 'Op. Cultivo',
  entregas: 'Op. Entregas',
  readonly: 'Solo Lectura',
};

export function Sidebar() {
  const location = useLocation();
  const { urgentTasks } = useTasks();
  const { profile, organization, canAccess, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Leaf className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-sidebar-foreground truncate">
            {organization?.name || 'Registro de Cultivo'}
          </h1>
          <p className="text-xs text-sidebar-foreground/60">Sistema de Trazabilidad</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigation.filter(item => canAccess(item.section)).map((item) => {
            const isActive = location.pathname === item.href;
            const isCalendar = item.href === '/calendario';
            const badgeCount = isCalendar ? urgentTasks.length : 0;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {badgeCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info + logout */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        {profile && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
            <p className="text-xs text-sidebar-foreground/50">{ROLE_LABELS[profile.role] || profile.role}</p>
          </div>
        )}
        {profile?.role === 'superadmin' && (
          <button
            onClick={() => navigate('/org-selector')}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <Building2 className="h-5 w-5 flex-shrink-0" />
            Cambiar empresa
          </button>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
