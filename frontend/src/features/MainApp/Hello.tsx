import { useMemo, useState } from 'react'
import {
  Activity, Bell, Bookmark, BriefcaseBusiness, ChevronDown, ChevronRight, CircleHelp,
  Clock3, FileText, Hash, Inbox, LockKeyhole, Menu, MessageCircle, MoreHorizontal,
  Paperclip, Plus, Search, Send, Settings, Smile, Sparkles, Star, UserPlus, Users,
  X, Zap
} from 'lucide-react'
import { mockChannels } from '../channels/mock/channel.mock'
import { mockMessages } from '../messages/mock/message.mock'
import { mockWorkspaces } from '../workspace/mock/workspace.mock'
import type { Workspace } from '../workspace/types/workspace.types'

const members = [
  { id: 'user-1', name: 'Sarah Chen', role: 'Owner', initials: 'SC', color: 'coral', status: 'online' },
  { id: 'user-2', name: 'James Smith', role: 'Admin', initials: 'JS', color: 'blue', status: 'online' },
  { id: 'user-3', name: 'Alex Rodriguez', role: 'Member', initials: 'AR', color: 'violet', status: 'away' },
  { id: 'user-4', name: 'Maya Patel', role: 'Member', initials: 'MP', color: 'amber', status: 'offline' },
]

const dms = [
  { name: 'James Smith', initials: 'JS', color: 'blue', preview: 'The roadmap looks great', unread: 2, status: 'online' },
  { name: 'Maya Patel', initials: 'MP', color: 'amber', preview: 'Can you review this?', unread: 0, status: 'offline' },
  { name: 'Design crew', initials: 'DC', color: 'violet', preview: 'Alex: New layouts are ready', unread: 0, status: 'away' },
]

function Avatar({ initials, color = 'blue', status }: { initials: string; color?: string; status?: string }) {
  return <span className={`avatar avatar-${color}`}>{initials}<i className={status ? `presence presence-${status}` : ''} /></span>
}

