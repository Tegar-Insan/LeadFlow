"""
supabase_client.py — shared supabase-py admin client (service role key).

Used by the agent's own direct tools (image upload, schedule read/write)
AND by run_store.py's separate FastAPI-layer bookkeeping. Same client
shape, two different concerns — see PLAN.md section 11.
"""

import os
from functools import lru_cache

from supabase import create_client, Client

MEDIA_BUCKET = "leadflow-media"


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)
