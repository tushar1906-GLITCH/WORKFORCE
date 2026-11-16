import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import aiApi from '../../api/ai';
import MarkdownContent from '../../components/ai/MarkdownContent';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Sparkles,
  Shield,
  Clock,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

export const AiAssistantPage = () => {
  const { user, isAdmin } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingConvs, setFetchingConvs] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedPrompts = [
    { title: 'Today’s Attendance', prompt: 'What is today’s attendance summary and absent count?' },
    { title: 'Yesterday vs Today', prompt: 'Compare attendance performance between yesterday and today' },
    { title: 'Active Workforce', prompt: 'How many active workers are currently deployed across departments and sites?' },
    { title: 'Pending Leaves', prompt: 'Show all pending leave requests requiring review' },
    { title: 'Site Staffing', prompt: 'List all operational work locations and their active worker counts' },
    ...(isAdmin
      ? [{ title: 'Payroll Summary', prompt: 'What is the total gross expenditure and outstanding payroll amount?' }]
      : []),
  ];

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      setFetchingConvs(true);
      const res = await aiApi.getConversations();
      setConversations(res || []);
      if (res && res.length > 0 && !activeConvId) {
        selectConversation(res[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setFetchingConvs(false);
    }
  };

  const selectConversation = async (convId) => {
    try {
      setActiveConvId(convId);
      setErrorMsg('');
      const conv = await aiApi.getConversation(convId);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
      setErrorMsg('Failed to load conversation messages.');
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setErrorMsg('');
    inputRef.current?.focus();
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation thread?')) return;
    try {
      await aiApi.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || loading) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');
    setErrorMsg('');

    // Optimistically append user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await aiApi.sendMessage(userText, activeConvId || undefined);

      if (!activeConvId && res.conversationId) {
        setActiveConvId(res.conversationId);
        // Refresh conversations list to show new title
        loadConversations();
      }

      setMessages((prev) => {
        // Replace temp or just append assistant response
        return [...prev, res.message];
      });
    } catch (err) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'Failed to get response from AI Assistant.');
      // Add error assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error:** ${err.message || 'Unable to connect to database query engine.'}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - var(--header-height) - 40px)',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Left Sidebar: Threads */}
      <div
        style={{
          width: '280px',
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleNewChat}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              padding: '6px 10px',
              letterSpacing: '0.05em',
            }}
          >
            Recent Conversations
          </div>

          {fetchingConvs ? (
            <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Loading history...
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No previous threads. Ask a question to start!
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: isActive ? '1px solid var(--border-focus)' : '1px solid transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <Bot size={16} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                    <span
                      style={{
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '170px',
                        fontWeight: isActive ? 600 : 400,
                      }}
                      title={conv.title}
                    >
                      {conv.title || 'Conversation'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    title="Delete thread"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Scope Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Shield size={14} color={isAdmin ? 'var(--success)' : 'var(--warning)'} />
            <strong style={{ color: 'var(--text-secondary)' }}>
              {isAdmin ? 'Admin Mode' : 'Supervisor Mode'}
            </strong>
          </div>
          <div>
            {isAdmin
              ? 'Full organization and financial access.'
              : `Site-scoped (${user?.assignedSites?.length || 0} sites). Payroll restricted.`}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div
          style={{
            height: '60px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-focus)',
              }}
            >
              <Sparkles size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                ShramSetu AI Assistant
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                PostgreSQL Database-Connected &bull; Groq Llama 3.3 Engine
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--success)',
                border: '1px solid var(--success-border)',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                }}
              />
              Live DB Ready
            </span>
          </div>
        </div>

        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {messages.length === 0 ? (
            <div style={{ maxWidth: '720px', margin: '40px auto', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '1px solid var(--border-focus)',
                }}
              >
                <Bot size={32} color="var(--primary)" />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                How can I assist your operations today?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px' }}>
                Ask real-time questions about active workers, attendance rates, shifts, leave requests, or staffing.
                All answers are queried directly from live PostgreSQL records.
              </p>

              {/* Suggestion Chips */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  textAlign: 'left',
                }}
              >
                {suggestedPrompts.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputPrompt(s.prompt);
                      inputRef.current?.focus();
                    }}
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-focus)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '4px' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {s.prompt}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isUser ? 'var(--primary)' : 'rgba(59, 130, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: isUser ? 'none' : '1px solid var(--border-focus)',
                      }}
                    >
                      {isUser ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>YOU</span>
                      ) : (
                        <Bot size={18} color="var(--primary)" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      style={{
                        maxWidth: '85%',
                        backgroundColor: isUser ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)',
                        border: isUser ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 18px',
                        color: 'var(--text-primary)',
                        position: 'relative',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {isUser ? (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.92rem' }}>
                          {m.content}
                        </div>
                      ) : (
                        <div>
                          <MarkdownContent content={m.content} />
                          <div
                            style={{
                              marginTop: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderTop: '1px solid var(--border-subtle)',
                              paddingTop: '8px',
                            }}
                          >
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              onClick={() => handleCopy(m.id, m.content)}
                              title="Copy response"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                              }}
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check size={13} color="var(--success)" />
                                  <span style={{ color: 'var(--success)' }}>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={13} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {loading && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-focus)',
                    }}
                  >
                    <Bot size={18} color="var(--primary)" />
                  </div>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 18px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        border: '2px solid var(--primary)',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span>Querying live PostgreSQL database...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--danger)',
                fontSize: '0.8rem',
                marginBottom: '8px',
              }}
            >
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              backgroundColor: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)',
              padding: '6px 12px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask anything about workers, attendance, leaves, or site operations..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.92rem',
                padding: '8px 4px',
              }}
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || loading}
              style={{
                backgroundColor: inputPrompt.trim() && !loading ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: inputPrompt.trim() && !loading ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Send size={15} />
              <span>Send</span>
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginTop: '8px',
              padding: '0 4px',
            }}
          >
            <span>Live data connected &bull; Strict role permission boundaries enforced</span>
            <span>ShramSetu AI Assistant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;
