import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { AlertCircle, CheckCircle2, Pencil, Search, Trash2 } from 'lucide-react';
import { adminFetch } from '../api';
import { Alert, AlertContent, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardHeading,
  CardTable,
  CardTitle,
  CardToolbar
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input, inputVariants } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ClassRow {
  id: string;
  code: string | null;
  name: string;
  disciplineId: string;
  disciplineName: string | null;
  companyId: string;
  companyName: string | null;
  organizationId: string;
  organizationName: string | null;
  capacity: number | null;
  status: string;
  teacherCount?: number;
  studentCount?: number;
}

interface CompanyOption {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
}

interface DisciplineOption {
  id: string;
  name: string;
}

interface FormState {
  name: string;
  description: string;
  disciplineId: string;
  companyId: string;
  capacity: string;
  status: string;
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  disciplineId: '',
  companyId: '',
  capacity: '',
  status: 'ACTIVE'
});

const ClasesPage: React.FC = () => {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [disciplineOptions, setDisciplineOptions] = useState<DisciplineOption[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setStatus(null);
    try {
      const res = await adminFetch('/api/admin/classes');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las clases');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    void (async () => {
      try {
        const [cRes, dRes] = await Promise.all([
          adminFetch('/api/admin/classes/companies'),
          adminFetch('/api/admin/classes/disciplines')
        ]);
        if (cRes.ok) setCompanyOptions(await cRes.json());
        if (dRes.ok) setDisciplineOptions(await dRes.json());
      } catch {
        /* ignore */
      }
    })();
  }, [modalOpen]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [row.name, row.disciplineName || '', row.companyName || '', row.organizationName || '', row.code || '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, searchTerm]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
    setStatus(null);
  }, []);

  const openEdit = useCallback((row: ClassRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      description: '',
      disciplineId: row.disciplineId || '',
      companyId: row.companyId || '',
      capacity: row.capacity != null ? String(row.capacity) : '',
      status: row.status || 'ACTIVE'
    });
    setModalOpen(true);
    setStatus(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setStatus({ type: 'error', message: 'El nombre es obligatorio.' });
      return;
    }
    if (!form.disciplineId) {
      setStatus({ type: 'error', message: 'La disciplina es obligatoria.' });
      return;
    }
    if (!form.companyId) {
      setStatus({ type: 'error', message: 'La sede es obligatoria.' });
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      disciplineId: form.disciplineId,
      companyId: form.companyId,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
      status: form.status
    };

    setSaving(true);
    setStatus(null);
    try {
      const url = editingId ? `/api/admin/classes/${editingId}` : '/api/admin/classes';
      const res = await adminFetch(url, { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');
      await load();
      closeModal();
      setStatus({ type: 'success', message: editingId ? 'Clase actualizada.' : 'Clase creada.' });
    } catch (e: unknown) {
      setStatus({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo guardar' });
    } finally {
      setSaving(false);
    }
  };

  const remove = useCallback(
    async (row: ClassRow) => {
      if (!window.confirm(`¿Eliminar la clase ${row.name}? Esta acción no se puede deshacer.`)) return;
      setStatus(null);
      try {
        const res = await adminFetch(`/api/admin/classes/${row.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'No se pudo eliminar');
        await load();
        setStatus({ type: 'success', message: 'Clase eliminada.' });
      } catch (e: unknown) {
        setStatus({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo eliminar' });
      }
    },
    [load]
  );

  const columns = useMemo<ColumnDef<ClassRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Clase" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-foreground">{row.original.name}</p>
            <p className="text-muted-foreground text-[11px] font-medium">{row.original.disciplineName || '—'}</p>
          </div>
        )
      },
      {
        id: 'sede',
        accessorFn: (row) => row.companyName || '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Sede" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.companyName || '—'}</span>
      },
      {
        id: 'organization',
        accessorFn: (row) => row.organizationName || '',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Organización" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.organizationName || '—'}</span>
      },
      {
        id: 'students',
        accessorFn: (row) => row.studentCount ?? 0,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Alumnos" />,
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.studentCount ?? 0}</span>
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => <DataGridColumnHeader column={column} title="Estado" />,
        cell: ({ row }) => (
          <span
            className={cn(
              'rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
              row.original.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'
            )}
          >
            {row.original.status}
          </span>
        )
      },
      {
        id: 'actions',
        enableSorting: false,
        meta: { headerClassName: 'text-end', cellClassName: 'text-end' },
        header: () => (
          <span className="inline-flex w-full justify-end text-[0.8125rem] font-medium uppercase tracking-wide text-table-header-foreground">
            Acciones
          </span>
        ),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex flex-wrap items-center justify-end gap-1">
              <Button type="button" mode="icon" size="sm" variant="outline" className="size-8" onClick={() => openEdit(c)} aria-label="Editar">
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                mode="icon"
                size="sm"
                variant="outline"
                className="size-8 text-destructive hover:bg-destructive/10"
                onClick={() => void remove(c)}
                aria-label="Eliminar"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        }
      }
    ],
    [openEdit, remove]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const emptyMessage = rows.length === 0 && !loading ? 'No hay clases todavía.' : 'Sin coincidencias.';
  const selectClass = cn(inputVariants({ variant: 'md' }), 'cursor-pointer');

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="mb-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Clases</h2>
        <p className="mt-1 mb-10 text-sm font-medium text-slate-500">
          Alta, baja y modificación de las clases de todas las organizaciones.
        </p>
      </div>

      {loadError && (
        <Alert variant="destructive" appearance="light" size="md">
          <AlertIcon>
            <AlertCircle className="size-5" />
          </AlertIcon>
          <AlertContent>
            <AlertDescription>{loadError}</AlertDescription>
          </AlertContent>
        </Alert>
      )}

      {status && !modalOpen && (
        <Alert variant={status.type === 'success' ? 'success' : 'destructive'} appearance="light" size="md">
          <AlertIcon>
            {status.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
          </AlertIcon>
          <AlertContent>
            <AlertDescription>{status.message}</AlertDescription>
          </AlertContent>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="min-h-0 flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <CardHeading>
            <CardTitle>Clases</CardTitle>
          </CardHeading>
          <CardToolbar className="w-full flex-wrap justify-stretch gap-2 sm:w-auto sm:justify-end">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2" aria-hidden />
              <Input
                type="search"
                placeholder="Buscar clases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn('ps-9')}
                aria-label="Buscar clases"
              />
            </div>
            <Button type="button" variant="primary" onClick={openCreate}>
              Nueva clase
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardTable className="p-0">
          <DataGrid
            table={table}
            recordCount={filteredRows.length}
            isLoading={loading}
            loadingMessage="Cargando clases..."
            emptyMessage={emptyMessage}
            tableLayout={{ rowBorder: true, headerBackground: true, headerBorder: true, width: 'auto' }}
          >
            <div className="overflow-x-auto">
              <DataGridTable />
            </div>
          </DataGrid>
        </CardTable>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar clase' : 'Nueva clase'}</DialogTitle>
          </DialogHeader>
          {status && modalOpen && (
            <Alert variant={status.type === 'success' ? 'success' : 'destructive'} appearance="light" size="sm" className="mb-2">
              <AlertIcon>
                {status.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
              </AlertIcon>
              <AlertContent>
                <AlertDescription>{status.message}</AlertDescription>
              </AlertContent>
            </Alert>
          )}
          <DialogBody>
            <form onSubmit={(e) => void submit(e)} id="admin-class-form" className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="c-name" className="text-xs">Nombre *</Label>
                  <Input id="c-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-discipline" className="text-xs">Disciplina *</Label>
                  <select
                    id="c-discipline"
                    className={selectClass}
                    required
                    value={form.disciplineId}
                    onChange={(e) => setForm((f) => ({ ...f, disciplineId: e.target.value }))}
                  >
                    <option value="">—</option>
                    {disciplineOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-company" className="text-xs">Sede *</Label>
                  <select
                    id="c-company"
                    className={selectClass}
                    required
                    value={form.companyId}
                    onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                  >
                    <option value="">—</option>
                    {companyOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.organizationName} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-capacity" className="text-xs">Cupo</Label>
                  <Input id="c-capacity" type="number" min={0} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-status" className="text-xs">Estado</Label>
                  <select
                    id="c-status"
                    className={selectClass}
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="c-desc" className="text-xs">Descripción</Label>
                  <Input id="c-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </form>
          </DialogBody>
          <DialogFooter className="border-t border-border pt-4 sm:space-x-2">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="admin-class-form" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClasesPage;
