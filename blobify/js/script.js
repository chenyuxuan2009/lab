import { parseGIF, decompressFrames } from 'https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/+esm';

// UI Elements: Avatar setup
const avatarUpload = document.getElementById('avatarUpload');
const qqInput = document.getElementById('qqInput');
const fetchQqBtn = document.getElementById('fetchQqBtn');
const placeholderText = document.getElementById('placeholderText');

// UI Elements: Modal & Generation
const resultModal = document.getElementById('resultModal');
const modalStatusText = document.getElementById('modalStatusText');
const resultImg = document.getElementById('resultImg');
const downloadBtn = document.getElementById('downloadBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const projectCards = document.querySelectorAll('.project-card[data-gif]');
const tabs = document.querySelectorAll('.tab[data-tab]');
const qqPanel = document.getElementById('qqPanel');
const uploadPanel = document.getElementById('uploadPanel');
const uploadBox = document.getElementById('uploadBox');

let userAvatar = null;

const defaultAvatarPreview = document.getElementById('userAvatarPreview');
const defaultAvatarIcon = document.getElementById('defaultAvatarIcon');

function syncPreviewAvatar(img) {
    userAvatar = img;
    if (defaultAvatarIcon) defaultAvatarIcon.style.display = 'none';
    if (defaultAvatarPreview) {
        defaultAvatarPreview.src = img.src;
        defaultAvatarPreview.style.display = 'block';
    }
}

if (defaultAvatarPreview) {
    const applyDefaultAvatar = () => syncPreviewAvatar(defaultAvatarPreview);
    if (defaultAvatarPreview.complete && defaultAvatarPreview.naturalWidth > 0) {
        applyDefaultAvatar();
    } else {
        defaultAvatarPreview.addEventListener('load', applyDefaultAvatar, { once: true });
    }
}

tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        tabs.forEach((item) => item.classList.toggle('active', item === tab));
        if (qqPanel && uploadPanel) {
            qqPanel.classList.toggle('active', tabName === 'qq');
            uploadPanel.classList.toggle('active', tabName === 'upload');
        }
    });
});

if (uploadBox && avatarUpload) {
    uploadBox.addEventListener('click', () => avatarUpload.click());
}