function Hello() {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(mockWorkspaces[0])
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [activeChannel, setActiveChannel] = useState('general')
  const [activeSection, setActiveSection] = useState('channel')
  const [showThread, setShowThread] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [message, setMessage] = useState('')
  const [threadReply, setThreadReply] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sentMessages, setSentMessages] = useState<typeof mockMessages>([])
  const [sentThreadReplies, setSentThreadReplies] = useState<string[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const [reacted, setReacted] = useState<string[]>([])

  const allMessages = useMemo(() => [...mockMessages, ...sentMessages], [sentMessages])
  const channel = mockChannels.find((item) => item.name === activeChannel) ?? mockChannels[0]

  const sendMessage = () => {
    if (!message.trim()) return
    setSentMessages((current) => [...current, {
      id: `new-${Date.now()}`, channelId: channel.id, userId: 'user-1', userName: 'Sarah Chen', userAvatar: 'SC',
      content: message.trim(), reactions: [], threadCount: 0, isPinned: false, isSaved: false, mentions: [], createdAt: new Date(), updatedAt: new Date()
    }])
    setMessage('')
  }

  const sendThreadReply = () => {
    if (!threadReply.trim()) return
    setSentThreadReplies((current) => [...current, threadReply.trim()])
    setThreadReply('')
  }

  const switchWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace)
    setWorkspaceOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><span className="brand-symbol">✦</span><span>luma</span></div>
        <button className="mobile-menu" onClick={() => setShowMobileNav(!showMobileNav)} aria-label="Toggle navigation"><Menu /></button>
        <button className="search-trigger" onClick={() => setShowSearch(true)}><Search /><span>Search messages, people, files...</span><kbd>⌘ K</kbd></button>
        <div className="top-actions"><button aria-label="Help"><CircleHelp /></button><button aria-label="Activity" className="notification-button"><Bell /><i /></button><Avatar initials="SC" color="coral" status="online" /></div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${showMobileNav ? 'sidebar-open' : ''}`}>
          <div className="workspace-area">
            <button className="workspace-switcher" onClick={() => setWorkspaceOpen(!workspaceOpen)}>
              <span className="workspace-icon">{activeWorkspace.name.slice(0, 1)}</span><span className="workspace-name">{activeWorkspace.name}</span><ChevronDown />
            </button>
            {workspaceOpen && <div className="workspace-popover">
              <div className="popover-label">YOUR WORKSPACES</div>
              {mockWorkspaces.map((workspace) => <button key={workspace.id} className={`workspace-option ${workspace.id === activeWorkspace.id ? 'selected' : ''}`} onClick={() => switchWorkspace(workspace)}><span className="workspace-icon small">{workspace.name.slice(0, 1)}</span><span>{workspace.name}<small>{workspace.memberCount} members</small></span>{workspace.id === activeWorkspace.id && <span className="check">✓</span>}</button>)}
              <div className="popover-divider" /><button className="workspace-option muted"><Plus /> Create workspace</button><button className="workspace-option muted"><Settings /> Workspace settings</button>
            </div>}
          </div>

          <nav className="main-nav">
            <button className={activeSection === 'home' ? 'active' : ''} onClick={() => { setActiveSection('home'); setShowMobileNav(false) }}><Sparkles /> Home</button>
            <button className={activeSection === 'activity' ? 'active' : ''} onClick={() => { setActiveSection('activity'); setShowMobileNav(false) }}><Activity /> Activity <span className="nav-badge">4</span></button>
            <button className={activeSection === 'dms' ? 'active' : ''} onClick={() => { setActiveSection('dms'); setShowMobileNav(false) }}><MessageCircle /> Direct messages</button>
            <button><Bookmark /> Saved</button>
          </nav>

          <div className="sidebar-section"><div className="section-heading"><span>CHANNELS</span><button aria-label="Add channel"><Plus /></button></div>
            {mockChannels.slice(0, 5).map((item) => <button key={item.id} className={`channel-link ${activeSection === 'channel' && activeChannel === item.name ? 'active' : ''}`} onClick={() => { setActiveChannel(item.name); setActiveSection('channel'); setShowMobileNav(false) }}>{item.isPrivate ? <LockKeyhole /> : <Hash />}{item.name}{item.name === 'general' && <span className="unread-dot" />}</button>)}
          </div>
          <div className="sidebar-section"><div className="section-heading"><span>PRIVATE</span><button aria-label="Add private channel"><Plus /></button></div>{mockChannels.slice(5).map((item) => <button key={item.id} className="channel-link"><LockKeyhole />{item.name}</button>)}</div>
          <div className="sidebar-section"><div className="section-heading"><span>DIRECT MESSAGES</span><button aria-label="New message"><Plus /></button></div>{dms.map((dm) => <button key={dm.name} className="dm-link" onClick={() => { setActiveSection('dms'); setShowMobileNav(false) }}><Avatar initials={dm.initials} color={dm.color} status={dm.status} /><span>{dm.name}<small>{dm.preview}</small></span>{dm.unread > 0 && <b>{dm.unread}</b>}</button>)}</div>
          <div className="sidebar-spacer" />
          <div className="user-area"><Avatar initials="SC" color="coral" status="online" /><div><strong>Sarah Chen</strong><small>Available</small></div><button aria-label="User menu"><MoreHorizontal /></button></div>
        </aside>

        <main className="main-content">
          {activeSection === 'home' ? <HomeView workspace={activeWorkspace} setActiveSection={setActiveSection} /> : activeSection === 'activity' ? <ActivityView /> : activeSection === 'dms' ? <DMView /> : <>
            <div className="conversation-header"><div className="channel-title"><span className="title-icon"><Hash /></span><div><h1>{channel.name}</h1><p>{channel.description}</p></div></div><div className="conversation-actions"><button><Users /><span>{channel.memberCount}</span></button><button onClick={() => setShowSearch(true)}><Search /></button><button><MoreHorizontal /></button></div></div>
            <div className="message-scroller"><div className="date-marker"><span>Today</span></div>{allMessages.map((item, index) => <div className={`message-row ${index === 1 ? 'grouped' : ''}`} key={item.id}><Avatar initials={item.userAvatar === '👩‍💼' ? 'SC' : item.userAvatar === '👨‍💼' ? 'JS' : item.userAvatar === '👨‍🎨' ? 'AR' : item.userAvatar === '👩‍💻' ? 'MP' : 'SC'} color={index % 4 === 0 ? 'coral' : index % 4 === 1 ? 'blue' : index % 4 === 2 ? 'violet' : 'amber'} /><div className="message-body"><div className="message-meta"><strong>{item.userName}</strong><time>{item.createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><p>{item.content}</p><div className="message-footer"><button className={reacted.includes(item.id) ? 'reaction active' : 'reaction'} onClick={() => setReacted((r) => r.includes(item.id) ? r.filter((id) => id !== item.id) : [...r, item.id])}>👍 <span>{(item.reactions[0]?.count ?? 0) + (reacted.includes(item.id) ? 1 : 0)}</span></button>{item.threadCount > 0 && <button className="reply-link" onClick={() => setShowThread(true)}><MessageCircle /> {item.threadCount} replies</button>}</div></div><div className="message-tools"><button aria-label="Add reaction">☺</button><button onClick={() => setShowThread(true)} aria-label="Reply"><MessageCircle /></button><button onClick={() => setSaved((s) => s.includes(item.id) ? s.filter((id) => id !== item.id) : [...s, item.id])} aria-label="Save"><Bookmark /></button><button aria-label="More actions"><MoreHorizontal /></button></div></div>)}</div>
            <div className="typing-indicator"><span className="typing-dots"><i /><i /><i /></span> Maya is typing...</div>
            <div className="composer"><div className="composer-input"><textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} placeholder={`Message #${channel.name}`} rows={1} /><div className="composer-tools"><div><button aria-label="Attach"><Paperclip /></button><button aria-label="Format"><FileText /></button><button aria-label="Add emoji"><Smile /></button><button aria-label="Mention">@</button></div><div className="composer-hint"><kbd>Enter</kbd> to send</div></div></div><button className="send-button" onClick={sendMessage} aria-label="Send message"><Send /></button></div>
          </>}
        </main>

        {showThread && <aside className="thread-panel"><div className="thread-header"><div><span className="eyebrow">THREAD</span><h2>Welcome to general</h2></div><button onClick={() => setShowThread(false)} aria-label="Close thread"><X /></button></div><div className="thread-content"><div className="thread-original"><Avatar initials="SC" color="coral" /><div><div className="message-meta"><strong>Sarah Chen</strong><time>10:32 AM</time></div><p>Hey everyone! Welcome to the general channel. Feel free to share updates and collaborate here.</p></div></div><div className="thread-line" />{[{ name: 'James Smith', initials: 'JS', color: 'blue', text: 'What timeline are we looking at for launch?' }, { name: 'Sarah Chen', initials: 'SC', color: 'coral', text: "We're targeting end of Q2. Depends on how the beta testing goes." }].map((reply) => <div className="thread-reply" key={reply.name}><Avatar initials={reply.initials} color={reply.color} /><div><div className="message-meta"><strong>{reply.name}</strong><time>11:14 AM</time></div><p>{reply.text}</p></div></div>)}</div><div className="thread-composer"><input value={threadReply} onChange={(event) => setThreadReply(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendThreadReply() } }} placeholder="Reply to thread..." /><button onClick={sendThreadReply} aria-label="Send thread reply"><Send /></button></div></aside>}
      </div>
      {showSearch && <div className="search-overlay" onClick={() => setShowSearch(false)}><div className="search-modal" onClick={(event) => event.stopPropagation()}><div className="search-modal-input"><Search /><input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setShowSearch(false); setSearchTerm('') } }} placeholder="Search messages, channels, people..." /><kbd>ESC</kbd></div><div className="search-suggestions">{searchTerm.trim() ? <><p>RESULTS IN {activeWorkspace.name.toUpperCase()}</p>{allMessages.filter((item) => item.content.toLowerCase().includes(searchTerm.toLowerCase()) || item.userName.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => <button key={item.id} onClick={() => { setActiveSection('channel'); setActiveChannel(item.channelId === 'channel-1' ? 'general' : item.channelId === 'channel-2' ? 'engineering' : 'design'); setShowSearch(false); setSearchTerm('') }}><Search /><span><strong>{item.userName}</strong> {item.content}</span></button>)}{allMessages.every((item) => !item.content.toLowerCase().includes(searchTerm.toLowerCase()) && !item.userName.toLowerCase().includes(searchTerm.toLowerCase())) && <div className="search-empty"><Search /><strong>No results found</strong><span>Try a different message, person, or channel.</span></div>}</> : <><p>RECENT SEARCHES</p><button><Clock3 /> Launch timeline</button><button><Clock3 /> Design feedback</button><div className="search-empty"><Search /><strong>Search across {activeWorkspace.name}</strong><span>Find messages, people, files, and channels.</span></div></>}</div></div></div>}
    </div>
  )
}

