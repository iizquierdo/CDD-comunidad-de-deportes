import React, { useEffect, useState } from 'react';

interface AdminThread {
  id: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  companyId: string;
  companyName: string;
  subject: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageBody?: string;
  lastMessageAt?: string;
  participants?: Array<{ userId: string; name: string }>;
}

interface AdminMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  senderName?: string;
  senderImageUrl?: string;
}

const studentLabel = (t: AdminThread) => [t.studentFirstName, t.studentLastName].filter(Boolean).join(' ') || '—';

const timeLabel = (iso: string): string =>
  new Date(iso).toLocaleString([], { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const MensajeriaAdminPage: React.FC = () => {
  const [threads, setThreads] = useState<AdminThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminThread | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/messaging/threads')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setThreads(data))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  const openThread = async (t: AdminThread) => {
    setSelected(t);
    setLoadingMsgs(true);
    try {
      const r = await fetch(`/api/admin/messaging/threads/${t.id}/messages`);
      if (r.ok) {
        const data = await r.json();
        setMessages(data.messages || []);
      }
    } finally {
      setLoadingMsgs(false);
    }
  };

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      studentLabel(t).toLowerCase().includes(q) ||
      (t.companyName || '').toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q) ||
      (t.lastMessageBody || '').toLowerCase().includes(q) ||
      (t.participants || []).some((p) => p.name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0, background: 'var(--background)' }}>
      {/* Thread list */}
      <div style={{ width: 420, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--card)' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>
            <i className="fa-solid fa-comments" style={{ marginRight: 8, color: 'var(--primary)' }} />
            Mensajería
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por alumno, sede, participante..."
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 13, background: 'var(--background)', color: 'var(--foreground)', outline: 'none' }}
          />
          {!loading && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>
              {filtered.length} conversación{filtered.length !== 1 ? 'es' : ''}
            </div>
          )}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20, marginBottom: 8, display: 'block' }} />
              Cargando...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
              <i className="fa-regular fa-comments" style={{ fontSize: 28, marginBottom: 8, display: 'block' }} />
              No hay conversaciones
            </div>
          )}
          {filtered.map((t) => {
            const isActive = selected?.id === t.id;
            const participantNames = (t.participants || []).map((p) => p.name).join(', ');
            return (
              <div
                key={t.id}
                onClick={() => openThread(t)}
                style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: isActive ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--accent)'; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    <i className="fa-solid fa-user-graduate" style={{ marginRight: 5, color: 'var(--primary)', fontSize: 12 }} />
                    {studentLabel(t)}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0, marginLeft: 8 }}>
                    {t.lastMessageAt ? timeLabel(t.lastMessageAt) : timeLabel(t.createdAt)}
                  </span>
                </div>
                {t.subject && (
                  <div style={{ fontSize: 12, color: 'var(--foreground)', marginBottom: 2 }}>{t.subject}</div>
                )}
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                  {t.lastMessageBody || <em>Sin mensajes</em>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--muted)', borderRadius: 4, padding: '1px 6px' }}>
                    <i className="fa-regular fa-building" style={{ marginRight: 3 }} />{t.companyName}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    <i className="fa-regular fa-comment" style={{ marginRight: 3 }} />{t.messageCount} mens.
                  </span>
                  {participantNames && (
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      <i className="fa-regular fa-user" style={{ marginRight: 3 }} />{participantNames}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thread detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!selected && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', flexDirection: 'column', gap: 8 }}>
            <i className="fa-regular fa-comments" style={{ fontSize: 40 }} />
            <span style={{ fontSize: 14 }}>Seleccioná una conversación para ver los mensajes</span>
          </div>
        )}
        {selected && (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                <i className="fa-solid fa-user-graduate" style={{ marginRight: 6, color: 'var(--primary)' }} />
                {studentLabel(selected)}
              </div>
              {selected.subject && <div style={{ fontSize: 13, color: 'var(--foreground)', marginBottom: 2 }}>{selected.subject}</div>}
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                <i className="fa-regular fa-building" style={{ marginRight: 4 }} />{selected.companyName}
                <span style={{ margin: '0 8px' }}>·</span>
                <i className="fa-regular fa-comment" style={{ marginRight: 4 }} />{selected.messageCount} mensajes
                <span style={{ margin: '0 8px' }}>·</span>
                Iniciada {timeLabel(selected.createdAt)}
              </div>
              {selected.participants && selected.participants.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>
                  <i className="fa-regular fa-users" style={{ marginRight: 4 }} />
                  {selected.participants.map((p) => p.name).join(', ')}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loadingMsgs && (
                <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: 32 }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20 }} />
                </div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, padding: 32 }}>
                  Esta conversación no tiene mensajes aún.
                </div>
              )}
              {messages.map((msg) => {
                const name = msg.senderName || [msg.firstName, msg.lastName].filter(Boolean).join(' ') || '?';
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2 }}>
                      {name} · {timeLabel(msg.createdAt)}
                    </div>
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 14, maxWidth: '70%', wordBreak: 'break-word', lineHeight: 1.5 }}>
                      {msg.body}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MensajeriaAdminPage;
