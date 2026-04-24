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

        debugColor: { type: 'color', default: '#ff00ff' },
        showDebugBox: { type: 'boolean', default: false }
    },

    init: function () {
        this.debugVisual = document.createElement('a-entity');
        this.el.parentNode.appendChild(this.debugVisual);
        this.isVisible = true;

        // ★ 重要：自身のエンティティにスケールを適用
        const s = this.data.modelScale;
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