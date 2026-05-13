// 追加拡張機能：虫取りゲームモジュール
window.GameModule = {
    score: 0,
    hotarinCount: 0,
    spawnIntervalTimer: null,
    gameTimer: null,
    timeLeft: 0,
    
    startGameMode: function() {
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
            // 文字列指定かオブジェクト指定か判定
            const id = typeof target === 'string' ? target : target.id;
            const extraParams = target.params ? target.params + ';' : '';

            const bgContainer = document.createElement('a-entity');
            bgContainer.innerHTML = `
                <a-entity ${id}-logic="showDebugBox: false; ${extraParams}">
                    <a-gltf-model src="#${id}Model" rotation="90 0 0" animation-mixer></a-gltf-model>
                </a-entity>
            `;
            window.ARCore.mainTarget.appendChild(bgContainer);
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
            window.UIManager.currentMode = 'result';
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
        const container = document.createElement('a-entity');
        container.classList.add('clickable');
        
        const targetId = window.AppConfig.game.catchTarget; // config.jsから獲物を取得

        const logicEntity = document.createElement('a-entity');
        logicEntity.setAttribute(`${targetId}-logic`, `showDebugBox: false; seed: ${seed}`);
        
        const model = document.createElement('a-gltf-model');
        model.setAttribute('src', `#${targetId}Model`);
        model.setAttribute('rotation', '90 0 0');
        model.setAttribute('animation-mixer', '');
        
        // 当たり判定用の球体
        const sphere = document.createElement('a-sphere');
        sphere.setAttribute('radius', '1.0'); 
        sphere.setAttribute('material', 'opacity: 0; transparent: true');
        
        logicEntity.appendChild(model);
        logicEntity.appendChild(sphere);
        container.appendChild(logicEntity);

        window.ARCore.mainTarget.appendChild(container);

        // 10秒で自動消滅
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
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
