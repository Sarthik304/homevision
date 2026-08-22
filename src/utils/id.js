// generates a unique id for rooms/walls/doors/windows
export function nextId() {
  return crypto.randomUUID()
}
