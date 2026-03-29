// -- Nav: mark current page active ------------------------------------------
(function markActiveNav() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.top-nav a').forEach(a => {
        const href = a.getAttribute('href').split('/').pop();
        if (href === page) a.classList.add('active');
    });
    // Show session status immediately (status bar visible before content loads)
    setTimeout(applySessionVars, 0);
})();

// -- Copy button -------------------------------------------------------------
function copyCode(btn) {
    const pre = btn.closest('.code-block').querySelector('pre');
    navigator.clipboard.writeText(pre.textContent.trim()).then(() => {
        btn.textContent = 'COPIED!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'COPY'; btn.classList.remove('copied'); }, 1800);
    });
}

// -- Section toggle -----------------------------------------------------------
function toggleSection(header) {
    const body = header.nextElementSibling;
    const toggle = header.querySelector('.section-toggle');
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    toggle.classList.toggle('open', !isOpen);
}

// -- Sidebar active on scroll -------------------------------------------------
function initScrollSpy() {
    const sections = document.querySelectorAll('.section');
    if (!sections.length) return;

    function updateActive() {
        const scrollY = window.scrollY + 80;
        let current = sections[0].id;
        sections.forEach(s => { if (s.offsetTop <= scrollY) current = s.id; });
        document.querySelectorAll('.sidebar li a').forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === '#' + current);
        });
    }
    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
}

// -- Sidebar click: smooth scroll + open section ---------------------------
function initSidebarLinks() {
    document.querySelectorAll('.sidebar li a').forEach(a => {
        a.addEventListener('click', function(e) {
            e.preventDefault();
            const id = this.getAttribute('href').substring(1);
            const el = document.getElementById(id);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const body = el.querySelector('.section-body');
            const toggle = el.querySelector('.section-toggle');
            if (body && !body.classList.contains('open')) {
                body.classList.add('open');
                if (toggle) toggle.classList.add('open');
            }
        });
    });
}

// -- Shared session variables -------------------------------------------------
// targetIp  -> stored as 'ctf_target_ip'   in sessionStorage
// attackerIp -> stored as 'ctf_attacker_ip' in sessionStorage
// attackerPort -> stored as 'ctf_attacker_port' in sessionStorage
//
// Call applySessionVars() after any DOM change to refresh all placeholders.

// -- Sanitise user input before inserting into innerHTML ---------------------
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function getSession(key, fallback) {
    try { return sessionStorage.getItem(key) || fallback; } catch(e) { return fallback; }
}
function setSession(key, val) {
    try { sessionStorage.setItem(key, val); } catch(e) {}
}

function applySessionVars() {
    const targetIp     = getSession('ctf_target_ip',      '');
    const attackerIp   = getSession('ctf_attacker_ip',    '');
    const attackerPort = getSession('ctf_attacker_port',  '');

    // -- Target IP: .ip-placeholder spans (rendered by renderPage) ------------
    document.querySelectorAll('.ip-placeholder').forEach(el => {
        el.textContent = targetIp || '<Target_IP>';
    });

    // -- Indicator on recon page ----------------------------------------------
    const indicator = document.getElementById('ipIndicator');
    if (indicator) indicator.classList.toggle('active', targetIp.length > 0);

    // -- Attacker IP + PORT in pre blocks (payloads page) ---------------------
    const safeIp   = escapeHtml(attackerIp);
    const safePort = escapeHtml(attackerPort);
    document.querySelectorAll('.code-block pre').forEach(pre => {
        if (!pre.dataset.original) pre.dataset.original = pre.innerHTML;
        let html = pre.dataset.original;
        if (safeIp)   html = html.replace(/&lt;YOUR_IP&gt;/g,  safeIp);
        if (safePort) html = html.replace(/&lt;PORT&gt;/g,      safePort);
        pre.innerHTML = html;
    });

}

// -- IP placeholder (recon page) ----------------------------------------------
function initIpInput() {
    const input = document.getElementById('targetIp');
    if (!input) return;

    // Pre-fill from session
    input.value = getSession('ctf_target_ip', '');
    applySessionVars();

    input.addEventListener('input', function() {
        setSession('ctf_target_ip', escapeHtml(this.value.trim()));
        applySessionVars();
    });
}

// -- Render engine ------------------------------------------------------------
// Builds HTML from a page data object loaded from JSON.
//
// JSON structure:
// {
//   "title": "Page Title",
//   "subtitle": "SIDEBAR SUBTITLE",
//   "sidebarGroups": [
//     { "label": "GROUP LABEL", "items": [{ "id": "section-id", "text": "Label", "badge": "21" }] }
//   ],
//   "sections": [
//     {
//       "id": "section-id",
//       "title": "SECTION TITLE",
//       "port": "21",           // optional
//       "subsections": [
//         {
//           "title": "Subsection title",
//           "tag": "HIGH VALUE", // optional -- shows red tag
//           "note": "optional note text (supports HTML links)",
//           "blocks": [
//             { "tool": "nmap", "desc": "optional description", "code": "nmap ..." }
//           ]
//         }
//       ]
//     }
//   ]
// }

