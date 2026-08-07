/**
 * ARコア機能：モデル描画・アンカー制御・3D空間オブジェクト配置 (ARCore)
 */
window.ARCore = {
    physicalAnchor: null,
    virtualAnchor: null,
    outdoorAnchor: null,
    physicalTargetFound: false,

    /**
     * 初期化処理
     */
    init: async function() {
        await this.loadAssets();
        if (window.AppMode.isOutdoor()) {
            this.initGPSMode();
        } else {
            this.initDioramaMode();
        }
    },

    /**
     * アセット (3Dモデル, 動作スクリプト) の非同期ロード
     * @returns {Promise<void[]>}
     */
    loadAssets: function() {
        const assetManager = document.querySelector('#asset-manager');
        const componentLoads = window.AppConfig.core.arsystem.map((id) => {
            const componentName = `${id}-logic`;
            const script = document.createElement('script');
            const assetItem = document.createElement('a-asset-item');

            assetItem.setAttribute('id', `${id}Model`);
            assetItem.setAttribute('src', `assets/${id}/model.glb`);
            if (assetManager) assetManager.appendChild(assetItem);

            if (AFRAME.components[componentName]) {
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                script.src = `assets/${id}/motion.js`;
                script.onload = resolve;
                script.onerror = () => reject(new Error(`${componentName} の読み込みに失敗しました`));
                document.head.appendChild(script);
            });
        });

        return Promise.all(componentLoads);
    },

    /**
     * 屋外 (GPS) モードの初期化
     */
    initGPSMode: function() {
        const headerText = document.querySelector('#header p');
        const outdoor = window.AppConfig.outdoor;

        if (headerText) headerText.innerText = 'GPSを取得中...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const useCurrentPosition = window.AppMode.isTest();
                const latitude = useCurrentPosition
                    ? position.coords.latitude
                    : outdoor.center.latitude;
                const longitude = useCurrentPosition
                    ? position.coords.longitude
                    : outdoor.center.longitude;

                if (headerText) {
                    headerText.innerText = useCurrentPosition
                        ? 'GPSモード (テスト表示中)'
                        : 'GPSモード: YBP水のホールに出現中！';
                }

                this.initGPSScene(latitude, longitude);
            },
            (error) => {
                console.warn('GPS取得失敗。YBP水のホール位置を使用します。', error);
                if (headerText) headerText.innerText = 'GPSモード (YBP水のホール表示)';
                this.initGPSScene(outdoor.center.latitude, outdoor.center.longitude);
            },
            outdoor.geolocationOptions
        );
    },

    /**
     * ジオラマ (MindAR) モードの初期化
     */
    initDioramaMode: function() {
        const scene = document.querySelector('a-scene');
        const camera = document.querySelector('a-camera') || scene;
        const diorama = window.AppConfig.diorama;
        if (!scene || !camera) return;

        // 1. 実マーカー認識用アンカー (実NFT用)
        this.physicalAnchor = document.createElement('a-entity');
        this.physicalAnchor.setAttribute('mindar-image-target', 'targetIndex: 0');
        scene.appendChild(this.physicalAnchor);

        // 2. 仮想マーカー認識用アンカー (テストモード用: カメラ前方1.2mに置いた状態をモック)
        this.virtualAnchor = document.createElement('a-entity');
        this.virtualAnchor.setAttribute('id', 'virtual-anchor');
        this.virtualAnchor.setAttribute(
            'position',
            `0 ${diorama.testAnchorVerticalOffsetMeters} -${diorama.testAnchorDistanceMeters}`
        );
        this.virtualAnchor.setAttribute(
            'scale',
            `${diorama.targetWidthMeters} ${diorama.targetWidthMeters} ${diorama.targetWidthMeters}`
        );
        camera.appendChild(this.virtualAnchor);

        this.physicalTargetFound = false;
        this.physicalAnchor.addEventListener('targetFound', () => {
            this.physicalTargetFound = true;
            this.applyEnvironmentState();
        });
        this.physicalAnchor.addEventListener('targetLost', () => {
            this.physicalTargetFound = false;
            this.applyEnvironmentState();
        });
        this.applyEnvironmentState();
    },

    /**
     * GPSシーン用アンカー生成
     * @param {number} latitude
     * @param {number} longitude
     */
    initGPSScene: function(latitude, longitude) {
        const scene = document.querySelector('a-scene');
        if (!scene) return;

        const worldScale = window.AppConfig.outdoor.worldScale;
        const gpsEntity = document.createElement('a-entity');

        gpsEntity.setAttribute('gps-new-entity-place', `latitude: ${latitude}; longitude: ${longitude}`);
        gpsEntity.setAttribute('rotation', '-90 0 0');
        gpsEntity.setAttribute('scale', `${worldScale} ${worldScale} ${worldScale}`);

        this.outdoorAnchor = gpsEntity;
        scene.appendChild(gpsEntity);
        this.startViewMode();
    },

    /**
     * デバッグ用枠線表示フラグの取得
     * @returns {boolean}
     */
    shouldShowDebugBounds: function() {
        return window.AppMode.isTest() && window.TestShowBounds !== false;
    },

    /**
     * ARオブジェクト（ターゲット）のエンティティ生成
     * @param {string | Object} target
     * @param {Object} [options]
     * @returns {{ container: HTMLElement, logicEntity: HTMLElement }}
     */
    createTargetEntity: function(target, options = {}) {
        const definition = typeof target === 'string' ? { id: target } : target;
        const container = document.createElement('a-entity');
        const componentSettings = [`showDebugBox: ${this.shouldShowDebugBounds()}`];
        const characterSettings = window.AppConfig.characters[definition.id];

        if (characterSettings) {
            Object.entries(characterSettings).forEach(([name, value]) => {
                componentSettings.push(`${name}: ${value}`);
            });
        }

        if (options.seed !== undefined) componentSettings.push(`seed: ${options.seed}`);
        if (definition.params) componentSettings.push(definition.params);

        container.setAttribute('visible', 'true');
        container.innerHTML = `
            <a-entity ${definition.id}-logic="${componentSettings.join('; ')}">
                <a-gltf-model
                    src="#${definition.id}Model"
                    rotation="${definition.baseRot || '90 0 0'}"
                    animation-mixer>
                </a-gltf-model>
            </a-entity>
        `;

        return { container, logicEntity: container.firstElementChild };
    },

    /**
     * 全アンカー内のコンテンツをクリア
     */
    clearScene: function() {
        [this.physicalAnchor, this.virtualAnchor, this.outdoorAnchor].forEach((anchor) => {
            while (anchor && anchor.firstChild) {
                anchor.removeChild(anchor.firstChild);
            }
        });
    },

    /**
     * マーカー認識状態文字列を取得
     * @returns {'gps' | 'virtual' | 'physical' | 'none'}
     */
    getRecognitionState: function() {
        if (window.AppMode.isOutdoor()) return 'gps';
        if (window.AppMode.isTest()) return 'virtual';
        return this.physicalTargetFound ? 'physical' : 'none';
    },

    /**
     * @returns {boolean}
     */
    isTargetRecognized: function() {
        return this.getRecognitionState() !== 'none';
    },

    /**
     * 現在有効なアンカーエンティティの取得
     * @returns {HTMLElement | null}
     */
    getActiveAnchor: function() {
        if (window.AppMode.isOutdoor()) return this.outdoorAnchor;
        return window.AppMode.isTest()
            ? this.virtualAnchor
            : this.physicalAnchor;
    },

    /**
     * ノードコンテンツを一方のアンカーから他方のアンカーへ移動
     * @param {HTMLElement} source
     * @param {HTMLElement} destination
     */
    moveSceneContent: function(source, destination) {
        while (source && destination && source.firstChild) {
            const child = source.firstChild;
            destination.appendChild(child);
            child.setAttribute('visible', 'true');
            if (child.object3D) child.object3D.visible = true;
        }
    },

    /**
     * アンカーの表示/非表示制御
     * @param {HTMLElement | null} anchor
     * @param {boolean} visible
     */
    setAnchorVisible: function(anchor, visible) {
        if (!anchor) return;
        anchor.setAttribute('visible', String(visible));
        if (anchor.object3D) anchor.object3D.visible = visible;
    },

    /**
     * マーカー認識状態の判定 (簡素な条件分岐)
     * テストモード時: 画面中央で仮想認識中
     * 実装モード時: 物理NFTを探索 / 認識
     */
    isTargetRecognized: function() {
        if (window.AppMode.isOutdoor()) return true;
        return window.AppMode.isTest() ? true : this.physicalTargetFound;
    },

    /**
     * テスト/実装の環境状態の適用
     * isTest ? 画面中央で認識中 : 物理NFTを探索/認識
     */
    applyEnvironmentState: function() {
        if (window.AppMode.isOutdoor() || !this.physicalAnchor || !this.virtualAnchor) return;

        const headerText = document.querySelector('#header p');
        const isTest = window.AppMode.isTest();
        const isRecognized = isTest || this.physicalTargetFound;

        const activeAnchor = isTest ? this.virtualAnchor : this.physicalAnchor;
        const inactiveAnchor = isTest ? this.physicalAnchor : this.virtualAnchor;

        this.setAnchorVisible(activeAnchor, isRecognized);
        this.setAnchorVisible(inactiveAnchor, false);
        this.moveSceneContent(inactiveAnchor, activeAnchor);

        const overlay = document.getElementById('test-marker-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !isTest);
        }

        if (headerText) {
            if (isTest) {
                headerText.innerText = 'ジオラマ表示中 (仮想認識)';
            } else if (this.physicalTargetFound) {
                headerText.innerText = 'ジオラマが起動しました！';
            } else {
                headerText.innerText = 'ターゲットを映してね！';
            }
        }
    },

    /**
     * 鑑賞モード表示開始
     */
    startViewMode: function() {
        const activeAnchor = this.getActiveAnchor();
        if (!activeAnchor) return;

        this.clearScene();
        window.AppConfig.core.viewModeTargets.forEach((target) => {
            if (target.id === 'train') return;

            const spawnCount = target.count || 1;
            for (let index = 0; index < spawnCount; index++) {
                const seed = spawnCount > 1 ? index * 50 : undefined;
                const { container } = this.createTargetEntity(target, { seed });
                activeAnchor.appendChild(container);
            }
        });
        this.applyEnvironmentState();
    }
};

window.addEventListener('ARSceneReady', async () => {
    try {
        await window.ARCore.init();
        if (window.UIManager) {
            window.UIManager.init();
        } else if (!window.AppMode.isOutdoor()) {
            window.ARCore.startViewMode();
        }
    } catch (error) {
        console.error('ARの初期化に失敗しました。', error);
        const headerText = document.querySelector('#header p');
        if (headerText) headerText.innerText = 'ARの読み込みに失敗しました';
    }
});
