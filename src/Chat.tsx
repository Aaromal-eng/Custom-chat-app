import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Hash, MessageSquare, Plus, Search, Send, Smile, Paperclip,
  Mic, MicOff, StopCircle, X, ChevronLeft, LogOut, Users,
  MoreHorizontal, Reply, Check, CheckCheck, ImageIcon, Video,
  Loader2, AtSign, Settings, Trash2
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────
const SCALEDRONE_CHANNEL   = import.meta.env.VITE_SCALEDRONE_CHANNEL_ID
const GIPHY_KEY            = import.meta.env.VITE_GIPHY_API_KEY
const CHUNK_SIZE           = 32 * 1024  // 32 KB per packet
const EMOJI_LIST           = ['👍','❤️','😂','😮','😢','🔥','💯','🎉','🤔','👎']

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2, 11)
const ts   = () => Date.now()
const fmtTime = (ms) => {
  const d = new Date(ms)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
const displayName = (user) =>
  user?.user_metadata?.display_name
  || user?.user_metadata?.full_name
  || user?.email?.split('@')[0]
  || 'Anonymous'

const avatarInitials = (name) =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

const avatarColor = (str) => {
  const colors = ['bg-purple-600','bg-blue-600','bg-emerald-600','bg-orange-600','bg-pink-600','bg-cyan-600']
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}

// ─── Drone singleton ─────────────────────────────────────────────────────────
let droneInstance = null
function getDrone(clientId) {
  if (droneInstance) return droneInstance
  droneInstance = new window.Scaledrone(SCALEDRONE_CHANNEL, { data: { clientId } })
  return droneInstance
}

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({ name, size = 8, src }) {
  const initials = avatarInitials(name || '?')
  const color    = avatarColor(name || '?')
  const sizeClass = `w-${size} h-${size}`
  if (src) return <img src={src} alt={name} className={`${sizeClass} rounded-full object-cover`} />
  return (
    <div className={`${sizeClass} rounded-full ${color} flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ fontSize: size <= 8 ? '0.65rem' : '0.85rem' }}>
      {initials}
    </div>
  )
}

// ─── Typing dots ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 h-4">
      {[0,1,2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-text-dim animate-[dotBounce_1.4s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </span>
  )
}

// ─── Message read checkmark ───────────────────────────────────────────────────
function ReadMark({ status }) {
  if (status === 'delivered') return <CheckCheck size={13} className="text-accent opacity-80" />
  return <Check size={13} className="text-text-dim" />
}

// ─── GIF picker ───────────────────────────────────────────────────────────────
function GifPicker({ onSelect, onClose }) {
  const [query, setQuery]   = useState('')
  const [gifs, setGifs]     = useState([])
  const [loading, setLoad]  = useState(true)
  const debounce            = useRef(null)

  const fetchGifs = useCallback(async (q) => {
    setLoad(true)
    const base  = 'https://api.giphy.com/v1/gifs'
    const path  = q ? `${base}/search?q=${encodeURIComponent(q)}&limit=18` : `${base}/trending?limit=18`
    const url   = `${path}&api_key=${GIPHY_KEY}&rating=g`
    try {
      const res  = await fetch(url)
      const json = await res.json()
      setGifs(json.data || [])
    } catch { setGifs([]) }
    setLoad(false)
  }, [])

  useEffect(() => { fetchGifs('') }, [fetchGifs])

  function handleInput(e) {
    setQuery(e.target.value)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => fetchGifs(e.target.value), 400)
  }

  return (
    <div className="absolute bottom-full mb-2 right-0 w-80 bg-surface border border-border rounded-2xl shadow-card overflow-hidden animate-slide-up z-50">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary">GIFs</span>
        <button onClick={onClose} className="text-text-dim hover:text-text-primary"><X size={14} /></button>
      </div>
      <div className="px-3 py-2 border-b border-border">
        <input className="input-field text-xs py-2" placeholder="Search GIPHY…" value={query} onChange={handleInput} />
      </div>
      <div className="h-56 overflow-y-auto p-2 grid grid-cols-3 gap-1.5">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        ) : gifs.map(g => (
          <button key={g.id}
            onClick={() => onSelect(g.images.fixed_height_small.url)}
            className="rounded-lg overflow-hidden hover:ring-2 hover:ring-accent transition-all aspect-square">
            <img src={g.images.fixed_height_small.url} alt={g.title} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <div className="px-3 py-1.5 border-t border-border flex justify-end">
        <span className="text-[10px] text-text-dim">Powered by GIPHY</span>
      </div>
    </div>
  )
}

// ─── Emoji reaction tray ──────────────────────────────────────────────────────
function ReactionTray({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-full mb-1 left-0 bg-elevated border border-border rounded-2xl px-2 py-1.5 flex gap-1 shadow-card z-50 animate-fade-in">
      {EMOJI_LIST.map(e => (
        <button key={e}
          onClick={() => { onSelect(e); onClose() }}
          className="text-lg hover:scale-125 transition-transform leading-none p-0.5">
          {e}
        </button>
      ))}
    </div>
  )
}

// ─── Quote preview (reply context) ───────────────────────────────────────────
function QuotePreview({ message, onClear }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 mx-3 mb-2 bg-elevated border-l-2 border-accent rounded-r-xl px-3 py-2 animate-fade-in">
      <Reply size={13} className="text-accent mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-accent mb-0.5">{message.senderName}</p>
        <p className="text-xs text-text-secondary truncate">
          {message.type === 'gif' ? '🖼 GIF' :
           message.type === 'voice' ? '🎙 Voice note' :
           message.type === 'video' ? '🎬 Video' :
           message.text}
        </p>
      </div>
      <button onClick={onClear} className="text-text-dim hover:text-text-primary flex-shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

// ─── Transfer progress bar ────────────────────────────────────────────────────
function TransferBubble({ progress, label, isMine }) {
  return (
    <div className={`${isMine ? 'message-bubble-mine' : 'message-bubble-theirs'} min-w-[160px]`}>
      <p className="text-xs mb-2 opacity-80">{label}</p>
      <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
        <div className="h-full bg-white/80 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[10px] mt-1 opacity-60 text-right">{Math.round(progress)}%</p>
    </div>
  )
}

// ─── Single message row ───────────────────────────────────────────────────────
function MessageRow({ msg, isMine, onReply, onReact, onDeleteLocal }) {
  const [showActions, setShowActions] = useState(false)
  const [showTray, setShowTray]       = useState(false)
  const [trayTarget, setTrayTarget]   = useState(null)

  function handleReactionSelect(emoji) {
    onReact(msg.id, emoji)
    setShowTray(false)
  }

  const reactionEntries = Object.entries(msg.reactions || {})

  return (
    <div
      className={`group flex gap-2.5 mb-1 ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end px-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowTray(false) }}
    >
      {/* Avatar */}
      {!isMine && (
        <Avatar name={msg.senderName} size={7}
          src={msg.senderAvatar} />
      )}

      {/* Bubble column */}
      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[70%] relative`}>
        {/* Sender name (group) */}
        {!isMine && (
          <span className="text-[11px] text-text-dim mb-0.5 ml-1">{msg.senderName}</span>
        )}

        {/* Reply quote */}
        {msg.replyTo && (
          <div className={`mb-1 text-xs border-l-2 border-accent pl-2 py-0.5 rounded-r-lg opacity-70 ${isMine ? 'text-white/70 bg-white/10' : 'text-text-secondary bg-elevated'}`}>
            <span className="font-semibold text-accent text-[10px]">{msg.replyTo.senderName}</span>
            <p className="truncate max-w-[200px]">
              {msg.replyTo.type === 'gif' ? '🖼 GIF' :
               msg.replyTo.type === 'voice' ? '🎙 Voice note' :
               msg.replyTo.text}
            </p>
          </div>
        )}

        {/* Main bubble */}
        {msg.progress !== undefined && msg.progress < 100 ? (
          <TransferBubble progress={msg.progress} label={msg.transferLabel || 'Transferring…'} isMine={isMine} />
        ) : msg.type === 'gif' ? (
          <div className={`rounded-2xl overflow-hidden ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'} max-w-[220px]`}>
            <img src={msg.url} alt="GIF" className="w-full" loading="lazy" />
          </div>
        ) : msg.type === 'voice' ? (
          <div className={`${isMine ? 'message-bubble-mine' : 'message-bubble-theirs'} flex items-center gap-3 min-w-[180px]`}>
            <Mic size={14} className={isMine ? 'text-white/70' : 'text-accent'} />
            <audio src={msg.url} controls className="h-6 max-w-[130px]"
              style={{ filter: isMine ? 'invert(1)' : 'none' }} />
          </div>
        ) : msg.type === 'video' ? (
          <div className={`rounded-2xl overflow-hidden max-w-[280px] ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
            <video src={msg.url} controls className="w-full rounded-2xl" />
          </div>
        ) : (
          <div className={isMine ? 'message-bubble-mine' : 'message-bubble-theirs'}>
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
          </div>
        )}

        {/* Timestamp + read status */}
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-text-dim">{fmtTime(msg.ts)}</span>
          {isMine && <ReadMark status={msg.status} />}
        </div>

        {/* Reaction bubbles */}
        {reactionEntries.length > 0 && (
          <div className={`flex gap-1 flex-wrap mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, count]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className="bg-elevated border border-border rounded-full text-xs px-2 py-0.5 hover:border-accent transition-colors">
                {emoji} {count > 1 && <span className="text-text-secondary">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Action tray (hover) */}
        {showActions && (
          <div className={`absolute top-0 flex items-center gap-0.5 ${isMine ? 'right-full mr-2' : 'left-full ml-2'} z-40 animate-fade-in`}>
            <div className="relative">
              <button onClick={() => { setShowTray(t => !t); setTrayTarget(msg.id) }}
                className="p-1.5 rounded-lg bg-elevated border border-border text-text-secondary hover:text-text-primary transition-colors">
                <Smile size={13} />
              </button>
              {showTray && trayTarget === msg.id && (
                <ReactionTray onSelect={handleReactionSelect} onClose={() => setShowTray(false)} />
              )}
            </div>
            <button onClick={() => onReply(msg)}
              className="p-1.5 rounded-lg bg-elevated border border-border text-text-secondary hover:text-text-primary transition-colors">
              <Reply size={13} />
            </button>
            {isMine && (
              <button onClick={() => onDeleteLocal(msg.id)}
                className="p-1.5 rounded-lg bg-elevated border border-border text-red-400 hover:text-red-300 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Room header ──────────────────────────────────────────────────────────────
function RoomHeader({ room, onlineCount, onBack, onSignOut }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-sm flex-shrink-0">
      <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-elevated text-text-secondary">
        <ChevronLeft size={18} />
      </button>
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="relative">
          {room.type === 'dm' ? (
            <Avatar name={room.targetName} size={8} />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Hash size={14} className="text-accent" />
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-surface" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {room.type === 'dm' ? room.targetName : `# ${room.name}`}
          </p>
          <p className="text-[10px] text-text-dim">
            {onlineCount} online
          </p>
        </div>
      </div>
      <button onClick={onSignOut} className="p-2 rounded-xl hover:bg-elevated text-text-dim hover:text-text-secondary transition-colors" title="Sign out">
        <LogOut size={15} />
      </button>
    </div>
  )
}

// ─── Main Chat component ──────────────────────────────────────────────────────
export default function Chat({ user, onSignOut }) {
  const myName     = displayName(user)
  const myId       = user.id
  const myAvatar   = user.user_metadata?.avatar_url || null

  // Rooms state
  const [rooms, setRooms]             = useState([
    { id: 'general', name: 'general', type: 'group' },
    { id: 'random',  name: 'random',  type: 'group' },
  ])
  const [activeRoomId, setActiveRoomId] = useState('general')
  const [sidebarOpen, setSidebarOpen]   = useState(true)
  const [sidebarTab, setSidebarTab]     = useState('group') // 'group' | 'dm'

  // New room inputs
  const [newGroup, setNewGroup]         = useState('')
  const [newDmTarget, setNewDmTarget]   = useState('')

  // Messages per room
  const [roomMessages, setRoomMessages] = useState({})
  const [replyTo, setReplyTo]           = useState(null)
  const [typingUsers, setTypingUsers]   = useState({})
  const [onlineCount, setOnlineCount]   = useState(1)

  // Input state
  const [text, setText]     = useState('')
  const [showGif, setGif]   = useState(false)

  // Voice recording
  const [recording, setRecording]   = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const mediaRecRef  = useRef(null)
  const recTimerRef  = useRef(null)
  const chunksRef    = useRef([])

  // Incoming file chunk buffers  { transferId: { chunks:[], total, label } }
  const inboundBuffers = useRef({})

  // Drone + subscription refs
  const droneRef    = useRef(null)
  const subRefs     = useRef({})
  const typingTimer = useRef(null)

  const messagesEndRef = useRef(null)
  const fileInputRef   = useRef(null)

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0]

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages, activeRoomId])

  // ── Ensure Scaledrone script loaded ───────────────────────────────────────
  useEffect(() => {
    if (window.Scaledrone) { initDrone(); return }
    const s = document.createElement('script')
    s.src   = 'https://cdn.scaledrone.com/scaledrone.min.js'
    s.onload = initDrone
    document.head.appendChild(s)
  }, [])

  function initDrone() {
    if (droneRef.current) return
    const drone = getDrone(myId)
    droneRef.current = drone

    drone.on('open', () => {
      subscribeToRoom('general')
      subscribeToRoom('random')
    })
    drone.on('error', console.error)
    drone.on('close', () => {})
  }

  // ── Subscribe/unsubscribe to a room ────────────────────────────────────────
  function subscribeToRoom(roomId) {
    if (subRefs.current[roomId]) return
    const drone = droneRef.current
    if (!drone) return

    const roomName = `observable-${roomId}`
    const room     = drone.subscribe(roomName)
    subRefs.current[roomId] = room

    room.on('open', (err) => { if (!err) console.log(`Joined ${roomId}`) })

    room.on('members', (members) => {
      if (roomId === activeRoomId) setOnlineCount(members.length)
    })

    room.on('member_join', () => {
      if (roomId === activeRoomId) setOnlineCount(c => c + 1)
      // Mark all my sent messages as delivered
      setRoomMessages(prev => {
        const msgs = (prev[roomId] || []).map(m =>
          m.senderId === myId && m.status === 'sent' ? { ...m, status: 'delivered' } : m
        )
        return { ...prev, [roomId]: msgs }
      })
    })

    room.on('member_leave', () => {
      if (roomId === activeRoomId) setOnlineCount(c => Math.max(1, c - 1))
    })

    room.on('data', (data, member) => {
      if (!data || !data.type) return
      handleIncoming(roomId, data, member)
    })
  }

  // ── Handle incoming Scaledrone messages ────────────────────────────────────
  function handleIncoming(roomId, data, member) {
    const senderId = data.senderId || member?.id

    if (data.type === 'typing') {
      if (senderId !== myId) {
        setTypingUsers(prev => ({ ...prev, [roomId]: data.name }))
        setTimeout(() => setTypingUsers(prev => {
          const n = { ...prev }; delete n[roomId]; return n
        }), 2000)
      }
      return
    }

    if (data.type === 'reaction') {
      setRoomMessages(prev => {
        const msgs = (prev[roomId] || []).map(m => {
          if (m.id !== data.msgId) return m
          const reactions = { ...m.reactions }
          reactions[data.emoji] = (reactions[data.emoji] || 0) + 1
          return { ...m, reactions }
        })
        return { ...prev, [roomId]: msgs }
      })
      return
    }

    // File chunk packet
    if (data.type === 'chunk') {
      handleChunk(roomId, data, senderId)
      return
    }

    // Regular message
    if (senderId === myId) {
      // Update status of matching optimistic message to 'delivered'
      setRoomMessages(prev => {
        const msgs = (prev[roomId] || []).map(m =>
          m.id === data.id ? { ...m, status: 'delivered' } : m
        )
        return { ...prev, [roomId]: msgs }
      })
      return
    }

    const msg = {
      ...data,
      senderId,
      senderName: data.senderName || member?.clientData?.name || 'User',
      senderAvatar: data.senderAvatar || null,
      status: 'delivered',
      reactions: data.reactions || {},
    }
    pushMessage(roomId, msg)
  }

  // ── Chunk reassembly ───────────────────────────────────────────────────────
  function handleChunk(roomId, data, senderId) {
    const { transferId, chunkIndex, totalChunks, chunkData, mimeType, label, replyTo, ts: msgTs, senderName } = data

    if (!inboundBuffers.current[transferId]) {
      inboundBuffers.current[transferId] = { chunks: new Array(totalChunks), received: 0, total: totalChunks, mimeType, label, replyTo, ts: msgTs, senderName }

      // Insert placeholder progress message
      if (senderId !== myId) {
        const placeholder = {
          id: transferId,
          senderId,
          senderName,
          type: mimeType?.startsWith('video') ? 'video-transfer' : 'voice-transfer',
          transferLabel: label || 'Receiving…',
          progress: 0,
          ts: msgTs || ts(),
          reactions: {},
          status: 'delivered',
        }
        pushMessage(roomId, placeholder)
      }
    }

    const buf = inboundBuffers.current[transferId]
    buf.chunks[chunkIndex] = chunkData
    buf.received++

    const pct = Math.round((buf.received / buf.total) * 100)

    // Update progress on placeholder
    if (senderId !== myId) {
      setRoomMessages(prev => {
        const msgs = (prev[roomId] || []).map(m =>
          m.id === transferId ? { ...m, progress: pct } : m
        )
        return { ...prev, [roomId]: msgs }
      })
    }

    if (buf.received === buf.total) {
      // Reassemble
      const binaryChunks = buf.chunks.map(b64 => {
        const binary = atob(b64)
        const bytes  = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        return bytes
      })
      const blob = new Blob(binaryChunks, { type: buf.mimeType })
      const url  = URL.createObjectURL(blob)

      const finalMsg = {
        id: transferId,
        senderId,
        senderName: buf.senderName,
        type: buf.mimeType?.startsWith('video') ? 'video' : 'voice',
        url,
        replyTo: buf.replyTo || null,
        ts: buf.ts || ts(),
        reactions: {},
        status: 'delivered',
        progress: 100,
      }

      if (senderId !== myId) {
        setRoomMessages(prev => {
          const msgs = (prev[roomId] || []).map(m =>
            m.id === transferId ? finalMsg : m
          )
          return { ...prev, [roomId]: msgs }
        })
      } else {
        setRoomMessages(prev => {
          const msgs = (prev[roomId] || []).map(m =>
            m.id === transferId ? { ...m, url, progress: 100 } : m
          )
          return { ...prev, [roomId]: msgs }
        })
      }

      delete inboundBuffers.current[transferId]
    }
  }

  // ── Push a message into a room ─────────────────────────────────────────────
  function pushMessage(roomId, msg) {
    setRoomMessages(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), msg],
    }))
  }

  // ── Publish via Scaledrone ─────────────────────────────────────────────────
  function publish(roomId, payload) {
    const drone = droneRef.current
    if (!drone) return
    drone.publish({ room: `observable-${roomId}`, message: payload })
  }

  // ── Send text message ──────────────────────────────────────────────────────
  function sendText(e) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    const msg = {
      id: uid(),
      type: 'text',
      text: trimmed,
      senderId: myId,
      senderName: myName,
      senderAvatar: myAvatar,
      replyTo: replyTo || null,
      ts: ts(),
      reactions: {},
      status: 'sent',
    }

    pushMessage(activeRoomId, msg)
    publish(activeRoomId, msg)
    setText('')
    setReplyTo(null)
  }

  // ── Send GIF ───────────────────────────────────────────────────────────────
  function sendGif(url) {
    const msg = {
      id: uid(),
      type: 'gif',
      url,
      senderId: myId,
      senderName: myName,
      senderAvatar: myAvatar,
      replyTo: replyTo || null,
      ts: ts(),
      reactions: {},
      status: 'sent',
    }
    pushMessage(activeRoomId, msg)
    publish(activeRoomId, msg)
    setGif(false)
    setReplyTo(null)
  }

  // ── Chunked transfer ───────────────────────────────────────────────────────
  async function sendChunked(file, mimeType, label) {
    const transferId = uid()
    const buffer     = await file.arrayBuffer()
    const bytes      = new Uint8Array(buffer)
    const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE)
    const msgTs      = ts()

    // Insert sender-side progress placeholder
    const placeholder = {
      id: transferId,
      type: mimeType.startsWith('video') ? 'video' : 'voice',
      senderId: myId,
      senderName: myName,
      transferLabel: `Sending ${label}…`,
      progress: 0,
      url: null,
      replyTo: replyTo || null,
      ts: msgTs,
      reactions: {},
      status: 'sent',
    }
    pushMessage(activeRoomId, placeholder)
    setReplyTo(null)

    for (let i = 0; i < totalChunks; i++) {
      const slice     = bytes.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      const b64       = btoa(String.fromCharCode(...slice))
      const chunkPct  = Math.round(((i + 1) / totalChunks) * 100)

      const packet = {
        type: 'chunk',
        transferId,
        chunkIndex: i,
        totalChunks,
        chunkData: b64,
        mimeType,
        label,
        replyTo: placeholder.replyTo,
        ts: msgTs,
        senderId: myId,
        senderName: myName,
      }

      publish(activeRoomId, packet)

      // Update sender progress
      setRoomMessages(prev => {
        const msgs = (prev[activeRoomId] || []).map(m =>
          m.id === transferId ? { ...m, progress: chunkPct } : m
        )
        return { ...prev, [activeRoomId]: msgs }
      })

      // Small async yield to avoid locking the event loop on large files
      if (i % 4 === 0) await new Promise(r => setTimeout(r, 0))
    }

    // Sender: create local Blob URL from original file for immediate preview
    const localUrl = URL.createObjectURL(file)
    setRoomMessages(prev => {
      const msgs = (prev[activeRoomId] || []).map(m =>
        m.id === transferId ? { ...m, url: localUrl, progress: 100, status: 'delivered' } : m
      )
      return { ...prev, [activeRoomId]: msgs }
    })
  }

  // ── File input handler ─────────────────────────────────────────────────────
  async function handleFileInput(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.type.startsWith('video/')) {
      await sendChunked(file, file.type, `📹 ${file.name}`)
    } else {
      // Fallback: treat as text announcement
      alert('Only video files supported via file picker. Use the mic for voice notes.')
    }
  }

  // ── Voice recording ────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec    = new MediaRecorder(stream)
      mediaRecRef.current = rec
      chunksRef.current   = []

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        await sendChunked(blob, 'audio/webm', '🎙 Voice note')
        setRecording(false)
        setRecSeconds(0)
      }

      rec.start(250)
      setRecording(true)
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch (err) {
      alert('Microphone access denied: ' + err.message)
    }
  }

  function stopRecording() {
    clearInterval(recTimerRef.current)
    if (mediaRecRef.current?.state !== 'inactive') mediaRecRef.current.stop()
  }

  function cancelRecording() {
    clearInterval(recTimerRef.current)
    if (mediaRecRef.current?.state !== 'inactive') {
      mediaRecRef.current.ondataavailable = null
      mediaRecRef.current.onstop = null
      mediaRecRef.current.stop()
      mediaRecRef.current.stream?.getTracks().forEach(t => t.stop())
    }
    setRecording(false)
    setRecSeconds(0)
  }

  // ── Typing indicator ───────────────────────────────────────────────────────
  function handleTextChange(e) {
    setText(e.target.value)
    clearTimeout(typingTimer.current)
    publish(activeRoomId, { type: 'typing', name: myName, senderId: myId })
    typingTimer.current = setTimeout(() => {}, 2000)
  }

  // ── Reactions ──────────────────────────────────────────────────────────────
  function handleReact(msgId, emoji) {
    setRoomMessages(prev => {
      const msgs = (prev[activeRoomId] || []).map(m => {
        if (m.id !== msgId) return m
        const reactions = { ...m.reactions }
        reactions[emoji] = (reactions[emoji] || 0) + 1
        return { ...m, reactions }
      })
      return { ...prev, [activeRoomId]: msgs }
    })
    publish(activeRoomId, { type: 'reaction', msgId, emoji, senderId: myId })
  }

  // ── Delete local ───────────────────────────────────────────────────────────
  function deleteLocal(msgId) {
    setRoomMessages(prev => ({
      ...prev,
      [activeRoomId]: (prev[activeRoomId] || []).filter(m => m.id !== msgId),
    }))
  }

  // ── Room switching ─────────────────────────────────────────────────────────
  function switchRoom(id) {
    setActiveRoomId(id)
    setSidebarOpen(false) // auto-close on mobile
    const drone = droneRef.current
    if (drone && !subRefs.current[id]) subscribeToRoom(id)
  }

  // ── Create new group ───────────────────────────────────────────────────────
  function createGroup(e) {
    e.preventDefault()
    const name = newGroup.trim().toLowerCase().replace(/\s+/g, '-')
    if (!name) return
    const id = `grp-${name}-${uid().slice(0,4)}`
    setRooms(prev => [...prev, { id, name, type: 'group' }])
    setNewGroup('')
    switchRoom(id)
  }

  // ── Open DM ────────────────────────────────────────────────────────────────
  function openDm(e) {
    e.preventDefault()
    const target = newDmTarget.trim()
    if (!target) return
    const dmId = `dm-${[myId, target].sort().join('-')}`
    if (!rooms.find(r => r.id === dmId)) {
      setRooms(prev => [...prev, { id: dmId, name: dmId, type: 'dm', targetName: target }])
    }
    setNewDmTarget('')
    switchRoom(dmId)
  }

  // ── Keyboard send (Enter without Shift) ───────────────────────────────────
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() }
  }

  const currentMessages = roomMessages[activeRoomId] || []
  const typingLabel     = typingUsers[activeRoomId]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex bg-void overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:relative z-40 lg:z-auto
        w-72 h-full flex-shrink-0
        bg-surface border-r border-border
        flex flex-col
        transition-transform duration-200
      `}>
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
              <MessageSquare size={14} className="text-accent" />
            </div>
            <span className="font-bold text-text-primary text-sm tracking-tight">Cipher</span>
          </div>
          <Avatar name={myName} src={myAvatar} size={7} />
        </div>

        {/* Tab switcher */}
        <div className="flex p-2 gap-1 border-b border-border">
          <button onClick={() => setSidebarTab('group')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${sidebarTab === 'group' ? 'bg-elevated text-text-primary' : 'text-text-dim hover:text-text-secondary'}`}>
            <Hash size={12} /> Groups
          </button>
          <button onClick={() => setSidebarTab('dm')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${sidebarTab === 'dm' ? 'bg-elevated text-text-primary' : 'text-text-dim hover:text-text-secondary'}`}>
            <AtSign size={12} /> DMs
          </button>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {sidebarTab === 'group' && rooms.filter(r => r.type === 'group').map(room => (
            <button key={room.id}
              onClick={() => switchRoom(room.id)}
              className={`sidebar-item w-full text-left ${activeRoomId === room.id ? 'active' : ''}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${activeRoomId === room.id ? 'bg-accent/20' : 'bg-elevated'}`}>
                <Hash size={12} className={activeRoomId === room.id ? 'text-accent' : 'text-text-dim'} />
              </div>
              <span className={`text-sm truncate ${activeRoomId === room.id ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                {room.name}
              </span>
              {typingUsers[room.id] && (
                <span className="ml-auto flex-shrink-0"><TypingDots /></span>
              )}
            </button>
          ))}

          {sidebarTab === 'dm' && rooms.filter(r => r.type === 'dm').map(room => (
            <button key={room.id}
              onClick={() => switchRoom(room.id)}
              className={`sidebar-item w-full text-left ${activeRoomId === room.id ? 'active' : ''}`}>
              <Avatar name={room.targetName} size={7} />
              <span className={`text-sm truncate ${activeRoomId === room.id ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                {room.targetName}
              </span>
            </button>
          ))}

          {((sidebarTab === 'group' && rooms.filter(r => r.type === 'group').length === 0) ||
            (sidebarTab === 'dm'    && rooms.filter(r => r.type === 'dm').length === 0)) && (
            <p className="text-xs text-text-dim text-center py-8">
              {sidebarTab === 'group' ? 'No groups yet' : 'No DMs yet'}
            </p>
          )}
        </div>

        {/* New room input */}
        <div className="p-3 border-t border-border">
          {sidebarTab === 'group' ? (
            <form onSubmit={createGroup} className="flex gap-2">
              <input className="input-field text-xs py-2" placeholder="New group name…"
                value={newGroup} onChange={e => setNewGroup(e.target.value)} />
              <button type="submit"
                className="p-2 bg-accent hover:bg-accent-glow rounded-xl text-white transition-colors flex-shrink-0">
                <Plus size={14} />
              </button>
            </form>
          ) : (
            <form onSubmit={openDm} className="flex gap-2">
              <input className="input-field text-xs py-2" placeholder="@username to DM…"
                value={newDmTarget} onChange={e => setNewDmTarget(e.target.value)} />
              <button type="submit"
                className="p-2 bg-accent hover:bg-accent-glow rounded-xl text-white transition-colors flex-shrink-0">
                <Plus size={14} />
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main panel ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <RoomHeader
          room={activeRoom}
          onlineCount={onlineCount}
          onBack={() => setSidebarOpen(true)}
          onSignOut={onSignOut}
        />

        {/* Messages viewport */}
        <div className="flex-1 overflow-y-auto py-4 space-y-0.5">
          {currentMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-elevated border border-border flex items-center justify-center">
                {activeRoom.type === 'dm' ? <AtSign size={24} className="text-accent" /> : <Hash size={24} className="text-accent" />}
              </div>
              <p className="text-sm text-text-dim">
                {activeRoom.type === 'dm'
                  ? `Start a private conversation with ${activeRoom.targetName}`
                  : `This is the beginning of #${activeRoom.name}`}
              </p>
            </div>
          )}

          {currentMessages.map(msg => (
            <MessageRow
              key={msg.id}
              msg={msg}
              isMine={msg.senderId === myId}
              onReply={setReplyTo}
              onReact={handleReact}
              onDeleteLocal={deleteLocal}
            />
          ))}

          {/* Typing indicator */}
          {typingLabel && (
            <div className="px-4 flex items-center gap-2 animate-fade-in">
              <span className="text-xs text-text-dim italic">{typingLabel} is typing</span>
              <TypingDots />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ───────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-border bg-surface/60 backdrop-blur-sm">

          {/* Reply preview */}
          <QuotePreview message={replyTo} onClear={() => setReplyTo(null)} />

          {/* Recording mode */}
          {recording ? (
            <div className="flex items-center gap-3 px-4 py-3 animate-fade-in">
              <div className="flex items-center gap-2 flex-1 bg-elevated border border-red-500/40 rounded-xl px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-400 font-mono">
                  {String(Math.floor(recSeconds/60)).padStart(2,'0')}:{String(recSeconds%60).padStart(2,'0')}
                </span>
                <span className="text-xs text-text-dim ml-2">Recording…</span>
              </div>
              <button onClick={cancelRecording}
                className="p-2.5 rounded-xl bg-elevated border border-border text-text-dim hover:text-red-400 transition-colors">
                <X size={16} />
              </button>
              <button onClick={stopRecording}
                className="p-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white transition-colors shadow-glow">
                <StopCircle size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2 px-3 py-3">
              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileInput} />

              {/* Attachment */}
              <button onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-elevated border border-border text-text-dim hover:text-accent transition-colors flex-shrink-0"
                title="Attach video">
                <Video size={16} />
              </button>

              {/* Text input */}
              <div className="relative flex-1">
                <textarea
                  rows={1}
                  className="input-field pr-10 resize-none leading-5 max-h-32 overflow-y-auto py-2.5"
                  placeholder={`Message ${activeRoom.type === 'dm' ? activeRoom.targetName : '#' + activeRoom.name}…`}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  style={{ minHeight: '42px' }}
                />
              </div>

              {/* GIF button */}
              <div className="relative flex-shrink-0">
                <button onClick={() => setGif(g => !g)}
                  className={`p-2.5 rounded-xl border transition-colors ${showGif ? 'bg-accent/20 border-accent text-accent' : 'bg-elevated border-border text-text-dim hover:text-accent'}`}
                  title="GIF">
                  <ImageIcon size={16} />
                </button>
                {showGif && (
                  <GifPicker onSelect={sendGif} onClose={() => setGif(false)} />
                )}
              </div>

              {/* Voice */}
              <button onClick={startRecording}
                className="p-2.5 rounded-xl bg-elevated border border-border text-text-dim hover:text-accent transition-colors flex-shrink-0"
                title="Record voice note">
                <Mic size={16} />
              </button>

              {/* Send */}
              <button
                onClick={sendText}
                disabled={!text.trim()}
                className="p-2.5 rounded-xl bg-accent hover:bg-accent-glow text-white transition-all shadow-glow-sm hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                title="Send (Enter)">
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
