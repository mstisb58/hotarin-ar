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
        window.AR_MODE = requestedMode === 'gps' ? 'gps' : 'diorama';
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
        window.TestMode = this.readBooleanSetting('testMode', false);
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

        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (requestedConstraints) => {
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

            try {
                this.activeCameraStream = await originalGetUserMedia(sharedConstraints);
            } catch (error) {
                console.warn('共通カメラ設定を利用できないため、要求された設定を使用します。', error);
                this.activeCameraStream = await originalGetUserMedia(requestedConstraints);
            }
            return this.activeCameraStream.clone();
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
        const headerText = document.querySelector('#header p');
        if (window.AppMode.isOutdoor()) {
            if (headerText) headerText.innerText = 'GPSを取得中...';
            return this.loadScript(
                'https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js'
            );
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

        if (window.AppMode.isOutdoor()) {
            camera.setAttribute('gps-camera', 'gpsMinDistance: 5;');
            camera.setAttribute('rotation-reader', '');
            scene.setAttribute(
                'arjs',
                'sourceType: webcam; videoTexture: false; debugUIEnabled: false; sourceWidth: 1280; sourceHeight: 720; destWidth: 1280; destHeight: 720;'
            );
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

        const outdoor = window.AppMode.isOutdoor();
        button.innerText = outdoor ? 'ジオラマモード' : '外で見てみる！ (GPS)';
        button.classList.toggle('gps-mode-active', outdoor);
    },

    /**
     * ジオラマモード ↔ 外で見る(GPS)モードのトグル切り替え
     */
    switchSpace: function() {
        window.location.search = window.AppMode.isOutdoor() ? '?mode=diorama' : '?mode=gps';
    }
};

window.switchARMode = () => window.AppBootstrap.switchSpace();
window.AppBootstrap.init();
