// ピュアなAR基本システム (Ver2相当)
window.ARCore = {
    mainTarget: null,
    
    init: function() {
        const scene = document.querySelector('a-scene');
        const assetManager = document.querySelector('#asset-manager');
        const headerText = document.querySelector('#header p');
        
        headerText.innerText = "ターゲットを映してね！";
        scene.setAttribute('mindar-image', `imageTargetSrc: ${window.AppConfig.core.masterMind}; uiScanning: no;`);

        this.mainTarget = document.createElement('a-entity');
        this.mainTarget.setAttribute('mindar-image-target', 'targetIndex: 0');
        scene.appendChild(this.mainTarget);

        this.mainTarget.addEventListener("targetFound", () => { headerText.innerText = "ジオラマが起動しました！"; });
        this.mainTarget.addEventListener("targetLost", () => { headerText.innerText = "ターゲットを映してね！"; });

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

// 起動時の初期化
window.addEventListener("DOMContentLoaded", () => {
    window.ARCore.init();
    // UIモジュールが存在すればUIの初期化も行う
    if (window.UIManager) {
        window.UIManager.init();
    } else {
        // ゲーム/UI機能を持たない純粋なARアプリの場合のフォールバック
        setTimeout(() => window.ARCore.startViewMode(), 500);
    }
});
