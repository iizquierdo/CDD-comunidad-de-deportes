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
import { Building2, CalendarDays, Check, ChevronDown, Eye, Layers, Pencil, Power, PowerOff, Trash2, Users, X } from 'lucide-react';
import { Button } from '@webapp/components/ui/button';
import { DataGridColumnHeader } from '@webapp/components/ui/data-grid-column-header';
import { cn } from '@webapp/lib/utils';
import ListCard from '@webapp/components/shared/ListCard';
import ProfileHeader from '@webapp/components/shared/ProfileHeader';

type ClassView = 'list' | 'details';

interface Props {
  view: ClassView;
  setView: (view: ViewType, params?: Record<string, string>) => void;
  currentUser?: AppUser;
  companyId?: string;
  onSubTitleChange?: (subtitle: string) => void;
  recordId?: string;
}

interface MetaItem { id: string; name: string }
interface StaffItem { id: string; name: string; email?: string; roleName?: string }
interface LevelItem { id: string; disciplineId: string; name: string }
interface DisciplineItem { id: string; name: string; levels: LevelItem[] }
interface CompanyItem { id: string; name: string }

interface ClassRow {
  id: string; code?: string | null; name: string; disciplineId: string; disciplineName?: string | null;
  companyId: string; companyName?: string | null; capacity?: number | null; status: string;
  teacherCount?: number; scheduleCount?: number; studentCount?: number;
}

interface ScheduleForm { dayOfWeek: number; startTime: string; endTime: string; location: string }
interface LevelForm { id?: string; name: string; levelOrder: number }
interface AvailableStudent { id: string; code: string; firstName: string; lastName: string }

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100';

const emptyForm = {
  name: '', description: '', disciplineId: '', companyId: '', capacity: '', status: 'ACTIVE',
  schedules: [] as ScheduleForm[],
  teacherIds: [] as string[],
  levels: [] as LevelForm[]
};

