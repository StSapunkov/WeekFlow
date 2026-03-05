
function toggleTheme(cb) {
document.body.classList.toggle('dark', cb.checked);
localStorage.setItem('wf_theme', cb.checked ? 'dark' : 'light');
}

const DAYS       = ['Понеділок','Вівторок','Середа','Четвер','Пятниця','Субота','Неділя'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

const CATS = {
work:     { label:'Робота',    color:'var(--c-work)',     badge:'badge-work' },
personal: { label:'Особисте',  color:'var(--c-personal)', badge:'badge-personal' },
health:   { label:"Здоров'я",  color:'var(--c-health)',   badge:'badge-health' },
study:    { label:'Навчання',  color:'var(--c-study)',    badge:'badge-study' },
other:    { label:'Інше',      color:'var(--c-other)',    badge:'badge-other' },
};

const PRIOS = {
high: { label:'Високий', badge:'badge-high', cls:'priority-high' },
mid:  { label:'Середній',badge:'badge-mid',  cls:'priority-mid'  },
low:  { label:'Низький', badge:'badge-low',  cls:'priority-low'  },
};

const todayRaw = new Date().getDay();
const todayIdx = todayRaw === 0 ? 6 : todayRaw - 1;

let selectedDay  = todayIdx;
let activeFilter = 'all';

let tasks = JSON.parse(localStorage.getItem('wf_tasks_v2') || 'null')
|| Array.from({length:7}, ()=>[]);

function save() { localStorage.setItem('wf_tasks_v2', JSON.stringify(tasks)); }

function getDayStats(d) {
const t = tasks[d];
const total = t.length;
const done  = t.filter(x=>x.done).length;
const pct   = total ? Math.round(done/total*100) : 0;
return { total, done, pct };
}

function renderWeekOverview() {
const el = document.getElementById('weekOverview');
el.innerHTML = '';
DAYS.forEach((_, i) => {
    const {total, pct} = getDayStats(i);
    const div = document.createElement('div');
    div.className = 'week-mini' + (i===selectedDay?' active':'') + (i===todayIdx?' today':'');
    div.style.setProperty('--pct', pct/100);
    div.innerHTML = `
    <div class="day-abbr">${DAYS_SHORT[i]}</div>
    <div class="day-pct">${pct}%</div>
    <div class="day-task-count">${total} задач</div>
    `;
    div.onclick = () => selectDay(i);
    el.appendChild(div);
});
}

function getFilteredTasks() {
const t = tasks[selectedDay];
if (activeFilter === 'all') return t.map((task,i) => ({task,i}));
const cat = activeFilter.replace('cat-','');
return t.map((task,i) => ({task,i})).filter(({task}) => task.cat === cat);
}

function renderTaskList() {
const el = document.getElementById('taskList');
document.getElementById('selectedDayTitle').textContent = DAYS[selectedDay];
const filtered = getFilteredTasks();

if (filtered.length === 0) {
    const msg = activeFilter === 'all'
    ? 'Задач ще немає<br><small>Додайте першу задачу нижче</small>'
    : 'Немає задач у цій категорії';
    el.innerHTML = `<div class="task-empty"><div class="empty-icon">📋</div><div>${msg}</div></div>`;
} else {
    el.innerHTML = filtered.map(({task, i}) => `
    <div class="task-item ${PRIOS[task.prio].cls}">
        <div class="task-checkbox ${task.done?'checked':''}" onclick="toggleTask(${i})"></div>
        <div class="task-body">
        <div class="task-meta">
            <span class="task-cat-badge ${CATS[task.cat].badge}">${CATS[task.cat].label}</span>
            <span class="task-priority-badge ${PRIOS[task.prio].badge}">${PRIOS[task.prio].label}</span>
        </div>
        <div class="task-text ${task.done?'done':''}">${escHtml(task.text)}</div>
        </div>
        <button class="task-delete" onclick="deleteTask(${i})">×</button>
    </div>
    `).join('');
}

updateRing();
}

function updateRing() {
const {pct} = getDayStats(selectedDay);
const c = 188;
  document.getElementById('ringFill').style.strokeDashoffset = c - (c * pct / 100);
document.getElementById('ringPct').textContent = pct + '%';
}

function renderStats() {
let total=0, done=0;
tasks.forEach(d => { total+=d.length; done+=d.filter(x=>x.done).length; });
const pct = total ? Math.round(done/total*100) : 0;

document.getElementById('statTotal').textContent = total;
document.getElementById('statDone').textContent  = done;
document.getElementById('statLeft').textContent  = total - done;
document.getElementById('statPct').textContent   = pct + '%';

const bc = document.getElementById('barChart');
bc.innerHTML = '';
const maxT = Math.max(1, ...tasks.map(d=>d.length));
tasks.forEach((d, i) => {
    const {total:t} = getDayStats(i);
    const h = t ? Math.max(8, Math.round(t/maxT*100)) : 5;
    const wrap = document.createElement('div');
    wrap.className = 'bar-wrap';
    wrap.innerHTML = `
    <div class="bar-col">
        <div class="bar-fill ${i===selectedDay?'active':(t>0?'has-data':'')}" style="height:${h}%"></div>
    </div>
    <div class="bar-label">${DAYS_SHORT[i]}</div>
    `;
    wrap.onclick = () => selectDay(i);
    bc.appendChild(wrap);
});

const catCounts = {};
Object.keys(CATS).forEach(k => catCounts[k] = 0);
tasks.forEach(d => d.forEach(t => { catCounts[t.cat] = (catCounts[t.cat]||0)+1; }));

document.getElementById('catLegend').innerHTML = Object.entries(CATS).map(([key, info]) => `
    <div class="cat-legend-row">
    <div class="cat-legend-left">
        <div class="cat-color-dot" style="background:${info.color}"></div>
        ${info.label}
    </div>
    <div class="cat-count">${catCounts[key]||0}</div>
    </div>
`).join('');

const el = document.getElementById('motivationBlock');
if (total === 0) {
    el.innerHTML = `<div class="emoji">🚀</div><p>Додайте перші задачі та почніть продуктивний тиждень!</p>`;
} else if (pct === 100) {
    el.innerHTML = `<div class="emoji">🏆</div><p><strong>Неймовірно!</strong> Всі задачі виконано. Ви — машина продуктивності!</p>`;
} else if (pct >= 70) {
    el.innerHTML = `<div class="emoji">🔥</div><p><strong>${pct}% виконано!</strong> Ще трохи — і тиждень закритий!</p>`;
} else if (pct >= 40) {
    el.innerHTML = `<div class="emoji">⚡</div><p>Гарний темп! <strong>${done}</strong> виконано, <strong>${total-done}</strong> ще попереду.</p>`;
} else {
    el.innerHTML = `<div class="emoji">🌱</div><p>Маєте <strong>${total} задач</strong> цього тижня. Кожен крок — це прогрес!</p>`;
}
}

function renderAll() {
renderWeekOverview();
renderTaskList();
renderStats();
}

function selectDay(i) { selectedDay = i; renderAll(); }

function addTask() {
const inp  = document.getElementById('taskInput');
const cat  = document.getElementById('catSelect').value;
const prio = document.getElementById('prioSelect').value;
const text = inp.value.trim();
if (!text) { inp.focus(); return; }
tasks[selectedDay].push({ id: Date.now(), text, cat, prio, done: false });
inp.value = '';
inp.focus();
save();
renderAll();
}

function toggleTask(i) {
tasks[selectedDay][i].done = !tasks[selectedDay][i].done;
save(); renderAll();
}

function deleteTask(i) {
tasks[selectedDay].splice(i, 1);
save(); renderAll();
}

function escHtml(s) {
return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.addEventListener('DOMContentLoaded', () => {
const d = new Date();
const savedTheme = localStorage.getItem('wf_theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    const cb = document.getElementById('themeToggle');
    if (cb) cb.checked = true;
}

document.getElementById('currentDate').textContent =
    d.toLocaleDateString('uk-UA', { weekday:'long', day:'numeric', month:'long' });

document.getElementById('filters').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderTaskList();
});

document.getElementById('taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
});

renderAll();
});