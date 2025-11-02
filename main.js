// --- CONFIGURACIÓN ---
const webhookUrl = 'https://hook.us2.make.com/14fk1hk6d7m12f61riahcot6era25woy';
const N8N_WHATSAPP_WEBHOOK = 'https://edwinguty222.app.n8n.cloud/webhook-test/245e6f35-3dda-412b-9c74-c67bc9c340d4';
const WHATSAPP_TO = '';

const updateButton = document.getElementById('updateButton');
const dataContainer = document.getElementById('dataContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const statusEl = document.getElementById('status');
const initialMessage = document.getElementById('initialMessage');

if (updateButton) updateButton.addEventListener('click', fetchData);

let isFetching = false;


async function fetchData() {
    if (webhookUrl === 'URL_DE_TU_WEBHOOK_AQUI') {
        if (!isFetching) alert('Por favor, edita este archivo (index.html) y añade tu URL de webhook de Make.com en la variable `webhookUrl`.');
        return;
    }
    if (isFetching) return; 
    isFetching = true;

    loadingSpinner.classList.remove('hidden');
    dataContainer.classList.add('hidden');
    errorMessage.classList.add('hidden');
    if (initialMessage && initialMessage.parentNode) {
        initialMessage.parentNode.removeChild(initialMessage);
    }
    updateButton.disabled = true;
    updateButton.classList.add('opacity-50', 'cursor-not-allowed');

            try {
        const response = await fetch(webhookUrl, { method: 'GET' });
        if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);
        const responseText = await response.text();
        let data;
        try { data = JSON.parse(responseText); } catch (e) {
            console.error('El webhook no devolvió JSON. Respuesta:', responseText);
            if (responseText.trim().toLowerCase() === 'accepted') {
                throw new Error("Error en Make.com: El webhook devolvió 'Accepted'. Añade el módulo 'Webhook Response' al final para enviar los datos.");
            } else {
                throw new Error(`Respuesta inesperada del servidor. No es JSON válido: ${responseText}`);
            }
        }

    renderTable(data);
        dataContainer.classList.remove('hidden');
        statusEl.textContent = `Última actualización: ${new Date().toLocaleTimeString()}`;
            } catch (error) {
        console.error('Error al obtener datos:', error.message || error);
        errorMessage.textContent = error.message || String(error);
        errorMessage.classList.remove('hidden');
    } finally {
        loadingSpinner.classList.add('hidden');
        updateButton.disabled = false;
        updateButton.classList.remove('opacity-50', 'cursor-not-allowed');
                isFetching = false;
    }
}