const ClassModule: React.FC<Props> = ({ view, setView, currentUser, companyId, onSubTitleChange, recordId }) => {
  const { t } = useTranslation();
  const userId = currentUser?.id || '';

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [meta, setMeta] = useState<{ statuses: MetaItem[]; staff: StaffItem[]; disciplines: DisciplineItem[] }>({ statuses: [], staff: [], disciplines: [] });
  const [companies, setCompanies] = useState<CompanyItem[]>([]);

  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Levels' | 'Teachers' | 'Schedule' | 'Students'>('Overview');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Student enrollment (details → Students tab)
  const [available, setAvailable] = useState<AvailableStudent[]>([]);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollLevelId, setEnrollLevelId] = useState('');

  const dayLabel = (d: number) => t(`classes.days.${d}`, { defaultValue: String(d) });
  const teacherName = (id: string) => meta.staff.find((s) => s.id === id)?.name || id;

  const loadClasses = async () => {
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams();
      if (companyId) qs.set('companyId', companyId);
      const res = await fetch(`/api/classes?${qs.toString()}`);
      if (!res.ok) throw new Error();
      setClasses(await res.json());
    } catch { setError(t('classes.errorLoad')); } finally { setLoading(false); }
  };

  const loadMeta = async () => {
    try {
      const res = await fetch('/api/classes/meta');
      if (res.ok) {
        const data = await res.json();
        setMeta({ statuses: data.categories?.statuses || [], staff: data.staff || [], disciplines: data.disciplines || [] });
      }
    } catch { /* defaults */ }
    try {
      const res = await fetch('/api/companies?status=Active');
      if (res.ok) setCompanies(await res.json());
    } catch { /* ignore */ }
  };

  const loadDetails = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/classes/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelected(data);
      onSubTitleChange?.(data.name);
    } catch { setError(t('classes.errorLoad')); }
  };

  const loadAvailable = async (id: string) => {
    try {
      const res = await fetch(`/api/classes/${id}/available-students`);
      if (res.ok) setAvailable(await res.json()); else setAvailable([]);
    } catch { setAvailable([]); }
  };

  useEffect(() => { void loadMeta(); }, []);
  useEffect(() => {
    if (view === 'list') { void loadClasses(); setSelected(null); }
    else if (recordId) { void loadDetails(recordId); }
    else { setView('Classes'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, companyId, recordId]);

  useEffect(() => {
    if (view === 'details' && activeTab === 'Students' && selected?.id) void loadAvailable(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeTab, selected?.id]);

  const openDetails = (c: ClassRow) => { setActiveTab('Overview'); setView('ClassDetails', { id: c.id }); };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, companyId: companyId || companies[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      ...emptyForm,
      name: c.name || '', description: c.description || '', disciplineId: c.disciplineId || '',
      companyId: c.companyId || '', capacity: c.capacity != null ? String(c.capacity) : '', status: c.status || 'ACTIVE',
      schedules: (c.schedules || []).map((s: any) => ({ dayOfWeek: Number(s.dayOfWeek), startTime: s.startTime || '', endTime: s.endTime || '', location: s.location || '' })),
      teacherIds: (c.teachers || []).map((x: any) => x.teacherId).filter(Boolean),
      levels: (c.ownLevels || []).map((l: any) => ({ id: l.id, name: l.name, levelOrder: Number(l.levelOrder) || 0 }))
    });
    setModalOpen(true);
  };

  const submitClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return setError(t('classes.errorAuthRequired'));
    if (!form.name.trim()) return;
    if (!form.disciplineId) return setError(t('classes.errorDisciplineRequired'));
    if (!form.companyId) return setError(t('classes.errorSedeRequired'));
    try {
      const payload = {
        ...form,
        capacity: form.capacity.trim() ? Number(form.capacity) : null,
        schedules: form.schedules.filter((s) => Number.isFinite(s.dayOfWeek) && s.startTime && s.endTime),
        levels: form.levels.filter((l) => l.name.trim())
      };
      const isEdit = Boolean(editingId);
      const res = await fetch(isEdit ? `/api/classes/${editingId}` : '/api/classes', {
        method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || t('classes.errorSave')); }
      setModalOpen(false);
      if (view === 'list') await loadClasses(); else if (editingId) await loadDetails(editingId);
    } catch (e: any) { setError(e.message || t('classes.errorSave')); }
  };

  const toggleStatus = async (c: ClassRow) => {
    await fetch(`/api/classes/${c.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }) });
    await loadClasses();
  };

  const enrollStudent = async () => {
    if (!selected || !enrollStudentId) return;
    try {
      const res = await fetch(`/api/classes/${selected.id}/students`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: enrollStudentId, levelId: enrollLevelId || null })
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || t('classes.errorSave')); }
      setEnrollStudentId(''); setEnrollLevelId('');
      await loadDetails(selected.id); await loadAvailable(selected.id);
    } catch (e: any) { setError(e.message || t('classes.errorSave')); }
  };

  const removeStudent = async (studentId: string) => {
    if (!selected) return;
    await fetch(`/api/classes/${selected.id}/students/${studentId}`, { method: 'DELETE' });
    await loadDetails(selected.id); await loadAvailable(selected.id);
  };

  const statusOptions = useMemo(() => (meta.statuses.length ? meta.statuses.map((x) => x.name) : ['ACTIVE', 'INACTIVE', 'ARCHIVED']), [meta.statuses]);
  const selectedDiscipline = useMemo(() => meta.disciplines.find((d) => d.id === form.disciplineId), [meta.disciplines, form.disciplineId]);
  const teacherOptions = useMemo(() => meta.staff, [meta.staff]);

  const toggleInArray = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  // Level options for student enrollment = inherited (discipline) + own (class).
  const enrollLevelOptions = useMemo(() => {
    if (!selected) return [] as { id: string; name: string; inherited?: boolean }[];
    const inherited = (selected.inheritedLevels || []).map((l: any) => ({ id: l.id, name: l.name, inherited: true }));
    const own = (selected.ownLevels || []).map((l: any) => ({ id: l.id, name: l.name }));
    return [...inherited, ...own];
  }, [selected]);

  // ---- List table -----------------------------------------------------------
  const [sorting, setSorting] = useState<SortingState>([]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.disciplineName || '').toLowerCase().includes(q) ||
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q)
    );
  }, [classes, search]);

  const columns = useMemo<ColumnDef<ClassRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('classes.name')} />,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500"><CalendarDays className="size-4" /></div>
              <div>
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-[11px] font-medium text-muted-foreground">{c.disciplineName || '—'}</p>
              </div>
            </div>
          );
        }
      },
      {
        id: 'sede',
        accessorFn: (row) => row.companyName || '',
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('classes.sede')} />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.companyName || '—'}</span>
      },
      {
        id: 'teachers',
        accessorFn: (row) => row.teacherCount ?? 0,
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('classes.teachersCount')} />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.teacherCount ?? 0}</span>
      },
      {
        id: 'students',
        accessorFn: (row) => row.studentCount ?? 0,
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('classes.studentsCount')} />,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.studentCount ?? 0}</span>
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader column={column} title={t('classes.status')} />,
        cell: ({ row }) => (
          <span className={cn('rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', row.original.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground')}>
            {row.original.status === 'ACTIVE' ? t('classes.active') : t('classes.inactive')}
          </span>
        )
      },
      {
        id: 'actions',
        enableSorting: false,
        meta: { headerClassName: 'text-end', cellClassName: 'text-end' },
        header: () => (
          <span className="inline-flex w-full justify-end text-[0.8125rem] font-medium uppercase tracking-wide text-table-header-foreground">{t('classes.actions')}</span>
        ),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Button type="button" mode="icon" size="sm" variant="outline" className="size-8" onClick={() => openDetails(c)} aria-label={t('classes.view')}>
                <Eye className="size-3.5" />
              </Button>
              <Button type="button" mode="icon" size="sm" variant="outline" className={cn('size-8', c.status === 'ACTIVE' && 'text-destructive hover:bg-destructive/10')} onClick={() => toggleStatus(c)} aria-label={t('classes.status')}>
                {c.status === 'ACTIVE' ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
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

  const primaryBtn = 'px-5 py-2.5 bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2';

  // ---------------------------------------------------------------- details --
  if (view === 'details') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-10">
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

        <ProfileHeader
          title={selected ? selected.name : '—'}
          initials={selected ? (selected.name?.charAt(0) || '?').toUpperCase() : '?'}
          meta={[
            { icon: <Layers className="size-4" />, text: selected?.disciplineName || '—' },
            { icon: <Building2 className="size-4" />, text: selected?.companyName || '—' },
            { text: selected?.status === 'ACTIVE' ? t('classes.active') : t('classes.inactive') }
          ]}
          tabs={[
            { id: 'Overview', label: t('classes.overview') },
            { id: 'Levels', label: t('classes.levels') },
            { id: 'Teachers', label: t('classes.teachers') },
            { id: 'Schedule', label: t('classes.schedule') },
            { id: 'Students', label: t('classes.students') }
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as typeof activeTab)}
          onBack={() => setView('Classes')}
          actions={
            <Button type="button" variant="outline" onClick={() => selected && openEdit(selected)}>
              <Pencil className="size-3.5" /> {t('classes.edit')}
            </Button>
          }
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
          {activeTab === 'Overview' && selected && (
            <div className="grid gap-4 px-1 sm:grid-cols-2 lg:grid-cols-3">
              <Info label={t('classes.discipline')} value={selected.disciplineName} />
              <Info label={t('classes.sede')} value={selected.companyName} />
              <Info label={t('classes.capacity')} value={selected.capacity != null ? String(selected.capacity) : null} />
              <Info label={t('classes.status')} value={selected.status === 'ACTIVE' ? t('classes.active') : t('classes.inactive')} />
              <Info label="Código" value={selected.code} />
              <div className="sm:col-span-2 lg:col-span-3"><Info label={t('classes.description2')} value={selected.description} /></div>
            </div>
          )}

          {activeTab === 'Levels' && selected && (
            <div className="space-y-5 px-1">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{t('classes.inheritedLevels')}</h3>
                {(selected.inheritedLevels || []).length === 0 ? <Empty text={t('classes.none')} /> : (
                  <div className="flex flex-wrap gap-2">
                    {(selected.inheritedLevels as any[]).map((l) => (
                      <span key={l.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">{l.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{t('classes.ownLevels')}</h3>
                {(selected.ownLevels || []).length === 0 ? <Empty text={t('classes.none')} /> : (
                  <div className="flex flex-wrap gap-2">
                    {(selected.ownLevels as any[]).map((l) => (
                      <span key={l.id} className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">{l.name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Teachers' && selected && (
            <div className="px-1">
              {(selected.teachers || []).length === 0 ? <Empty text={t('classes.none')} /> : (selected.teachers as any[]).map((x) => (
                <div key={x.id} className="mb-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <Users className="size-4 text-slate-400" /> {x.teacherName}{x.teacherEmail ? <span className="text-xs text-slate-400">· {x.teacherEmail}</span> : null}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Schedule' && selected && (
            <div className="px-1">
              {(selected.schedules || []).length === 0 ? <Empty text={t('classes.none')} /> : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(selected.schedules as any[]).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">{dayLabel(Number(s.dayOfWeek))}</span>
                      <span className="text-sm text-slate-600">{s.startTime} – {s.endTime}{s.location ? ` · ${s.location}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Students' && selected && (
            <div className="px-1 space-y-4">
              <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex-1 min-w-[12rem]">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('classes.assignStudent')}</label>
                  <select className={inputClass} value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)}>
                    <option value="">—</option>
                    {available.map((s) => <option key={s.id} value={s.id}>{s.lastName}, {s.firstName} ({s.code})</option>)}
                  </select>
                </div>
                {enrollLevelOptions.length > 0 && (
                  <div className="min-w-[10rem]">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('classes.level')}</label>
                    <select className={inputClass} value={enrollLevelId} onChange={(e) => setEnrollLevelId(e.target.value)}>
                      <option value="">—</option>
                      {enrollLevelOptions.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}
                <button type="button" onClick={enrollStudent} disabled={!enrollStudentId} className={cn(primaryBtn, !enrollStudentId && 'opacity-40')}>
                  <i className="fa-solid fa-plus" /> {t('classes.addStudent')}
                </button>
              </div>
              {available.length === 0 && <p className="text-xs text-slate-400">{t('classes.noAvailableStudents')}</p>}

              {(selected.students || []).length === 0 ? <Empty text={t('classes.noStudents')} /> : (
                <div className="space-y-2">
                  {(selected.students as any[]).map((s) => {
                    const lvl = enrollLevelOptions.find((l) => l.id === s.levelId)?.name;
                    return (
                      <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{s.lastName ? `${s.lastName}, ${s.firstName}` : s.studentId}</p>
                          <p className="text-xs text-slate-400">{s.studentCode || ''}{lvl ? ` · ${lvl}` : ''}</p>
                        </div>
                        <Button type="button" mode="icon" size="sm" variant="outline" className="size-8 text-destructive hover:bg-destructive/10" onClick={() => removeStudent(s.studentId)} aria-label={t('classes.removeStudent')}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {modalOpen && ClassForm()}
      </div>
    );
  }

  // ------------------------------------------------------------------- form --
  function ClassForm() {
    return (
      <Modal title={editingId ? t('classes.editClass') : t('classes.newClass')} onClose={() => setModalOpen(false)} wide>
        <form onSubmit={submitClass} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('classes.name')}><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label={t('classes.discipline')}>
              <select className={inputClass} value={form.disciplineId} onChange={(e) => setForm({ ...form, disciplineId: e.target.value })} required>
                <option value="">—</option>
                {meta.disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label={t('classes.sede')}>
              <select className={inputClass} value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} required>
                <option value="">—</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t('classes.capacity')}><input type="number" min={0} className={inputClass} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
            <Field label={t('classes.status')}>
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((x) => <option key={x} value={x}>{x === 'ACTIVE' ? t('classes.active') : x === 'INACTIVE' ? t('classes.inactive') : x}</option>)}
              </select>
            </Field>
          </div>
          <Field label={t('classes.description2')}><textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

          {/* Schedule */}
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('classes.schedule')}</span>
              <button type="button" onClick={() => setForm({ ...form, schedules: [...form.schedules, { dayOfWeek: 1, startTime: '', endTime: '', location: '' }] })} className="text-xs font-bold text-red-500"><i className="fa-solid fa-plus mr-1" />{t('classes.addSchedule')}</button>
            </div>
            {form.schedules.map((s, i) => (
              <div key={i} className="flex gap-2">
                <select className={inputClass} value={s.dayOfWeek} onChange={(e) => { const next = [...form.schedules]; next[i] = { ...next[i], dayOfWeek: Number(e.target.value) }; setForm({ ...form, schedules: next }); }}>
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
                </select>
                <input type="time" className={inputClass} value={s.startTime} onChange={(e) => { const next = [...form.schedules]; next[i] = { ...next[i], startTime: e.target.value }; setForm({ ...form, schedules: next }); }} />
                <input type="time" className={inputClass} value={s.endTime} onChange={(e) => { const next = [...form.schedules]; next[i] = { ...next[i], endTime: e.target.value }; setForm({ ...form, schedules: next }); }} />
                <input className={inputClass} placeholder={t('classes.location')} value={s.location} onChange={(e) => { const next = [...form.schedules]; next[i] = { ...next[i], location: e.target.value }; setForm({ ...form, schedules: next }); }} />
                <button type="button" onClick={() => setForm({ ...form, schedules: form.schedules.filter((_, idx) => idx !== i) })} className="h-10 w-10 shrink-0 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"><i className="fa-solid fa-trash" /></button>
              </div>
            ))}
          </div>

          {/* Own levels */}
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('classes.ownLevels')}</span>
              <button type="button" onClick={() => setForm({ ...form, levels: [...form.levels, { name: '', levelOrder: form.levels.length }] })} className="text-xs font-bold text-red-500"><i className="fa-solid fa-plus mr-1" />{t('classes.addLevel')}</button>
            </div>
            {selectedDiscipline && (selectedDiscipline.levels || []).length > 0 && (
              <p className="text-[11px] text-slate-400">{t('classes.inheritedLevels')}: {(selectedDiscipline.levels || []).map((l) => l.name).join(', ')}</p>
            )}
            {form.levels.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputClass} placeholder={t('classes.levelName')} value={l.name} onChange={(e) => { const next = [...form.levels]; next[i] = { ...next[i], name: e.target.value }; setForm({ ...form, levels: next }); }} />
                <button type="button" onClick={() => setForm({ ...form, levels: form.levels.filter((_, idx) => idx !== i) })} className="h-10 w-10 shrink-0 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"><i className="fa-solid fa-trash" /></button>
              </div>
            ))}
          </div>

          {/* Teachers */}
          <MultiSelect label={t('classes.selectTeachers')} options={teacherOptions} selected={form.teacherIds} onToggle={(id) => setForm((f) => ({ ...f, teacherIds: toggleInArray(f.teacherIds, id) }))} />

          <ModalActions onCancel={() => setModalOpen(false)} cancel={t('classes.cancel')} save={t('classes.save')} />
        </form>
      </Modal>
    );
  }

  return (
    <>
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

      <ListCard<ClassRow>
        title={t('classes.title')}
        description={t('classes.description')}
        cardTitle={t('classes.title')}
        searchPlaceholder={t('classes.searchPlaceholder')}
        searchTerm={search}
        onSearchChange={setSearch}
        primaryLabel={t('classes.newClass')}
        onPrimary={openCreate}
        table={table}
        recordCount={filtered.length}
        isLoading={loading}
        emptyMessage={t('classes.noClasses')}
        onRowClick={(c) => openDetails(c)}
      />

      {modalOpen && ClassForm()}
    </>
  );
};

