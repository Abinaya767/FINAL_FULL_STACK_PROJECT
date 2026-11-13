import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";
import { expressRequest } from "./api/expressApi.js";
import { getAuthSession } from "./api/authSession.js";
import { useAuth } from "./AuthContext.jsx";
import "./realtime.css";

const API_URL = (import.meta.env.VITE_EXPRESS_API_URL || "https://learnspace-api-idh2.onrender.com/api").replace(/\/$/, "");
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

function useLearnSpaceSocket() {
  const token = getAuthSession()?.token;
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [token]);
  return connected;
}

export function RealtimeNotificationsPage() {
  const connected = useLearnSpaceSocket();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    expressRequest("/notifications")
      .then((result) => { if (active) setNotifications(result.data?.notifications || []); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    const socket = io(SOCKET_URL, { auth: { token: getAuthSession()?.token }, transports: ["websocket", "polling"] });
    socket.on("notification:new", (notification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item._id !== notification._id)]);
    });
    return () => { active = false; socket.disconnect(); };
  }, []);

  async function markRead(id) {
    try {
      const result = await expressRequest(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((current) => current.map((item) => item._id === id ? result.data?.notification || item : item));
    } catch (err) { setError(err.message); }
  }

  return (
    <main className="realtime-page">
      <header className="realtime-header">
        <div><p className="eyebrow">{isAdmin ? "ADMIN UPDATES" : "LEARNING UPDATES"}</p><h1>Notifications</h1><p>{isAdmin ? "New student messages and important LearnSpace updates." : "Important updates from your LearnSpace account."}</p><p className="notification-unread-count">{notifications.filter((item) => !item.isRead).length} unread</p></div>
        <span className={`connection-state ${connected ? "online" : ""}`}>{connected ? "Live connection" : "Connecting…"}</span>
      </header>
      <nav className="realtime-nav"><Link to={isAdmin ? "/admin/dashboard" : "/student-dashboard"}>Dashboard</Link><Link to="/chat">Chat</Link></nav>
      {error && <p className="realtime-error" role="alert">{error}</p>}
      {loading ? <p>Loading notifications…</p> : notifications.length === 0
        ? <section className="empty-state"><h2>You’re all caught up</h2><p>New notifications will appear here automatically.</p></section>
        : <section className="notification-list" aria-label="Your notifications">
          {notifications.map((item) => (
            <article className={`notification-card ${item.isRead ? "read" : "unread"}`} key={item._id}>
              <div><h2>{item.title}</h2><p>{item.message}</p><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>{item.type === "message" && <p><Link to="/chat">Open conversation</Link></p>}</div>
              {!item.isRead && <button type="button" onClick={() => markRead(item._id)}>Mark as read</button>}
            </article>
          ))}
        </section>}
    </main>
  );
}

export function ChatPage() {
  const { user } = useAuth();
  const connected = useLearnSpaceSocket();
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const selectedContact = useMemo(() => contacts.find((item) => item.id === selectedId), [contacts, selectedId]);

  useEffect(() => {
    let active = true;
    expressRequest("/messages/contacts").then((result) => {
      if (!active) return;
      const list = result.data?.contacts || [];
      setContacts(list);
      if (list.length) setSelectedId(list[0].id);
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return undefined; }
    let active = true;
    expressRequest(`/messages/${selectedId}`).then((result) => {
      if (active) setMessages(result.data?.messages || []);
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token: getAuthSession()?.token }, transports: ["websocket", "polling"] });
    socket.on("message:new", (message) => {
      if (message.sender === selectedId || message.recipient === selectedId) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      }
    });
    return () => socket.disconnect();
  }, [selectedId]);

  async function send(event) {
    event.preventDefault();
    if (!draft.trim() || !selectedId || sending) return;
    setSending(true); setError("");
    try {
      const result = await expressRequest(`/messages/${selectedId}`, { method: "POST", body: { content: draft } });
      setMessages((current) => current.some((item) => item.id === result.data?.message?.id) ? current : [...current, result.data.message]);
      setDraft("");
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  return (
    <main className="realtime-page chat-page">
      <header className="realtime-header">
        <div><p className="eyebrow">LEARNSPACE MESSAGES</p><h1>Chat</h1><p>Talk with your LearnSpace {user?.role === "admin" ? "students" : "administrator"}.</p></div>
        <span className={`connection-state ${connected ? "online" : ""}`}>{connected ? "Live connection" : "Connecting…"}</span>
      </header>
      <nav className="realtime-nav"><Link to={user?.role === "admin" ? "/admin/dashboard" : "/student-dashboard"}>Dashboard</Link>{user?.role === "student" && <Link to="/notifications">Notifications</Link>}</nav>
      {error && <p className="realtime-error" role="alert">{error}</p>}
      <section className="chat-layout">
        <aside className="contact-panel"><h2>Contacts</h2>{contacts.length === 0 ? <p>No contacts are available yet.</p> : contacts.map((contact) => (
          <button type="button" className={selectedId === contact.id ? "selected" : ""} key={contact.id} onClick={() => setSelectedId(contact.id)}>
            <strong>{contact.name}</strong><small>{contact.role} · {contact.email}</small>
          </button>
        ))}</aside>
        <section className="conversation-panel">
          <h2>{selectedContact ? selectedContact.name : "Select a contact"}</h2>
          <div className="message-history" aria-live="polite">
            {messages.length === 0 ? <p className="empty-chat">Your conversation will appear here.</p> : messages.map((message) => (
              <article className={message.sender === user?.id ? "message-bubble own" : "message-bubble"} key={message.id}>
                <p>{message.content}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </div>
          <form className="message-composer" onSubmit={send}>
            <label className="sr-only" htmlFor="chat-message">Write a message</label>
            <input id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Write a message…" disabled={!selectedId} />
            <button type="submit" disabled={!selectedId || !draft.trim() || sending}>{sending ? "Sending…" : "Send"}</button>
          </form>
        </section>
      </section>
    </main>
  );
}