function renderPage(data) {
    // -- Sidebar --------------------------------------------------------------
    const sidebarEl = document.querySelector('.sidebar');
    if (sidebarEl) {
        const subtitleEl = sidebarEl.querySelector('.sidebar-subtitle');
        if (subtitleEl) subtitleEl.textContent = data.subtitle || '';

        let groupsHtml = '';
        (data.sidebarGroups || []).forEach(g => {
            groupsHtml += `<div class="sidebar-group-label">${g.label}</div><ul>`;
            (g.items || []).forEach(item => {
                const badge = item.badge ? `<span class="port-badge">${item.badge}</span>` : '';
                groupsHtml += `<li><a href="#${item.id}">${item.text}${badge}</a></li>`;
            });
            groupsHtml += '</ul>';
        });

        const groupsContainer = sidebarEl.querySelector('.sidebar-groups');
        if (groupsContainer) groupsContainer.innerHTML = groupsHtml;
    }

    // -- Page title -----------------------------------------------------------
    const titleParts = (data.title || '').split(' / ');
    const titleEl = document.querySelector('.page-title');
    if (titleEl) {
        titleEl.innerHTML = titleParts.length > 1
            ? `${titleParts[0]} <span>/ ${titleParts.slice(1).join(' / ')}</span>`
            : data.title || '';
    }
    document.title = 'SUD0X0 - CTFTools | ' + (data.title || '');

    // -- Sections -------------------------------------------------------------
    const main = document.getElementById('sections-container');
    if (!main) return;

    let html = '';
    (data.sections || []).forEach(sec => {
        const portHtml = sec.port ? `<span class="section-port">${sec.port}</span>` : '';
        let bodyHtml = '';

        (sec.subsections || []).forEach(sub => {
            const tagHtml = sub.tag ? `<span class="tag tag-crit">${sub.tag}</span>` : '';
            let blocksHtml = '';

            (sub.blocks || []).forEach(b => {
                const descHtml = b.desc ? `<span class="code-meta-desc">${b.desc}</span>` : '';
                // Escape < > in code that aren't already entities
                const safeCode = b.code
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                // Re-mark IP placeholders so they stay green
                const finalCode = safeCode.replace(
                    /&lt;Target_IP&gt;/g,
                    '<span class="ip-placeholder">&lt;Target_IP&gt;</span>'
                );
                blocksHtml += `
                <div class="code-block">
                    <div class="code-meta">
                        <span class="code-meta-tool">${b.tool}</span>
                        ${descHtml}
                        <button class="copy-btn" onclick="copyCode(this)">COPY</button>
                    </div>
                    <pre>${finalCode}</pre>
                </div>`;
            });

            const noteHtml = sub.note ? `<div class="note">${sub.note}</div>` : '';

            bodyHtml += `
            <div class="subsection">
                <div class="subsection-title">${sub.title}${tagHtml}</div>
                ${blocksHtml}
                ${noteHtml}
            </div>`;
        });

        html += `
    <div class="section" id="${sec.id}">
        <div class="section-header" onclick="toggleSection(this)">
            <span class="section-icon">▸</span>
            <span class="section-title">${sec.title}</span>
            ${portHtml}
            <span class="section-toggle">▶</span>
        </div>
        <div class="section-body">
${bodyHtml}
        </div>
    </div>`;
    });

    main.innerHTML = html;

    // Init interactions after DOM is populated
    initSidebarLinks();
    initScrollSpy();
    initIpInput();
    applySessionVars();
}

// -- Markdown parser -----------------------------------------------------------
// Parses the custom .md format into the same data structure renderPage() expects.
//
// Format:
//   ---
//   title: Page Title
//   subtitle: SIDEBAR SUBTITLE
//   sidebar:
//     - label: GROUP
//       items:
//         - id: section-id
//           text: "Label [port]"
//   ---
//
//   ## SECTION TITLE [port:21]
//   <!-- id: section-id -->
//
//   ### Subsection title [!HIGH-VALUE]
//
//   #### tool | optional description
//   ```
//   command here
//   ```
//
//   > optional note

