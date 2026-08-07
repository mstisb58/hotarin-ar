/**
 * ARライブラリ、カメラ、A-Frameシーンの初期化・ライフサイクル管理 (AppBootstrap)
 */
window.AppBootstrap = {
    /** @type {MediaStream | null} */
    activeCameraStream: null,

    /**
     * アプリ起動メイン処理
     */
    init: async function() {
        this.restoreSettings();
        this.installSharedCamera();

        const requestedMode = new URLSearchParams(window.location.search).get('mode');
        window.AR_MODE = (requestedMode === 'surround' || requestedMode === 'gps') ? 'surround' : 'diorama';
        this.updateSpaceSwitchButton();

        try {
            await this.loadARLibrary();
            await this.startSharedCamera();

            const scene = this.createScene();
            const container = document.getElementById('scene-container');
            if (container) container.appendChild(scene);

            window.dispatchEvent(new CustomEvent('ARSceneReady'));
        } catch (error) {
            console.error('ARシーンの起動に失敗しました。', error);
            const headerText = document.querySelector('#header p');
            if (headerText) headerText.innerText = 'ARの起動に失敗しました';
        }
    },

    /**
     * ローカルストレージからの設定復元
     */
    restoreSettings: function() {
        // テストモードは基本的にデフォルトOFF（実装モード）だが、
        // URLパラメータに ?test=1 がある場合はUIからのリロードとみなしてONにする
        const urlParams = new URLSearchParams(window.location.search);
        window.TestMode = urlParams.has('test') && urlParams.get('test') === '1';
        
        // UI(設定画面)のトグル状態復元のために localStorage も合わせて更新しておく
        localStorage.setItem('testMode', window.TestMode ? 'true' : 'false');

        window.TestShowBounds = this.readBooleanSetting(
            'testShowBounds',
            window.AppConfig.testModeDefaults.showBounds
        );
    },

    /**
     * @param {string} key
     * @param {boolean} defaultValue
     * @returns {boolean}
     */
    readBooleanSetting: function(key, defaultValue) {
        const storedValue = localStorage.getItem(key);
        return storedValue === null ? defaultValue : storedValue === 'true';
    },

    /**
     * カメラストリームを統一して再利用可能にするラッパーのインストール
     */
    installSharedCamera: function() {
        if (!navigator.mediaDevices?.getUserMedia) return;

        // 実装モード（本番）の場合は、一切カメラストリームへ介入しない（MindARのネイティブ処理に完全に任せる）
        const isTest = window.AppMode && window.AppMode.isTest();
        if (!isTest) return;

        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (requestedConstraints) => {
            // すでにストリームが生成済みの場合はクローンを返す
            const activeTrack = this.activeCameraStream?.getVideoTracks()[0];
            if (activeTrack?.readyState === 'live') {
                return this.activeCameraStream.clone();
            }

            const sharedConstraints = {
                audio: false,
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            let rawStream;
            try {
                rawStream = await originalGetUserMedia(sharedConstraints);
            } catch (error) {
                console.warn('共通カメラ設定を利用できないため、要求された設定を使用します。', error);
                rawStream = await originalGetUserMedia(requestedConstraints);
            }

            // テストモード時は Canvas を用いてカメラ映像中央にターゲット画像を合成する
            const video = document.createElement('video');
            video.srcObject = rawStream;
            video.muted = true;
            video.playsInline = true;
            await video.play();

            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');

            const targetImg = new Image();
            targetImg.src = window.AppConfig?.core?.masterMind.replace('.mind', '.png') || 'assets/target.png';

            const renderFrame = () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    // 背景として生カメラ映像を描画
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    // 画面中央にターゲット画像 (target.png) を合成描画 (ジオラマモードのテスト時のみ)
                    if (!window.AppMode.isSurround() && targetImg.complete && targetImg.naturalWidth !== 0) {
                        const targetSize = Math.min(canvas.width, canvas.height) * 0.5;
                        const x = (canvas.width - targetSize) / 2;
                        const y = (canvas.height - targetSize) / 2;
                        ctx.drawImage(targetImg, x, y, targetSize, targetSize);
                    }
                }
                requestAnimationFrame(renderFrame);
            };
            renderFrame();

            // 合成されたCanvasから30fpsのストリームを生成し、ARエンジン(MindAR)へ渡す
            const canvasStream = canvas.captureStream(30);
            this.activeCameraStream = canvasStream;
            return canvasStream.clone();
        };
    },

    /**
     * スクリプトの動的ロード
     * @param {string} src
     * @returns {Promise<void>}
     */
    loadScript: function(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`${src} の読み込みに失敗しました`));
            document.head.appendChild(script);
        });
    },

    /**
     * モードに応じたARライブラリの動的ロード
     * @returns {Promise<void>}
     */
    loadARLibrary: function() {
        // Surroundモード時は追加のARライブラリは不要（A-Frame標準のlook-controlsを使うため）
        if (window.AppMode.isSurround()) {
            return Promise.resolve();
        }
        return this.loadScript(
            'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js'
        );
    },

    /**
     * 背景ビデオ要素へのカメラストリーム接続
     */
    startSharedCamera: async function() {
        const video = document.getElementById('shared-webcam');
        if (!video || !navigator.mediaDevices?.getUserMedia) return;

        try {
            video.srcObject = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            await video.play();
        } catch (error) {
            console.error('カメラを開始できませんでした。', error);
        }
    },

    /**
     * A-Frameシーン要素の生成
     * @returns {HTMLElement}
     */
    createScene: function() {
        const scene = document.createElement('a-scene');
        const camera = document.createElement('a-camera');

        scene.setAttribute('embedded', '');
        scene.setAttribute('vr-mode-ui', 'enabled: false');
        scene.setAttribute(
            'renderer',
            'antialias: true; devicePixelRatio: 2; alpha: true; preserveDrawingBuffer: true; colorManagement: true;'
        );
        scene.innerHTML = '<a-assets id="asset-manager"></a-assets>';

        if (window.AppMode.isSurround()) {
            // 等身大・周辺モード：ジャイロで見回せるようにし、背景は透明にしてビデオ要素を見せる
            camera.setAttribute('look-controls', 'enabled: true; magicWindowTrackingEnabled: true; touchEnabled: true;');
            camera.setAttribute('position', '0 1.6 0'); // 人の目の高さ目安
        } else {
            camera.setAttribute('position', '0 0 0');
            camera.setAttribute('look-controls', 'enabled: false');
            scene.setAttribute('cursor', 'rayOrigin: mouse');
            scene.setAttribute('raycaster', 'objects: .clickable');
            scene.setAttribute(
                'mindar-image',
                `imageTargetSrc: ${window.AppConfig.core.masterMind}; uiScanning: no;`
            );
        }

        scene.appendChild(camera);
        return scene;
    },

    /**
     * 空間切り替えボタンの見た目更新
     */
    updateSpaceSwitchButton: function() {
        const button = document.getElementById('gps-switch-btn');
        if (!button) return;

        const isSurround = window.AppMode.isSurround();
        button.innerText = isSurround ? 'ジオラマモード' : '周囲に表示 (等身大)';
        button.classList.toggle('gps-mode-active', isSurround);
    },

    /**
     * ジオラマモード ↔ 等身大(Surround)モードのトグル切り替え
     */
    switchSpace: function() {
        window.location.search = window.AppMode.isSurround() ? '?mode=diorama' : '?mode=surround';
    }
};

window.switchARMode = () => window.AppBootstrap.switchSpace();
window.AppBootstrap.init();
