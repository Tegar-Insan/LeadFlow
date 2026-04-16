// src/pages/dashboard/AdminBusinessOwnersPage.jsx
// Admin Page 3 — registered business owner accounts

import { useState, useEffect } from 'react';
import AdminLayout    from '../../components/dashboard/AdminLayout';
import AdminUserTable from '../../components/dashboard/AdminUserTable';
import { getAllUsers } from '../../services/adminService';

export default function AdminBusinessOwnersPage() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getAllUsers({ limit: 200 })
      .then((res) => { if (res.success) setAllUsers(res.data.users || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const owners = allUsers.filter((u) => u.role_name === 'business_owner');
  const active = owners.filter((u) => u.is_active).length;

  return (
    <AdminLayout
      title="Business Owners"
      subtitle={`${owners.length} registered · ${active} active`}
    >
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Owners', value: owners.length },
          { label: 'Active',       value: active },
          { label: 'Inactive',     value: owners.length - active },
        ].map(({ label, value }) => (
          <div key={label} className="card px-5 py-4 flex flex-col gap-1 animate-slide-up">
            <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest">{label}</p>
            <p className="text-3xl font-headline font-bold text-gold">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <AdminUserTable users={owners} loading={loading} onUsersChange={setAllUsers} />
    </AdminLayout>
  );
}
