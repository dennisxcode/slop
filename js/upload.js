// Optional: send each recording to a Supabase Storage bucket so the names
// players record are collected in one place. The record screen tells players
// this happens (see index.html) — don't remove that notice.
//
// Setup (one time):
//   1. Make a free project at supabase.com.
//   2. Storage → New bucket "recordings" (leave "Public bucket" OFF).
//   3. SQL Editor → run:
//        create policy "anyone can upload recordings" on storage.objects
//          for insert to anon with check (bucket_id = 'recordings');
//   4. Project Settings → API Keys → paste the Project URL and the
//      publishable (or legacy anon) key below. Never the secret/service_role key.
//
// With URL/KEY left blank, uploading is simply off and nothing breaks.
window.Upload = (() => {
  const URL = "https://gsjipkefnhplukodckmz.supabase.co";
  const KEY = "sb_publishable_TR9dBa0Qooi1-ILdyOCVCA_UL4-N_J0";   // publishable key: public by design
  const BUCKET = "recordings";

  const on = () => !!(URL && KEY);

  // A stable anonymous id so one player's 12 clips land in the same folder.
  // It's a random value in this browser only — no name, no account.
  function who() {
    let id;
    try { id = localStorage.getItem("uploadId"); } catch (e) {}
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
      try { localStorage.setItem("uploadId", id); } catch (e) {}
    }
    return id;
  }

  const ext = type => (/ogg/.test(type) ? "ogg" : /mp4|m4a|aac/.test(type) ? "m4a" : /wav/.test(type) ? "wav" : /mpeg|mp3/.test(type) ? "mp3" : "webm");

  // ASCII-only file names (Supabase rejects some accented characters).
  const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

  // Fire-and-forget: never blocks recording, never surfaces an error to the player.
  // Every clip gets a unique name (re-records don't overwrite), so the bucket
  // only needs an INSERT policy.
  function send(tier, name, blob) {
    if (!on()) return;
    const path = `${who()}/${String(tier).padStart(2, "0")}-${slug(name)}-${Date.now()}.${ext(blob.type)}`;
    const headers = { apikey: KEY, "Content-Type": blob.type || "application/octet-stream" };
    if (!KEY.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${KEY}`;   // legacy anon (JWT) key
    fetch(`${URL}/storage/v1/object/${BUCKET}/${path}`, { method: "POST", headers, body: blob }).catch(() => {});
  }

  return { send, enabled: on };
})();
