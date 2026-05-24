/**
 * AdminProfilePage.jsx
 * Admin profile — read + CRUD (name, phone, password, photo)
 * Separate from marketing ProfilePage — back nav goes to /admin, not /calendar
 * LeadFlow – Krench Chicken
 */

import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import Sidebar from '../../components/common/Sidebar';
import DashboardNavbar  from '../../components/common/DashboardNavbar';
import { KineticLoader } from '../../components/common/KineticLoader';
import { getProfile, updateProfile, changePassword, uploadPhoto, deletePhoto } from '../../services/profileService';

const InfoRow = ({ icon, label, value, placeholder = '—' }) => (
  <div className="flex items-center gap-4 py-4 border-b border-surface-border last:border-b-0">
    <div className="w-10 h-10 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-center flex-shrink-0 text-text-secondary">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-body font-medium text-text-primary truncate">
        {value || <span className="text-text-muted italic">{placeholder || '—'}</span>}
      </p>
    </div>
  </div>
);

const AdminProfilePage = () => {
  const navigate   = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const authCtx    = useContext(AuthContext);
  const { updateUser } = authCtx;

  const [profile,  setProfile]  = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getProfile()
      .then(r => setProfile(r.data?.data || r.data))
      .catch(() => setProfile(authCtx?.user))
      .finally(() => setFetching(false));
  }, []);

  const user     = profile || authCtx?.user;
  const initials = (user?.fullName || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const photoInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeleting,  setPhotoDeleting]  = useState(false);
  const [photoError,     setPhotoError]     = useState(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { setPhotoError('Only JPEG, PNG or WEBP images are allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Photo must be under 5 MB.'); return; }
    setPhotoUploading(true); setPhotoError(null);
    try {
      const r        = await uploadPhoto(file);
      const photoUrl = r.data?.data?.photoUrl;
      setProfile(prev => ({ ...prev, photoUrl }));
      updateUser({ ...authCtx.user, photoUrl });
    } catch (err) {
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
      setProfile(prev => ({ ...prev, photoUrl: null }));
      updateUser({ ...authCtx.user, photoUrl: null });
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Failed to delete photo.');
    } finally { setPhotoDeleting(false); }
  };

  // ── Edit profile state ────────────────────────────────────────
  const [editMode,   setEditMode]   = useState(false);
  const [editForm,   setEditForm]   = useState({ fullName: '', phone: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState(null);
  const [editOk,     setEditOk]     = useState(false);

  const openEdit = () => {
    setEditForm({ fullName: user?.fullName || '', phone: user?.phone || '' });
    setEditError(null); setEditOk(false); setEditMode(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true); setEditError(null); setEditOk(false);
    try {
      const r       = await updateProfile({ fullName: editForm.fullName.trim(), phone: editForm.phone.trim() || null });
      const updated = r.data?.data;
      setProfile(prev => ({ ...prev, fullName: updated.fullName, phone: updated.phone }));
      updateUser({ ...authCtx.user, fullName: updated.fullName, phone: updated.phone });
      setEditOk(true);
      setTimeout(() => setEditMode(false), 900);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update profile');
    } finally { setEditSaving(false); }
  };

  // ── Change password state ─────────────────────────────────────
  const [pwMode,   setPwMode]   = useState(false);
  const [pwForm,   setPwForm]   = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError,  setPwError]  = useState(null);
  const [pwOk,     setPwOk]     = useState(false);

  const handlePwSave = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    setPwSaving(true); setPwError(null); setPwOk(false);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwOk(true);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => setPwMode(false), 900);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  if (fetching) return <KineticLoader message="Loading Profile…" />;

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 p-8 animate-fade-in">
          <div className="max-w-2xl mx-auto space-y-6">

            <div>
              <p className="text-text-secondary text-xs font-body font-semibold uppercase tracking-widest mb-2">Admin Account</p>
              <h1 className="font-headline font-bold text-4xl text-text-primary tracking-tight">My Profile</h1>
              <p className="text-text-secondary font-body text-base mt-1">Administrator account — Krench Chicken</p>
            </div>

            {/* Profile card */}
            <div className="card overflow-hidden">
              <div className="h-24 bg-gradient-to-r from-brand via-brand-dark to-[#7b0000]" />

              <div className="px-6 pb-5">
                <div className="flex items-end justify-between -mt-10 mb-5">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="w-20 h-20 rounded-full border-4 border-surface-raised overflow-hidden flex items-center justify-center glow-red focus:outline-none"
                      title="Click to change photo"
                    >
                      {user?.photoUrl ? (
                        <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-brand flex items-center justify-center">
                          <span className="font-headline font-bold text-2xl text-white">{initials}</span>
                        </div>
                      )}
                      <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity
                        ${photoUploading ? 'bg-black/60 opacity-100' : 'bg-black/50 opacity-0 group-hover:opacity-100'}`}>
                        {photoUploading ? (
                          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                        )}
                      </div>
                    </button>

                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />

                    {user?.photoUrl && (
                      <button
                        type="button"
                        onClick={handlePhotoDelete}
                        disabled={photoDeleting || photoUploading}
                        title="Remove photo"
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand border-2 border-surface-raised flex items-center justify-center hover:bg-brand-dark transition-colors focus:outline-none"
                      >
                        {photoDeleting ? (
                          <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="status-scheduled">Admin</span>
                    <button onClick={openEdit}
                      className="px-3 h-8 rounded-lg border border-surface-border text-xs font-body font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16H8v-2a2 2 0 01.586-1.414z"/>
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>
                <h2 className="font-headline font-bold text-xl text-text-primary tracking-tight">{user?.fullName || 'Admin'}</h2>
                <p className="text-sm text-text-secondary font-body mt-0.5">System Administrator · Krench Chicken</p>
                {photoError && <p className="text-xs text-brand font-body mt-2">{photoError}</p>}
              </div>

              <div className="h-px bg-surface-border" />

              <div className="px-6">
                <InfoRow label="Email Address" value={user?.email} placeholder="No email set"
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
                />
                <InfoRow label="Role" value="Administrator"
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>}
                />
                <InfoRow label="Phone Number" value={user?.phone} placeholder="No phone number set"
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>}
                />
                <InfoRow label="Account Status" value={user?.isActive !== false ? 'Active' : 'Inactive'}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>}
                />
              </div>
            </div>

            {/* Change Password */}
            <div className="card px-6 py-5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-body font-semibold text-text-primary">Password</p>
                  <p className="text-xs text-text-muted font-body mt-0.5">Update your administrator password</p>
                </div>
                {!pwMode && (
                  <button onClick={() => { setPwMode(true); setPwError(null); setPwOk(false); }}
                    className="px-3 h-8 rounded-lg border border-surface-border text-xs font-body font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-colors">
                    Change
                  </button>
                )}
              </div>

              {pwMode && (
                <form onSubmit={handlePwSave} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Current Password</label>
                    <input type="password" required value={pwForm.currentPassword}
                      onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                      placeholder="Enter current password" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">New Password</label>
                    <input type="password" required value={pwForm.newPassword}
                      onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Min. 8 characters" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Confirm New Password</label>
                    <input type="password" required value={pwForm.confirm}
                      onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder="Repeat new password" className="input-field" />
                  </div>
                  {pwError && <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 font-body">{pwError}</p>}
                  {pwOk    && <p className="text-xs text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2 font-body">Password changed successfully!</p>}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setPwMode(false)} className="btn-secondary flex-1 h-9 text-xs">Cancel</button>
                    <button type="submit" disabled={pwSaving} className="btn-primary flex-1 h-9 text-xs">
                      {pwSaving ? 'Saving…' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Back to Admin Panel */}
            <div className="text-center">
              <button onClick={() => navigate('/admin')}
                className="text-sm text-brand hover:text-brand-light font-body font-semibold transition-colors">
                ← Back to Admin Panel
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-raised rounded-2xl shadow-2xl overflow-hidden border border-surface-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
              <h2 className="font-headline font-bold text-lg text-text-primary">Edit Profile</h2>
              <button onClick={() => setEditMode(false)} className="text-text-muted hover:text-text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditSave} className="px-6 py-5 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
                    className="w-20 h-20 rounded-full border-4 border-surface-border overflow-hidden flex items-center justify-center focus:outline-none" title="Click to change photo">
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-brand flex items-center justify-center">
                        <span className="font-headline font-bold text-2xl text-white">{initials}</span>
                      </div>
                    )}
                    <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity
                      ${photoUploading ? 'bg-black/60 opacity-100' : 'bg-black/50 opacity-0 group-hover:opacity-100'}`}>
                      {photoUploading ? (
                        <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-text-muted font-body">
                    {photoUploading ? 'Uploading…' : photoDeleting ? 'Removing…' : 'Click photo to change'}
                  </p>
                  {user?.photoUrl && !photoUploading && !photoDeleting && (
                    <button type="button" onClick={handlePhotoDelete}
                      className="text-xs text-brand hover:text-brand-light font-body font-semibold transition-colors">
                      Remove
                    </button>
                  )}
                </div>
                {photoError && <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-1.5 font-body text-center">{photoError}</p>}
              </div>
              <div>
                <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Full Name</label>
                <input type="text" required value={editForm.fullName}
                  onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Your full name" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-body font-semibold text-text-secondary mb-1.5">Phone Number</label>
                <input type="tel" value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+62 812 3456 7890" className="input-field" />
              </div>
              {editError && <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2 font-body">{editError}</p>}
              {editOk    && <p className="text-xs text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2 font-body">Profile updated!</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditMode(false)} className="btn-secondary flex-1 h-10">Cancel</button>
                <button type="submit" disabled={editSaving} className="btn-primary flex-1 h-10">
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfilePage;
