import { parseGIF, decompressFrames } from 'https://testingcf.jsdelivr.net/npm/gifuct-js@2.1.2/+esm';

export async function generateGif(gifUrl, configUrl, exportName, getUserAvatar) {
    const resultModal = document.getElementById('resultModal');
    const modalStatusText = document.getElementById('modalStatusText');
    const resultImg = document.getElementById('resultImg');
    const downloadBtn = document.getElementById('downloadBtn');

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
    const workerStr = await fetch('https://testingcf.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js').then(r => r.text());
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

    const userAvatar = getUserAvatar();
    if (!userAvatar) throw new Error('未设置头像');

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

export function initProjectCards(getUserAvatar) {
    const projectCards = document.querySelectorAll('.project-card[data-gif]');
    const resultModal = document.getElementById('resultModal');
    const resultImg = document.getElementById('resultImg');
    const downloadBtn = document.getElementById('downloadBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalStatusText = document.getElementById('modalStatusText');

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            resultModal.style.display = 'none';
        });
    }

    projectCards.forEach(card => {
        card.addEventListener('click', async () => {
            if (!getUserAvatar()) {
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

            // show modal
            resultModal.style.display = 'flex';
            resultImg.style.display = 'none';
            downloadBtn.style.display = 'none';

            card.style.pointerEvents = 'none';
            card.style.opacity = '0.7';

            try {
                await generateGif(gifUrl, configUrl, exportName, getUserAvatar);
            } catch (err) {
                if (modalStatusText) {
                    modalStatusText.textContent = "错误: " + err.message;
                    modalStatusText.style.color = "red";
                }
            } finally {
                card.style.pointerEvents = 'auto';
                card.style.opacity = '1';
            }
        });
    });
}