function parseMarkdown(text) {

    // -- Split frontmatter from body ------------------------------------------
    // Frontmatter is between the first and second --- lines
    const lines = text.split('\n');
    let fmEnd = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') { fmEnd = i; break; }
    }
    if (fmEnd === -1) throw new Error('Missing closing --- in frontmatter');

    const fmLines   = lines.slice(1, fmEnd);
    const bodyLines = lines.slice(fmEnd + 1);

    // -- Parse frontmatter ----------------------------------------------------
    const meta = { sidebarGroups: [] };
    let idx = 0;

    while (idx < fmLines.length) {
        const line = fmLines[idx];

        // Simple key: value
        const kv = line.match(/^(\w+):\s*(.+)$/);
        if (kv && line.indexOf('sidebar') === -1) {
            meta[kv[1]] = kv[2].trim();
            idx++; continue;
        }

        // sidebar: block
        if (line.trim() === 'sidebar:') {
            idx++;
            let currentGroup = null;
            while (idx < fmLines.length) {
                const sl = fmLines[idx];
                const grpMatch  = sl.match(/^  - label:\s*(.+)$/);
                const itemMatch = sl.match(/^      - id:\s*(.+)$/);
                const txtMatch  = sl.match(/^        text:\s*"?([^"]+)"?$/);

                if (grpMatch) {
                    currentGroup = { label: grpMatch[1].trim(), items: [] };
                    meta.sidebarGroups.push(currentGroup);
                } else if (itemMatch && currentGroup) {
                    currentGroup.items.push({ id: itemMatch[1].trim(), text: '', badge: null });
                } else if (txtMatch && currentGroup && currentGroup.items.length) {
                    const raw  = txtMatch[1].trim();
                    const last = currentGroup.items[currentGroup.items.length - 1];
                    // Extract badge from "Label [21]" pattern
                    const bm   = raw.match(/^(.+?)\s*\[([^\]]+)\]$/);
                    if (bm) { last.text = bm[1].trim(); last.badge = bm[2]; }
                    else     { last.text = raw; }
                }
                idx++;
            }
            continue;
        }
        idx++;
    }

    // -- Parse body -----------------------------------------------------------
    const sections = [];
    let currentSection = null;
    let currentSub     = null;
    let currentBlock   = null;
    let inCode         = false;
    let codeLines      = [];

    function flushBlock() {
        if (currentBlock && currentSub) {
            currentBlock.code = codeLines.join('\n').trim();
            currentSub.blocks.push(currentBlock);
        }
        currentBlock = null;
        codeLines    = [];
    }

    function flushSub() {
        flushBlock();
        if (currentSub && currentSection) {
            currentSection.subsections.push(currentSub);
        }
        currentSub = null;
    }

    function flushSection() {
        flushSub();
        if (currentSection) sections.push(currentSection);
        currentSection = null;
    }

    for (const line of bodyLines) {

        // -- Code fence -------------------------------------------------------
        if (line.trim() === '```') {
            if (!inCode) { inCode = true; }
            else         { inCode = false; flushBlock(); }
            continue;
        }
        if (inCode) { codeLines.push(line); continue; }

        // -- ## Section -------------------------------------------------------
        if (line.startsWith('## ')) {
            flushSection();
            const portMatch = line.match(/\[port:([^\]]+)\]/);
            const title     = line.replace(/^## /, '').replace(/\s*\[port:[^\]]+\]/, '').trim();
            currentSection  = { id: '', title, port: portMatch ? portMatch[1] : null, subsections: [] };
            continue;
        }

        // -- <!-- id: ... --> -------------------------------------------------
        const idMatch = line.match(/^<!-- id:\s*([^>]+)\s*-->$/);
        if (idMatch && currentSection) {
            currentSection.id = idMatch[1].trim();
            continue;
        }

        // -- ### Subsection ---------------------------------------------------
        if (line.startsWith('### ')) {
            flushSub();
            const tagMatch = line.match(/\[!([^\]]+)\]/);
            const title    = line.replace(/^### /, '').replace(/\s*\[![^\]]+\]/, '').trim();
            currentSub     = { title, tag: tagMatch ? tagMatch[1].replace(/-/g, ' ') : null, blocks: [], note: null };
            continue;
        }

        // -- #### tool | desc (code block header) -----------------------------
        if (line.startsWith('#### ') && currentSub) {
            flushBlock();
            const parts  = line.replace(/^#### /, '').split(' | ');
            currentBlock = { tool: parts[0].trim(), desc: parts[1] ? parts[1].trim() : null };
            codeLines    = [];
            continue;
        }

        // -- > note -----------------------------------------------------------
        if (line.startsWith('> ') && currentSub) {
            currentSub.note = line.replace(/^> /, '');
            continue;
        }
    }

    flushSection();

    return {
        title:         meta.title    || '',
        subtitle:      meta.subtitle || '',
        sidebarGroups: meta.sidebarGroups,
        sections
    };
}


// -- Load page data and render -------------------------------------------------
// Call this from each page's inline script:
//   loadPage('../data/recon.md')
async function loadPage(dataPath) {
    try {
        const res = await fetch(dataPath);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const data = parseMarkdown(text);
        renderPage(data);
    } catch (err) {
        document.getElementById('sections-container').innerHTML =
            `<p style="color:var(--red);padding:20px;">Failed to load: ${err.message}</p>`;
        console.error(err);
    }
}
