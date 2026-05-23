import { initAvatar, getUserAvatar } from './avatar.js';
import { initProjectCards } from './generator.js';

// initialize UI pieces
initAvatar();

// pass a getter that returns current avatar
initProjectCards(getUserAvatar);

// tabs 切换逻辑（恢复原有行为）
const tabs = document.querySelectorAll('.tab[data-tab]');
const qqPanel = document.getElementById('qqPanel');
const uploadPanel = document.getElementById('uploadPanel');
if (tabs && tabs.length) {
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
}
