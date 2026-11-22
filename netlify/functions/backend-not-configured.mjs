// Netlify Function placeholder.
// Implement authenticated, short-lived R2 upload/download signing here.
// Never expose R2 credentials to browser code.
export default async () => new Response(
  JSON.stringify({ error: "R2 backend is not configured yet." }),
  { status: 501, headers: { "content-type": "application/json" } }
);