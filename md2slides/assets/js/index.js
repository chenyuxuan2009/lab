(function () {
    const baseWidth = 1280, baseHeight = 720;
    const $ = sel => document.querySelector(sel);

    const dom = {
        body: document.body,
        themeSelect: $('#themeSelect'),
        markdown: $('#markdownInput'),
        preview: $('#preview'),
        stage: $('#stage'),
        currentSlide: $('#currentSlide'),
        indicator: $('#slideIndicator'),
        progressFill: $('#progressFill'),
        deckTitle: $('#deckTitle'),
        prev: $('#prevBtn'),
        next: $('#nextBtn'),
        fullscreenTop: $('#fullscreenTop'),
        stageWrapper: document.querySelector('.stage-wrapper'),
    };

    const SAMPLE = `# Markdown → Slides\nA clean, business-ready deck from plain text.\n\nPresenter: Jane Doe\nCompany: Example Corp\n\n---\n\n## Agenda\n- Why Markdown slides\n- How it works\n- Live demo\n- Tips\n- Q&A\n\n---\n\n## Why Markdown?\n- Focus on content, not formatting\n- Version control friendly\n- Quickly iterate and collaborate\n- Portable: works anywhere with a browser\n\n---\n\n## Formatting essentials\n- Emphasis with **bold** and *italic*\n- Links like [OpenAI](https://openai.com) and images below\n- Inline code: \`npm start\`\n- Code blocks:\n\n\`\`\`js\nfunction hello(name) {\n  console.log('Hello, ' + name + '!');\n}\nhello('world');\n\`\`\`\n\n---\n\n## Visuals\n![Chart](https://dummyimage.com/960x320/4b9cd3/ffffff&text=Business+Chart)\n\n- Add images to support your narrative\n- Keep slides focused and uncluttered\n\n---\n\n## Tips for great slides\n1. One idea per slide\n2. Use readable font sizes\n3. Contrast matters\n4. Keep code snippets small\n\n> Pro tip: Press F for fullscreen, use ← → to navigate.\n\n---\n\n# Thank you\n\nQuestions?\n`;

    //       const SAMPLE = `# 代码块宽度测试

    // ## 短代码
    // \`\`\`javascript
    // const x = 1;
    // const y = 2;
    // \`\`\`

    // ## 超长行代码
    // \`\`\`javascript
    // // 这是一行非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的代码行，应该会被限制在容器内这是一行非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的代码行，应该会被限制在容器内这是一行非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的代码行，应该会被限制在容器内
    // const extremelyLongVariableName = "这是一个非常长的字符串，用来测试代码块的宽度限制和滚动行为，看看它是否会超出容器边界";
    // \`\`\`

    // ---

    // 这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试这是一个测试


    // `;
    // State
    let slides = [];
    let index = 0;

    // Setup theme from preference/localStorage
    const savedTheme = localStorage.getItem('m2s-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const normalizedSaved = (savedTheme === 'corporate') ? null : savedTheme;
    const initialTheme = normalizedSaved || 'light';
    setTheme(initialTheme);
    dom.themeSelect.value = initialTheme;

    // Fill sample by default
    dom.markdown.value = SAMPLE;

    // Render initial
    compileAndRender();
    layoutStage();

    // Event listeners
    window.addEventListener('resize', layoutStage);
    document.addEventListener('fullscreenchange', layoutStage);

    dom.themeSelect.addEventListener('change', (e) => setTheme(e.target.value));
    $('#loadSample').addEventListener('click', () => { dom.markdown.value = SAMPLE; compileAndRender(true); });
    dom.fullscreenTop.addEventListener('click', toggleFullscreen);

    dom.prev.addEventListener('click', prevSlide);
    dom.next.addEventListener('click', nextSlide);

    // 仅在舞台区域悬停时显示左右按钮
    if (dom.stageWrapper) {
        dom.stageWrapper.addEventListener('mouseenter', () => dom.preview.classList.add('nav-visible'));
    }
    dom.preview.addEventListener('mouseleave', () => dom.preview.classList.remove('nav-visible'));

    // dom.preview.addEventListener('dblclick', toggleFullscreen);
    // dom.preview.addEventListener('keydown', handleKey);
    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'input') return; // ignore while typing
        handleKey(e);
    });

    // Debounced input handler
    let timer = null;
    dom.markdown.addEventListener('input', () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => compileAndRender(), 180);
    });

    // 在 setTheme 函数中添加代码高亮主题切换
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('m2s-theme', theme);

        // 切换代码高亮主题
        const highlightLight = document.getElementById('highlightLightTheme');
        const highlightDark = document.getElementById('highlightDarkTheme');

        if (theme === 'dark') {
            if (highlightLight) highlightLight.disabled = true;
            if (highlightDark) highlightDark.disabled = false;
        } else {
            if (highlightLight) highlightLight.disabled = false;
            if (highlightDark) highlightDark.disabled = true;
        }
    }

    function handleKey(e) {
        const key = e.key;
        if (key === 'ArrowRight' || key === 'PageDown' || key === ' ') { e.preventDefault(); nextSlide(); }
        else if (key === 'ArrowLeft' || key === 'PageUp') { e.preventDefault(); prevSlide(); }
        else if (key === 'Home') { e.preventDefault(); gotoSlide(0); }
        else if (key === 'End') { e.preventDefault(); gotoSlide(slides.length - 1); }
        else if (key === 'f' || key === 'F') { e.preventDefault(); toggleFullscreen(); }
    }

    function toggleFullscreen() {
        const el = dom.preview;
        if (!document.fullscreenElement) {
            el.requestFullscreen && el.requestFullscreen();
        } else {
            document.exitFullscreen && document.exitFullscreen();
        }
    }

    function layoutStage() {
        const wrap = dom.preview.querySelector('.stage-wrapper');
        const rect = wrap.getBoundingClientRect();
        const scale = Math.min(rect.width / baseWidth, rect.height / baseHeight);
        dom.stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }

    function prevSlide() { gotoSlide(index - 1); }
    function nextSlide() { gotoSlide(index + 1); }
    function gotoSlide(i) {
        if (!slides.length) return;
        index = Math.max(0, Math.min(slides.length - 1, i));
        dom.currentSlide.innerHTML = slides[index] || '';
        // renderKaTeX();

        // 延迟一点渲染 LaTeX 和代码高亮
        setTimeout(() => {
            renderKaTeX();
        }, 5);

        updateHud();
    }

    function updateHud() {
        dom.indicator.textContent = `Slide ${slides.length ? index + 1 : 0} of ${slides.length}`;
        const pct = slides.length ? ((index + 1) / slides.length) * 100 : 0;
        dom.progressFill.style.width = pct.toFixed(2) + '%';
        // Update deck title from first H1, if present
        const tmp = document.createElement('div');
        tmp.innerHTML = slides[0] || '';
        const h1 = tmp.querySelector('h1');
        dom.deckTitle.textContent = h1 ? h1.textContent : 'Presentation';
    }

    function compileAndRender(forceFirst = false) {
        const text = dom.markdown.value ?? '';
        const parts = splitSlides(text);
        slides = parts.map(s => mdToHtml(s.trim()));
        if (forceFirst) index = 0;
        if (index >= slides.length) index = Math.max(0, slides.length - 1);
        gotoSlide(index);
    }
    // 新增 renderKaTeX 函数
    // 修改 renderKaTeX 函数，处理块引用中的数学公式
    function renderKaTeX() {
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(dom.currentSlide, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false,
                errorColor: '#ff5252'
            });
        }

        // 渲染代码高亮
        if (typeof hljs !== 'undefined') {
            dom.currentSlide.querySelectorAll('pre.code code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
    }

    function splitSlides(text) {
        const lines = (text || '').replace(/\r/g, '').split('\n');
        const out = [];
        let buf = [];
        let inCode = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/^```/.test(line.trim())) inCode = !inCode;
            if (!inCode && line.trim() === '---') {
                out.push(buf.join('\n'));
                buf = [];
            } else {
                buf.push(line);
            }
        }
        out.push(buf.join('\n'));
        return out;
    }

    // Basic Markdown to HTML (safe, minimal, business-friendly)
    // 修改 mdToHtml 函数中的代码块处理部分
    function mdToHtml(md) {
        if (!md.trim()) return '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:18px;">(Empty slide)</div>';

        let text = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // 1. 先提取 LaTeX 公式块（$$...$$ 和 \[...\]）
        const latexBlocks = [];
        text = text.replace(/\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$/g, (match) => {
            const i = latexBlocks.length;
            latexBlocks.push(match);
            return `\uE001LATEXBLOCK${i}\uE001`;
        });

        // 2. 提取 fenced code blocks
        const codeBlocks = [];
        text = text.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (m, lang, code) => {
            const i = codeBlocks.length;
            const langClass = lang ? ` class="language-${escapeHtmlAttr(lang)}"` : '';
            codeBlocks.push(`<pre class="code"><code${langClass}>${escapeHtml(code)}</code></pre>`);
            return `\uE000CODEBLOCK${i}\uE000`;
        });
        // 3. 处理提示块（> [!NOTE] 这类）
        let admonitions = [];
        ({ text, admonitions } = transformAdmonitions(text));

        // 4. 块级转换
        text = blockify(text);

        // 5. 内联转换
        text = inlineify(text);

        // 6. 恢复代码块
        text = text.replace(/\uE000CODEBLOCK(\d+)\uE000/g, (_, i) => codeBlocks[Number(i)] || '');

        // 7. 恢复 LaTeX 公式块 - 关键修改：确保每个公式被适当包裹
        text = text.replace(/\uE001LATEXBLOCK(\d+)\uE001/g, (_, i) => {
            const latex = latexBlocks[Number(i)];
            if (!latex) return '';

            // 对于 $$...$$ 格式的公式，确保它们被包裹在适当的元素中
            if (latex.startsWith('$$') && latex.endsWith('$$')) {
                const content = latex.slice(2, -2).trim();
                // 将连续的 $$ 公式分割成独立的公式
                const formulas = content.split(/\$\$/).filter(f => f.trim());

                if (formulas.length > 1) {
                    // 多个公式，每个单独渲染
                    return formulas.map(formula =>
                        `<div class="katex-display-wrapper">$$${formula}$$</div>`
                    ).join('\n');
                } else {
                    // 单个公式
                    return `<div class="katex-display-wrapper">${latex}</div>`;
                }
            }

            // 对于 \[...\] 格式，保持原样
            return latex;
        });
        // 8. 恢复提示块
        text = text.replace(/\uE003ADMON(\d+)\uE003/g, (_, i) => admonitions[Number(i)] || '');

        return text;
    }

    function blockify(src) {
        const lines = src.split('\n');
        let out = '';
        let inUl = false, inOl = false, bqDepth = 0, para = '';

        const flushPara = () => {
            if (para.trim()) out += `<p>${inlineify(para.trim())}</p>`;
            para = '';
        };
        const closeLists = () => {
            if (inUl) { out += '</ul>'; inUl = false; }
            if (inOl) { out += '</ol>'; inOl = false; }
        };
        const closeQuote = () => {
            while (bqDepth > 0) {
                out += '</blockquote>';
                bqDepth--;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            const line = raw; // already escaped
            // 跳过 LaTeX 公式块占位符的处理
            if (line.includes('\uE001LATEXBLOCK')) {
                if (para) flushPara();
                closeLists();
                closeQuote();
                out += line + '\n';
                continue;
            }
            if (!line.trim()) { // blank line
                flushPara();
                closeLists();
                closeQuote();
                continue;
            }

            // Headings
            const h = /^(#{1,6})\s+(.*)$/.exec(line);
            if (h) {
                flushPara(); closeLists(); closeQuote();
                const level = h[1].length;
                out += `<h${level}>${inlineify(h[2].trim())}</h${level}>`;
                continue;
            }

            // Tables (GitHub style): header | header\n| --- |\nrows...
            if (looksLikeTable(lines, i)) {
                flushPara(); closeLists(); closeQuote();
                const { tableHtml, nextIndex } = parseTable(lines, i);
                out += tableHtml;
                i = nextIndex;
                continue;
            }

            // Blockquote (nested) - 支持原始 > 与转义 &gt;，允许中间空格
            const bq = /^((?:(?:>|\&gt;)\s*)+)(.*)$/.exec(line);
            if (bq) {
                flushPara(); closeLists();
                const markers = bq[1].match(/(?:>|&gt;)/g);
                const level = markers ? markers.length : 0;
                // open to target level
                while (bqDepth < level) { out += '<blockquote>'; bqDepth++; }
                // close if we stepped back
                while (bqDepth > level) { out += '</blockquote>'; bqDepth--; }
                out += `<p>${inlineify(bq[2].trim())}</p>`;
                continue;
            }

            // Unordered list
            const ul = /^\s*[-+*]\s+(.*)$/.exec(line);
            if (ul) {
                flushPara(); closeQuote();
                if (!inUl) { out += '<ul>'; inUl = true; }
                out += `<li>${inlineify(ul[1])}</li>`;
                continue;
            }

            // Ordered list
            const ol = /^\s*\d+[\.)]\s+(.*)$/.exec(line);
            if (ol) {
                flushPara(); closeQuote();
                if (!inOl) { out += '<ol>'; inOl = true; }
                out += `<li>${inlineify(ol[1])}</li>`;
                continue;
            }

            // Default: paragraph continuation
            para += (para ? ' ' : '') + line.trim();
        }

        flushPara();
        closeLists();
        closeQuote();
        return out;
    }

    function looksLikeTable(lines, idx) {
        if (idx + 1 >= lines.length) return false;
        const header = lines[idx].trim();
        const sep = lines[idx + 1].trim();
        if (!header.includes('|') || !sep.includes('|')) return false;
        const sepParts = sep.replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
        if (!sepParts.length) return false;
        // all separator cells should look like --- or :--- or ---:
        const sepOk = sepParts.every(cell => /^:?-{2,}:?$/.test(cell));
        return sepOk;
    }

    function parseTable(lines, start) {
        const headerLine = lines[start].trim();
        const alignLine = lines[start + 1].trim();
        const bodyLines = [];
        let i = start + 2;
        while (i < lines.length && /\|/.test(lines[i])) {
            bodyLines.push(lines[i].trim());
            i++;
        }
        const headers = splitTableRow(headerLine);
        const aligns = splitTableRow(alignLine).map(parseAlign);
        const rows = bodyLines.map(splitTableRow);

        const thead = `<thead><tr>${headers.map((h, idx) => `<th${alignAttr(aligns[idx])}>${inlineify(h)}</th>`).join('')}</tr></thead>`;
        const tbody = `<tbody>${rows.map(r => `<tr>${r.map((c, idx) => `<td${alignAttr(aligns[idx])}>${inlineify(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
        return { tableHtml: `<table class="md-table">${thead}${tbody}</table>`, nextIndex: i - 1 };
    }

    function splitTableRow(line) {
        const trimmed = line.replace(/^\|/, '').replace(/\|$/, '');
        return trimmed.split('|').map(s => s.trim());
    }
    function parseAlign(cell) {
        if (/^:-+:$/.test(cell)) return 'center';
        if (/^:-+$/.test(cell)) return 'left';
        if (/^-+:$/.test(cell)) return 'right';
        return null;
    }
    function alignAttr(align) {
        return align ? ` align="${align}"` : '';
    }

    // 将 > [!TYPE] ... 转换为提示块占位符
    function transformAdmonitions(src) {
        const lines = src.split('\n');
        const out = [];
        const stores = [];
        const valid = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];

        for (let i = 0; i < lines.length; i++) {
            const m = /^&gt;\s*\[!(\w+)\]\s*(.*)$/.exec(lines[i]);
            if (!m) {
                out.push(lines[i]);
                continue;
            }
            const type = m[1].toUpperCase();
            if (!valid.includes(type)) {
                out.push(lines[i]);
                continue;
            }
            const firstLine = m[2] || '';
            const body = [];
            if (firstLine) body.push(firstLine);
            let j = i + 1;
            while (j < lines.length) {
                const n = /^&gt;\s?(.*)$/.exec(lines[j]);
                if (!n) break;
                body.push(n[1]);
                j++;
            }
            i = j - 1;
            const inner = blockify(body.join('\n'));
            stores.push(
                `<div class="admonition ${type.toLowerCase()}">` +
                `<p class="admonition-title">${escapeHtmlAttr(type)}</p>` +
                `<div class="admonition-content">${inner}</div>` +
                `</div>`
            );
            out.push(`\uE003ADMON${stores.length - 1}\uE003`);
        }

        return { text: out.join('\n'), admonitions: stores };
    }

    function inlineify(str) {
        const mathSpans = [];
        let s = str.replace(/\$(.+?)\$/g, (m, math) => {
            const i = mathSpans.length;
            mathSpans.push(math);
            return `\uE002MATH${i}\uE002`;
        });
        // Images ![alt](src "title")
        s = s.replace(/!\[([^\]]*)\]\(([^\s\)]+)(?:\s+"([^"]+)")?\)/g, (m, alt, src, title) => {
            const safeSrc = sanitizeUrlForImg(unescapeMdLink(src));
            const safeAlt = escapeHtmlAttr(alt);
            const safeTitle = title ? ` title="${escapeHtmlAttr(title)}"` : '';
            if (!safeSrc) return alt ? `<em>${safeAlt}</em>` : '';
            return `<img alt="${safeAlt}" src="${safeSrc}"${safeTitle} />`;
        });

        // Links [text](href "title")
        s = s.replace(/\[([^\]]+)\]\(([^\s\)]+)(?:\s+"([^"]+)")?\)/g, (m, txt, href, title) => {
            const safeHref = sanitizeUrl(unescapeMdLink(href));
            const safeTxt = escapeHtmlAttr(txt);
            const safeTitle = title ? ` title="${escapeHtmlAttr(title)}"` : '';
            if (!safeHref) return safeTxt;
            return `<a href="${safeHref}" target="_blank" rel="noopener"${safeTitle}>${safeTxt}</a>`;
        });

        // Bold **text** or __text__
        s = s.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>');
        // Italic *text* or _text_
        s = s.replace(/(\*|_)([^*_]+?)\1/g, '<em>$2</em>');

        s = s.replace(/`([^`]+?)`/g, (m, code) => `<code>${escapeHtml(code)}</code>`);

        // 恢复行内公式占位符
        s = s.replace(/\uE002MATH(\d+)\uE002/g, (_, i) => `$${mathSpans[Number(i)]}$`);

        return s;
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function escapeHtmlAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function sanitizeUrl(u) {
        try {
            if (!u) return '';
            // allow anchors and relative paths
            if (u.startsWith('#') || u.startsWith('/') || u.startsWith('./') || u.startsWith('../')) return u;
            const url = new URL(u, window.location.origin);
            return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : '';
        } catch { return ''; }
    }
    function sanitizeUrlForImg(u) {
        try {
            if (!u) return '';
            if (u.startsWith('/') || u.startsWith('./') || u.startsWith('../')) return u;
            if (u.startsWith('data:image/')) return u;
            const url = new URL(u, window.location.origin);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        } catch { return ''; }
    }
    function unescapeMdLink(s) {
        return s.replace(/\((?=.*\))/g, '%28').replace(/\)/g, '%29');
    }
    document.getElementById('exportPdf').addEventListener('click', async () => {
        compileAndRender();

        const { jsPDF } = window.jspdf;

        const LEFT_MARGIN = 56;
        const RIGHT_MARGIN = 56;
        const TOP_MARGIN = 48;
        const BOTTOM_MARGIN = 48;

        const STAGE_W = 1280;
        const STAGE_H = 720;

        const PDF_W = STAGE_W + LEFT_MARGIN + RIGHT_MARGIN; // 1392
        const PDF_H = STAGE_H + TOP_MARGIN + BOTTOM_MARGIN; // 816

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [PDF_W, PDF_H]
        });

        const realStage = document.getElementById("stage");
        const originalHTML = realStage.querySelector("#currentSlide").innerHTML;

        for (let i = 0; i < slides.length; i++) {
            // 只替换 currentSlide 内容，不破坏 stage 本体
            realStage.querySelector("#currentSlide").innerHTML = slides[i];
            // 渲染公式与代码高亮后再截图
            renderKaTeX();
            await new Promise(r => setTimeout(r, 120));

            // 克隆整个 stage（包含其 class 与样式）
            const cloneStage = realStage.cloneNode(true);

            // 移除 translate 等影响位置的 transform，但保留其他样式 (如果你确实想保留 scale 可改这里)
            // 你可以把 "none" 改为保留 scale 的方式，这里保持之前你确定好的行为
            cloneStage.style.transform = "none";
            cloneStage.style.left = "0";
            cloneStage.style.top = "0";
            cloneStage.style.position = "relative";
            cloneStage.style.width = STAGE_W + "px";
            cloneStage.style.height = STAGE_H + "px";

            // 创建容器（包含精确留白）
            const container = document.createElement("div");
            container.style.position = "fixed";
            container.style.left = "-99999px";
            container.style.top = "0";
            container.style.width = PDF_W + "px";
            container.style.height = PDF_H + "px";
            container.style.background = "white";
            container.style.overflow = "hidden";
            container.style.padding = `${TOP_MARGIN}px ${RIGHT_MARGIN}px ${BOTTOM_MARGIN}px ${LEFT_MARGIN}px`;

            container.appendChild(cloneStage);
            document.body.appendChild(container);

            // 截图（高清）
            const canvas = await html2canvas(container, {
                useCORS: true,
                backgroundColor: "#fff",
                scale: 3
            });

            // 把图片插入 PDF（缩放到 PDF 尺寸）
            const imgData = canvas.toDataURL("image/jpeg", 0.98);
            if (i > 0) pdf.addPage([PDF_W, PDF_H], "landscape");
            pdf.addImage(imgData, "JPEG", 0, 0, PDF_W, PDF_H);

            // ====== 在 PDF 上添加可点链接 ======
            // 计算 container 在页面上的 clientRect（克隆在页面上，所以有真实的 rect）
            const containerRect = container.getBoundingClientRect();
            // 获取所有链接（相对于 cloneStage 的链接）
            const anchors = cloneStage.querySelectorAll('a[href]');
            anchors.forEach(a => {
                try {
                    const href = a.getAttribute('href');
                    if (!href) return;
                    // 跳过 javascript: 或 空锚
                    if (/^\s*(javascript:|#)/i.test(href)) return;

                    const rect = a.getBoundingClientRect();

                    // 计算相对于 container 的位置（CSS 像素）
                    const relLeft = rect.left - containerRect.left;
                    const relTop = rect.top - containerRect.top;
                    const relW = rect.width;
                    const relH = rect.height;

                    // 将 CSS 像素映射到 PDF 像素（因为我们把 canvas 渲染为 PDF_W x PDF_H）
                    const pdfX = (relLeft / containerRect.width) * PDF_W;
                    const pdfY = (relTop / containerRect.height) * PDF_H;
                    const pdfW = (relW / containerRect.width) * PDF_W;
                    const pdfH = (relH / containerRect.height) * PDF_H;

                    // jsPDF 的链接 API：link(x, y, w, h, { url: '...' })
                    pdf.link(pdfX, pdfY, pdfW, pdfH, { url: href });
                } catch (e) {
                    // 单个链接解析失败不影响整体
                    console.warn('add link failed', e);
                }
            });
            // ====== end add links ======

            container.remove();
        }

        // 恢复原始当前幻灯片内容
        realStage.querySelector("#currentSlide").innerHTML = originalHTML;

        // 触发下载
        pdf.save("slides.pdf");
        compileAndRender()
    });



})();
