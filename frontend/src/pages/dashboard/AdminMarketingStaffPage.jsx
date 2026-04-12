// src/pages/dashboard/AdminMarketingStaffPage.jsx
// Admin Page 2 — registered marketing staff accounts

import { useState, useEffect } from 'react';
import AdminLayout    from '../../components/dashboard/AdminLayout';
import AdminUserTable from '../../components/dashboard/AdminUserTable';
import { getAllUsers } from '../../services/adminService';

export default function AdminMarketingStaffPage() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getAllUsers({ limit: 200 })
      .then((res) => { if (res.success) setAllUsers(res.data.users || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter to marketing staff only — role change in table propagates back here
  const staff  = allUsers.filter((u) => u.role_name === 'marketing_staff');
  const active = staff.filter((u) => u.is_active).length;

  return (
    <AdminLayout
      title="Marketing Staff"
      subtitle={`${staff.length} registered · ${active} active`}
    >
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Staff',  value: staff.length },
          { label: 'Active',       value: active },
          { label: 'Inactive',     value: staff.length - active },
        ].map(({ label, value }) => (
          <div key={label} className="card px-5 py-4 flex flex-col gap-1 animate-slide-up">
            <p className="text-xs font-body font-semibold text-text-secondary uppercase tracking-widest">{label}</p>
            <p className="text-3xl font-display font-extrabold text-gold">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Pass the full list to the table — it handles role changes and re-filters live */}
      <AdminUserTable users={staff} loading={loading} onUsersChange={setAllUsers} />
    </AdminLayout>
  );
}
