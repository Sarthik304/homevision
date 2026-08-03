// Date.now() collides when two entities are created in the same millisecond (fast clicking,
// or any future batch/duplicate action); crypto.randomUUID() has no realistic collision risk.
export function nextId() {
  return crypto.randomUUID()
}
