// reads client coordinates from either a MouseEvent or a TouchEvent (touchend has no top-level clientX/Y)
export function eventClientXY(nativeEvent) {
  if (nativeEvent.clientX != null) return { clientX: nativeEvent.clientX, clientY: nativeEvent.clientY }
  const touch = nativeEvent.changedTouches?.[0]
  return { clientX: touch?.clientX ?? 0, clientY: touch?.clientY ?? 0 }
}
