// ピュアなAR基本システム (Ver2相当)
window.ARCore = {
    mainTarget: null,
    
    init: function() {
        const scene = document.querySelector('a-scene');
        const assetManager = document.querySelector('#asset-manager');
        const headerText = document.querySelector('#header p');
        
        // アセット事前読み込みとロジックスクリプトの動的読み込み
        window.AppConfig.core.arsystem.forEach((id) => {
            // スクリプトの読み込み
            const script = document.createElement('script');
            script.src = `assets/${id}/motion.js`;
            document.head.appendChild(script);

            // モデルの読み込み
            const assetItem = document.createElement('a-asset-item');
            assetItem.setAttribute('id', `${id}Model`);
            assetItem.setAttribute('src', `assets/${id}/model.glb`);
            assetManager.appendChild(assetItem);
        });

        if (window.AR_MODE === 'gps') {
            headerText.innerText = "GPSを取得中...";
            
            // GPS Location Retrieval
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    const waterHallLat = 35.454332476881056;
                    const waterHallLon = 139.59818021935607;
                    
                    let centerLat = waterHallLat;
                    let centerLon = waterHallLon;
                    
                    if (window.TestMode) {
                        console.log("テストモードON: 現在地をYBPの中心（原点）とみなして配置します。");
                        headerText.innerText = "GPSモード (テスト表示中)";
                        centerLat = lat;
                        centerLon = lon;
                    } else {
                        console.log("テストモードOFF: リアルGPSで動作（現地でのみ見えます）。");
                        headerText.innerText = "GPSモード: YBP水のホールに出現中！";
                    }
                    
                    this.initGPSScene(centerLat, centerLon);
                },
                (error) => {
                    console.warn("GPS取得失敗。YBP水�        } else {
            headerText.innerText = "ターゲットを映してね！";

            this.mainTarget = document.createElement('a-entity');
            this.mainTarget.setAttribute('mindar-image-target', 'targetIndex: 0');
            scene.appendChild(this.mainTarget);

            // テストモード（仮想認識）用のアンカーをカメラ前方1.2mに作成
            const camera = document.querySelector('a-camera') || scene;
            this.virtualAnchor = document.createElement('a-entity');
            this.virtualAnchor.setAttribute('id', 'virtual-anchor');
            this.virtualAnchor.setAttribute('position', '0 -0.1 -1.2'); // カメラ正面1.2m
            this.virtualAnchor.setAttribute('rotation', '0 0 0');
            camera.appendChild(this.virtualAnchor);

            this.isTracking = false;

            this.mainTarget.addEventListener("targetFound", () => { 
                this.isTracking = true;
                this.updateAnchorState();
            });
            this.mainTarget.addEventListener("targetLost", () => { 
                this.isTracking = false;
                this.updateAnchorState();
            });

            // 初期アンカー状態の適用
            setTimeout(() => this.updateAnchorState(), 100);
        }
    },

    getDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in meters
    },
    
    initGPSScene: function(lat, lon) {
        const scene = document.querySelector('a-scene');
        
        // Create the GPS wrapper entity at the target coordinates
        const gpsEntity = document.createElement('a-entity');
        gpsEntity.setAttribute('gps-new-entity-place', `latitude: ${lat}; longitude: ${lon}`);
        
        // Rotate -90 degrees on X to map (X, Y) of diorama to (X, -Z) of GPS world,
        // and local Z (height) to world Y (altitude).
        // Scale by 100 to blow up the 1m diorama range to a 100m (50m radius) real-scale range.
        gpsEntity.setAttribute('rotation', '-90 0 0');
        gpsEntity.setAttribute('scale', '100 100 100');
        
        this.mainTarget = gpsEntity;
        scene.appendChild(gpsEntity);
        
        // Spawn all standard targets configured in config.js
        this.startViewMode();
    },
    
    clearScene: function() {
        if (this.mainTarget) {
            while (this.mainTarget.firstChild) {
                this.mainTarget.removeChild(this.mainTarget.firstChild);
            }
        }
        if (this.virtualAnchor) {
            while (this.virtualAnchor.firstChild) {
                this.virtualAnchor.removeChild(this.virtualAnchor.firstChild);
            }
        }
    },
    
    isVirtualNFTActive: function() {
        // 設定モード > 仮想認識ON (またはテストモードONで仮想認識チェックあり)
        return window.TestMode && (window.TestVirtualNFT !== false);
    },

    getCurrentAnchor: function() {
        if (window.AR_MODE === 'gps') {
            return this.mainTarget;
        }
        // IF : 設定モード > 仮想認識ON かつ 実NFT未検知 -> 仮想アンカーを使用
        if (this.isVirtualNFTActive() && !this.isTracking) {
            return this.virtualAnchor;
        }
        return this.mainTarget;
    },

    updateAnchorState: function() {
        if (window.AR_MODE === 'gps') return;
        
        const headerText = document.querySelector('#header p');

        if (this.isVirtualNFTActive() && !this.isTracking) {
            // ★ 仮想認識モード：画面中央に配置
            if (headerText) headerText.innerText = "ジオラマ表示中 (仮想認識)";
            if (this.virtualAnchor) {
                this.virtualAnchor.setAttribute('visible', 'true');
                if (this.virtualAnchor.object3D) this.virtualAnchor.object3D.visible = true;
            }

            // mainTargetからvirtualAnchorへ子要素（ほたりん）を移動
            while (this.mainTarget && this.mainTarget.firstChild) {
                const child = this.mainTarget.firstChild;
                child.setAttribute('visible', 'true');
                if (child.object3D) child.object3D.visible = true;
                this.virtualAnchor.appendChild(child);
            }

            // virtualAnchor内の全子要素を表示状態に確実にする
            if (this.virtualAnchor) {
                Array.from(this.virtualAnchor.children).forEach(child => {
                    child.setAttribute('visible', 'true');
                    if (child.object3D) child.object3D.visible = true;
                });
            }
        } else if (this.isTracking) {
            // ★ マーカー認識成功：リアルNFTマーカー上に配置
            if (headerText) headerText.innerText = "ジオラマが起動しました！";
            
            while (this.virtualAnchor && this.virtualAnchor.firstChild) {
                const child = this.virtualAnchor.firstChild;
                child.setAttribute('visible', 'true');
                if (child.object3D) child.object3D.visible = true;
                this.mainTarget.appendChild(child);
            }
        } else {
            // ★ マーカー未認識 かつ 仮想認識OFF：マーカー探知待ち
            if (headerText) headerText.innerText = "ターゲットを映してね！";
            if (this.virtualAnchor) {
                this.virtualAnchor.setAttribute('visible', 'false');
                if (this.virtualAnchor.object3D) this.virtualAnchor.object3D.visible = false;
            }
        }
    },

    updateAnchorParenting: function() {
        this.updateAnchorState();
    },

    startViewMode: function() {
        this.clearScene();
        
        // config.js の viewModeTargets リストに基づいて配置
        window.AppConfig.core.viewModeTargets.forEach((target) => {
            if (target.id === 'train') return;

            const spawnCount = target.count || 1;
            
            for (let i = 0; i < spawnCount; i++) {
                const container = document.createElement('a-entity');
                container.setAttribute('visible', 'true');
                
                const seedSetting = (spawnCount > 1) ? `seed: ${i * 50};` : '';
                const extraParams = target.params ? target.params + ';' : '';
                const baseRot = target.baseRot || "90 0 0";
                
                container.innerHTML = `
                    <a-entity ${target.id}-logic="showDebugBox: ${window.TestMode}; ${seedSetting} ${extraParams}">
                        <a-gltf-model src="#${target.id}Model" rotation="${baseRot}" animation-mixer></a-gltf-model>
                    </a-entity>
                `;
                this.getCurrentAnchor().appendChild(container);
            }
        });

        this.updateAnchorState();
    },ualAnchor);
            }
            return this.virtualAnchor || this.mainTarget;
        }
        return this.mainTarget;
    },

    updateAnchorParenting: function() {
        if (window.AR_MODE === 'gps') return;
        
        // 付け替え前に、アタッチ先（または virtualAnchor）を生成・接続させる
        const targetAnchor = this.getCurrentAnchor();
        
        if (!this.virtualAnchor) return;
        
        const otherAnchor = (targetAnchor === this.mainTarget) ? this.virtualAnchor : this.mainTarget;
        
        while (otherAnchor.firstChild) {
            targetAnchor.appendChild(otherAnchor.firstChild);
        }
    }
};

// 起動時の初期化 (Dynamic Scene Ready に変更)
window.addEventListener("ARSceneReady", () => {
    window.ARCore.init();
    // UIモジュールが存在すればUIの初期化も行う
    if (window.UIManager) {
        window.UIManager.init();
    } else {
        // ゲーム/UI機能を持たない純粋なARアプリの場合のフォールバック
        if (window.AR_MODE !== 'gps') {
            setTimeout(() => window.ARCore.startViewMode(), 500);
        }
    }
});
