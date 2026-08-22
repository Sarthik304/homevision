// shareable link for a design — anyone who opens it can view+fork it (no account needed)
export function shareLinkFor(designId) {
  return `${window.location.origin}${window.location.pathname}?design=${designId}`
}
