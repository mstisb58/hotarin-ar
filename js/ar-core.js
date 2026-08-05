// ARシーンの初期化・配置・アンカー切り替えを管理する。
window.ARCore = {
    physicalAnchor: null,
    virtualAnchor: null,
    outdoorAnchor: null,
    physicalTargetFound: false,

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
        const diorama = window.AppConfig.diorama;

        this.physicalAnchor = document.createElement('a-entity');
        this.physicalAnchor.setAttribute('mindar-image-target', 'targetIndex: 0');
        scene.appendChild(this.physicalAnchor);

        // 30cm幅のNFTを1.2m先に置いた状態と同じ座標系を作る。
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

    initGPSScene: function(latitude, longitude) {
        const scene = document.querySelector('a-scene');
        const worldScale = window.AppConfig.outdoor.worldScale;
        const gpsEntity = document.createElement('a-entity');

        gpsEntity.setAttribute('gps-new-entity-place', `latitude: ${latitude}; longitude: ${longitude}`);
        // ジオラマのXY平面を地面へ、ローカルZを実空間の高さへ対応させる。
        gpsEntity.setAttribute('rotation', '-90 0 0');
        gpsEntity.setAttribute('scale', `${worldScale} ${worldScale} ${worldScale}`);

        this.outdoorAnchor = gpsEntity;
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
        const characterSettings = window.AppConfig.characters[definition.id];

        if (characterSettings) {
            Object.entries(characterSettings).forEach(([name, value]) => {
                componentSettings.push(`${name}: ${value}`);
            });
        }

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
        [this.physicalAnchor, this.virtualAnchor, this.outdoorAnchor].forEach((anchor) => {
            while (anchor && anchor.firstChild) anchor.removeChild(anchor.firstChild);
        });
    },

    getRecognitionState: function() {
        if (window.AppMode.isOutdoor()) return 'gps';
        if (window.AppMode.isTest()) return 'virtual';
        return this.physicalTargetFound ? 'physical' : 'none';
    },

    isTargetRecognized: function() {
        return this.getRecognitionState() !== 'none';
    },

    getActiveAnchor: function() {
        if (window.AppMode.isOutdoor()) return this.outdoorAnchor;
        return window.AppMode.isTest()
            ? this.virtualAnchor
            : this.physicalAnchor;
    },

    moveSceneContent: function(source, destination) {
        while (source && destination && source.firstChild) {
            const child = source.firstChild;
            destination.appendChild(child);
            child.setAttribute('visible', 'true');
            if (child.object3D) child.object3D.visible = true;
        }
    },

    setAnchorVisible: function(anchor, visible) {
        if (!anchor) return;
        anchor.setAttribute('visible', String(visible));
        if (anchor.object3D) anchor.object3D.visible = visible;
    },

    applyEnvironmentState: function() {
        if (window.AppMode.isOutdoor() || !this.physicalAnchor || !this.virtualAnchor) return;

        const headerText = document.querySelector('#header p');
        const useVirtualAnchor = window.AppMode.isTest();
        const usePhysicalAnchor = !useVirtualAnchor && this.physicalTargetFound;
        const targetAnchor = useVirtualAnchor ? this.virtualAnchor : this.physicalAnchor;
        const sourceAnchor = useVirtualAnchor ? this.physicalAnchor : this.virtualAnchor;

        // テストは常に仮想認識、実装は実NFTを認識したときだけ表示する。
        this.setAnchorVisible(this.physicalAnchor, usePhysicalAnchor);
        this.setAnchorVisible(this.virtualAnchor, useVirtualAnchor);
        this.moveSceneContent(sourceAnchor, targetAnchor);

        if (useVirtualAnchor) {
            headerText.innerText = 'ジオラマ表示中 (仮想認識)';
        } else if (usePhysicalAnchor) {
            headerText.innerText = 'ジオラマが起動しました！';
        } else {
            headerText.innerText = 'ターゲットを映してね！';
        }
    },

    startViewMode: function() {
        if (!this.getActiveAnchor()) return;

        this.clearScene();
        window.AppConfig.core.viewModeTargets.forEach((target) => {
            // 実空間で電車内に見えてしまう問題を避け、ほたりんだけを表示する。
            if (target.id === 'train') return;

            const spawnCount = target.count || 1;
            for (let index = 0; index < spawnCount; index++) {
                const seed = spawnCount > 1 ? index * 50 : undefined;
                const { container } = this.createTargetEntity(target, { seed });
                this.getActiveAnchor().appendChild(container);
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