// QQ 获取头像
if (fetchQqBtn) {
    fetchQqBtn.addEventListener('click', async () => {
        const qqid = qqInput.value.trim();
        if (!qqid) {
            alert("请输入 QQ 号码!");
            return;
        }

        fetchQqBtn.textContent = "获取中...";
        fetchQqBtn.disabled = true;

        // 使用 wsrv.nl 的 CORS 代理避免 canvas Tainted
        const targetUrl = `https://q.qlogo.cn/headimg_dl?dst_uin=${qqid}&spec=640&img_type=jpg`;
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}`;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            syncPreviewAvatar(img);

            placeholderText.textContent = "头像已就绪，请点击下方表情包生成";
            fetchQqBtn.textContent = "重新获取";
            fetchQqBtn.disabled = false;
        };
        img.onerror = () => {
            alert("获取头像失败，请检查 QQ 号是否正确或网络状况。");
            fetchQqBtn.textContent = "确认并获取头像";
            fetchQqBtn.disabled = false;
        };
        img.src = proxyUrl;
    });
}

// 监听上传
if (avatarUpload) {
    avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                syncPreviewAvatar(img);

                placeholderText.textContent = "头像已就绪，请点击下方表情包生成";
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 模态框关闭
closeModalBtn.addEventListener('click', () => {
    resultModal.style.display = 'none';
});

// 处理各个项目生成点击
projectCards.forEach(card => {
    card.addEventListener('click', async () => {
        if (!userAvatar) {
            alert("请先在上方设置你的头像！");
            return;
        }

        const gifUrl = card.getAttribute('data-gif');
        const configUrl = card.getAttribute('data-config');
        const exportName = card.getAttribute('data-name') || 'avatar_gen';

        if (!gifUrl || !configUrl) {
            alert("该模板配置不完整！");
            return;
        }

        // 开启弹窗并初始化状态
        resultModal.style.display = 'flex';
        resultImg.style.display = 'none';
        downloadBtn.style.display = 'none';

        card.style.pointerEvents = 'none';
        card.style.opacity = '0.7';

        try {
            await generateGif(gifUrl, configUrl, exportName);
        } catch (err) {
            modalStatusText.textContent = "错误: " + err.message;
            modalStatusText.style.color = "red";
        } finally {
            card.style.pointerEvents = 'auto';
            card.style.opacity = '1';
        }
    });
});

async function generateGif(gifUrl, configUrl, exportName) {
    modalStatusText.style.color = "#007BFF";
    modalStatusText.textContent = "1. 正在加载配置...";

    // 加载配置
    const configRes = await fetch(configUrl);
    if (!configRes.ok) throw new Error("无法加载动画配置文件");
    const frameConfig = await configRes.json();
    if (!Array.isArray(frameConfig) || frameConfig.length === 0) {
        throw new Error("动图配置文件格式不正确或为空");
    }

    modalStatusText.textContent = "2. 正在下载并解析原图...";
    const gifRes = await fetch(gifUrl);
    if (!gifRes.ok) throw new Error("无法下载原图 GIF");
    const buffer = await gifRes.arrayBuffer();
    const gif = parseGIF(buffer);
    const frames = decompressFrames(gif, true);

    modalStatusText.textContent = "3. 正在合成中 (这可能需要几秒钟)...";
    const workerStr = await fetch('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js').then(r => r.text());
    const workerBlob = new Blob([workerStr], { type: 'application/javascript' });

    const gifGenerator = new GIF({
        workers: 2,
        quality: 10,
        workerScript: URL.createObjectURL(workerBlob)
    });

    const width = frames[0].dims.width;
    const height = frames[0].dims.height;

    const drawCanvas = document.createElement('canvas');
    const drawCtx = drawCanvas.getContext('2d');
    drawCanvas.width = width;
    drawCanvas.height = height;

    const frameCanvas = document.createElement('canvas');
    const frameCtx = frameCanvas.getContext('2d');
    frameCanvas.width = width;
    frameCanvas.height = height;

    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const config = frameConfig[i] || frameConfig[frameConfig.length - 1] || { x: width / 2, y: height / 2, scale: 1, rotation: 0 };

        if (i > 0 && frames[i - 1].disposalType === 2) {
            const prev = frames[i - 1];
            frameCtx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
        }

        let patchData;
        if (frame.patch) {
            patchData = new Uint8ClampedArray(frame.patch);
        } else if (frame.pixels) {
            patchData = new Uint8ClampedArray(frame.pixels);
        }

        if (patchData) {
            const w = Math.round(frame.dims.width);
            const h = Math.round(frame.dims.height);
            const left = Math.round(frame.dims.left);
            const top = Math.round(frame.dims.top);

            const tCanv = document.createElement('canvas');
            tCanv.width = w; tCanv.height = h;
            tCanv.getContext('2d').putImageData(new ImageData(patchData, w, h), 0, 0);
            frameCtx.drawImage(tCanv, left, top);
        }

        drawCtx.clearRect(0, 0, width, height);
        drawCtx.drawImage(frameCanvas, 0, 0);

        drawCtx.save();
        drawCtx.translate(config.x, config.y);
        drawCtx.rotate(config.rotation * Math.PI / 180);

        const baseAvatarSize = 80;
        const avatarD = baseAvatarSize * config.scale;

        const offX = (config.offsetX || 0) * config.scale;
        const offY = (config.offsetY || 0) * config.scale;

        drawCtx.drawImage(userAvatar, (-avatarD / 2) - offX, (-avatarD / 2) - offY, avatarD, avatarD);
        drawCtx.restore();

        gifGenerator.addFrame(drawCanvas, { copy: true, delay: frame.delay });
    }

    return new Promise((resolve, reject) => {
        gifGenerator.on('finished', function (blob) {
            const url = URL.createObjectURL(blob);
            resultImg.src = url;
            resultImg.style.display = 'block';

            modalStatusText.style.color = "#28a745";
            modalStatusText.textContent = "生成完毕！";

            downloadBtn.style.display = 'block';
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = url;
                a.download = exportName + '.gif';
                a.click();
            };
            resolve();
        });

        try {
            gifGenerator.render();
        } catch (e) {
            reject(e);
        }
    });
}