const Info: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-0.5 text-sm text-slate-800">{value || '—'}</p>
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">{text}</p>;

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>{children}</div>
);

const MultiSelect: React.FC<{ label: string; options: StaffItem[]; selected: string[]; onToggle: (id: string) => void; placeholder?: string }> = ({ label, options, selected, onToggle, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const selectedOptions = options.filter((o) => selected.includes(o.id));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q) || (o.roleName || '').toLowerCase().includes(q) || (o.email || '').toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <div className="relative">
        {/* Control: shows selected teachers as removable pills + a toggle */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}
          className="flex min-h-[2.75rem] w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
        >
          {selectedOptions.length === 0 && <span className="px-1 text-slate-400">{placeholder || '—'}</span>}
          {selectedOptions.map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
              {o.name}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle(o.id); }}
                className="rounded p-0.5 text-red-400 hover:bg-red-100 hover:text-red-600"
                aria-label={`Quitar ${o.name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <ChevronDown className={cn('ml-auto size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>

        {/* Panel: search + checkable option list (in-flow so it never clips inside the modal) */}
        {open && (
          <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Buscar..."
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="max-h-44 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-slate-400">Sin resultados</p>
              ) : (
                filtered.map((o) => {
                  const checked = selected.includes(o.id);
                  return (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => onToggle(o.id)}
                      className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50', checked && 'bg-red-50/60')}
                    >
                      <span className="text-slate-700">{o.name}{o.roleName ? <span className="text-slate-400"> · {o.roleName}</span> : null}</span>
                      {checked && <Check className="size-4 shrink-0 text-red-500" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button onClick={onClose} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100"><i className="fa-solid fa-xmark" /></button>
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

export default ClassModule;