// ------------------- Helpers para filtrado por tiempo/sector -------------------
function normalizeStr(s){
    if (s == null) return '';
    let v = String(s).trim().toLowerCase();
    try { v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch {}
    return v.replace(/\s+/g, ' '); 
}

function getPropCI(obj, name){
    if (!obj) return undefined;
    const target = normalizeStr(name);
    let key = Object.keys(obj).find(k => normalizeStr(k) === target);
    if (key) return obj[key];
    const targetNoSpace = target.replace(/\s+/g, '');
    key = Object.keys(obj).find(k => normalizeStr(k).replace(/\s+/g, '') === targetNoSpace);
    return key ? obj[key] : undefined;
}

function normalizeSectorVal(val){
    if (val == null) return null;
    let s = String(val).trim().toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch {}
    if (s.includes('maria')) return 'maria';
    if (s.includes('danubio')) return 'danubio';
    return null;
}

function parseFechaHoraFromRow(row){
    const f = getPropCI(row, 'fecha');
    const h = getPropCI(row, 'hora');
    if (!f || !h) return null;
    let year, month, day;
    const fs = String(f).trim();
    if (fs.includes('-')){
        const parts = fs.split(/[-T ]/);
        year = Number(parts[0]);
        month = Number(parts[1]) - 1; 
        day = Number(parts[2]);
    } else if (fs.includes('/')){
        const parts = fs.split('/');
        day = Number(parts[0]);
        month = Number(parts[1]) - 1;
        year = Number(parts[2]);
    } else {
        const d = new Date(fs + ' ' + h);
        return isNaN(d.getTime()) ? null : d;
    }
    let hh = 0, mm = 0, ss = 0;
    const hs = String(h).trim();
    const hparts = hs.split(':');
    if (hparts.length >= 1) hh = Number(hparts[0]);
    if (hparts.length >= 2) mm = Number(hparts[1]);
    if (hparts.length >= 3) ss = Number(hparts[2]);
    const d = new Date(year, month, day, hh, mm, ss);
    return isNaN(d.getTime()) ? null : d;
}

function isSameDay(a, b){
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getLastTimestamp(rows){
    let last = null;
    for (const r of rows){
        const ts = parseFechaHoraFromRow(r);
        if (ts && !isNaN(ts.getTime())){
            if (!last || ts.getTime() > last.getTime()) last = ts;
        }
    }
    return last;
}

function analyzeWindowByLastTs(rows){
    const mapped = rows.map(r => ({ r, ts: parseFechaHoraFromRow(r), sec: normalizeSectorVal(
        getPropCI(r, 'sector') || getPropCI(r, 'barrio') || getPropCI(r, 'zona')
    ) }));
    const lastTs = getLastTimestamp(rows);
    if (!lastTs) return { recent: [], counts: {}, lastTs: null };
    const cutoff = lastTs.getTime() - 30 * 60 * 1000;
    const recent = mapped.filter(x => x.ts && isSameDay(x.ts, lastTs) && x.ts.getTime() >= cutoff && x.sec);
    const counts = recent.reduce((acc, x) => { acc[x.sec] = (acc[x.sec] || 0) + 1; return acc; }, {});
    try { console.debug('[Ventana por última hora]', {ultima:lastTs.toString(), cutoff:new Date(cutoff).toString(), counts, total:recent.length}); } catch {}
    return { recent, counts, lastTs };
}

function extractRows(payload){
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object'){
        const candidates = ['data','items','rows','result','results','values'];
        for (const key of candidates){
            const v = payload[key];
            if (Array.isArray(v)) return v;
        }
        for (const k of Object.keys(payload)){
            if (Array.isArray(payload[k])) return payload[k];
        }
    }
    return payload ? [payload] : [];
}

function renderTable(payload){
    dataContainer.innerHTML = '';
    const rows = extractRows(payload);
    if (!Array.isArray(rows) || rows.length === 0){
        const msg = document.createElement('div');
        msg.className = 'text-center text-gray-500 p-4';
        msg.textContent = 'Sin datos del webhook.';
        dataContainer.appendChild(msg);
        return;
    }

    const { recent, counts, lastTs } = analyzeWindowByLastTs(rows);
    const allowed = Object.keys(counts).filter(k => counts[k] >= 3);
    const filtered = recent.filter(x => allowed.includes(x.sec)).map(x => x.r);

    if (filtered.length === 0){
        const msg = document.createElement('div');
        msg.className = 'text-center text-gray-500 p-4';
        const tsText = lastTs ? new Date(lastTs).toLocaleTimeString() : 'N/A';
        msg.textContent = `No hay sectores con 3 alertas en los 30 minutos anteriores a la última hora registrada (${tsText}).`;
        dataContainer.appendChild(msg);

        const debugWrap = document.createElement('details');
        debugWrap.className = 'mt-2 border border-dashed border-gray-300 rounded';
        const sum = document.createElement('summary');
        sum.className = 'cursor-pointer p-2 text-sm text-gray-600';
        sum.textContent = 'Ver ultimos registros';
        debugWrap.appendChild(sum);

        const info = document.createElement('div');
        info.className = 'text-sm text-gray-600 px-3 py-2';
        const cutoff = lastTs ? new Date(lastTs.getTime() - 30*60*1000) : null;
        info.textContent = `Última hora: ${lastTs ? lastTs.toLocaleString() : 'N/A'} | Inicio ventana: ${cutoff ? cutoff.toLocaleString() : 'N/A'}`;
        debugWrap.appendChild(info);

        const countsDiv = document.createElement('div');
        countsDiv.className = 'text-sm text-gray-600 px-3 py-2';
        debugWrap.appendChild(countsDiv);

        if (recent.length > 0){
            const recentRows = recent.slice(0, 20).map(x => x.r);
            const headers = Object.keys(recentRows[0]);
            const table = document.createElement('table');
            table.className = 'w-full text-left border-collapse text-sm';
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headers.forEach(h => {
                const th = document.createElement('th');
                th.className = 'p-2 bg-gray-50 border-b text-gray-700';
                th.textContent = h;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            recentRows.forEach(r => {
                const tr = document.createElement('tr');
                tr.className = 'even:bg-white odd:bg-gray-50';
                headers.forEach(h => {
                    const td = document.createElement('td');
                    td.className = 'p-2 border-b text-gray-600';
                    td.textContent = r[h] ?? '';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            const box = document.createElement('div');
            box.className = 'px-2 pb-3';
            box.appendChild(table);
            debugWrap.appendChild(box);
        } else {
            const empty = document.createElement('div');
            empty.className = 'px-3 pb-3 text-sm text-gray-500';
            empty.textContent = 'No hay registros en la ventana (misma fecha y últimos 30 minutos).';
            debugWrap.appendChild(empty);
        }

        dataContainer.appendChild(debugWrap);
        return;
    }

    const table = document.createElement('table');
    table.className = 'w-full text-left border-collapse';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = Object.keys(filtered[0]);
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.className = 'text-sm font-semibold text-gray-700 p-3 bg-gray-100 border-b border-gray-300 sticky top-0';
        th.textContent = headerText.charAt(0).toUpperCase() + headerText.slice(1);
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    filtered.forEach(rowData => {
        const row = document.createElement('tr');
        row.className = 'even:bg-white odd:bg-gray-50 hover:bg-blue-50 transition-colors';
        headers.forEach(header => {
            const td = document.createElement('td');
            td.className = 'text-md text-gray-600 p-3 border-b border-gray-200';
            td.textContent = rowData[header] || '';
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    dataContainer.appendChild(table);
}

const alarmToggle = document.getElementById('alarmToggle');
const alarmIndicator = document.getElementById('alarmIndicator');
const alarmText = document.getElementById('alarmText');
const alertSelect = document.getElementById('alertSelect');
const alertLevelBadge = document.getElementById('alertLevel');
const sendAlertBtn = document.getElementById('sendAlertBtn');
const sendAlertStatus = document.getElementById('sendAlertStatus');
const refreshBarriosBtn = document.getElementById('refreshBarrios');
const barriosStatus = document.getElementById('barriosStatus');
// La María
const lmRisk = document.getElementById('lm-risk');
const lmLevel = document.getElementById('lm-level');
const lmRh = document.getElementById('lm-rh');
const lmPress = document.getElementById('lm-press');
const lmGust = document.getElementById('lm-gust');
const lmLclouds = document.getElementById('lm-lclouds');
const lmWarn = document.getElementById('lm-warning');
const lmTime = document.getElementById('lm-time');
// Danubio
const danRisk = document.getElementById('dan-risk');
const danLevel = document.getElementById('dan-level');
const danRh = document.getElementById('dan-rh');
const danPress = document.getElementById('dan-press');
const danGust = document.getElementById('dan-gust');
const danLclouds = document.getElementById('dan-lclouds');
const danWarn = document.getElementById('dan-warning');
const danTime = document.getElementById('dan-time');

// Simulaciones
const refreshSimsBtn = document.getElementById('refreshSims');
const simsStatus = document.getElementById('simsStatus');
const simARisk = document.getElementById('simA-risk');
const simALevel = document.getElementById('simA-level');
const simPRisk = document.getElementById('simP-risk');
const simPLevel = document.getElementById('simP-level');

let alarmOn = localStorage.getItem('alarmOn') === 'true';

function updateAlarmUI() {
    if (!alarmIndicator || !alarmToggle || !alarmText) return;
    if (alarmOn) {
        alarmIndicator.className = 'w-3 h-3 rounded-full bg-red-500';
        alarmToggle.textContent = 'Apagar';
        alarmToggle.classList.remove('bg-gray-200');
        alarmToggle.classList.add('bg-red-600', 'text-white');
        alarmText.textContent = 'Alarma activada';
    } else {
        alarmIndicator.className = 'w-3 h-3 rounded-full bg-gray-300';
        alarmToggle.textContent = 'Encender';
        alarmToggle.classList.remove('bg-red-600', 'text-white');
        alarmToggle.classList.add('bg-gray-200');
        alarmText.textContent = 'Alarma apagada';
    }
}

function toggleAlarm() {
    alarmOn = !alarmOn;
    localStorage.setItem('alarmOn', alarmOn);
    updateAlarmUI();
}

function updateAlertUI() {
    if (!alertSelect || !alertLevelBadge) return;
    const v = alertSelect.value;
    if (v === 'low') {
        alertLevelBadge.textContent = 'Bajo';
        alertLevelBadge.className = 'px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm';
    } else if (v === 'medium') {
        alertLevelBadge.textContent = 'Medio';
        alertLevelBadge.className = 'px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-semibold text-sm';
    } else if (v === 'high') {
        alertLevelBadge.textContent = 'Alto';
        alertLevelBadge.className = 'px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-sm';
    }
}

if (alarmToggle) alarmToggle.addEventListener('click', toggleAlarm);
if (alertSelect) alertSelect.addEventListener('change', updateAlertUI);
if (sendAlertBtn) sendAlertBtn.addEventListener('click', sendAlertWhatsApp);

updateAlarmUI();
updateAlertUI();

// ------------------- WhatsApp (n8n) -------------------
const ALERT_MESSAGES = {
    low: 'Nivel de alerta BAJO. Seguimiento rutinario. Sin acciones adicionales por ahora.',
    medium: 'Nivel de alerta MEDIO. Mantener vigilancia y preparar recursos en caso de escalamiento.',
    high: 'Nivel de alerta ALTO. Activar protocolo y coordinar respuesta inmediata.'
};

async function sendAlertWhatsApp(){
    try{
        if (!N8N_WHATSAPP_WEBHOOK || N8N_WHATSAPP_WEBHOOK === 'PON_AQUI_TU_WEBHOOK_DE_N8N'){
            alert('Configura N8N_WHATSAPP_WEBHOOK en main.js con la URL del webhook de n8n.');
            return;
        }
        const level = (alertSelect?.value || 'low');
        const message = ALERT_MESSAGES[level] || `Nivel de alerta: ${level}`;
        const payload = {
            level,
            message,
            to: WHATSAPP_TO || undefined,
            source: 'panel-cruz-roja',
            ts: Date.now()
        };
        if (sendAlertStatus) sendAlertStatus.textContent = 'Enviando…';
        if (sendAlertBtn){ sendAlertBtn.disabled = true; }

        const res = await fetch(N8N_WHATSAPP_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        if (!res.ok){
            throw new Error(`${res.status} ${res.statusText}: ${text}`);
        }
        if (sendAlertStatus) sendAlertStatus.textContent = 'Mensaje enviado ✔';
    }catch(err){
        console.error('Error enviando WhatsApp:', err);
        if (sendAlertStatus){
            const msg = String(err?.message || err || '').toLowerCase();
            if (msg.includes('no respond to webhook node')){
                sendAlertStatus.textContent = 'Configura en n8n un nodo "Respond to Webhook" o pon el Webhook en "Respond immediately"';
            } else {
                sendAlertStatus.textContent = 'Error al enviar (ver consola)';
            }
        }
    }finally{
        if (sendAlertBtn){ sendAlertBtn.disabled = false; }
        setTimeout(() => { if (sendAlertStatus) sendAlertStatus.textContent = ''; }, 4000);
    }
}

// ------------------- Barrios (La María, Danubio) -------------------
const API_BASE = 'http://127.0.0.1:8000';

function levelBadgeCls(level){
    const l = (level || '').toString().toLowerCase();
    if (l.includes('alta')) return 'px-2 py-1 rounded-full text-xs bg-red-100 text-red-700';
    if (l.includes('media')) return 'px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800';
    if (l.includes('baja')) return 'px-2 py-1 rounded-full text-xs bg-green-100 text-green-700';
    return 'px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700';
}

async function fetchJson(url){
    const res = await fetch(url, { mode: 'cors' });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} | ${text}`);
    try { return JSON.parse(text); } catch { return text; }
}

async function fetchBarrios(){
    if (!barriosStatus) return;
    const startedAt = Date.now();
    barriosStatus.textContent = 'Consultando…';
    try{
        const [laMaria, danubio, pLaMaria, pDanubio] = await Promise.all([
            fetchJson(`${API_BASE}/la_maria`),
            fetchJson(`${API_BASE}/danubio`),
            fetchJson(`${API_BASE}/parametros_la_maria`),
            fetchJson(`${API_BASE}/parametros_danubio`),
        ]);

        try { console.debug('[Barrios API]', { laMaria, danubio, pLaMaria, pDanubio }); } catch {}

        const ensureParsed = (v) => {
            if (typeof v === 'string'){
                try { return JSON.parse(v); } catch { return v; }
            }
            return v;
        };
        const laMariaData = ensureParsed(laMaria);
        const danubioData = ensureParsed(danubio);
        const pLaMariaData = ensureParsed(pLaMaria);
        const pDanubioData = ensureParsed(pDanubio);

        if (Array.isArray(laMariaData) && laMariaData.length >= 2){
            const [score, level] = laMariaData;
            if (lmRisk) lmRisk.textContent = Number(score).toFixed(4);
            if (lmLevel){ lmLevel.textContent = String(level); lmLevel.className = levelBadgeCls(level); }
        } else if (laMariaData && typeof laMariaData === 'object'){
            if (laMariaData.error){
                console.warn('La María API error:', laMariaData);
                if (lmLevel){ lmLevel.textContent = 'Error API'; lmLevel.className = 'px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700'; }
            }
            const score = Number(getPropCI(laMariaData,'score') ?? getPropCI(laMariaData,'riesgo'));
            const level = getPropCI(laMariaData,'level') ?? getPropCI(laMariaData,'nivel');
            if (lmRisk && !Number.isNaN(score)) lmRisk.textContent = score.toFixed(4);
            if (lmLevel && level!=null){ lmLevel.textContent = String(level); lmLevel.className = levelBadgeCls(level); }
        }
        if (pLaMariaData && typeof pLaMariaData === 'object'){
            const rh = getPropCI(pLaMariaData,'rh-surface') ?? getPropCI(pLaMariaData,'rh');
            const press = getPropCI(pLaMariaData,'pressure-surface') ?? getPropCI(pLaMariaData,'pressure');
            const gust = getPropCI(pLaMariaData,'gust-surface') ?? getPropCI(pLaMariaData,'gust');
            const lclouds = getPropCI(pLaMariaData,'lclouds-surface') ?? getPropCI(pLaMariaData,'low_clouds') ?? getPropCI(pLaMariaData,'lclouds');
            const warning = getPropCI(pLaMariaData,'warning') ?? getPropCI(pLaMariaData,'alerta');
            const tsVal = getPropCI(pLaMariaData,'ts') ?? getPropCI(pLaMariaData,'timestamp');
            if (lmRh) lmRh.textContent = (rh!=null)? (rh.toFixed? rh.toFixed(2) : rh) : '--';
            if (lmPress) lmPress.textContent = (press!=null)? Math.round(press) : '--';
            if (lmGust) lmGust.textContent = (gust!=null)? (gust.toFixed? gust.toFixed(2) : gust) : '--';
            if (lmLclouds) lmLclouds.textContent = (lclouds!=null)? (lclouds.toFixed? lclouds.toFixed(1) : lclouds) : '--';
            if (lmWarn) lmWarn.textContent = (warning!=null)? String(warning) : '--';
            if (lmTime) lmTime.textContent = new Date(Number(tsVal) || Date.now()).toLocaleTimeString();
        }

        if (Array.isArray(danubioData) && danubioData.length >= 2){
            const [score, level] = danubioData;
            if (danRisk) danRisk.textContent = Number(score).toFixed(4);
            if (danLevel){ danLevel.textContent = String(level); danLevel.className = levelBadgeCls(level); }
        } else if (danubioData && typeof danubioData === 'object'){
            if (danubioData.error){
                console.warn('Danubio API error:', danubioData);
                if (danLevel){ danLevel.textContent = 'Error API'; danLevel.className = 'px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700'; }
            }
            const score = Number(getPropCI(danubioData,'score') ?? getPropCI(danubioData,'riesgo'));
            const level = getPropCI(danubioData,'level') ?? getPropCI(danubioData,'nivel');
            if (danRisk && !Number.isNaN(score)) danRisk.textContent = score.toFixed(4);
            if (danLevel && level!=null){ danLevel.textContent = String(level); danLevel.className = levelBadgeCls(level); }
        }
        if (pDanubioData && typeof pDanubioData === 'object'){
            const rh = getPropCI(pDanubioData,'rh-surface') ?? getPropCI(pDanubioData,'rh');
            const press = getPropCI(pDanubioData,'pressure-surface') ?? getPropCI(pDanubioData,'pressure');
            const gust = getPropCI(pDanubioData,'gust-surface') ?? getPropCI(pDanubioData,'gust');
            const lclouds = getPropCI(pDanubioData,'lclouds-surface') ?? getPropCI(pDanubioData,'low_clouds') ?? getPropCI(pDanubioData,'lclouds');
            const warning = getPropCI(pDanubioData,'warning') ?? getPropCI(pDanubioData,'alerta');
            const tsVal = getPropCI(pDanubioData,'ts') ?? getPropCI(pDanubioData,'timestamp');
            if (danRh) danRh.textContent = (rh!=null)? (rh.toFixed? rh.toFixed(2) : rh) : '--';
            if (danPress) danPress.textContent = (press!=null)? Math.round(press) : '--';
            if (danGust) danGust.textContent = (gust!=null)? (gust.toFixed? gust.toFixed(2) : gust) : '--';
            if (danLclouds) danLclouds.textContent = (lclouds!=null)? (lclouds.toFixed? lclouds.toFixed(1) : lclouds) : '--';
            if (danWarn) danWarn.textContent = (warning!=null)? String(warning) : '--';
            if (danTime) danTime.textContent = new Date(Number(tsVal) || Date.now()).toLocaleTimeString();
        }

        const took = ((Date.now()-startedAt)/1000).toFixed(1);
        barriosStatus.textContent = `Actualizado hace ${new Date().toLocaleTimeString()}`;
    }catch(err){
        console.error('Error consultando barrios:', err);
        barriosStatus.textContent = `Error barrios: ${err?.message || err}`;
    }
}

if (refreshBarriosBtn) refreshBarriosBtn.addEventListener('click', fetchBarrios);
fetchBarrios();

// ------------------- Simulaciones (arriesgada, peligrosa) -------------------
async function fetchSimulaciones(){
    if (!simsStatus) return;
    const startedAt = Date.now();
    simsStatus.textContent = 'Consultando…';
    try{
        const [simA, simP] = await Promise.all([
            fetchJson(`${API_BASE}/simulacion_arriesgada`),
            fetchJson(`${API_BASE}/simulacion_peligrosa`),
        ]);

        if (Array.isArray(simA) && simA.length >= 2){
            const [score, level] = simA;
            if (simARisk) simARisk.textContent = Number(score).toFixed(4);
            if (simALevel){ simALevel.textContent = String(level); simALevel.className = levelBadgeCls(level); }
        }
        if (Array.isArray(simP) && simP.length >= 2){
            const [score, level] = simP;
            if (simPRisk) simPRisk.textContent = Number(score).toFixed(4);
            if (simPLevel){ simPLevel.textContent = String(level); simPLevel.className = levelBadgeCls(level); }
        }

        const took = ((Date.now()-startedAt)/1000).toFixed(1);
        simsStatus.textContent = `Actualizado hace ${new Date().toLocaleTimeString()} `;
    }catch(err){
        console.error('Error consultando simulaciones:', err);
        simsStatus.textContent = 'Error al consultar simulaciones (ver consola)';
    }
}

if (refreshSimsBtn) refreshSimsBtn.addEventListener('click', fetchSimulaciones);
fetchSimulaciones();

const AUTO_REFRESH_MS = 30_000;
if (webhookUrl && webhookUrl !== 'URL_DE_TU_WEBHOOK_AQUI') {
    fetchData();
}

setInterval(() => {
    if (webhookUrl && webhookUrl !== 'URL_DE_TU_WEBHOOK_AQUI') fetchData();
    fetchBarrios();
    fetchSimulaciones();
}, AUTO_REFRESH_MS);