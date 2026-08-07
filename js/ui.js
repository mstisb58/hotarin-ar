/**
 * UIおよび画面操作モジュール (UIManager)
 * 設定モーダル, ゲーム/鑑賞画面切り替え, デバッグHUD, 写真撮影, SNSシェア
 */
window.UIManager = {
    experienceMode: 'view',
    screenMode: 'live',
    lastTouchTime: 0,
    resultImageBlob: null,
    resultImageUrl: null,

    /**
     * キャッシュされたDOMエレメント参照
     */
    elements: null,

    /**
     * DOMエレメントの取得およびキャッシュ化
     */
    getElements: function() {
        if (!this.elements) {
            this.elements = {
                headerText: document.querySelector('#header p'),
                resultScreen: document.getElementById('result-screen'),
                resultScore: document.getElementById('result-score'),
                resultMessage: document.getElementById('result-message'),
                scoreDisplay: document.getElementById('score-display'),
                timerDisplay: document.getElementById('timer-display'),
                captureBtn: document.getElementById('capture-btn'),
                modeToggleBtn: document.getElementById('mode-toggle-btn'),
                settingsModal: document.getElementById('settings-modal'),
                testModeCheckbox: document.getElementById('test-mode-checkbox'),
                testShowBoundsCheckbox: document.getElementById('test-show-bounds-checkbox'),
                testSuboptions: document.getElementById('test-suboptions'),
                debugHud: document.getElementById('debug-hud'),
                creditsInfo: document.getElementById('credits-info'),
                gitCommit: document.getElementById('git-commit'),
                gitCommitLink: document.getElementById('git-commit-link'),
                gitVersion: document.getElementById('git-version')
            };
        }
        return this.elements;
    },

    /**
     * 初期化処理
     */
    init: function() {
        this.bindEvents();
        this.fetchGitHubVersion();

        // デバッグHUDの更新タイマー開始 (500ms周期)
        setInterval(() => this.updateDebugHUD(), 500);

        // 初期状態は鑑賞モード
        this.startViewModeUI();
    },

    /**
     * タッチ/クリックイベントのバインド
     */
    bindEvents: function() {
        const handleInteraction = (e) => {
            if (this.experienceMode === 'game' && this.screenMode === 'live') {
                // タッチとクリックの重複発火防止
                if (e.type === 'touchstart') {
                    this.lastTouchTime = Date.now();
                } else if (e.type === 'click' && Date.now() - this.lastTouchTime < 300) {
                    return;
                }

                // UI要素上の操作時は無効化
                if (e.target.closest('#mode-toggle-btn, #capture-btn, #info-btn, #settings-btn, #settings-modal, .share-btn, .result-buttons')) {
                    return;
                }

                // 座標の取得
                let clientX, clientY;
                if (e.touches && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                this.showBugNet(clientX, clientY);
                if (window.GameModule) window.GameModule.handleInteraction(clientX, clientY);
            }
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction, { passive: false });
    },

    /**
     * 鑑賞 ↔ ゲーム モードのトグル切り替え
     */
    toggleMode: function() {
        if (this.experienceMode === 'view') {
            this.startGameModeUI();
        } else {
            this.startViewModeUI();
        }
    },

    /**
     * 鑑賞モードUIの表示切り替え
     */
    startViewModeUI: function() {
        const els = this.getElements();
        this.experienceMode = 'view';
        this.screenMode = 'live';

        if (window.GameModule) window.GameModule.clearTimers();
        if (window.ARCore) window.ARCore.startViewMode();

        els.resultScreen?.classList.add('hidden');
        els.scoreDisplay?.classList.add('hidden');
        els.timerDisplay?.classList.add('hidden');
        els.captureBtn?.classList.remove('hidden');

        if (els.modeToggleBtn) {
            els.modeToggleBtn.classList.remove('hidden');
            els.modeToggleBtn.innerText = 'ゲームモードにする';
        }
    },

    /**
     * ゲームモードUIの表示切り替え
     */
    startGameModeUI: function() {
        const els = this.getElements();
        this.experienceMode = 'game';
        this.screenMode = 'live';

        els.resultScreen?.classList.add('hidden');
        els.captureBtn?.classList.add('hidden');
        els.modeToggleBtn?.classList.add('hidden');
        els.scoreDisplay?.classList.remove('hidden');
        els.timerDisplay?.classList.remove('hidden');

        if (window.GameModule) window.GameModule.startGameMode();
    },

    /**
     * スコア表示の更新
     * @param {number} score
     */
    updateScoreUI: function(score) {
        const els = this.getElements();
        if (els.scoreDisplay) els.scoreDisplay.innerText = `捕まえた数: ${score}`;
    },

    /**
     * タイマー表示の更新
     * @param {number} timeLeft
     */
    updateTimerUI: function(timeLeft) {
        const els = this.getElements();
        if (!els.timerDisplay) return;

        els.timerDisplay.innerText = `残り時間: ${timeLeft}秒`;
        els.timerDisplay.style.background = timeLeft <= 3
            ? 'rgba(255, 0, 0, 1)'
            : 'rgba(255, 100, 100, 0.9)';
    },

    /**
     * リザルト画面の表示
     * @param {number} score
     */
    showResultScreen: function(score) {
        const els = this.getElements();
        if (!els.resultScreen) return;

        if (els.resultScore) els.resultScore.innerText = `${score} 匹捕まえた！`;

        const msgs = window.AppConfig.game.resultMessages;
        let msg = msgs[msgs.length - 1].text;
        for (let i = 0; i < msgs.length; i++) {
            if (score >= msgs[i].min) {
                msg = msgs[i].text;
                break;
            }
        }
        if (els.resultMessage) els.resultMessage.innerText = msg;
        els.resultScreen.classList.remove('hidden');
    },

    /**
     * リザルト共有画像のキャプチャ生成
     * @param {number} score
     */
    captureResultImage: function(score) {
        const scene = document.querySelector('a-scene');
        const video = document.querySelector('video');
        if (!video || !scene || !scene.renderer) return;

        scene.renderer.render(scene.object3D, scene.camera);

        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');

        if (video.videoWidth) {
            const videoRatio = video.videoWidth / video.videoHeight;
            const canvasRatio = canvas.width / canvas.height;
            let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;

            if (videoRatio > canvasRatio) {
                sWidth = video.videoHeight * canvasRatio;
                sx = (video.videoWidth - sWidth) / 2;
            } else {
                sHeight = video.videoWidth / canvasRatio;
                sy = (video.videoHeight - sHeight) / 2;
            }
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(scene.canvas, 0, 0, canvas.width, canvas.height);

        // バナー背景の描画
        const bgHeight = 160;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, canvas.height - bgHeight, canvas.width, bgHeight);

        // スコアテキストの描画
        ctx.fillStyle = '#ff9800';
        const fontSize = Math.min(canvas.width * 0.08, 50);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`ほたりんを ${score}匹 捕まえた！`, canvas.width / 2, canvas.height - 90);

        // ハッシュタグの描画
        const hashSize = Math.min(canvas.width * 0.04, 24);
        ctx.font = `bold ${hashSize}px sans-serif`;
        ctx.fillStyle = '#333333';
        ctx.fillText(window.AppConfig.game.hashtags, canvas.width / 2, canvas.height - 35);

        canvas.toBlob((blob) => {
            if (!blob) return;
            this.resultImageBlob = blob;
            if (this.resultImageUrl) URL.revokeObjectURL(this.resultImageUrl);
            this.resultImageUrl = URL.createObjectURL(blob);
        }, 'image/jpeg', 0.9);
    },

    /**
     * Web Share API または ダウンロードによるSNSシェア
     */
    shareTo: function() {
        const score = window.GameModule ? window.GameModule.score : 0;
        const hashtags = window.AppConfig.game.hashtags;
        const text = `ARでほたりんを ${score}匹 捕まえたよ！\n${hashtags}`;
        const url = window.location.href;

        if (navigator.canShare && this.resultImageBlob) {
            const file = new File([this.resultImageBlob], `hotarin_result_${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({
                    title: 'ほたりん虫取りゲーム',
                    text: text,
                    url: url,
                    files: [file]
                }).catch(console.error);
                return;
            }
        }

        if (this.resultImageUrl) {
            const link = document.createElement('a');
            link.download = `hotarin_result_${Date.now()}.jpg`;
            link.href = this.resultImageUrl;
            link.click();
            alert('結果画像をダウンロードしました。\nお好きなSNSを開いて、画像を添付して投稿してください！\n\n【おすすめハッシュタグ】\n' + hashtags);
        }
    },

    /**
     * 虫取り網のタップアニメーションエフェクト
     * @param {number} x
     * @param {number} y
     */
    showBugNet: function(x, y) {
        const net = document.createElement('div');
        net.innerText = '🕸️';
        net.className = 'bug-net-effect';
        net.style.left = `${x - 25}px`;
        net.style.top = `${y - 25}px`;
        document.body.appendChild(net);

        setTimeout(() => net.classList.add('active'), 10);
        setTimeout(() => net.classList.add('fade'), 300);
        setTimeout(() => net.remove(), 600);
    },

    /**
     * 写真撮影 (ARスクショ保存)
     */
    takePhoto: function() {
        const scene = document.querySelector('a-scene');
        const video = document.querySelector('video');
        if (!video || !scene || !scene.renderer) return;

        scene.renderer.render(scene.object3D, scene.camera);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(scene.canvas, 0, 0, canvas.width, canvas.height);

        const link = document.createElement('a');
        link.download = `ar-capture-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    },

    /**
     * 設定モーダルの開閉トグル
     */
    toggleSettingsModal: function() {
        const els = this.getElements();
        if (!els.settingsModal) return;

        els.settingsModal.classList.toggle('hidden');
        if (!els.settingsModal.classList.contains('hidden')) {
            this.renderTestSettings();
        }
    },

    /**
     * 設定モーダル内UI値の更新
     */
    renderTestSettings: function() {
        const els = this.getElements();
        if (els.testModeCheckbox) els.testModeCheckbox.checked = window.AppMode.isTest();
        if (els.testShowBoundsCheckbox) els.testShowBoundsCheckbox.checked = window.TestShowBounds;
        if (els.testSuboptions) {
            els.testSuboptions.classList.toggle('hidden', !window.AppMode.isTest());
        }
    },

    /**
     * テストモード設定変更
     * @param {boolean} checked
     */
    setTestMode: function(checked) {
        localStorage.setItem('testMode', String(checked));
        this.handleTestModeChange(checked);
        this.renderTestSettings();
    },

    /**
     * 境界線表示設定変更
     * @param {boolean} checked
     */
    setTestShowBounds: function(checked) {
        localStorage.setItem('testShowBounds', String(checked));
        this.handleTestShowBoundsChange(checked);
    },

    /**
     * @param {boolean} checked
     */
    handleTestModeChange: function(checked) {
        window.TestMode = checked;
        this.applyDebugBoxState();

        if (window.AppMode.isOutdoor()) {
            alert('GPSの基準点を再設定するため、ページをリロードします。');
            window.location.reload();
        } else {
            this.refreshExperienceForTestSettings();
        }
    },

    /**
     * @param {boolean} checked
     */
    handleTestShowBoundsChange: function(checked) {
        window.TestShowBounds = checked;
        this.applyDebugBoxState();
    },

    /**
     * テスト設定変更時の画面再ロード
     */
    refreshExperienceForTestSettings: function() {
        if (!window.ARCore || window.AppMode.isOutdoor()) return;

        if (this.screenMode === 'result') {
            window.ARCore.applyEnvironmentState();
        } else if (this.experienceMode === 'game' && window.GameModule) {
            window.GameModule.startGameMode();
        } else if (this.experienceMode === 'view') {
            window.ARCore.startViewMode();
        } else {
            window.ARCore.applyEnvironmentState();
        }
    },

    /**
     * 3Dデバッグボックス表示状態の反映
     */
    applyDebugBoxState: function() {
        const show = window.AppMode.isTest() && window.TestShowBounds !== false;
        const scene = document.querySelector('a-scene');
        if (scene) {
            const components = ['hotarin-logic', 'hotarin2-logic'];
            components.forEach((comp) => {
                const entities = scene.querySelectorAll(`[${comp}]`);
                entities.forEach((el) => {
                    el.setAttribute(comp, 'showDebugBox', show);
                });
            });
        }
    },

    /**
     * リアルタイム デバッグ・サイズ表示HUDの描画更新
     */
    updateDebugHUD: function() {
        const els = this.getElements();
        if (!els.debugHud) return;

        const showHUD = window.AppMode.isTest() && window.TestShowBounds !== false;
        if (!showHUD) {
            els.debugHud.classList.add('hidden');
            return;
        }

        els.debugHud.classList.remove('hidden');
        const modeStr = window.AppMode.isOutdoor() ? 'GPS Outdoor Mode' : 'Diorama AR Mode';
        const recognitionState = window.ARCore ? window.ARCore.getRecognitionState() : 'none';
        const recognitionLabels = {
            gps: 'GPS Coordinate Base',
            virtual: 'Virtual NFT Recognized',
            physical: 'Physical NFT Recognized',
            none: 'Searching NFT'
        };

        const characterId = this.experienceMode === 'game'
            ? window.AppConfig.game.catchTarget
            : window.AppConfig.core.viewModeTargets[0].id;
        const character = window.AppConfig.characters[characterId];
        const targetWidth = window.AppConfig.diorama.targetWidthMeters;
        const rangeWidth = (character.dioramaWidth * targetWidth).toFixed(2);
        const rangeDepth = (character.dioramaDepth * targetWidth).toFixed(2);
        const minHeight = (character.minHeight * targetWidth).toFixed(3);
        const maxHeight = (character.maxHeight * targetWidth).toFixed(3);

        els.debugHud.innerHTML = `
            <h4>📐 Debug & Size Info</h4>
            <div><b>Mode:</b> ${modeStr}</div>
            <div><b>Target State:</b> ${recognitionLabels[recognitionState]}</div>
            <div><b>NFT Width:</b> ${targetWidth.toFixed(2)}m</div>
            <div style="margin-top:4px;"><b>Flight Range:</b> ${rangeWidth}m × ${rangeDepth}m</div>
            <div><b>Height:</b> ${minHeight}m – ${maxHeight}m</div>
            <div><b>Model Scale:</b> ${character.modelScale} × NFT basis</div>
        `;
    },

    /**
     * GitHubコミット情報の非同期取得
     */
    fetchGitHubVersion: async function() {
        const els = this.getElements();
        try {
            let res = await fetch('https://api.github.com/repos/mstisb58/hotarin-ar/commits/master', { cache: 'no-cache' });
            if (!res.ok) {
                res = await fetch('https://api.github.com/repos/mstisb58/hotarin-ar/commits/HEAD', { cache: 'no-cache' });
            }
            if (!res.ok) throw new Error('API fetch error');

            const data = await res.json();
            const commitSha = data.sha ? data.sha.substring(0, 7) : '9fb0a8a';

            if (els.gitCommit) els.gitCommit.innerText = commitSha;
            if (els.gitCommitLink) els.gitCommitLink.href = `https://github.com/mstisb58/hotarin-ar/commit/${data.sha}`;
            if (els.gitVersion && window.AppConfig) els.gitVersion.innerText = window.AppConfig.version;
        } catch (e) {
            console.warn('Could not fetch latest commit from GitHub API, using fallback:', e);
            if (els.gitCommit && window.AppConfig) els.gitCommit.innerText = window.AppConfig.commitHash;
            if (els.gitVersion && window.AppConfig) els.gitVersion.innerText = window.AppConfig.version;
        }
    }
};

// HTMLのイベント属性用グローバル関数バインド
window.toggleMode = () => { window.UIManager.toggleMode(); };
window.startViewMode = () => { window.UIManager.startViewModeUI(); };
window.startGameMode = () => { window.UIManager.startGameModeUI(); };
window.shareTo = () => { window.UIManager.shareTo(); };
window.takePhoto = () => { window.UIManager.takePhoto(); };
window.toggleCredits = () => {
    const els = window.UIManager.getElements();
    if (els.creditsInfo) els.creditsInfo.classList.toggle('hidden');
};
window.toggleSettingsModal = () => { window.UIManager.toggleSettingsModal(); };
window.onTestModeChange = (checked) => { window.UIManager.setTestMode(checked); };
window.onTestShowBoundsChange = (checked) => { window.UIManager.setTestShowBounds(checked); };
