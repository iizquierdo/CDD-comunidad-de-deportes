import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Globe, Mail, MapPin, Pencil } from 'lucide-react';
import { adminFetch } from '../api';
import { Button } from '@/components/ui/button';
import ProfileHeader from '@/components/shared/ProfileHeader';

interface OrgDetail {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  website: string | null;
  taxId: string | null;
  address: string | null;
  defaultLanguage: string;
  baseCurrency: string | null;
  createdAt: string;
  usersCount: number;
  _count?: { companies: number };
  subscriptionPlan?: { id: string; code: string; name: string; status: string } | null;
}

interface TeacherRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  organizationId: string;
}

interface ParentRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  organizationId: string;
}

type Tab = 'overview' | 'profesores' | 'padres';

const InfoCell: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-0.5 text-sm text-slate-800">{value || '—'}</p>
  </div>
);

const OrganizationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [orgRes, teachersRes, parentsRes] = await Promise.all([
        adminFetch(`/api/admin/organizations/${id}`),
        adminFetch('/api/admin/teachers'),
        adminFetch('/api/admin/parents')
      ]);
      if (!orgRes.ok) throw new Error('Organización no encontrada');
      const orgData = await orgRes.json();
      setOrg(orgData);

      const teachersData = teachersRes.ok ? await teachersRes.json() : [];
      setTeachers((Array.isArray(teachersData) ? teachersData : []).filter((t: TeacherRow) => t.organizationId === id));

      const parentsData = parentsRes.ok ? await parentsRes.json() : [];
      setParents((Array.isArray(parentsData) ? parentsData : []).filter((p: ParentRow) => p.organizationId === id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar la organización');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Cargando organización…
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="space-y-4 pb-12 animate-in fade-in duration-500">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error || 'Organización no encontrada'}
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/organizations')}>
          ← Volver
        </Button>
      </div>
    );
  }

  const initials = org.name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <ProfileHeader
        title={org.name}
        initials={initials}
        meta={[
          ...(org.email ? [{ icon: <Mail className="size-4" />, text: org.email }] : []),
          ...(org.city || org.country
            ? [{ icon: <MapPin className="size-4" />, text: [org.city, org.country].filter(Boolean).join(', ') }]
            : []),
          { icon: <Globe className="size-4" />, text: org.timezone },
          { icon: <Building2 className="size-4" />, text: `${org._count?.companies ?? 0} sedes · ${org.usersCount} usuarios` }
        ]}
        tabs={[
          { id: 'overview', label: 'Información' },
          { id: 'profesores', label: `Profesores (${teachers.length})` },
          { id: 'padres', label: `Padres (${parents.length})` }
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
        onBack={() => navigate('/admin/organizations')}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/admin/organizations/${org.id}/branding`)}
          >
            <Pencil className="size-3.5" /> Branding
          </Button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === 'overview' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCell label="Plan" value={org.subscriptionPlan ? `${org.subscriptionPlan.name} (${org.subscriptionPlan.code})` : '—'} />
            <InfoCell label="Idioma" value={org.defaultLanguage} />
            <InfoCell label="Moneda" value={org.baseCurrency} />
            <InfoCell label="Zona horaria" value={org.timezone} />
            <InfoCell label="Email" value={org.email} />
            <InfoCell label="Tax ID" value={org.taxId} />
            <InfoCell label="Sitio web" value={org.website} />
            <InfoCell label="Dirección" value={org.address} />
            <InfoCell label="Ciudad" value={org.city} />
            <InfoCell label="País" value={org.country} />
            <InfoCell label="Creada" value={new Date(org.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </div>
        )}

        {activeTab === 'profesores' && (
          <div className="space-y-2">
            {teachers.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">Sin profesores en esta organización</p>
            ) : (
              teachers.map((t) => {
                const fullName = [t.firstName, t.lastName].filter(Boolean).join(' ') || t.name || t.email;
                const initials = fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-500">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                      <p className="text-xs text-slate-400">{t.email}{t.companyName ? ` · ${t.companyName}` : ''}</p>
                    </div>
                    {t.phone && <span className="shrink-0 text-xs text-slate-400">{t.phone}</span>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'padres' && (
          <div className="space-y-2">
            {parents.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">Sin padres en esta organización</p>
            ) : (
              parents.map((p) => {
                const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || p.email;
                const initials = fullName.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-500">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                      <p className="text-xs text-slate-400">{p.email}{p.companyName ? ` · ${p.companyName}` : ''}</p>
                    </div>
                    {p.phone && <span className="shrink-0 text-xs text-slate-400">{p.phone}</span>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationDetailPage;
