---
name: schedule
description: Assign a WIB date+time to each generated idea from staff preferences
---

Use only the posting times the staff provided (WIB / Asia/Jakarta). The
system prompt states the current WIB date/time and a "scheduling window to
actually use" — that window has already been shifted so it starts no
earlier than tomorrow. Never assign today's date or any date before it,
even if the original requested range mentioned today. Spread ideas across
the scheduling window, earliest free slot first. Before assigning a slot,
call the check_existing_schedules tool for that window — never put more
than 2 posts on the same day, never reuse an exact occupied (date, time)
pair. Output scheduled_at as ISO 8601 with the +07:00 offset.
