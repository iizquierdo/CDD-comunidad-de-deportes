import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppUser, ViewType } from '@sinapsis/shared-types';
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Building2, CalendarDays, GraduationCap, Mail, Pencil, Trash2, UserRound } from 'lucide-react';
import { Button } from '@webapp/components/ui/button';
import { DataGridColumnHeader } from '@webapp/components/ui/data-grid-column-header';
import { cn } from '@webapp/lib/utils';
import ListCard from '@webapp/components/shared/ListCard';
import ProfileHeader from '@webapp/components/shared/ProfileHeader';

type TeacherView = 'list' | 'details';
type DetailTab = 'Overview' | 'Classes' | 'Students';

interface Props {
  view: TeacherView;
  setView: (view: ViewType, params?: Record<string, string>) => void;
  currentUser?: AppUser;
  companyId?: string;
  onSubTitleChange?: (subtitle: string) => void;
  recordId?: string;
}

interface CompanyItem { id: string; name: string }
interface AvailableClass { id: string; name: string; status: string; companyName?: string | null }

interface TeacherRow {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  phone?: string | null;
  document?: string | null;
  companyId: string;
  companyName?: string | null;
  imageUrl?: string | null;
  coverUrl?: string | null;
}

interface ClassRow {
  id: string;
  name: string;
  companyId: string;
  companyName?: string | null;
  status: string;
  disciplineName?: string | null;
}

interface StudentRow {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  studentCode?: string | null;
  className?: string | null;
  companyName?: string | null;
  enrollmentStatus?: string | null;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100';

const emptyForm = { firstName: '', lastName: '', email: '', document: '', phone: '', companyId: '', password: '' };

const TeachersModule: React.FC<Props> = ({ view, setView, companyId, onSubTitleChange, recordId }) => {
  const { t } = useTranslation();

  // List state
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Detail state
  const [selected, setSelected] = useState<TeacherRow | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<ClassRow[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('Overview');

  // Image upload refs
  const logoFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // Class assignment modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Teacher edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // ---- Data loaders ----------------------------------------------------------

  const loadTeachers = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/teachers');
      if (!res.ok) throw new Error();
      setTeachers(await res.json());
    } catch { setError(t('teachers.errorLoad')); } finally { setLoading(false); }
  };

  const loadCompanies = async () => {
    try {
      const res = await fetch('/api/companies?status=Active');
      if (res.ok) setCompanies(await res.json());
    } catch { /* ignore */ }
  };

