import http from 'node:http';
import crypto from 'node:crypto';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';

const DEMO_EMAIL = process.env.TEST_USER_EMAIL || 'qa.engineer@example.com';
const DEMO_PASSWORD = process.env.TEST_USER_PASSWORD || 'Password123!';

const DEMO_USER = {
  id: 'usr_01',
  name: 'QA Engineer',
  email: DEMO_EMAIL,
  role: 'admin',
};

const activeTokens = new Map();
const tasks = new Map();

function seedInitialTasks() {
  if (tasks.size > 0) return;
  const now = new Date().toISOString();
  const initial = [
    {
      id: 'tsk_seed_1',
      title: 'Configure Playwright sharding in CI',
      description: 'Split E2E suite across 4 parallel GitHub Actions runners.',
      priority: 'high',
      status: 'done',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tsk_seed_2',
      title: 'Validate API contract schemas with Zod',
      description: 'Ensure every REST response matches strict schema definitions.',
      priority: 'medium',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const t of initial) {
    tasks.set(t.id, t);
  }
}

seedInitialTasks();

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = statusCode === 204 ? '' : JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
  });
  res.end(html);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      cookies[key] = val;
    }
  }
  return cookies;
}

function authenticate(req) {
  const authHeader = req.headers.authorization || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    token = parseCookies(req).session_token || '';
  }
  if (!token || !activeTokens.has(token)) {
    return null;
  }
  return activeTokens.get(token);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QA TaskBoard — Demo App</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --surface-alt: #334155;
      --text: #f8fafc;
      --muted: #cbd5e1;
      --primary: #38bdf8;
      --primary-text: #0f172a;
      --danger: #f87171;
      --success: #4ade80;
      --border: #475569;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .container {
      max-width: 880px;
      margin: 0 auto;
      padding: 2rem 1.25rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }
    h1, h2 { margin: 0 0 0.75rem; }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.35rem;
      color: var(--text);
    }
    input, select, textarea {
      width: 100%;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    button {
      cursor: pointer;
      border: none;
      border-radius: 8px;
      padding: 0.65rem 1rem;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .btn-primary {
      background: var(--primary);
      color: var(--primary-text);
    }
    .btn-secondary {
      background: var(--surface-alt);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-danger {
      background: #991b1b;
      color: #fef2f2;
    }
    .alert {
      background: #7f1d1d;
      color: #fef2f2;
      border: 1px solid var(--danger);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .hidden { display: none !important; }
    .row {
      display: grid;
      grid-template-columns: 1fr 180px;
      gap: 1rem;
    }
    .filters {
      display: flex;
      gap: 0.75rem;
      align-items: end;
      margin-bottom: 1rem;
    }
    .filters > div { flex: 1; }
    .task-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .task-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
    }
    .task-item.done .task-title {
      text-decoration: line-through;
      color: var(--muted);
    }
    .badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      text-transform: uppercase;
      background: var(--surface-alt);
      color: var(--text);
      margin-left: 0.5rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .muted { color: var(--muted); font-size: 0.9rem; margin: 0.25rem 0 0; }
  </style>
</head>
<body>
  <main class="container">
    <section id="login-view" class="card" aria-labelledby="login-heading">
      <h1 id="login-heading">QA TaskBoard Sign In</h1>
      <p class="muted">Production-ready demo application for E2E, API, and load testing.</p>
      <div id="login-error" class="alert hidden" role="alert"></div>
      <form id="login-form" style="margin-top: 1rem;">
        <div>
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="username" required />
        </div>
        <div>
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required />
        </div>
        <button type="submit" class="btn-primary">Sign in</button>
      </form>
    </section>

    <section id="dashboard-view" class="hidden" aria-labelledby="dashboard-heading">
      <header>
        <div>
          <h1 id="dashboard-heading">Task Board</h1>
          <p id="user-greeting" class="muted"></p>
        </div>
        <button id="logout-btn" type="button" class="btn-secondary">Sign out</button>
      </header>

      <div class="card">
        <h2>Create Task</h2>
        <div id="task-error" class="alert hidden" role="alert"></div>
        <form id="create-task-form">
          <div class="row">
            <div>
              <label for="task-title">Task Title</label>
              <input id="task-title" name="title" type="text" placeholder="e.g. Add contract tests" required />
            </div>
            <div>
              <label for="task-priority">Priority</label>
              <select id="task-priority" name="priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label for="task-description">Description</label>
            <input id="task-description" name="description" type="text" placeholder="Optional details" />
          </div>
          <button type="submit" class="btn-primary">Add Task</button>
        </form>
      </div>

      <div class="card">
        <h2>Tasks (<span id="task-count">0</span>)</h2>
        <div class="filters">
          <div>
            <label for="filter-status">Filter by status</label>
            <select id="filter-status">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label for="filter-search">Search tasks</label>
            <input id="filter-search" type="search" placeholder="Search by title..." style="margin-bottom: 0;" />
          </div>
        </div>
        <ul id="task-list" class="task-list" aria-live="polite"></ul>
        <p id="empty-state" class="muted hidden">No tasks match the current filter.</p>
      </div>
    </section>
  </main>

  <script>
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const taskError = document.getElementById('task-error');
    const createTaskForm = document.getElementById('create-task-form');
    const taskList = document.getElementById('task-list');
    const taskCount = document.getElementById('task-count');
    const emptyState = document.getElementById('empty-state');
    const filterStatus = document.getElementById('filter-status');
    const filterSearch = document.getElementById('filter-search');
    const userGreeting = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-btn');

    function getToken() {
      return localStorage.getItem('auth_token') || '';
    }

    async function apiFetch(path, options = {}) {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(options.headers || {}),
      };
      const res = await fetch(path, { ...options, headers });
      if (res.status === 204) return { ok: true, status: 204, data: null };
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    }

    function showLogin() {
      dashboardView.classList.add('hidden');
      loginView.classList.remove('hidden');
    }

    function showDashboard(user) {
      loginView.classList.add('hidden');
      dashboardView.classList.remove('hidden');
      userGreeting.textContent = 'Signed in as ' + user.name + ' (' + user.email + ')';
    }

    async function loadTasks() {
      const params = new URLSearchParams();
      if (filterStatus.value !== 'all') params.set('status', filterStatus.value);
      if (filterSearch.value.trim()) params.set('search', filterSearch.value.trim());

      const res = await apiFetch('/api/tasks?' + params.toString());
      if (!res.ok) return;

      const items = res.data.items || [];
      taskCount.textContent = String(items.length);
      taskList.innerHTML = '';

      if (items.length === 0) {
        emptyState.classList.remove('hidden');
        return;
      }
      emptyState.classList.add('hidden');

      for (const task of items) {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.status === 'done' ? ' done' : '');
        li.dataset.taskId = task.id;

        const info = document.createElement('div');
        const titleEl = document.createElement('strong');
        titleEl.className = 'task-title';
        titleEl.textContent = task.title;

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = task.priority;

        const statusBadge = document.createElement('span');
        statusBadge.className = 'badge';
        statusBadge.textContent = task.status;

        info.appendChild(titleEl);
        info.appendChild(badge);
        info.appendChild(statusBadge);

        if (task.description) {
          const desc = document.createElement('p');
          desc.className = 'muted';
          desc.textContent = task.description;
          info.appendChild(desc);
        }

        const actions = document.createElement('div');
        actions.className = 'actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn-secondary';
        toggleBtn.textContent = task.status === 'done' ? 'Reopen' : 'Complete';
        toggleBtn.setAttribute('aria-label', (task.status === 'done' ? 'Reopen ' : 'Complete ') + task.title);
        toggleBtn.addEventListener('click', async () => {
          const nextStatus = task.status === 'done' ? 'pending' : 'done';
          await apiFetch('/api/tasks/' + task.id, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus }),
          });
          await loadTasks();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', 'Delete ' + task.title);
        deleteBtn.addEventListener('click', async () => {
          await apiFetch('/api/tasks/' + task.id, { method: 'DELETE' });
          await loadTasks();
        });

        actions.appendChild(toggleBtn);
        actions.appendChild(deleteBtn);
        li.appendChild(info);
        li.appendChild(actions);
        taskList.appendChild(li);
      }
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.classList.add('hidden');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        loginError.textContent = res.data.error || 'Authentication failed';
        loginError.classList.remove('hidden');
        return;
      }

      localStorage.setItem('auth_token', res.data.token);
      showDashboard(res.data.user);
      await loadTasks();
    });

    createTaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      taskError.classList.add('hidden');
      const title = document.getElementById('task-title').value.trim();
      const priority = document.getElementById('task-priority').value;
      const description = document.getElementById('task-description').value.trim();

      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, priority, description }),
      });

      if (!res.ok) {
        taskError.textContent = res.data.error || 'Failed to create task';
        taskError.classList.remove('hidden');
        return;
      }

      createTaskForm.reset();
      await loadTasks();
    });

    logoutBtn.addEventListener('click', async () => {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth_token');
      showLogin();
    });

    filterStatus.addEventListener('change', loadTasks);
    filterSearch.addEventListener('input', loadTasks);

    (async function init() {
      const res = await apiFetch('/api/auth/me');
      if (res.ok && res.data.user) {
        showDashboard(res.data.user);
        await loadTasks();
      } else {
        showLogin();
      }
    })();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  const { pathname } = url;
  const method = req.method || 'GET';

  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok', uptime: process.uptime() });
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const body = await readJsonBody(req);
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
      return sendJson(res, 400, { error: 'Email and password are required' });
    }
    if (body.email !== DEMO_EMAIL || body.password !== DEMO_PASSWORD) {
      return sendJson(res, 401, { error: 'Invalid email or password' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    activeTokens.set(token, DEMO_USER);
    return sendJson(
      res,
      200,
      { token, user: DEMO_USER },
      { 'Set-Cookie': `session_token=${token}; Path=/; HttpOnly; SameSite=Lax` },
    );
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : parseCookies(req).session_token || '';
    if (token) activeTokens.delete(token);
    return sendJson(
      res,
      200,
      { ok: true },
      { 'Set-Cookie': 'session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax' },
    );
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const user = authenticate(req);
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    return sendJson(res, 200, { user });
  }

  if (pathname === '/api/tasks' && method === 'GET') {
    const user = authenticate(req);
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

    const statusFilter = url.searchParams.get('status');
    const priorityFilter = url.searchParams.get('priority');
    const searchFilter = (url.searchParams.get('search') || '').toLowerCase();

    let items = Array.from(tasks.values());
    if (statusFilter) items = items.filter((t) => t.status === statusFilter);
    if (priorityFilter) items = items.filter((t) => t.priority === priorityFilter);
    if (searchFilter) {
      items = items.filter((t) => t.title.toLowerCase().includes(searchFilter));
    }

    return sendJson(res, 200, { items, total: items.length });
  }

  if (pathname === '/api/tasks' && method === 'POST') {
    const user = authenticate(req);
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

    const body = await readJsonBody(req);
    if (!body || typeof body.title !== 'string' || body.title.trim().length < 3) {
      return sendJson(res, 400, { error: 'Task title must be at least 3 characters' });
    }
    const priority = ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium';
    const now = new Date().toISOString();
    const task = {
      id: `tsk_${crypto.randomBytes(6).toString('hex')}`,
      title: body.title.trim(),
      description: typeof body.description === 'string' ? body.description.trim() : '',
      priority,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    tasks.set(task.id, task);
    return sendJson(res, 201, { task });
  }

  if (pathname.startsWith('/api/tasks/')) {
    const user = authenticate(req);
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });

    const taskId = pathname.slice('/api/tasks/'.length);
    const existing = tasks.get(taskId);
    if (!existing) return sendJson(res, 404, { error: 'Task not found' });

    if (method === 'GET') {
      return sendJson(res, 200, { task: existing });
    }

    if (method === 'PATCH') {
      const body = await readJsonBody(req);
      if (!body) return sendJson(res, 400, { error: 'Invalid JSON body' });
      if (body.title !== undefined) {
        if (typeof body.title !== 'string' || body.title.trim().length < 3) {
          return sendJson(res, 400, { error: 'Task title must be at least 3 characters' });
        }
        existing.title = body.title.trim();
      }
      if (body.description !== undefined && typeof body.description === 'string') {
        existing.description = body.description.trim();
      }
      if (body.priority !== undefined && ['low', 'medium', 'high'].includes(body.priority)) {
        existing.priority = body.priority;
      }
      if (body.status !== undefined && ['pending', 'done'].includes(body.status)) {
        existing.status = body.status;
      }
      existing.updatedAt = new Date().toISOString();
      tasks.set(taskId, existing);
      return sendJson(res, 200, { task: existing });
    }

    if (method === 'DELETE') {
      tasks.delete(taskId);
      return sendJson(res, 204, null);
    }
  }

  if (
    method === 'GET' &&
    (pathname === '/' || pathname === '/login' || pathname === '/dashboard')
  ) {
    return sendHtml(res, 200, APP_HTML);
  }

  return sendJson(res, 404, { error: 'Route not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Demo QA TaskBoard listening at http://${HOST}:${PORT}`);
});
