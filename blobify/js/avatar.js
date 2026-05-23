// avatar.js — manage avatar selection / preview

let userAvatar = null;

const defaultAvatarPreview = document.getElementById('userAvatarPreview');
const defaultAvatarIcon = document.getElementById('defaultAvatarIcon');
const avatarUpload = document.getElementById('avatarUpload');
const qqInput = document.getElementById('qqInput');
const fetchQqBtn = document.getElementById('fetchQqBtn');
const uploadBox = document.getElementById('uploadBox');
const placeholderText = document.getElementById('placeholderText');

export function getUserAvatar() {
    return userAvatar;
}

export function setUserAvatar(img) {
    userAvatar = img;
    if (defaultAvatarIcon) defaultAvatarIcon.style.display = 'none';
    if (defaultAvatarPreview) {
        defaultAvatarPreview.src = img.src;
        defaultAvatarPreview.style.display = 'block';
    }
}

function syncPreviewAvatar(img) {
    setUserAvatar(img);
}

export function initAvatar() {
    // apply default if present in DOM
    if (defaultAvatarPreview) {
        const applyDefaultAvatar = () => syncPreviewAvatar(defaultAvatarPreview);
        if (defaultAvatarPreview.complete && defaultAvatarPreview.naturalWidth > 0) {
            applyDefaultAvatar();
        } else {
            defaultAvatarPreview.addEventListener('load', applyDefaultAvatar, { once: true });
        }
    }

    // upload box
    if (uploadBox && avatarUpload) {
        uploadBox.addEventListener('click', () => avatarUpload.click());
    }

    if (avatarUpload) {
        avatarUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    syncPreviewAvatar(img);

                    if (placeholderText) placeholderText.textContent = "头像已就绪，请点击下方表情包生成";
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // QQ fetch
    if (fetchQqBtn) {
        fetchQqBtn.addEventListener('click', async () => {
            const qqid = qqInput.value.trim();
            if (!qqid) {
                alert("请输入 QQ 号码!");
                return;
            }

            fetchQqBtn.textContent = "获取中...";
            fetchQqBtn.disabled = true;

            const targetUrl = `https://q.qlogo.cn/headimg_dl?dst_uin=${qqid}&spec=640&img_type=jpg`;
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}`;

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                syncPreviewAvatar(img);

                if (placeholderText) placeholderText.textContent = "头像已就绪，请点击下方表情包生成";
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
}