function HomeView({ workspace, setActiveSection }: { workspace: Workspace; setActiveSection: (value: string) => void }) { return <div className="home-view"><div className="home-intro"><div><span className="eyebrow">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span><h1>Good morning, Sarah</h1><p>Here&apos;s what&apos;s happening in {workspace.name}.</p></div><div className="home-avatar-stack"><Avatar initials="SC" color="coral" /><Avatar initials="JS" color="blue" /><Avatar initials="AR" color="violet" /><span>+25</span></div></div><div className="quick-actions"><button onClick={() => setActiveSection('channel')}><span className="quick-icon peach"><Plus /></span><strong>Create a channel</strong><small>Bring your team together</small><ChevronRight /></button><button><span className="quick-icon mint"><UserPlus /></span><strong>Invite teammates</strong><small>Grow your workspace</small><ChevronRight /></button><button onClick={() => setActiveSection('dms')}><span className="quick-icon lavender"><MessageCircle /></span><strong>Start a conversation</strong><small>Reach someone directly</small><ChevronRight /></button></div><div className="home-grid"><section className="home-section"><div className="section-title"><div><span className="eyebrow">KEEP IN TOUCH</span><h2>Recent conversations</h2></div><button>View all</button></div>{dms.slice(0, 2).map((dm) => <div className="recent-conversation" key={dm.name}><Avatar initials={dm.initials} color={dm.color} status={dm.status} /><div><strong>{dm.name}</strong><p>{dm.preview}</p></div><time>12m</time></div>)}</section><section className="home-section activity-card"><div className="section-title"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>Activity</h2></div><button onClick={() => setActiveSection('activity')}>View all</button></div><div className="activity-item"><span className="activity-icon coral"><Zap /></span><div><strong>James mentioned you</strong><p>in <b>#engineering</b></p></div><time>1h</time></div><div className="activity-item"><span className="activity-icon blue"><MessageCircle /></span><div><strong>New thread reply</strong><p>in <b>#general</b></p></div><time>3h</time></div></section></div></div> }

function ActivityView() { return <div className="simple-view"><div className="page-heading"><span className="eyebrow">WORKSPACE ACTIVITY</span><h1>Activity</h1><p>Stay up to date with everything happening around you.</p></div><div className="activity-list"><div className="activity-card-full"><span className="activity-icon coral"><Zap /></span><Avatar initials="JS" color="blue" /><div><strong>James Smith mentioned you in #engineering</strong><p>Sarah, can you take a look at the latest build when you have a chance?</p><time>1 hour ago</time></div><button><MoreHorizontal /></button></div><div className="activity-card-full"><span className="activity-icon lavender"><MessageCircle /></span><Avatar initials="SC" color="coral" /><div><strong>Sarah Chen replied to your thread</strong><p>We&apos;re targeting end of Q2. Depends on how the beta testing goes.</p><time>3 hours ago</time></div><button><MoreHorizontal /></button></div><div className="activity-card-full"><span className="activity-icon amber"><Star /></span><Avatar initials="AR" color="violet" /><div><strong>Alex Rodriguez reacted to your message</strong><p>in #design</p><time>Yesterday</time></div><button><MoreHorizontal /></button></div></div></div> }

function DMView() { return <div className="dm-view"><div className="dm-list"><div className="page-heading"><span className="eyebrow">MESSAGES</span><h1>Direct messages</h1><p>Private conversations with your teammates.</p></div><button className="new-message-button"><Plus /> New message</button>{dms.map((dm) => <button className="dm-list-item" key={dm.name}><Avatar initials={dm.initials} color={dm.color} status={dm.status} /><span><strong>{dm.name}</strong><small>{dm.preview}</small></span>{dm.unread > 0 && <b>{dm.unread}</b>}</button>)}</div><div className="dm-empty"><span className="empty-icon"><MessageCircle /></span><h2>Pick up where you left off</h2><p>Select a conversation to continue chatting, or start a new one.</p><button className="primary-button"><Plus /> New conversation</button></div></div> }

export default Hello

const _unused = { BriefcaseBusiness, Inbox, Star, Settings }
export { members }
        
