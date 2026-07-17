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
                    const dist = this.getDistance(lat, lon, waterHallLat, waterHallLon);
                    
                    let centerLat = waterHallLat;
                    let centerLon = waterHallLon;
                    
                    if (dist > 500) {
                        console.log(`ユーザーがYBPから離れています（距離: ${Math.round(dist)}m）。テスト用に現在地を中心とします。`);
                        headerText.innerText = "GPSモード (テスト表示中)";
                        centerLat = lat;
                        centerLon = lon;
                    } else {
                        console.log("ユーザーがYBP付近にいます。水のホールを中心とします。");
                        headerText.innerText = "GPSモード: YBP水のホールに出現中！";
                    }
                    
                    this.initGPSScene(centerLat, centerLon);
                },
                (error) => {
                    console.warn("GPS取得失敗。YBP水のホール位置を使用します。", error);
                    headerText.innerText = "GPSモード (YBP水のホール表示)";
                    this.initGPSScene(35.454332476881056, 139.59818021935607);
                },
                { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
            );
        } else {
            headerText.innerText = "ターゲットを映してね！";
            scene.setAttribute('mindar-image', `imageTargetSrc: ${window.AppConfig.core.masterMind}; uiScanning: no;`);

            this.mainTarget = document.createElement('a-entity');
            this.mainTarget.setAttribute('mindar-image-target', 'targetIndex: 0');
            scene.appendChild(this.mainTarget);

            this.mainTarget.addEventListener("targetFound", () => { headerText.innerText = "ジオラマが起動しました！"; });
            this.mainTarget.addEventListener("targetLost", () => { headerText.innerText = "ターゲットを映してね！"; });
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
        if (!this.mainTarget) return;
        while (this.mainTarget.firstChild) {
            this.mainTarget.removeChild(this.mainTarget.firstChild);
        }
    },
    
    startViewMode: function() {
        this.clearScene();
        
        // config.js の viewModeTargets リストに基づいて配置
        window.AppConfig.core.viewModeTargets.forEach((target) => {
            const spawnCount = target.count || 1;
            
            for (let i = 0; i < spawnCount; i++) {
                const container = document.createElement('a-entity');
                
                // 複数匹出現させる場合は動きが被らないようにseedをずらす
                const seedSetting = (spawnCount > 1) ? `seed: ${i * 50};` : '';
                // 個別設定パラメータがあれば追加
                const extraParams = target.params ? target.params + ';' : '';
                // ベースの回転（Blenderの書き出し設定に依存するため調整可能に）
                const baseRot = target.baseRot || "90 0 0";
                
                container.innerHTML = `
                    <a-entity ${target.id}-logic="showDebugBox: false; ${seedSetting} ${extraParams}">
                        <a-gltf-model src="#${target.id}Model" rotation="${baseRot}" animation-mixer></a-gltf-model>
                    </a-entity>
                `;
                this.mainTarget.appendChild(container);
            }
        });
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
