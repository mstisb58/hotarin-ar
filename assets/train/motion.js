// assets/train/motion.js
AFRAME.registerComponent('train-logic', {
    schema: {
        length: { type: 'number', default: 3 }, //線路の長さ
        speed: { type: 'number', default: 1 },//電車の速度
        posX: { type: 'number', default: 0 },         //電車の中心位置X
        posY: { type: 'number', default: 1 },         //電車の中心位置Y
        height: { type: 'number', default: 0.01 },    //電車の高さ
        routeAngle: { type: 'number', default: 0 },   //線路の角度
        faceOffset: { type: 'number', default: 0 },   //正面のオフセット

        modelScale: { type: 'number', default: 0.4 }, //電車のサイズ

        // --- 出現タイミングの設定 ---
        interval: { type: 'number', default: 10 },
        randomRange: { type: 'number', default: 3 },
        
        // --- 建物（駅・トンネル）の表示制御 ---
        showBuildings: { type: 'boolean', default: true },
        buildingOffsetY: { type: 'number', default: 0 },

        debugColor: { type: 'color', default: '#00ff00' },
        showDebugBox: { type: 'boolean', default: false }
    },

    init: function () {
        this.debugVisual = document.createElement('a-entity');
        this.el.parentNode.appendChild(this.debugVisual);
        this.isVisible = true;

        if (this.data.showBuildings) {
            // ★ 駅（スタート地点）のエンティティを作成（仮の直方体）
            this.stationEl = document.createElement('a-entity');
            // 【将来の差し替え手順】
            // station.glb が完成したら、以下の geometry と material を削除（またはコメントアウト）し、
            // 次の1行を有効にしてください。※ index.html の編集は不要です。
            // this.stationEl.setAttribute('gltf-model', 'assets/train/station.glb');
            this.stationEl.setAttribute('geometry', { primitive: 'box', width: 0.6, height: 0.6, depth: 0.8 }); // 複線をカバーするためdepthを拡大
            this.stationEl.setAttribute('material', { color: '#888888', opacity: 1.0 });
            this.el.parentNode.appendChild(this.stationEl);

            // ★ トンネル（ゴール地点）のエンティティを作成（仮の円柱）
            this.tunnelEl = document.createElement('a-entity');
            // 【将来の差し替え手順】
            // tunnel.glb が完成したら、以下の geometry と material を削除（またはコメントアウト）し、
            // 次の1行を有効にしてください。※ index.html の編集は不要です。
            // this.tunnelEl.setAttribute('gltf-model', 'assets/train/tunnel.glb');
            this.tunnelEl.setAttribute('geometry', { primitive: 'cylinder', radius: 0.35, height: 0.8 }); // 複線をカバーするためheight(奥行き方向)を拡大
            this.tunnelEl.setAttribute('material', { color: '#444444', opacity: 1.0 });
            this.el.parentNode.appendChild(this.tunnelEl);
        }

        // ★ 重要：自身のエンティティにスケールを適用 (GPSモードの時は0.8(2倍)、ジオラマ時は0.4)
        const s = (window.AR_MODE === 'gps') ? 0.8 : this.data.modelScale;
        this.el.setAttribute('scale', { x: s, y: s, z: s });
    },

    update: function () {
        const d = this.data;
        if (d.showDebugBox) {
            this.debugVisual.setAttribute('geometry', { primitive: 'box', width: d.length, height: 0.04, depth: 0.005 });
            this.debugVisual.setAttribute('material', { color: d.debugColor, wireframe: true, opacity: 0.5 });
            this.debugVisual.setAttribute('position', { x: d.posX, y: d.posY, z: d.height });
            this.debugVisual.setAttribute('rotation', { x: 0, y: 0, z: d.routeAngle });
            this.debugVisual.setAttribute('visible', true);
        } else {
            this.debugVisual.setAttribute('visible', false);
        }

        if (this.data.showBuildings) {
            // --- 駅とトンネルの位置と回転を計算して配置 ---
            const rad = d.routeAngle * Math.PI / 180;
            const orthoRad = rad + Math.PI / 2; // Y軸方向のオフセット計算用（直角）
            const offsetY_X = d.buildingOffsetY * Math.cos(orthoRad);
            const offsetY_Y = d.buildingOffsetY * Math.sin(orthoRad);
            
            // スタート地点（駅: -length/2）
            const startLocalX = -d.length / 2;
            const startX = d.posX + (startLocalX * Math.cos(rad)) + offsetY_X;
            const startY = d.posY + (startLocalX * Math.sin(rad)) + offsetY_Y;
            this.stationEl.setAttribute('position', { x: startX, y: startY, z: d.height });
            this.stationEl.setAttribute('rotation', { x: 0, y: 0, z: d.routeAngle });

            // ゴール地点（トンネル: +length/2）
            const endLocalX = d.length / 2;
            const endX = d.posX + (endLocalX * Math.cos(rad)) + offsetY_X;
            const endY = d.posY + (endLocalX * Math.sin(rad)) + offsetY_Y;
            this.tunnelEl.setAttribute('position', { x: endX, y: endY, z: d.height });
            // 仮の円柱が線路を覆うように向きを調整 (X軸を90度回転)
            this.tunnelEl.setAttribute('rotation', { x: 90, y: 0, z: d.routeAngle });
        }
    },

    getSeedRandom: function (seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    },

    tick: function (time, delta) {
        const d = this.data;
        if (d.speed <= 0 || d.interval <= 0) return;

        const t = (Date.now() / 1000);
        const cycleIndex = Math.floor(t / d.interval);
        const timeInCycle = t % d.interval;
        const delay = d.randomRange > 0 ? this.getSeedRandom(cycleIndex) * d.randomRange : 0;
        const travelTime = d.length / d.speed;

        if (timeInCycle >= delay && timeInCycle < (delay + travelTime)) {
            if (!this.isVisible) {
                this.el.setAttribute('visible', true);
                this.isVisible = true;
            }

            const localT = timeInCycle - delay;
            const localX = (localT * d.speed) - (d.length / 2);

            const rad = d.routeAngle * Math.PI / 180;
            const worldX = d.posX + (localX * Math.cos(rad));
            const worldY = d.posY + (localX * Math.sin(rad));

            this.el.object3D.position.set(worldX, worldY, d.height);
            this.el.object3D.rotation.set(0, 0, (d.routeAngle + d.faceOffset) * Math.PI / 180);
        } else {
            if (this.isVisible) {
                this.el.setAttribute('visible', false);
                this.isVisible = false;
            }
        }
    }
});