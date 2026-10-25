/**
 * Sprint API — Cloudflare Pages Function backed by D1.
 * Routes (all under /api/):
 *   GET    /api/state               -> { sessions: [...], tests: [...] }
 *   POST   /api/session             { id, date, dayType, completed, rpe, notes } (upsert)
 *   DELETE /api/session?id=x
 *   POST   /api/test                { id, date, metric, value } (upsert)
 *   DELETE /api/test?id=x
 * D1 binding name: DB
 * Tables: sessions(id TEXT PK, date TEXT, day_type TEXT, completed INTEGER, rpe INTEGER, notes TEXT, updated_at INTEGER)
 *         tests(id TEXT PK, date TEXT, metric TEXT, value REAL, updated_at INTEGER)
 */
export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const route = (params.route || []).join("/");
  const DB = env.DB;
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  if (!DB) return json({ error: "database not bound" }, 500);
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const METRICS = ["t10", "t20", "t30", "fly10", "broad"];
  try {
    if (request.method === "GET" && route === "state") {
      const s = await DB.prepare("SELECT id, date, day_type, completed, rpe, notes FROM sessions ORDER BY date").all();
      const t = await DB.prepare("SELECT id, date, metric, value FROM tests ORDER BY date").all();
      return json({
        sessions: s.results.map(r => ({ id: r.id, date: r.date, dayType: r.day_type, completed: !!r.completed, rpe: r.rpe, notes: r.notes || "" })),
        tests: t.results,
      });
    }
    if (request.method === "POST" && route === "session") {
      const b = await request.json();
      const id = String(b.id || "").slice(0, 64), date = String(b.date || "");
      if (!id || !DATE.test(date)) return json({ error: "bad request" }, 400);
      const rpe = Math.min(10, Math.max(1, Math.floor(Number(b.rpe) || 6)));
      await DB.prepare(
        "INSERT INTO sessions (id, date, day_type, completed, rpe, notes, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET date=excluded.date, day_type=excluded.day_type, completed=excluded.completed, rpe=excluded.rpe, notes=excluded.notes, updated_at=excluded.updated_at"
      ).bind(id, date, String(b.dayType || "").slice(0, 80), b.completed ? 1 : 0, rpe, String(b.notes || "").slice(0, 300), Date.now()).run();
      return json({ ok: true });
    }
    if (request.method === "POST" && route === "test") {
      const b = await request.json();
      const id = String(b.id || "").slice(0, 64), date = String(b.date || ""), metric = String(b.metric || "");
      const value = Number(b.value);
      if (!id || !DATE.test(date) || !METRICS.includes(metric) || !(value > 0 && value < 100000)) return json({ error: "bad request" }, 400);
      await DB.prepare(
        "INSERT INTO tests (id, date, metric, value, updated_at) VALUES (?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET date=excluded.date, metric=excluded.metric, value=excluded.value, updated_at=excluded.updated_at"
      ).bind(id, date, metric, value, Date.now()).run();
      return json({ ok: true });
    }
    if (request.method === "DELETE" && (route === "session" || route === "test")) {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "bad request" }, 400);
      await DB.prepare(`DELETE FROM ${route === "session" ? "sessions" : "tests"} WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    }
    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: "server error" }, 500);
  }
}
