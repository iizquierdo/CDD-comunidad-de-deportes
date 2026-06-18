import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "../components/MaterialIcon";
import { fetchStudents, fetchConversations, sendConversationMessage } from "../lib/data";
import { useAuth } from "../context/AuthContext";
import type { StudentSummary, StudentConversation } from "../types";

const getInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

const formatTime = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
};

const demoStudents: StudentSummary[] = [
  { id: "s1", firstName: "Lucas", lastName: "Rodríguez", status: "ACTIVE" },
  { id: "s2", firstName: "Valentina", lastName: "González", status: "ACTIVE" },
  { id: "s3", firstName: "Mateo", lastName: "Pérez", status: "ACTIVE" }
];

const demoConversation: StudentConversation = {
  id: "conv1",
  studentId: "s1",
  subject: "Consulta sobre horarios",
  status: "OPEN",
  createdAt: new Date().toISOString(),
  participants: [
    { id: "p1", conversationId: "conv1", userId: "t1", active: true, user: { id: "t1", firstName: "Ana", lastName: "Rodríguez" } },
    { id: "p2", conversationId: "conv1", userId: "me", active: true, user: { id: "me", firstName: "Prof.", lastName: "Gómez" } }
  ],
  messages: [
    {
      id: "m1", conversationId: "conv1", senderId: "t1", body: "Hola profesor, quería consultar si el horario del martes cambió.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      sender: { id: "t1", firstName: "Ana", lastName: "Rodríguez" }, attachments: []
    },
    {
      id: "m2", conversationId: "conv1", senderId: "me", body: "¡Hola! Sí, la clase del martes pasa a las 17:30 por esta semana. El jueves volvemos al horario habitual.",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      sender: { id: "me", firstName: "Prof.", lastName: "Gómez" }, attachments: []
    },
    {
      id: "m3", conversationId: "conv1", senderId: "t1", body: "Perfecto, muchas gracias por avisarnos.",
      createdAt: new Date(Date.now() - 900000).toISOString(),
      sender: { id: "t1", firstName: "Ana", lastName: "Rodríguez" }, attachments: []
    }
  ]
};

export const ChatPage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [conversations, setConversations] = useState<StudentConversation[]>([]);
  const [activeConv, setActiveConv] = useState<StudentConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStudents()
      .then((data) => {
        const active = data.filter((s) => s.status === "ACTIVE");
        setStudents(active.length > 0 ? active : demoStudents);
      })
      .catch(() => setStudents(demoStudents))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    fetchConversations(selectedStudent.id)
      .then((data) => {
        const convs = data.length > 0 ? data : [demoConversation];
        setConversations(convs);
        setActiveConv(convs[0] ?? null);
      })
      .catch(() => {
        setConversations([demoConversation]);
        setActiveConv(demoConversation);
      });
  }, [selectedStudent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const handleSend = async () => {
    if (!draft.trim() || !activeConv || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");

    const optimistic = {
      id: `temp-${Date.now()}`,
      conversationId: activeConv.id,
      senderId: user?.id ?? "me",
      body,
      createdAt: new Date().toISOString(),
      sender: { id: user?.id ?? "me", firstName: user?.firstName ?? "Prof.", lastName: user?.lastName ?? "" },
      attachments: [] as []
    };

    setActiveConv((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimistic] } : null
    );

    try {
      await sendConversationMessage(activeConv.id, body);
    } catch {
      // optimistic message stays
    } finally {
      setSending(false);
    }
  };

  const myId = user?.id ?? "me";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--primary)]" />
        <p className="text-sm text-slate-400">Cargando mensajes...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pb-6 pt-5" style={{ minHeight: "calc(100vh - 10rem)" }}>
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Chat</h1>
        <p className="mt-1 text-sm text-slate-500">Mensajes con tutores y familias</p>
      </header>

      {/* Student selector */}
      <div className="mb-4 rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
        <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Seleccioná un alumno
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {students.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStudent(st)}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                  selectedStudent?.id === st.id
                    ? "bg-[var(--primary)] text-white shadow-md"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {getInitials(st.firstName, st.lastName)}
              </span>
              <span className={`text-[10px] font-semibold ${selectedStudent?.id === st.id ? "text-[var(--primary)]" : "text-slate-400"}`}>
                {st.firstName}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      {selectedStudent && activeConv ? (
        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-white shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          {/* Conv header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-softer)] text-xs font-bold text-[var(--primary)]">
              {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {selectedStudent.firstName} {selectedStudent.lastName}
              </p>
              <p className="text-[10px] text-slate-400">{activeConv.subject ?? "Conversación"}</p>
            </div>
            <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold ${
              activeConv.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>
              {activeConv.status === "OPEN" ? "Abierta" : "Cerrada"}
            </span>
          </div>

          {/* Messages */}
          <div
            className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
            style={{
              maxHeight: "40vh",
              background: "radial-gradient(circle at 1px 1px, rgba(128,182,195,0.3) 1px, transparent 0) 0 0 / 18px 18px"
            }}
          >
            {activeConv.messages.map((msg) => {
              const isMine = msg.senderId === myId || msg.senderId === "me";
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} max-w-[85%] ${isMine ? "self-end" : "self-start"}`}>
                  {!isMine && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary-softer)] text-[10px] font-bold text-[var(--primary)]">
                      {msg.sender.firstName.charAt(0)}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 shadow-sm ${
                      isMine
                        ? "bg-gradient-to-br from-[var(--primary-dim)] to-[var(--primary)] text-white"
                        : "bg-[#bdefff] text-slate-800"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                    <p className={`mt-1 text-[10px] ${isMine ? "text-white/70" : "text-slate-500"}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Compose */}
          <div className="flex items-center gap-2 border-t border-slate-100 bg-[rgba(191,238,254,0.5)] px-3 py-3">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
              placeholder="Escribí un mensaje..."
              className="flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm outline-none shadow-sm"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-md disabled:opacity-40"
            >
              <MaterialIcon name="send" filled className="text-base" />
            </button>
          </div>
        </div>
      ) : selectedStudent ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-14 text-center">
          <MaterialIcon name="forum" className="text-4xl text-slate-200" />
          <h3 className="font-semibold text-slate-600">Sin conversaciones</h3>
          <p className="text-sm text-slate-400">
            No hay mensajes con {selectedStudent.firstName} aún.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-14 text-center">
          <MaterialIcon name="forum" className="text-4xl text-slate-200" />
          <h3 className="font-semibold text-slate-600">Seleccioná un alumno</h3>
          <p className="text-sm text-slate-400">Elegí un alumno para ver sus mensajes con los tutores.</p>
        </div>
      )}
    </div>
  );
};
