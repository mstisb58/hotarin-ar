/**
 * ゲーム機能モジュール (GameModule)
 * 虫取りゲームプレイ・敵出現・タイマー・3Dレイキャスト当たり判定
 */
window.GameModule = {
    score: 0,
    hotarinCount: 0,
    spawnIntervalTimer: null,
    gameTimer: null,
    timeLeft: 0,

    /**
     * ゲームモード開始
     */
    startGameMode: function() {
        this.clearTimers();
        window.ARCore.clearScene();

        this.score = 0;
        this.timeLeft = window.AppConfig.game.duration;
        this.hotarinCount = 0;

        if (window.UIManager) {
            window.UIManager.updateScoreUI(this.score);
            window.UIManager.updateTimerUI(this.timeLeft);
        }

        // 背景キャラクターの配置
        const backgrounds = window.AppConfig.game.backgroundTargets;
        backgrounds.forEach((target) => {
            const id = typeof target === 'string' ? target : target.id;
            if (id === 'train') return;

            const { container } = window.ARCore.createTargetEntity(target);
            const activeAnchor = window.ARCore.getActiveAnchor();
            if (activeAnchor) activeAnchor.appendChild(container);
        });

        // 制限時間カウントダウンタイマー開始
        this.gameTimer = setInterval(() => {
            this.timeLeft--;
            if (window.UIManager) window.UIManager.updateTimerUI(this.timeLeft);
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);

        // 定期スポーンタイマー開始
        this.spawnIntervalTimer = setInterval(() => {
            if (this.hotarinCount < window.AppConfig.game.maxTargets) {
                this.spawnTarget();
            }
        }, window.AppConfig.game.spawnInterval);

        this.spawnTarget();
        window.ARCore.applyEnvironmentState();
    },

    /**
     * ゲーム終了処理
     */
    endGame: function() {
        if (window.UIManager) {
            window.UIManager.screenMode = 'result';
            window.UIManager.captureResultImage(this.score);
        }

        this.clearTimers();
        window.ARCore.clearScene();

        if (window.UIManager) {
            window.UIManager.showResultScreen(this.score);
        }
    },

    /**
     * タイマーのクリア
     */
    clearTimers: function() {
        if (this.spawnIntervalTimer) clearInterval(this.spawnIntervalTimer);
        if (this.gameTimer) clearInterval(this.gameTimer);
        this.spawnIntervalTimer = null;
        this.gameTimer = null;
        this.hotarinCount = 0;
    },

    /**
     * ゲームターゲット（ほたりん）のスポーン処理
     */
    spawnTarget: function() {
        const activeAnchor = window.ARCore.getActiveAnchor();
        if (!activeAnchor) return;

        this.hotarinCount++;
        const seed = Math.random() * 1000;
        const targetId = window.AppConfig.game.catchTarget;
        const targetEntity = window.ARCore.createTargetEntity(targetId, { seed });
        const targetContainer = targetEntity.container;
        const logicEntity = targetEntity.logicEntity;

        targetContainer.classList.add('clickable');

        // 当たり判定アシスト用（不可視）球体
        const sphere = document.createElement('a-sphere');
        sphere.setAttribute('radius', '1.0');
        sphere.setAttribute('material', 'opacity: 0; transparent: true');

        if (logicEntity) logicEntity.appendChild(sphere);
        activeAnchor.appendChild(targetContainer);

        // 10秒後に自動消滅
        setTimeout(() => {
            if (targetContainer.parentNode) {
                targetContainer.parentNode.removeChild(targetContainer);
                this.hotarinCount--;
            }
        }, 10000);
    },

    /**
     * ターゲットの捕獲処理
     * @param {HTMLElement} element
     */
    catchTarget: function(element) {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
            this.hotarinCount--;
            this.score++;
            if (window.UIManager) window.UIManager.updateScoreUI(this.score);
        }
    },

    /**
     * 画面タップ/クリック位置でのレイキャスト当たり判定
     * @param {number} clientX
     * @param {number} clientY
     */
    handleInteraction: function(clientX, clientY) {
        const sceneEl = document.querySelector('a-scene');
        if (!sceneEl || !sceneEl.camera) return;

        const camera = sceneEl.camera;
        const rect = sceneEl.canvas.getBoundingClientRect();

        const mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const clickables = document.querySelectorAll('.clickable');
        const objectsToIntersect = [];
        clickables.forEach((el) => {
            if (el.object3D) objectsToIntersect.push(el.object3D);
        });

        const intersects = raycaster.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            // A-FrameのEntity (el) が見つかるまで親ノードを遡る
            while (hitObj && hitObj.el === undefined) {
                hitObj = hitObj.parent;
            }
            let hitEl = hitObj ? hitObj.el : null;

            // クリック対象のラッパーコンテナを探す
            while (hitEl && hitEl !== sceneEl) {
                if (hitEl.classList && hitEl.classList.contains('clickable')) {
                    this.catchTarget(hitEl);
                    break;
                }
                hitEl = hitEl.parentNode;
            }
        }
    }
};
