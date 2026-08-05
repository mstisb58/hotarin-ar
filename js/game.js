// 追加拡張機能：虫取りゲームモジュール
window.GameModule = {
    score: 0,
    hotarinCount: 0,
    spawnIntervalTimer: null,
    gameTimer: null,
    timeLeft: 0,
    
    startGameMode: function() {
        // テスト設定変更などによる再開始でもタイマーを重複させない。
        this.clearTimers();
        window.ARCore.clearScene();
        
        this.score = 0;
        this.timeLeft = window.AppConfig.game.duration;
        this.hotarinCount = 0;
        
        if (window.UIManager) {
            window.UIManager.updateScoreUI(this.score);
            window.UIManager.updateTimerUI(this.timeLeft);
        }

        // 背景キャラ配置（config.jsのリストに基づく）
        const backgrounds = window.AppConfig.game.backgroundTargets;
        backgrounds.forEach((target) => {
            const id = typeof target === 'string' ? target : target.id;
            // 電車と駅(train)は非表示にする
            if (id === 'train') return;

            const { container } = window.ARCore.createTargetEntity(target);
            window.ARCore.getCurrentAnchor().appendChild(container);
        });

        // ゲーム用タイマー開始
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            if (window.UIManager) window.UIManager.updateTimerUI(this.timeLeft);
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);

        // スポーン処理開始
        this.spawnIntervalTimer = setInterval(() => {
            if(this.hotarinCount < window.AppConfig.game.maxTargets) {
                this.spawnTarget();
            }
        }, window.AppConfig.game.spawnInterval); 
        
        this.spawnTarget();
    },

    endGame: function() {
        if (window.UIManager) {
            // リザルトは第3の体験ではなく、ゲーム体験内の画面状態。
            window.UIManager.screenMode = 'result';
            window.UIManager.captureResultImage(this.score);
        }
        
        this.clearTimers();
        window.ARCore.clearScene();
        
        if (window.UIManager) {
            window.UIManager.showResultScreen(this.score);
        }
    },
    
    clearTimers: function() {
        if (this.spawnIntervalTimer) clearInterval(this.spawnIntervalTimer);
        if (this.gameTimer) clearInterval(this.gameTimer);
        this.spawnIntervalTimer = null;
        this.gameTimer = null;
        this.hotarinCount = 0;
    },

    spawnTarget: function() {
        this.hotarinCount++;
        const seed = Math.random() * 1000;
        const targetId = window.AppConfig.game.catchTarget; // config.jsから獲物を取得
        const targetEntity = window.ARCore.createTargetEntity(targetId, { seed });
        const targetContainer = targetEntity.container;
        const logicEntity = targetEntity.logicEntity;
        targetContainer.classList.add('clickable');
        
        // 当たり判定用の球体
        const sphere = document.createElement('a-sphere');
        sphere.setAttribute('radius', '1.0'); 
        sphere.setAttribute('material', 'opacity: 0; transparent: true');
        
        logicEntity.appendChild(sphere);
        window.ARCore.getCurrentAnchor().appendChild(targetContainer);

        // 10秒で自動消滅
        setTimeout(() => {
            if (targetContainer.parentNode) {
                targetContainer.parentNode.removeChild(targetContainer);
                this.hotarinCount--;
            }
        }, 10000);
    },

    catchTarget: function(element) {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
            this.hotarinCount--;
            this.score++;
            if(window.UIManager) window.UIManager.updateScoreUI(this.score);
        }
    },
    
    handleInteraction: function(clientX, clientY) {
        // UIモジュールから渡された座標で当たり判定（Raycast）を行う
        const sceneEl = document.querySelector('a-scene');
        const camera = sceneEl.camera;
        if (!camera) return;

        const mouse = new THREE.Vector2();
        const rect = sceneEl.canvas.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const clickables = document.querySelectorAll('.clickable');
        const objectsToIntersect = [];
        clickables.forEach(el => {
            if (el.object3D) objectsToIntersect.push(el.object3D);
        });

        const intersects = raycaster.intersectObjects(objectsToIntersect, true);
        
        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            // A-FrameのEntity(el)が見つかるまで親を遡る
            while(hitObj && hitObj.el === undefined) {
                hitObj = hitObj.parent;
            }
            let hitEl = hitObj ? hitObj.el : null;
            
            // クリック対象のラッパーコンテナを探す
            while(hitEl && hitEl !== sceneEl) {
                if(hitEl.classList && hitEl.classList.contains('clickable')) {
                    this.catchTarget(hitEl);
                    break;
                }
                hitEl = hitEl.parentNode;
            }
        }
    }
};
