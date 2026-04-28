// src/pages/dashboard/AdminAllUsersPage.jsx
// Admin Page 1 — all registered accounts

import { useState, useEffect } from 'react';
import AdminLayout    from '../../components/dashboard/AdminLayout';
import AdminUserTable from '../../components/dashboard/AdminUserTable';
import { getAllUsers } from '../../services/adminService';

export default function AdminAllUsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers({ limit: 200 })
      .then((res) => { if (res.success) setUsers(res.data.users || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total   = users.length;
  const active  = users.filter((u) => u.is_active).length;

  return (
    <AdminLayout
      title="All Accounts"
      subtitle={`${total} registered · ${active} active — Krench Chicken`}
    >
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',           value: total },
          { label: 'Active',          value: active },
          { label: 'Marketing Staff', value: users.filter((u) => u.role_name === 'marketing_staff').length },
          { label: 'Business Owners', value: users.filter((u) => u.role_name === 'business_owner').length },
        ].map(({ label, value }) => (
          <div key={label} className="card px-5 py-4 flex flex-col gap-1 animate-slide-up">
            <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest">{label}</p>
            <p className="text-3xl font-headline font-bold text-gold">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <AdminUserTable users={users} loading={loading} onUsersChange={setUsers} />
    </AdminLayout>
  );
}
