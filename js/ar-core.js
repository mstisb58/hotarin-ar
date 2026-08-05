// ARシーンの初期化・配置・アンカー切り替えを管理する。
window.ARCore = {
    mainTarget: null,
    virtualAnchor: null,
    isTracking: false,

    init: async function() {
        await this.loadAssets();
        if (window.AppMode.isOutdoor()) {
            this.initGPSMode();
        } else {
            this.initDioramaMode();
        }
    },

    loadAssets: function() {
        const assetManager = document.querySelector('#asset-manager');
        const componentLoads = window.AppConfig.core.arsystem.map((id) => {
            const componentName = `${id}-logic`;
            const script = document.createElement('script');
            const assetItem = document.createElement('a-asset-item');

            assetItem.setAttribute('id', `${id}Model`);
            assetItem.setAttribute('src', `assets/${id}/model.glb`);
            assetManager.appendChild(assetItem);

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

    initGPSMode: function() {
        const headerText = document.querySelector('#header p');
        const outdoor = window.AppConfig.outdoor;

        headerText.innerText = 'GPSを取得中...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const useCurrentPosition = window.AppMode.isTest();
                const latitude = useCurrentPosition
                    ? position.coords.latitude
                    : outdoor.center.latitude;
                const longitude = useCurrentPosition
                    ? position.coords.longitude
                    : outdoor.center.longitude;

                if (useCurrentPosition) {
                    console.log('テストモードON: 現在地を実空間ARの中心として配置します。');
                    headerText.innerText = 'GPSモード (テスト表示中)';
                } else {
                    console.log('テストモードOFF: YBPの設定座標を基準に配置します。');
                    headerText.innerText = 'GPSモード: YBP水のホールに出現中！';
                }

                this.initGPSScene(latitude, longitude);
            },
            (error) => {
                console.warn('GPS取得失敗。YBP水のホール位置を使用します。', error);
                headerText.innerText = 'GPSモード (YBP水のホール表示)';
                this.initGPSScene(outdoor.center.latitude, outdoor.center.longitude);
            },
            outdoor.geolocationOptions
        );
    },

    initDioramaMode: function() {
        const scene = document.querySelector('a-scene');
        const camera = document.querySelector('a-camera') || scene;

        this.mainTarget = document.createElement('a-entity');
        this.mainTarget.setAttribute('mindar-image-target', 'targetIndex: 0');
        scene.appendChild(this.mainTarget);

        // NFTなしでも確認できるよう、カメラ正面1.2mに仮想アンカーを置く。
        this.virtualAnchor = document.createElement('a-entity');
        this.virtualAnchor.setAttribute('id', 'virtual-anchor');
        this.virtualAnchor.setAttribute('position', '0 -0.1 -1.2');
        camera.appendChild(this.virtualAnchor);

        this.isTracking = false;
        this.mainTarget.addEventListener('targetFound', () => {
            this.isTracking = true;
            this.updateAnchorState();
        });
        this.mainTarget.addEventListener('targetLost', () => {
            this.isTracking = false;
            this.updateAnchorState();
        });
        this.updateAnchorState();
    },

    initGPSScene: function(latitude, longitude) {
        const scene = document.querySelector('a-scene');
        const worldScale = window.AppConfig.outdoor.worldScale;
        const gpsEntity = document.createElement('a-entity');

        gpsEntity.setAttribute('gps-new-entity-place', `latitude: ${latitude}; longitude: ${longitude}`);
        // ジオラマのXY平面を地面へ、ローカルZを実空間の高さへ対応させる。
        gpsEntity.setAttribute('rotation', '-90 0 0');
        gpsEntity.setAttribute('scale', `${worldScale} ${worldScale} ${worldScale}`);

        this.mainTarget = gpsEntity;
        scene.appendChild(gpsEntity);
        this.startViewMode();
    },

    shouldShowDebugBounds: function() {
        return window.AppMode.isTest() && window.TestShowBounds !== false;
    },

    createTargetEntity: function(target, options = {}) {
        const definition = typeof target === 'string' ? { id: target } : target;
        const container = document.createElement('a-entity');
        const componentSettings = [`showDebugBox: ${this.shouldShowDebugBounds()}`];

        if (options.seed !== undefined) componentSettings.push(`seed: ${options.seed}`);
        if (definition.params) componentSettings.push(definition.params);

        container.setAttribute('visible', 'true');
        // 過去の動作版と同じ生成方法にし、A-Frameにまとめて初期化させる。
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

    clearScene: function() {
        [this.mainTarget, this.virtualAnchor].forEach((anchor) => {
            while (anchor && anchor.firstChild) anchor.removeChild(anchor.firstChild);
        });
    },

    isVirtualNFTActive: function() {
        return window.AppMode.isTest() && window.TestVirtualNFT !== false;
    },

    getCurrentAnchor: function() {
        if (window.AppMode.isOutdoor()) return this.mainTarget;
        return this.isVirtualNFTActive() && !this.isTracking
            ? this.virtualAnchor
            : this.mainTarget;
    },

    moveChildren: function(source, destination) {
        while (source && destination && source.firstChild) {
            const child = source.firstChild;
            destination.appendChild(child);
            this.setEntityTreeVisible(child, true);
        }
    },

    setEntityTreeVisible: function(entity, visible) {
        if (!entity) return;

        entity.setAttribute('visible', String(visible));
        if (entity.object3D) entity.object3D.visible = visible;
        Array.from(entity.children || []).forEach((child) => {
            this.setEntityTreeVisible(child, visible);
        });
    },

    setAnchorVisible: function(anchor, visible) {
        if (!anchor) return;
        anchor.setAttribute('visible', String(visible));
        if (anchor.object3D) anchor.object3D.visible = visible;
    },

    updateAnchorState: function() {
        if (window.AppMode.isOutdoor() || !this.mainTarget || !this.virtualAnchor) return;

        const headerText = document.querySelector('#header p');
        const useVirtualAnchor = this.isVirtualNFTActive() && !this.isTracking;
        const targetAnchor = useVirtualAnchor ? this.virtualAnchor : this.mainTarget;
        const sourceAnchor = useVirtualAnchor ? this.mainTarget : this.virtualAnchor;

        // NFT未認識時にゲームだけ見えてしまわないよう、両アンカーを明示的に制御する。
        this.setAnchorVisible(this.mainTarget, this.isTracking && !useVirtualAnchor);
        this.setAnchorVisible(this.virtualAnchor, useVirtualAnchor);
        this.moveChildren(sourceAnchor, targetAnchor);

        if (useVirtualAnchor) {
            headerText.innerText = 'ジオラマ表示中 (仮想認識)';
        } else if (this.isTracking) {
            headerText.innerText = 'ジオラマが起動しました！';
        } else {
            headerText.innerText = 'ターゲットを映してね！';
        }
    },

    startViewMode: function() {
        if (!this.mainTarget) return;

        this.clearScene();
        window.AppConfig.core.viewModeTargets.forEach((target) => {
            // 実空間で電車内に見えてしまう問題を避け、ほたりんだけを表示する。
            if (target.id === 'train') return;

            const spawnCount = target.count || 1;
            for (let index = 0; index < spawnCount; index++) {
                const seed = spawnCount > 1 ? index * 50 : undefined;
                const { container } = this.createTargetEntity(target, { seed });
                this.getCurrentAnchor().appendChild(container);
            }
        });
        this.updateAnchorState();
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
