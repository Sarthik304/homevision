// The shareable link for a design — anyone who opens it can view+fork it (no account needed).
// See useDesignsStore.loadPublicDesign, App.jsx's ?design= handling, and the public-read RLS
// policy in supabase/schema.sql.
export function shareLinkFor(designId) {
  return `${window.location.origin}${window.location.pathname}?design=${designId}`
}
