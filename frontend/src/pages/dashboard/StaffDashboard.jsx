// src/pages/dashboard/StaffDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import Navbar  from '../../components/common/Navbar';
import useAuth from '../../hooks/useAuth';
import api    from '../../services/authService';
import { nowWIB, getGreeting, formatTime, fromNowJakarta } from '../../utils/formatDate';

const INTENT_STYLE = {
  lead:      'text-green-400 bg-green-500/10 border-green-500/20',
  question:  'text-sky-400   bg-sky-500/10   border-sky-500/20',
  complaint: 'text-red-400   bg-red-500/10   border-red-500/20',
  praise:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  spam:      'text-text-muted bg-surface-overlay border-surface-border',
};

function QuickAction({ to, emoji, label, desc }) {
  return (
    <Link to={to} className="card p-4 flex items-start gap-3 hover:border-brand/30 hover:bg-brand/5 transition-all duration-200 group">
      <span className="text-xl mt-0.5">{emoji}</span>
      <div>
        <p className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

export default function StaffDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [todayPosts,   setTodayPosts]   = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingInbox, setLoadingInbox] = useState(true);

  const now      = nowWIB();
  const greeting = getGreeting();

  useEffect(() => {
    const today = now.format('YYYY-MM-DD');
    api.get(`/content-schedule?date=${today}`)
      .then(({ data }) => { if (data.success) setTodayPosts(data.data?.schedules || []); })
      .catch(() => {}).finally(() => setLoadingPosts(false));

    api.get('/interactions?limit=5')
      .then(({ data }) => { if (data.success) setInteractions(data.data?.interactions || []); })
      .catch(() => {}).finally(() => setLoadingInbox(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-6 animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">Marketing Dashboard</p>
            <h1 className="font-headline font-bold text-4xl text-text-primary tracking-tight mb-1">
              {greeting}, <span className="text-brand">{user?.fullName?.split(' ')[0] || 'Staff'}</span>
            </h1>
            <p className="text-text-secondary text-base font-body">Here&apos;s what needs your attention today — {now.format('dddd, DD MMMM YYYY')}</p>
          </div>

          {/* Quick actions */}
          <div className="mb-8">
            <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickAction to="/calendar"       emoji="📅" label="Content Calendar"  desc="Schedule & manage posts" />
              <QuickAction to="/ai-generator"   emoji="🤖" label="AI Generator"      desc="Generate content ideas"  />
              <QuickAction to="/interactions"   emoji="💬" label="Interactions"      desc="DMs & comments inbox"    />
              <QuickAction to="/publish-status" emoji="📤" label="Publish Status"    desc="Track posting results"   />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Today's schedule */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
                <h2 className="font-headline font-semibold text-text-primary text-sm">Today&apos;s Schedule</h2>
                <span className="text-xs text-text-muted font-mono">{now.format('DD MMM')}</span>
              </div>
              {loadingPosts ? (
                <div className="py-10 flex justify-center">
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : todayPosts.length === 0 ? (
                <div className="py-10 text-center px-5">
                  <p className="text-2xl mb-2">📅</p>
                  <p className="text-text-secondary text-sm font-medium">No posts scheduled today</p>
                  <p className="text-text-muted text-xs mt-1">Open the calendar to schedule content.</p>
                  <Link to="/calendar" className="inline-block mt-3 text-xs text-brand hover:text-brand-light font-medium transition-colors">
                    Open Calendar →
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {todayPosts.map((post) => (
                    <li key={post.scheduleid} className="px-5 py-3 flex items-center gap-3">
                      <span className="text-xs font-mono text-text-muted w-12 shrink-0">{formatTime(post.scheduled_time)}</span>
                      <p className="flex-1 text-sm text-text-primary truncate">{post.caption || 'Untitled post'}</p>
                      <span className={
                        post.status === 'published' ? 'status-live'
                        : post.status === 'scheduled' ? 'status-scheduled'
                        : post.status === 'draft' || post.status === 'planned' ? 'status-draft'
                        : post.status === 'failed' ? 'status-failed'
                        : 'status-draft'
                      }>
                        {post.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent interactions */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
                <h2 className="font-headline font-semibold text-text-primary text-sm">Recent Interactions</h2>
                <Link to="/interactions" className="text-xs text-brand hover:text-brand-light transition-colors">View all →</Link>
              </div>
              {loadingInbox ? (
                <div className="py-10 flex justify-center">
                  <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : interactions.length === 0 ? (
                <div className="py-10 text-center px-5">
                  <p className="text-2xl mb-2">💬</p>
                  <p className="text-text-secondary text-sm font-medium">No interactions yet</p>
                  <p className="text-text-muted text-xs mt-1">TikTok DMs and comments will appear here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {interactions.map((item) => (
                    <li key={item.interactionid} className="px-5 py-3 flex items-start gap-3">
                      <span className="text-base mt-0.5">{item.type === 'dm' ? '💬' : '💭'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{item.content}</p>
                        <p className="text-xs text-text-muted mt-0.5">{fromNowJakarta(item.received_at)}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg border shrink-0 ${INTENT_STYLE[item.intent] || INTENT_STYLE.question}`}>
                        {item.intent}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
