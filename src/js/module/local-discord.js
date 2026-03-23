// ===================== Local Discord Presence Forwarder =====================
export const LOCAL_DISCORD_PRESENCE_BASE = 'http://127.0.0.1:5678'; // 歌詞送信に必須

export async function postLocalDiscordPresence(path, payload) {
  const url = LOCAL_DISCORD_PRESENCE_BASE.replace(/\/+$/, '') + path;
  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload || {}),
    }),
    1500,
    'local presence timeout'
  );
  const txt = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`local presence failed: ${res.status} ${txt || res.statusText}`);
  }
  try { return JSON.parse(txt); } catch { return { ok: true }; }
}



