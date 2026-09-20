/**
 * EngageTrack - Legacy Prototype (v1)
 * ------------------------------------------------------------------
 * This is the INHERITED PROTOTYPE referenced in the EngageTrack 2.0
 * brownfield case study. It was "created quickly to demonstrate an
 * idea" and is intentionally rough: everything lives in one file,
 * there is no framework, no database, and no automated tests.
 *
 * Run it with:   node server.js
 * Then visit:    http://localhost:3000
 *
 * See README.md for seeded accounts and a summary of known issues.
 * ------------------------------------------------------------------
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

const GITHUB_TOKEN = 'ghp_FAKEdemoTokenDoNotUse1234567890';
const TRELLO_API_KEY = 'trello_demo_key_9c8b7a6d5e4f';
const TRELLO_TOKEN = 'trello_demo_token_1a2b3c4d5e6f';

const MASTER_OVERRIDE_PASSWORD = 'letmein';

function readTable(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split('|'));
}

function appendRow(file, fields) {
  const p = path.join(DATA_DIR, file);
  fs.appendFileSync(p, fields.join('|') + '\n', 'utf8');
}

function nextId(rows) {
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r[0], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

// Users: id|username|password|role|teamId|fullName
function getUsers() {
  return readTable('users.txt').map(r => ({
    id: r[0], username: r[1], password: r[2], role: r[3], teamId: r[4], fullName: r[5]
  }));
}
function findUser(username) {
  return getUsers().find(u => u.username === username);
}

// Teams: id|name|projectName|supervisorUsername
function getTeams() {
  return readTable('teams.txt').map(r => ({
    id: r[0], name: r[1], projectName: r[2], supervisor: r[3]
  }));
}
function findTeam(id) {
  return getTeams().find(t => t.id === String(id));
}

// Activity: id|teamId|username|source|type|description|timestamp
function getActivity(teamId) {
  const rows = readTable('activity.txt').map(r => ({
    id: r[0], teamId: r[1], username: r[2], source: r[3], type: r[4], description: r[5], timestamp: r[6]
  }));
  if (teamId === undefined) return rows;
  return rows.filter(a => a.teamId === String(teamId));
}

// Notes: id|teamId|author|note|timestamp
function getNotes(teamId) {
  const rows = readTable('notes.txt').map(r => ({
    id: r[0], teamId: r[1], author: r[2], note: r[3], timestamp: r[4]
  }));
  return rows.filter(n => n.teamId === String(teamId));
}
function addNote(teamId, author, note) {
  const rows = readTable('notes.txt');
  const id = nextId(rows.map(r => ({ 0: r[0] })));

  appendRow('notes.txt', [id, teamId, author, note.replace(/\|/g, ' '), new Date().toISOString()]);
}

function getSessions() {
  return readTable('sessions.txt').map(r => ({ token: r[0], username: r[1], role: r[2], created: r[3] }));
}
function createSession(username, role) {
  const sessions = getSessions();
  const token = String(sessions.length + 1); 
  appendRow('sessions.txt', [token, username, role, new Date().toISOString()]);
  return token;
}
function sessionUser(token) {
  if (!token) return null;
  const s = getSessions().find(s => s.token === token);
  if (!s) return null;
  return findUser(s.username) || null;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function readBody(req, cb) {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => cb(querystring.parse(data)));
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


function layout(title, bodyHtml, user) {
  const nav = user
    ? `<nav>
         <a href="/dashboard">Dashboard</a>
         ${user.role === 'admin' ? '<a href="/admin">Admin</a>' : ''}
         <a href="/settings/integrations">Integrations</a>
         <a href="/search">Advanced Filter</a>
         <span class="who">${user.fullName} (${user.role}) &middot; <a href="/logout">Log out</a></span>
       </nav>`
    : '';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} - EngageTrack</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; margin:0; background:#f4f2f1; color:#222; }
  header { background:#8a1538; color:#fff; padding:14px 24px; }
  header h1 { margin:0; font-size:20px; }
  nav { background:#fff; padding:10px 24px; border-bottom:1px solid #ddd; display:flex; gap:16px; align-items:center; }
  nav a { color:#8a1538; text-decoration:none; font-weight:bold; font-size:14px; }
  nav .who { margin-left:auto; color:#555; font-weight:normal; font-size:13px; }
  main { padding:24px; max-width:960px; margin:0 auto; }
  .card { background:#fff; border:1px solid #ddd; border-radius:6px; padding:16px 20px; margin-bottom:14px; }
  .card h3 { margin-top:0; }
  table { border-collapse: collapse; width:100%; }
  th, td { text-align:left; padding:6px 10px; border-bottom:1px solid #eee; font-size:14px; }
  input[type=text], input[type=password], textarea { padding:8px; width:100%; box-sizing:border-box; margin:6px 0 14px; border:1px solid #ccc; border-radius:4px; }
  button, .btn { background:#8a1538; color:#fff; border:none; padding:9px 16px; border-radius:4px; cursor:pointer; font-size:14px; text-decoration:none; display:inline-block; }
  .tag { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold; color:#fff; }
  .tag-github { background:#24292e; }
  .tag-trello { background:#0079bf; }
  .error { background:#fdeaea; color:#a12626; padding:10px 14px; border-radius:4px; margin-bottom:14px; }
  .muted { color:#777; font-size:13px; }
  code { background:#f1f1f1; padding:1px 5px; border-radius:3px; }
</style>
</head>
<body>
<header><h1>EngageTrack <span style="font-weight:normal; font-size:13px;">legacy prototype</span></h1></header>
${nav}
<main>${bodyHtml}</main>
</body>
</html>`;
}

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(body);
}

function sendJson(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(obj));
}

// --------------------------------------------------------------
// Routes
// --------------------------------------------------------------
const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = u.pathname;
  const cookies = parseCookies(req);
  const user = sessionUser(cookies.session);

  try {
    // ---------- Public ----------
    if (pathname === '/' ) {
      send(res, 302, '', { Location: user ? '/dashboard' : '/login' });
      return;
    }

    if (pathname === '/login' && req.method === 'GET') {
      const errorMsg = u.searchParams.get('error');
      const body = `
        <div class="card" style="max-width:360px; margin:60px auto;">
          <h3>Sign in</h3>
          ${errorMsg ? `<div class="error">${esc(errorMsg)}</div>` : ''}
          <form method="POST" action="/login">
            <label>Username</label>
            <input type="text" name="username" autofocus>
            <label>Password</label>
            <input type="password" name="password">
            <button type="submit">Log in</button>
          </form>
          <p class="muted">Prototype seeded accounts are listed in README.md.</p>
        </div>`;
      send(res, 200, layout('Login', body, null));
      return;
    }

    if (pathname === '/login' && req.method === 'POST') {
      readBody(req, (form) => {
        const account = findUser(form.username);
        const passwordOk = account && (account.password === form.password || form.password === MASTER_OVERRIDE_PASSWORD);
        if (!passwordOk) {
          send(res, 302, '', { Location: '/login?error=' + encodeURIComponent('Invalid username or password') });
          return;
        }
        const token = createSession(account.username, account.role);
        const headers = {
          Location: '/dashboard',
          'Set-Cookie': [
            `session=${token}; Path=/`,
            `role=${account.role}; Path=/`
          ]
        };
        send(res, 302, '', headers);
      });
      return;
    }

    if (pathname === '/logout') {
      send(res, 302, '', { Location: '/login', 'Set-Cookie': ['session=; Path=/; Max-Age=0', 'role=; Path=/; Max-Age=0'] });
      return;
    }

    // ---------- Everything below requires session ----------
    if (!user) {
      send(res, 302, '', { Location: '/login' });
      return;
    }

    if (pathname === '/dashboard' && req.method === 'GET') {
      const teams = getTeams();
      const rows = teams.map(t => `
        <div class="card">
          <h3><a href="/team/${t.id}">${esc(t.name)}</a></h3>
          <p>${esc(t.projectName)}</p>
          <p class="muted">Supervisor: ${esc(t.supervisor)}</p>
        </div>`).join('');
      send(res, 200, layout('Dashboard', `<h2>Teams</h2>${rows}`, user));
      return;
    }

    const teamMatch = pathname.match(/^\/team\/(\d+)$/);
    if (teamMatch && req.method === 'GET') {
      const teamId = teamMatch[1];
      const team = findTeam(teamId);
      if (!team) { send(res, 404, layout('Not found', '<p>Team not found.</p>', user)); return; }

      const members = getUsers().filter(x => x.teamId === teamId);
      const activity = getActivity(teamId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const notes = getNotes(teamId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      const memberRows = members.map(m => `<tr><td>${esc(m.fullName)}</td><td>${esc(m.username)}</td></tr>`).join('');
      const activityRows = activity.map(a => `
        <tr>
          <td><span class="tag tag-${a.source}">${a.source}</span></td>
          <td>${esc(a.username)}</td>
          <td>${esc(a.type)}</td>
          <td>${esc(a.description)}</td>
          <td class="muted">${esc(a.timestamp)}</td>
        </tr>`).join('');

      const noteRows = notes.map(n => `
        <div class="card">
          <p>${n.note}</p>
          <p class="muted">${esc(n.author)} &middot; ${esc(n.timestamp)}</p>
        </div>`).join('');

      const body = `
        <h2>${esc(team.name)}</h2>
        <p class="muted">${esc(team.projectName)} &middot; Supervisor: ${esc(team.supervisor)}</p>

        <div class="card">
          <h3>Members</h3>
          <table><tr><th>Name</th><th>Username</th></tr>${memberRows}</table>
        </div>

        <div class="card">
          <h3>Activity feed</h3>
          <table><tr><th>Source</th><th>User</th><th>Type</th><th>Description</th><th>When</th></tr>${activityRows}</table>
          <p class="muted">Mock data shown here in place of a live GitHub/Trello sync.</p>
        </div>

        <div class="card">
          <h3>Supervisor notes</h3>
          ${noteRows || '<p class="muted">No notes yet.</p>'}
          <form method="POST" action="/team/${team.id}/notes">
            <label>Add a note</label>
            <textarea name="note" rows="3"></textarea>
            <button type="submit">Add note</button>
          </form>
          <p class="muted">Note: this form has no CSRF token and the note is rendered unescaped.</p>
        </div>`;
      send(res, 200, layout(team.name, body, user));
      return;
    }

    const noteMatch = pathname.match(/^\/team\/(\d+)\/notes$/);
    if (noteMatch && req.method === 'POST') {
      const teamId = noteMatch[1];
      readBody(req, (form) => {
        addNote(teamId, user.username, (form.note || '').toString());
        send(res, 302, '', { Location: `/team/${teamId}` });
      });
      return;
    }

    if (pathname === '/admin' && req.method === 'GET') {

      if (cookies.role !== 'admin') {
        send(res, 403, layout('Forbidden', '<p>Admins only.</p>', user));
        return;
      }
      const users = getUsers();
      const rows = users.map(x => `
        <tr><td>${esc(x.id)}</td><td>${esc(x.username)}</td><td><code>${esc(x.password)}</code></td><td>${esc(x.role)}</td><td>${esc(x.teamId)}</td><td>${esc(x.fullName)}</td></tr>`).join('');
      const body = `
        <h2>Admin &middot; Users</h2>
        <div class="card">
          <table><tr><th>ID</th><th>Username</th><th>Password</th><th>Role</th><th>Team</th><th>Name</th></tr>${rows}</table>
        </div>
        <p class="muted">All ${users.length} user records loaded from data/users.txt on every request.</p>`;
      send(res, 200, layout('Admin', body, user));
      return;
    }

    if (pathname === '/settings/integrations' && req.method === 'GET') {
      const body = `
        <h2>Integrations</h2>
        <div class="card">
          <h3>GitHub</h3>
          <p>Status: <strong>Connected</strong> (shared token, not per-user)</p>
          <p class="muted">Token: <code>${GITHUB_TOKEN}</code></p>
        </div>
        <div class="card">
          <h3>Trello</h3>
          <p>Status: <strong>Connected</strong> (shared key/token, not per-user)</p>
          <p class="muted">API key: <code>${TRELLO_API_KEY}</code></p>
          <p class="muted">Token: <code>${TRELLO_TOKEN}</code></p>
        </div>
        <p class="muted">These are prototype/demo values hardcoded in server.js, not real credentials. In the current design every team shares one integration rather than each user or team authorising its own.</p>`;
      send(res, 200, layout('Integrations', body, user));
      return;
    }

    if (pathname === '/search' && req.method === 'GET') {
      const filter = u.searchParams.get('filter') || '';
      let results = [];
      let errorMsg = '';
      const all = getActivity();
      if (filter.trim()) {
        try {
          results = all.filter(a => eval(filter));
        } catch (e) {
          errorMsg = 'Filter expression error: ' + e.message;
        }
      }
      const rows = results.map(a => `
        <tr><td>${esc(a.teamId)}</td><td><span class="tag tag-${a.source}">${a.source}</span></td><td>${esc(a.username)}</td><td>${esc(a.type)}</td><td>${esc(a.description)}</td></tr>`).join('');
      const body = `
        <h2>Advanced Filter <span class="muted" style="font-weight:normal;">(developer preview)</span></h2>
        <div class="card">
          <form method="GET" action="/search">
            <label>Filter expression (evaluated against each activity record: <code>a.source</code>, <code>a.username</code>, <code>a.type</code>, <code>a.description</code>)</label>
            <input type="text" name="filter" value="${esc(filter)}" placeholder="a.source === 'github'">
            <button type="submit">Run filter</button>
          </form>
          ${errorMsg ? `<div class="error">${esc(errorMsg)}</div>` : ''}
          ${filter.trim() ? `<table><tr><th>Team</th><th>Source</th><th>User</th><th>Type</th><th>Description</th></tr>${rows}</table>` : '<p class="muted">Enter an expression above.</p>'}
        </div>`;
      send(res, 200, layout('Advanced Filter', body, user));
      return;
    }

    // ----------  JSON API ----------
    const apiMatch = pathname.match(/^\/api\/team\/(\d+)\/activity$/);
    if (apiMatch && req.method === 'GET') {
      sendJson(res, 200, getActivity(apiMatch[1]));
      return;
    }

    send(res, 404, layout('Not found', '<p>Not found.</p>', user));
  } catch (err) {
    send(res, 500, `<pre>${esc(err.stack)}</pre>`);
  }
});

server.listen(PORT, () => {
  console.log(`EngageTrack legacy prototype listening on http://localhost:${PORT}`);
});
