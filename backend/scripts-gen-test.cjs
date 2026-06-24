const jwt = require('jsonwebtoken');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BASE = 'http://localhost:5000/api';
const USER_ID = 'a483afdb-e813-4041-874c-b73bc7a0b1ae';

async function main() {
  const { data: user } = await sb.from('users').select('id, email, role_id, roles(name)').eq('id', USER_ID).maybeSingle();
  const token = jwt.sign(
    { userId: user.id, roleId: user.role_id, roleName: user.roles.name, email: user.email },
    process.env.JWT_SECRET,
    { issuer: 'leadflow-api', audience: 'leadflow-client', expiresIn: '1h' },
  );
  console.log('[1] Calling POST /content/generate ...');
  const resp = await axios.post(`${BASE}/content/generate`, {
    brief: 'Promosi spesial weekend untuk Krench Chicken, fokus ke menu ayam geprek baru dengan 3 level kepedasan.',
  }, { headers: { Authorization: `Bearer ${token}` }, timeout: 180000 });
  console.log('[2] Response drafts:');
  (resp.data.data?.drafts || resp.data.data || []).forEach((d, i) => {
    console.log(`  #${i+1} id=${d.id} title="${d.content_title}" image=${d.generated_image_url}`);
  });
}
main().catch(err => { console.error('ERROR:', err.response?.data || err.message); process.exit(1); });
