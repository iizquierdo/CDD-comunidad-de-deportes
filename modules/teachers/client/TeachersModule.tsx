import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppUser, ViewType } from '@sinapsis/shared-types';
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@webapp/components/ui/button';
import { DataGridColumnHeader } from '@webapp/components/ui/data-grid-column-header';
import ListCard from '@webapp/components/shared/ListCard';

interface Props {
  view: 'list';
  setView: (view: ViewType) => void;
  currentUser?: AppUser;
  companyId?: string;
  onSubTitleChange?: (subtitle: string) => void;
}

interface CompanyItem { id: string; name: string }
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
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100';

const emptyForm = { firstName: '', lastName: '', email: '', document: '', phone: '', companyId: '', password: '' };

const TeachersModule: React.FC<Props> = ({ companyId }) => {
  const { t } = useTranslation();

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

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

  useEffect(() => { void loadCompanies(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadTeachers(); }, [companyId]);

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
      await loadTeachers();
    } catch (err: any) { setError(err.message || t('teachers.errorSave')); }
  };

  const remove = async (p: TeacherRow) => {
    const label = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email;
    if (!window.confirm(t('teachers.deleteConfirm', { name: label }))) return;
    setError('');
    try {
      const res = await fetch(`/api/teachers/${p.id}`, { method: 'DELETE' });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || t('teachers.errorSave')); }
      await loadTeachers();
    } catch (err: any) { setError(err.message || t('teachers.errorSave')); }
  };

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
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-500">{initials}</div>
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
        onRowClick={(p) => openEdit(p)}
      />

      {modalOpen && (
        <Modal title={editingId ? t('teachers.editTeacher') : t('teachers.newTeacher')} onClose={() => setModalOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
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
      )}
    </>
  );
};

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
