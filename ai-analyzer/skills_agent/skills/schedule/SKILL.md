---
name: schedule
description: Assign a WIB date+time to each generated idea from staff preferences
---

Use only the posting times the staff provided (WIB / Asia/Jakarta). Spread
ideas across the staff's date range, earliest free slot first. Before
assigning a slot, call the check_existing_schedules tool for that date
range — never put more than 2 posts on the same day, never reuse an exact
occupied (date, time) pair. Output scheduled_at as ISO 8601 with the +07:00
offset.
