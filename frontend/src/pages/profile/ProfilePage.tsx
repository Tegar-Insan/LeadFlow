import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { KineticLoader } from '../../components/common/KineticLoader';
import SmallSidebar from '../../components/common/smallsidebar';
import { getProfile, updateProfile, changePassword, uploadPhoto, deletePhoto } from '../../services/profileService';

/* ─── Dot background ─────────────────────────────────────────── */
interface Dot { ox: number; oy: number; x: number; y: number; phase: number; }
const COLS = 40, RADIUS = 1.8, REPEL = 120, STRENGTH = 18, WAVE_SPEED = 0.0012;

const DotBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef   = useRef<HTMLDivElement>(null);
  const dotsRef   = useRef<Dot[]>([]);
  const mouseRef  = useRef({ mx: -9999, my: -9999, targetMx: -9999, targetMy: -9999 });
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      const gap  = canvas.width / COLS;
      const rows = Math.ceil(canvas.height / gap) + 1;
      dotsRef.current = [];
      for (let r = 0; r <= rows; r++)
        for (let c = 0; c <= COLS; c++)
          dotsRef.current.push({ ox: c * gap, oy: r * gap, x: c * gap, y: r * gap, phase: Math.random() * Math.PI * 2 });
    };

    let t = 0;
    const draw = () => {
      const { mx: pmx, my: pmy, targetMx, targetMy } = mouseRef.current;
      mouseRef.current.mx = pmx + (targetMx - pmx) * 0.12;
      mouseRef.current.my = pmy + (targetMy - pmy) * 0.12;
      const { mx, my } = mouseRef.current;
      t += WAVE_SPEED;

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const colGap = W / COLS;
      // Brand gold (from tailwind): [246, 183, 10]
      const [ar, ag, ab] = [246, 183, 10];

      for (const d of dotsRef.current) {
        const dx = d.ox - mx, dy = d.oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let waveOffset = 0;
        if (dist < REPEL * 3)
          waveOffset = Math.sin(dist * 0.06 - t * 60) * 3 * Math.max(0, 1 - dist / (REPEL * 3));
        let rx = 0, ry = 0;
        if (dist < REPEL && dist > 0) {
          const force = (1 - dist / REPEL) * STRENGTH;
          rx = (dx / dist) * -force; ry = (dy / dist) * -force;
        }
        d.x = d.ox + rx + Math.sin(t * 30 + d.phase) * 0.5;
        d.y = d.oy + ry + waveOffset;
        const prox  = Math.max(0, 1 - dist / REPEL);
        const alpha = 0.15 + prox * 0.5;
        if (prox > 0.01) {
          const r = Math.round(ar * prox + 200 * (1 - prox));
          const g = Math.round(ag * prox + 200 * (1 - prox));
          const b = Math.round(ab * prox + 200 * (1 - prox));
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        } else {
          ctx.fillStyle = `rgba(190,190,190,0.35)`;
        }
        ctx.beginPath(); ctx.arc(d.x, d.y, RADIUS, 0, Math.PI * 2); ctx.fill();
      }

      ctx.save();
      const near = dotsRef.current.filter(d => {
        const dx = d.ox - mx, dy = d.oy - my;
        return Math.sqrt(dx * dx + dy * dy) < REPEL * 1.6;
      });
      for (const d of near) {
        const right = dotsRef.current.find(o => Math.abs(o.oy - d.oy) < 1 && Math.abs(o.ox - d.ox - colGap) < 1);
        if (right) {
          const prox = Math.max(0, 1 - ((Math.sqrt((d.ox - mx) ** 2 + (d.oy - my) ** 2) + Math.sqrt((right.ox - mx) ** 2 + (right.oy - my) ** 2)) / (2 * REPEL * 1.6)));
          ctx.setLineDash([2, colGap - 4]); ctx.lineDashOffset = -t * 600 % colGap;
          ctx.strokeStyle = `rgba(${ar},${ag},${ab},${prox * 0.5})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(right.x, right.y); ctx.stroke();
        }
        const below = dotsRef.current.find(o => Math.abs(o.ox - d.ox) < 1 && Math.abs(o.oy - d.oy - colGap) < 1);
        if (below) {
          const prox = Math.max(0, 1 - ((Math.sqrt((d.ox - mx) ** 2 + (d.oy - my) ** 2) + Math.sqrt((below.ox - mx) ** 2 + (below.oy - my) ** 2)) / (2 * REPEL * 1.6)));
          ctx.setLineDash([2, colGap - 4]); ctx.lineDashOffset = -t * 600 % colGap;
          ctx.strokeStyle = `rgba(${ar},${ag},${ab},${prox * 0.5})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(below.x, below.y); ctx.stroke();
        }
      }
      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      mouseRef.current.targetMx = e.clientX;
      mouseRef.current.targetMy = e.clientY;
      if (glowRef.current) {
        glowRef.current.style.left = e.clientX + 'px';
        glowRef.current.style.top  = e.clientY + 'px';
      }
    };
    const onLeave = () => { mouseRef.current.targetMx = -9999; mouseRef.current.targetMy = -9999; };

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div ref={glowRef} style={{
        position: 'fixed', width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(246,183,10,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', transform: 'translate(-50%,-50%)', zIndex: 0,
      }} />
    </>
  );
};