  const loadTeacher = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/teachers/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelected(data);
      onSubTitleChange?.(`${data.firstName || ''} ${data.lastName || ''}`.trim());
    } catch {
      setError(t('teachers.errorLoad'));
    }
  };

  const loadTeacherClasses = async (id: string) => {
    setClassesLoading(true);
    try {
      const res = await fetch(`/api/teachers/${id}/classes`);
      setTeacherClasses(res.ok ? await res.json() : []);
    } catch {
      setTeacherClasses([]);
    } finally {
      setClassesLoading(false);
    }
  };

  const loadStudents = async (id: string) => {
    setStudentsLoading(true);
    try {
      const res = await fetch(`/api/teachers/${id}/students`);
      setStudents(res.ok ? await res.json() : []);
    } catch {
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const uploadTeacherImage = async (kind: 'logo' | 'cover', file: File | undefined) => {
    if (!selected || !file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await fetch(`/api/teachers/${selected.id}/image`, { method: 'POST', body: fd });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || t('teachers.errorSave')); }
      setSelected(await res.json());
    } catch (err: any) { setError(err.message || t('teachers.errorSave')); }
  };

  // ---- Effects ---------------------------------------------------------------

  useEffect(() => { void loadCompanies(); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadTeachers(); }, [companyId]);

  useEffect(() => {
    if (view === 'list') {
      setSelected(null);
      setActiveTab('Overview');
    } else if (view === 'details') {
      if (recordId) void loadTeacher(recordId);
      else setView('Teachers');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, recordId]);

  useEffect(() => {
    if (view !== 'details' || !selected?.id) return;
    if (activeTab === 'Classes') void loadTeacherClasses(selected.id);
    if (activeTab === 'Students') void loadStudents(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeTab, selected?.id]);

  // ---- Class assignment ------------------------------------------------------

  const openClassModal = async () => {
    if (!selected) return;
    setSelectedClassId('');
    setClassModalOpen(true);
    try {
      const res = await fetch(`/api/teachers/${selected.id}/available-classes`);
      setAvailableClasses(res.ok ? await res.json() : []);
    } catch { setAvailableClasses([]); }
  };

  const assignClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !selectedClassId) return;
    try {
      const res = await fetch(`/api/teachers/${selected.id}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: selectedClassId })
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || t('teachers.errorSave')); }
      setClassModalOpen(false);
      await loadTeacherClasses(selected.id);
    } catch (err: any) { setError(err.message || t('teachers.errorSave')); }
  };

  const removeClass = async (classId: string) => {
    if (!selected) return;
    if (!window.confirm(t('teachers.removeClassConfirm'))) return;
    try {
      const res = await fetch(`/api/teachers/${selected.id}/classes/${classId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await loadTeacherClasses(selected.id);
    } catch { setError(t('teachers.errorSave')); }
  };

  // ---- Teacher CRUD ----------------------------------------------------------

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, companyId: companyId || companies[0]?.id || '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: TeacherRow) => {
    setEditingId(p.id);
    setForm({
      firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '',
      document: p.document || '', phone: p.phone || '', companyId: p.companyId || '', password: ''
    });
    setError('');
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    if (!form.email.trim()) return setError(t('teachers.errorEmailRequired'));
    if (!form.companyId) return setError(t('teachers.errorSedeRequired'));
    if (!editingId && !form.password) return setError(t('teachers.errorPasswordRequired'));
    try {
      const payload: Record<string, unknown> = { ...form };
      if (editingId && !form.password) delete payload.password;
      const res = await fetch(editingId ? `/api/teachers/${editingId}` : '/api/teachers', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || t('teachers.errorSave')); }
      setModalOpen(false);
      if (view === 'list') {
        await loadTeachers();
      } else if (editingId && selected?.id === editingId) {
        await loadTeacher(editingId);
      }
    } catch (err: any) { setError(err.message || t('teachers.errorSave')); }
  };

  const remove = async (p: TeacherRow) => {
    const label = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email;
    if (!window.confirm(t('teachers.deleteConfirm', { name: label }))) return;
    setError('');
    try {
      const res = await fetch(`/api/teachers/${p.id}`, { method: 'DELETE' });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || t('teachers.errorSave')); }
      if (view === 'list') await loadTeachers();
      else setView('Teachers');
    } catch (err: any) { setError(err.message || t('teachers.errorSave')); }
  };

  // ---- Table (always constructed – hooks must be unconditional) --------------

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((p) =>
      `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.document || '').toLowerCase().includes(q) ||
      (p.companyName || '').toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const columns = useMemo<ColumnDef<TeacherRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => `${row.firstName || ''} ${row.lastName || ''}`,
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('teachers.name')} />,
        cell: ({ row }) => {
          const p = row.original;
          const initials = `${(p.firstName || ' ').charAt(0)}${(p.lastName || ' ').charAt(0)}`.toUpperCase();
          return (
            <div className="flex items-center gap-3">
              {p.imageUrl
                ? <img src={p.imageUrl} alt={initials} className="h-9 w-9 flex-shrink-0 rounded-xl object-cover" />
                : <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-500">{initials}</div>
              }
              <div>
                <p className="text-sm font-semibold text-foreground">{`${p.firstName || ''} ${p.lastName || ''}`.trim() || '—'}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{p.email}</p>
              </div>
            </div>
          );
        }
      },
      {
        id: 'phone',
        accessorFn: (row) => row.phone || '',
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('teachers.phone')} />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone || '—'}</span>
      },
      {
        id: 'document',
        accessorFn: (row) => row.document || '',
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('teachers.document')} />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.document || '—'}</span>
      },
      {
        id: 'sede',
        accessorFn: (row) => row.companyName || '',
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('teachers.sede')} />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.companyName || '—'}</span>
      },
      {
        id: 'actions',
        enableSorting: false,
        meta: { headerClassName: 'text-end', cellClassName: 'text-end' },
        header: () => (
          <span className="inline-flex w-full justify-end text-[0.8125rem] font-medium uppercase tracking-wide text-table-header-foreground">
            {t('teachers.actions')}
          </span>
        ),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Button type="button" mode="icon" size="sm" variant="outline" className="size-8" onClick={() => openEdit(p)} aria-label={t('teachers.edit')}>
                <Pencil className="size-3.5" />
              </Button>
              <Button type="button" mode="icon" size="sm" variant="outline" className="size-8 text-destructive hover:bg-destructive/10" onClick={() => remove(p)} aria-label={t('teachers.delete')}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  // ---- Shared teacher edit modal ---------------------------------------------

  const teacherModal = modalOpen && (
    <Modal title={editingId ? t('teachers.editTeacher') : t('teachers.newTeacher')} onClose={() => setModalOpen(false)}>
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('teachers.firstName')}><input className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></Field>
          <Field label={t('teachers.lastName')}><input className={inputClass} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></Field>
          <Field label={t('teachers.email')}><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label={t('teachers.phone')}><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label={t('teachers.document')}><input className={inputClass} value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></Field>
          <Field label={t('teachers.sede')}>
            <select className={inputClass} value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} required>
              <option value="">—</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label={editingId ? t('teachers.passwordEdit') : t('teachers.password')}>
          <input
            type="password"
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editingId ? t('teachers.passwordPlaceholder') : ''}
            {...(editingId ? {} : { required: true })}
          />
        </Field>
        <ModalActions onCancel={() => setModalOpen(false)} cancel={t('teachers.cancel')} save={t('teachers.save')} />
      </form>
    </Modal>
  );

  // ---- Details view ----------------------------------------------------------

  if (view === 'details') {
    const fullName = `${selected?.firstName || ''} ${selected?.lastName || ''}`.trim();
    const initials = `${(selected?.firstName || ' ').charAt(0)}${(selected?.lastName || ' ').charAt(0)}`.toUpperCase();

    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-10">
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

        {/* Hidden file inputs for image upload */}
        <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { void uploadTeacherImage('logo', e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={coverFileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { void uploadTeacherImage('cover', e.target.files?.[0]); e.target.value = ''; }} />

        <ProfileHeader
          title={fullName || '—'}
          initials={initials}
          icon={<GraduationCap className="size-10" />}
          imageUrl={selected?.imageUrl}
          coverUrl={selected?.coverUrl}
          onLogoClick={() => logoFileRef.current?.click()}
          onCoverClick={() => coverFileRef.current?.click()}
          meta={[
            { icon: <Building2 className="size-4" />, text: selected?.companyName || '—' },
            { icon: <Mail className="size-4" />, text: selected?.email || '—' }
          ]}
          tabs={[
            { id: 'Overview', label: t('teachers.overview') },
            { id: 'Classes', label: t('teachers.classesTab') },
            { id: 'Students', label: t('teachers.studentsTab') }
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as DetailTab)}
          onBack={() => setView('Teachers')}
          actions={
            <Button type="button" variant="outline" onClick={() => selected && openEdit(selected)}>
              <Pencil className="size-3.5" /> {t('teachers.edit')}
            </Button>
          }
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">

          {/* ---- Overview ---- */}
          {activeTab === 'Overview' && selected && (
            <div className="grid grid-cols-1 gap-5 px-1 sm:grid-cols-2">
              <InfoItem label={t('teachers.email')} value={selected.email} />
              <InfoItem label={t('teachers.phone')} value={selected.phone || '—'} />
              <InfoItem label={t('teachers.document')} value={selected.document || '—'} />
              <InfoItem label={t('teachers.sede')} value={selected.companyName || '—'} />
            </div>
          )}

          {/* ---- Classes ---- */}
          {activeTab === 'Classes' && (
            <div className="px-1">
              <div className="mb-4 flex justify-end">
                <button type="button" onClick={openClassModal}
                  className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-600">
                  <i className="fa-solid fa-plus mr-1.5" /> {t('teachers.addToClass')}
                </button>
              </div>
              {classesLoading ? (
                <p className="py-8 text-center text-sm text-slate-400">…</p>
              ) : teacherClasses.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">{t('teachers.noClasses')}</p>
              ) : (
                <div className="space-y-2">
                  {teacherClasses.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-border dark:bg-card">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                        <CalendarDays className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">{c.name}</p>
                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                          <Building2 className="size-3" /> {c.companyName || '—'}
                          {c.disciplineName && <span>· {c.disciplineName}</span>}
                        </p>
                      </div>
                      <span className={cn('rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                        {c.status === 'ACTIVE' ? t('classes.active') : t('classes.inactive')}
                      </span>
                      <Button type="button" mode="icon" size="sm" variant="outline"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeClass(c.id)} aria-label={t('teachers.removeFromClass')}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- Students ---- */}
          {activeTab === 'Students' && (
            <div className="px-1">
              {studentsLoading ? (
                <p className="py-8 text-center text-sm text-slate-400">…</p>
              ) : students.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">{t('teachers.noStudents')}</p>
              ) : (
                <div className="space-y-2">
                  {students.map((s) => {
                    const initials2 = `${(s.firstName || ' ').charAt(0)}${(s.lastName || ' ').charAt(0)}`.toUpperCase();
                    return (
                      <div key={`${s.id}-${s.classId}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-border dark:bg-card">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-500">
                          {initials2 || <UserRound className="size-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">
                            {`${s.firstName || ''} ${s.lastName || ''}`.trim() || '—'}
                          </p>
                          <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                            <CalendarDays className="size-3" /> {s.className || '—'}
                            {s.companyName && <span>· {s.companyName}</span>}
                          </p>
                        </div>
                        {s.studentCode && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                            {s.studentCode}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assign to class modal */}
        {classModalOpen && (
          <Modal title={t('teachers.addToClass')} onClose={() => setClassModalOpen(false)}>
            <form onSubmit={assignClass} className="space-y-4">
              <Field label={t('teachers.selectClass')}>
                <select className={inputClass} value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} required>
                  <option value="">—</option>
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.companyName ? ` (${c.companyName})` : ''}</option>
                  ))}
                </select>
              </Field>
              {availableClasses.length === 0 && (
                <p className="text-sm text-slate-400">{t('teachers.noAvailableClasses')}</p>
              )}
              <ModalActions onCancel={() => setClassModalOpen(false)} cancel={t('teachers.cancel')} save={t('teachers.save')} />
            </form>
          </Modal>
        )}

        {teacherModal}
      </div>
    );
  }

  // ---- List view -------------------------------------------------------------

  return (
    <>
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

      <ListCard<TeacherRow>
        title={t('teachers.title')}
        description={t('teachers.description')}
        cardTitle={t('teachers.title')}
        searchPlaceholder={t('teachers.searchPlaceholder')}
        searchTerm={search}
        onSearchChange={setSearch}
        primaryLabel={t('teachers.newTeacher')}
        onPrimary={openCreate}
        table={table}
        recordCount={filtered.length}
        isLoading={loading}
        emptyMessage={t('teachers.noTeachers')}
        onRowClick={(p) => setView('TeacherDetails', { id: p.id })}
      />

      {teacherModal}
    </>
  );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 text-sm text-slate-700 dark:text-foreground">{value}</p>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>{children}</div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100"><i className="fa-solid fa-xmark" /></button>
      </div>
      {children}
    </div>
  </div>
);

const ModalActions: React.FC<{ onCancel: () => void; cancel: string; save: string }> = ({ onCancel, cancel, save }) => (
  <div className="flex justify-end gap-2 pt-2">
    <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50">{cancel}</button>
    <button type="submit" className="rounded-xl bg-red-500 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-600">{save}</button>
  </div>
);

export default TeachersModule;
