import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import DashboardNavbar from '../../components/common/DashboardNavbar';
import AuthContext from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useSchedule } from '../../hooks/useSchedule';
import { nowWIB } from '../../utils/formatDate';
import { LibraryCard } from '../../components/Schedule/ContentCard';

const FILTERS = [
  { key: 'all', label: 'All Post' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
];

const matchesFilter = (filter, item) => {
  if (filter === 'all') return true;
  if (filter === 'drafts') return item.status === 'draft' || item.status === 'planned' || !item.scheduled_at;
  if (filter === 'scheduled') return item.status === 'scheduled' || item.status === 'uploaded';
  if (filter === 'published') return item.status === 'published';
  return true;
};

export default function Marketingdashboard() {
  const navigate = useNavigate();
  const authCtx = useContext(AuthContext);
  const roleName = authCtx?.user?.roleName || authCtx?.user?.role_name;
  const canEdit = ['marketing_staff', 'admin'].includes(roleName);
  const { toast } = useNotification();
  const { schedules, drafts, loading, error, removeSchedule, publishNow } = useSchedule();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState('drafts');
  const [actionId, setActionId] = useState(null);

  const items = useMemo(() => {
    const seen = new Set();
    return [...drafts, ...schedules].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [drafts, schedules]);

  const visibleItems = useMemo(() => items.filter((item) => matchesFilter(filter, item)), [items, filter]);

  const handleEdit = (schedule) => navigate('/calendar', { state: { editScheduleId: schedule.id } });

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Delete this content?')) return;
    try {
      await removeSchedule(scheduleId);
      toast.success('Content removed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete content');
    }
  };

  const handlePublish = async (schedule) => {
    if (!schedule?.id) return;
    setActionId(schedule.id);
    try {
      const result = await publishNow(schedule.id);
      if (result.ok) toast.success(result.message || 'Content published successfully');
      else toast.error(result.message || 'Failed to publish content');
    } finally {
      setActionId(null);
    }
  };

  useEffect(() => {
    if (filter !== 'drafts' || loading) return;
    const draftCount = items.filter((item) => matchesFilter('drafts', item)).length;
    if (draftCount === 0) toast.info('No drafts yet. Create one from the calendar first.');
  }, [filter, items, loading, toast]);

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar onMenuToggle={() => setSidebarOpen((o) => !o)} />

        <main className="flex-1 p-6 animate-fade-in">
          <div className="mb-6">
            <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">Marketing Dashboard</p>
            <h1 className="font-headline font-bold text-4xl text-text-primary tracking-tight mb-1">Draft Content Library</h1>
            <p className="text-text-secondary text-base font-body">
              Drafts are kept here until they are ready to be scheduled on the calendar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-body font-semibold transition-colors ${filter === item.key ? 'bg-brand text-black' : 'bg-surface-overlay text-text-secondary hover:text-text-primary'}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-xs text-text-secondary uppercase tracking-widest">Total Content</p>
              <p className="text-3xl font-headline font-bold text-text-primary mt-2">{items.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-secondary uppercase tracking-widest">Drafts</p>
              <p className="text-3xl font-headline font-bold text-text-primary mt-2">{items.filter((item) => matchesFilter('drafts', item)).length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-secondary uppercase tracking-widest">Scheduled</p>
              <p className="text-3xl font-headline font-bold text-text-primary mt-2">{items.filter((item) => matchesFilter('scheduled', item)).length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-secondary uppercase tracking-widest">Today</p>
              <p className="text-lg font-headline font-bold text-text-primary mt-2">{nowWIB().format('DD MMM YYYY')}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 card p-4 border border-red-500/30 text-red-300">
              {error}
            </div>
          )}

          <section className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between gap-4">
              <div>
                <h2 className="font-headline font-semibold text-text-primary">{FILTERS.find((item) => item.key === filter)?.label || 'Drafts'}</h2>
                <p className="text-xs text-text-muted mt-1">No calendar grid here, just content cards.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/calendar', { state: { openCreate: true } })}
                className="btn-primary px-4 h-8 text-xs"
              >
                + New Post
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-text-muted">Loading content…</div>
            ) : visibleItems.length === 0 ? (
              <div className="py-16 text-center px-5">
                <p className="text-2xl mb-2">📄</p>
                <p className="text-text-secondary text-sm font-medium">No items in this section</p>
                <p className="text-text-muted text-xs mt-1">Create a draft first, then set a publish time later.</p>
              </div>
            ) : (
              <div className="p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((schedule) => (
                  <LibraryCard
                    key={schedule.id}
                    schedule={schedule}
                    onEdit={canEdit ? handleEdit : undefined}
                    onDelete={canEdit ? handleDelete : undefined}
                    onPublish={canEdit ? handlePublish : undefined}
                    publishLoading={actionId === schedule.id}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}