/* ─── Field row ──────────────────────────────────────────────── */
interface FieldRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  last?: boolean;
}
const FieldRow: React.FC<FieldRowProps> = ({ icon, label, value, last }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '18px 28px',
        borderBottom: last ? 'none' : '1px solid #f0f0f0',
        background: hovered ? 'rgba(246,183,10,0.02)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: '#f8f8f8', border: '1.5px solid #eee',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginRight: 16, flexShrink: 0, color: '#888',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{value}</div>
      </div>
    </div>
  );
};

/* ─── Role config ────────────────────────────────────────────── */
const ROLE_CONFIG: Record<string, { label: string }> = {
  admin:           { label: 'Admin' },
  business_owner:  { label: 'Business Owner' },
  marketing_staff: { label: 'Marketing Staff' },
};

/* ─── Profile Page ───────────────────────────────────────────── */
const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authCtx   = useContext(AuthContext) as any;
  const { updateUser } = authCtx;

  const [profile, setProfile]   = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [clock, setClock]       = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getProfile()
      .then((r: any) => setProfile(r.data?.data || r.data))
      .catch(() => setProfile(authCtx?.user))
      .finally(() => setFetching(false));
  }, []);

  const user     = profile || authCtx?.user;
  const roleName = user?.roleName || user?.role_name;
  const roleCfg  = ROLE_CONFIG[roleName] || { label: roleName || 'User' };
  const initials = (user?.fullName || user?.email || 'U')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  /* ─── Photo ──────────────────────────────────────────────────── */
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeleting,  setPhotoDeleting]  = useState(false);
  const [photoError,     setPhotoError]     = useState<string | null>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { setPhotoError('Only JPEG, PNG or WEBP images are allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Photo must be under 5 MB.'); return; }
    setPhotoUploading(true); setPhotoError(null);
    try {
      const r        = await uploadPhoto(file) as any;
      const photoUrl = r.data?.data?.photoUrl;
      setProfile((prev: any) => ({ ...prev, photoUrl }));
      updateUser({ ...authCtx.user, photoUrl });
    } catch (err: any) {
      setPhotoError(err.response?.data?.message || 'Photo upload failed.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    setPhotoDeleting(true); setPhotoError(null);
    try {
      await deletePhoto();
      setProfile((prev: any) => ({ ...prev, photoUrl: null }));
      updateUser({ ...authCtx.user, photoUrl: null });
    } catch (err: any) {
      setPhotoError(err.response?.data?.message || 'Failed to delete photo.');
    } finally {
      setPhotoDeleting(false);
    }
  };

  /* ─── Edit profile ───────────────────────────────────────────── */
  const [editMode,   setEditMode]   = useState(false);
  const [editForm,   setEditForm]   = useState({ fullName: '', phone: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState<string | null>(null);
  const [editOk,     setEditOk]     = useState(false);

  const openEdit = () => {
    setEditForm({ fullName: user?.fullName || '', phone: user?.phone || '' });
    setEditError(null); setEditOk(false); setEditMode(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true); setEditError(null); setEditOk(false);
    try {
      const r       = await updateProfile({ fullName: editForm.fullName.trim(), phone: editForm.phone.trim() || null }) as any;
      const updated = r.data?.data;
      setProfile((prev: any) => ({ ...prev, fullName: updated.fullName, phone: updated.phone }));
      updateUser({ ...authCtx.user, fullName: updated.fullName, phone: updated.phone });
      setEditOk(true);
      setTimeout(() => setEditMode(false), 900);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setEditSaving(false);
    }
  };

  /* ─── Change password ────────────────────────────────────────── */
  const [pwMode,   setPwMode]   = useState(false);
  const [pwForm,   setPwForm]   = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError,  setPwError]  = useState<string | null>(null);
  const [pwOk,     setPwOk]     = useState(false);
  const [logoutSaving, setLogoutSaving] = useState(false);

  const handlePwSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.newPassword.length < 8)          { setPwError('New password must be at least 8 characters'); return; }
    setPwSaving(true); setPwError(null); setPwOk(false);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwOk(true);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setPwMode(false), 900);
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = async () => {
    setLogoutSaving(true);
    try {
      await authCtx.logout();
      navigate('/login', { replace: true });
    } finally {
      setLogoutSaving(false);
    }
  };

  if (fetching) return <KineticLoader message="Loading Profile…" />;

  /* ─── Centered container with dotted animated background ───────── */
  const dottedWrapper: React.CSSProperties = {
    width: '100%',
    maxWidth: 980,
    borderRadius: 12,
    padding: 28,
    boxSizing: 'border-box',
    background: 'transparent',
    boxShadow: '0 8px 40px rgba(16,24,40,0.06)',
  };

  /* ─── Shared card style ──────────────────────────────────────── */
  const card: React.CSSProperties = {
    background: '#ffffff',
    border: '1.5px solid #eee',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,0.05)',
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <DotBackground />
      </div>

      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'stretch', zIndex: 10, background: 'transparent' }}>
        <SmallSidebar currentPath={location.pathname} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
          <div style={dottedWrapper}>
            <main style={{ width: '100%', padding: '20px 8px' }}>

            {/* Topbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', marginBottom: 6 }}>Account</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#111', lineHeight: 1 }}>My Profile</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Your Krench Chicken account information</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.85)', border: '1.5px solid #e8e8e8', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, backdropFilter: 'blur(8px)', color: '#111' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  Active Account
                </div>
                <div style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid #e8e8e8', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, backdropFilter: 'blur(8px)', color: '#111', fontVariantNumeric: 'tabular-nums' }}>
                  {clock}
                </div>
              </div>
            </div>

            {/* ── Profile hero card ── */}
            <div style={{ ...card, overflow: 'hidden', marginBottom: 18 }}>
              <div style={{ height: 110, background: 'linear-gradient(110deg,#ffd04d 0%,#f6b70a 40%,#d4960a 100%)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,transparent,transparent 18px,rgba(255,255,255,0.05) 18px,rgba(255,255,255,0.05) 20px)' }} />
              </div>

              <div style={{ padding: '0 32px 24px', position: 'relative' }}>
                {/* Avatar */}
                <div style={{ position: 'relative', width: 72, marginTop: -36, marginBottom: 12 }}>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    title="Click to change photo"
                    style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff', border: '3px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#111', cursor: 'pointer', overflow: 'hidden', padding: 0, position: 'relative' }}
                  >
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontWeight: 700 }}>{initials}</span>
                    )}
                    {photoUploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                        <svg style={{ width: 20, height: 20, color: '#fff', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      </div>
                    )}
                  </button>
                  <div style={{ position: 'absolute', bottom: 3, right: 3, width: 14, height: 14, borderRadius: '50%', background: '#22c55e', border: '2.5px solid #fff' }} />
                  {user?.photoUrl && !photoUploading && (
                    <button
                      type="button"
                      onClick={handlePhotoDelete}
                      disabled={photoDeleting}
                      title="Remove photo"
                      style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#e31837', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#fff', fontWeight: 700 }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />

                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 2 }}>{user?.fullName || user?.email || 'User'}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>Krench Chicken · Bogor, Indonesia</div>
                    {photoError && <div style={{ fontSize: 12, color: '#e31837', marginTop: 6 }}>{photoError}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#f6b70a', color: '#111', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6 }}>
                      {roleCfg.label}
                    </span>
                    <button
                      onClick={openEdit}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '6px 14px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#555', cursor: 'pointer' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Fields card ── */}
            <div style={{ ...card, padding: '8px 0', marginBottom: 18 }}>
              <FieldRow label="Email Address" value={user?.email || '—'}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>}
              />
              <FieldRow label="Role" value={roleCfg.label}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
              />
              <FieldRow label="Phone Number" value={user?.phone || <span style={{ color: '#bbb', fontStyle: 'italic' }}>No phone number set</span>}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z" /></svg>}
              />
              <FieldRow last label="Account Status"
                value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: user?.isActive !== false ? '#22c55e' : '#e31837' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: user?.isActive !== false ? '#22c55e' : '#e31837', display: 'inline-block' }} />
                    {user?.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                }
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
              />
            </div>

            {/* ── Password card ── */}
            <div style={{ ...card, padding: '22px 28px', marginBottom: 22 }}>
              {!pwMode ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 3 }}>Password</div>
                    <div style={{ fontSize: 12, color: '#999' }}>Update your account password</div>
                  </div>
                  <button
                    onClick={() => { setPwMode(true); setPwError(null); setPwOk(false); }}
                    style={{ background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px 18px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#555', cursor: 'pointer' }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePwSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>Change Password</div>
                  {['currentPassword', 'newPassword', 'confirm'].map(field => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', marginBottom: 6 }}>
                        {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                      </label>
                      <input
                        type="password"
                        required
                        value={pwForm[field as keyof typeof pwForm]}
                        onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                        placeholder={field === 'newPassword' ? 'Min. 8 characters' : field === 'confirm' ? 'Repeat new password' : 'Enter current password'}
                        style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, color: '#111', background: '#fafafa', outline: 'none' }}
                      />
                    </div>
                  ))}
                  {pwError && <div style={{ fontSize: 12, color: '#e31837', background: 'rgba(227,24,55,0.06)', border: '1px solid rgba(227,24,55,0.15)', borderRadius: 8, padding: '8px 12px' }}>{pwError}</div>}
                  {pwOk    && <div style={{ fontSize: 12, color: '#22c55e', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '8px 12px' }}>Password changed successfully!</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="button" onClick={() => setPwMode(false)}
                      style={{ flex: 1, padding: '10px', border: '1.5px solid #e0e0e0', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#555', background: 'none', cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={pwSaving}
                      style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#e31837', cursor: 'pointer', opacity: pwSaving ? 0.7 : 1 }}>
                      {pwSaving ? 'Saving…' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Back link */}
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => navigate('/calendar')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                Back to Calendar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutSaving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 16,
                  fontSize: 12, fontWeight: 700, color: '#e31837', background: 'none',
                  border: '1px solid rgba(227,24,55,0.18)', borderRadius: 999,
                  padding: '8px 14px', cursor: logoutSaving ? 'not-allowed' : 'pointer',
                  opacity: logoutSaving ? 0.7 : 1, fontFamily: 'inherit'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M21 3v18" />
                </svg>
                {logoutSaving ? 'Logging out…' : 'Logout'}
              </button>
            </div>

            </main>
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {editMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.12)', border: '1.5px solid #eee', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Edit Profile</div>
              <button onClick={() => setEditMode(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleEditSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Avatar in modal */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
                    style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0f0f0', border: '3px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#111', cursor: 'pointer', overflow: 'hidden', padding: 0 }}>
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#aaa' }}>{photoUploading ? 'Uploading…' : photoDeleting ? 'Removing…' : 'Click photo to change'}</span>
                  {user?.photoUrl && !photoUploading && !photoDeleting && (
                    <button type="button" onClick={handlePhotoDelete} style={{ fontSize: 12, fontWeight: 600, color: '#e31837', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Remove
                    </button>
                  )}
                </div>
                {photoError && <div style={{ fontSize: 12, color: '#e31837' }}>{photoError}</div>}
              </div>

              {[
                { field: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Your full name', required: true },
                { field: 'phone',    label: 'Phone Number', type: 'tel', placeholder: '+62 812 3456 7890', required: false },
              ].map(({ field, label, type, placeholder, required }) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={editForm[field as keyof typeof editForm]}
                    onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e8e8e8', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, color: '#111', background: '#fafafa', outline: 'none' }}
                  />
                </div>
              ))}

              {editError && <div style={{ fontSize: 12, color: '#e31837', background: 'rgba(227,24,55,0.06)', border: '1px solid rgba(227,24,55,0.15)', borderRadius: 8, padding: '8px 12px' }}>{editError}</div>}
              {editOk    && <div style={{ fontSize: 12, color: '#22c55e', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, padding: '8px 12px' }}>Profile updated!</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setEditMode(false)}
                  style={{ flex: 1, padding: '11px', border: '1.5px solid #e0e0e0', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#555', background: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: '#e31837', cursor: 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </>
  );
};

export default ProfilePage;
