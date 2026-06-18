import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { MaterialIcon } from "../components/MaterialIcon";
import { useAuth } from "../context/AuthContext";
import { useStudents } from "../context/StudentContext";
import { extractErrorMessage } from "../lib/api";
import {
  createConversation,
  fetchConversations,
  fetchStudentNotebook,
  sendConversationMessage
} from "../lib/data";
import type { ConversationStatus, StudentConversation, StudentNotebookDetail, UserRef } from "../types";

type ArchiveFilter = "ALL" | ConversationStatus;

const getDateValue = (v?: string | null) => {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

const formatClock = (v?: string | null) => {
  const t = getDateValue(v);
  if (!t) return "--:--";
  return new Date(t).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
};

const formatTicketDate = (v?: string | null) => {
  const t = getDateValue(v);
  if (!t) return "SIN FECHA";
  return new Date(t)
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
    .toUpperCase();
};

const statusLabel: Record<ConversationStatus, string> = {
  OPEN: "Activo",
  CLOSED: "Finalizado",
  ARCHIVED: "Archivado"
};

const statusColors: Record<ConversationStatus, string> = {
  OPEN: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-500",
  ARCHIVED: "bg-amber-50 text-amber-600"
};

const getLastMessage = (conv: StudentConversation) => {
  if (!conv.messages.length) return null;
  return [...conv.messages].sort(
    (a, b) => getDateValue(b.createdAt) - getDateValue(a.createdAt)
  )[0];
};

const truncate = (v: string, max = 100) =>
  v.length <= max ? v : `${v.slice(0, max).trimEnd()}...`;

const getTeacherFromConversations = (convs: StudentConversation[]) => {
  for (const c of convs) {
    const t = c.participants.find((p) => p.user.role === "PROFESOR");
    if (t) return t.user;
  }
  return null;
};

export const CuadernoPage = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { selectedStudent } = useStudents();
  const isChatRoute = pathname.startsWith("/chat");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentNotebookDetail | null>(null);
  const [conversations, setConversations] = useState<StudentConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("ALL");
  const [showNewConsult, setShowNewConsult] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

  const studentId = selectedStudent?.id ?? null;

  const loadNotebook = useCallback(
    async (preferredConversationId?: string) => {
      if (!studentId) {
        setStudentDetail(null);
        setConversations([]);
        setActiveConversationId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [detail, convs] = await Promise.all([
          fetchStudentNotebook(studentId),
          fetchConversations(studentId)
        ]);

        const ordered = [...convs].sort(
          (a, b) => getDateValue(b.updatedAt) - getDateValue(a.updatedAt)
        );

        setStudentDetail(detail);
        setConversations(ordered);

        setActiveConversationId((cur) => {
          const preferred = preferredConversationId ?? cur;
          if (preferred && ordered.some((c) => c.id === preferred)) return preferred;
          const open = ordered.find((c) => c.status === "OPEN");
          return open?.id ?? ordered[0]?.id ?? null;
        });
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [studentId]
  );

  useEffect(() => { void loadNotebook(); }, [loadNotebook]);

  const assignedTeacher = useMemo<UserRef | null>(() => {
    const t = studentDetail?.teacherAssignments?.[0]?.teacher;
    if (t) return t;
    return getTeacherFromConversations(conversations);
  }, [conversations, studentDetail]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  const sortedMessages = useMemo(() => {
    if (!activeConversation) return [];
    return [...activeConversation.messages].sort(
      (a, b) => getDateValue(a.createdAt) - getDateValue(b.createdAt)
    );
  }, [activeConversation]);

  const archiveConversations = useMemo(() => {
    const base = conversations.filter((c) => c.id !== activeConversation?.id);
    if (archiveFilter === "ALL") return base;
    return base.filter((c) => c.status === archiveFilter);
  }, [activeConversation?.id, archiveFilter, conversations]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !messageDraft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendConversationMessage(activeConversation.id, messageDraft.trim());
      setMessageDraft("");
      await loadNotebook(activeConversation.id);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const createConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const participantIds = assignedTeacher ? [assignedTeacher.id] : [];
      const created = await createConversation(studentId, {
        subject: newSubject.trim(),
        participantIds,
        firstMessage: { body: newMessage.trim() }
      });
      setShowNewConsult(false);
      setNewSubject("");
      setNewMessage("");
      await loadNotebook(created.id);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  if (!selectedStudent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <MaterialIcon name="menu_book" className="text-4xl text-slate-200" />
        <h3 className="font-semibold text-slate-700">Sin alumno seleccionado</h3>
        <p className="text-sm text-slate-400">
          Seleccioná un atleta en Resumen para abrir su cuaderno de notas.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-5">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <MaterialIcon name="warning" className="text-base" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">

        {/* Hero */}
        <div className="col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 p-5 text-white">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              {isChatRoute ? "Comunicación directa" : "Interacción familiar"}
            </p>
            {!isChatRoute && (
              <h1 className="mt-1 text-xl font-bold">
                Cuaderno de <em className="not-italic text-violet-200">Notas Digital</em>
              </h1>
            )}
            {isChatRoute && (
              <h1 className="mt-1 text-xl font-bold">Hablá con el profe</h1>
            )}
            {/* Teacher pill */}
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  Profesor asignado
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {assignedTeacher
                    ? `${assignedTeacher.firstName} ${assignedTeacher.lastName}`
                    : "Sin profesor asignado"}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <MaterialIcon name="school" className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Active chat */}
        <div className="col-span-2 overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-900">Conversación activa</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              #{activeConversation?.id.slice(-6).toUpperCase() ?? "------"}
            </span>
          </div>

          {/* Messages */}
          <div className="flex min-h-[200px] max-h-72 flex-col gap-3 overflow-y-auto p-4">
            {loading && (
              <p className="text-center text-sm text-slate-400">Cargando mensajes...</p>
            )}
            {!loading && !activeConversation && (
              <p className="text-center text-sm text-slate-400">
                No hay conversaciones activas. Creá una nueva consulta para comenzar.
              </p>
            )}
            {!loading &&
              sortedMessages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {!isMine && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                        {msg.sender.firstName.charAt(0)}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                        isMine
                          ? "rounded-br-sm bg-[var(--primary)] text-white"
                          : "rounded-bl-sm bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p className="text-sm leading-snug">{msg.body}</p>
                      {msg.attachments.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {msg.attachments.map((att, i) => (
                            <a
                              key={`${msg.id}-${i}`}
                              className="flex items-center gap-1 text-xs underline opacity-80"
                              href={att.fileUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <MaterialIcon name="attach_file" className="text-xs" />
                              {att.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                      <p className={`mt-0.5 text-[10px] ${isMine ? "text-white/60" : "text-slate-400"}`}>
                        {formatClock(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Compose */}
          <form
            className="flex items-center gap-2 border-t border-slate-100 px-4 py-3"
            onSubmit={sendMessage}
          >
            <input
              className="flex-1 rounded-full bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-[var(--primary)] transition-all"
              onChange={(e) => setMessageDraft(e.target.value)}
              placeholder="Escribí un mensaje..."
              type="text"
              value={messageDraft}
            />
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white transition-opacity disabled:opacity-40"
              disabled={sending || !activeConversation || !messageDraft.trim()}
              type="submit"
            >
              <MaterialIcon name="send" filled className="text-sm" />
            </button>
          </form>
        </div>

        {/* Archive */}
        <div className="col-span-2 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Archivo de tickets</h3>
            <div className="flex items-center gap-1.5">
              <MaterialIcon name="filter_list" className="text-slate-400 text-sm" />
              <select
                className="bg-transparent text-xs font-medium text-slate-500 outline-none"
                onChange={(e) => setArchiveFilter(e.target.value as ArchiveFilter)}
                value={archiveFilter}
              >
                <option value="ALL">Todos</option>
                <option value="OPEN">Activos</option>
                <option value="CLOSED">Finalizados</option>
                <option value="ARCHIVED">Archivados</option>
              </select>
            </div>
          </div>

          <div className="p-3">
            {archiveConversations.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No hay tickets para este filtro.
              </p>
            ) : (
              <div className="space-y-2">
                {archiveConversations.map((conv) => {
                  const last = getLastMessage(conv);
                  return (
                    <button
                      key={conv.id}
                      className="w-full rounded-2xl bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100"
                      onClick={() => setActiveConversationId(conv.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusColors[conv.status]}`}>
                            {statusLabel[conv.status]}
                          </span>
                          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] text-slate-500">
                            {formatTicketDate(conv.updatedAt)}
                          </span>
                        </div>
                        <MaterialIcon name="arrow_forward" className="text-slate-300 text-sm" />
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-slate-900 truncate">
                        {conv.subject || "Consulta sin asunto"}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                        {last ? truncate(last.body, 85) : "Sin mensajes todavía."}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* New consult form */}
            {showNewConsult && (
              <form
                className="mt-3 space-y-2 rounded-2xl border border-slate-200 p-4"
                onSubmit={createConsult}
              >
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[var(--primary)] focus:bg-white"
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Asunto de la consulta"
                  type="text"
                  value={newSubject}
                />
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[var(--primary)] focus:bg-white resize-none"
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribí la primera nota para el profesor..."
                  rows={3}
                  value={newMessage}
                />
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-full bg-[var(--primary)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={creating}
                    type="submit"
                  >
                    {creating ? "Creando..." : "Crear consulta"}
                  </button>
                  <button
                    className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
                    onClick={() => {
                      setShowNewConsult(false);
                      setNewSubject("");
                      setNewMessage("");
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <button
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary-softer)] py-3 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
              onClick={() => setShowNewConsult((v) => !v)}
              type="button"
            >
              <MaterialIcon name="add_comment" className="text-base" />
              Nueva consulta
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
