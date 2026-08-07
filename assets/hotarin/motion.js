AFRAME.registerComponent('hotarin-logic', {
    schema: {
        flightWidthMeters: { type: 'number', default: 0.4 },
        flightDepthMeters: { type: 'number', default: 0.4 },
        minHeightMeters: { type: 'number', default: 0.05 },
        maxHeightMeters: { type: 'number', default: 0.35 },
        modelScale: { type: 'number', default: 0.6 },
        seed: { type: 'number', default: 0 },
        debugColor: { type: 'color', default: '#00ff00' }, 
        speed: { type: 'number', default: 0.5 },
        showDebugBox: { type: 'boolean', default: false }
    },

    init: function () {
        const s = this.data.modelScale;
        this.el.setAttribute('scale', { x: s, y: s, z: s });
        
        this.debugVisual = document.createElement('a-entity');
        this.el.parentNode.appendChild(this.debugVisual);
    },

    // 内部座標スケールへの変換係数 (AR.js GPS時は 1m=1。MindAR時はターゲットの物理幅で割る)
    getScaleFactor: function() {
        if (window.AR_MODE === 'gps') return 1;
        // 例: ターゲットが 0.3m なら、現実の 1m は 内部座標の 1 / 0.3 = 3.333... となる
        const targetWidth = window.AppConfig?.diorama?.targetWidthMeters || 1.0;
        return 1.0 / targetWidth;
    },

    update: function () {
        const d = this.data;
        if (d.showDebugBox) {
            const scale = this.getScaleFactor();
            const zRange = Math.abs(d.maxHeightMeters - d.minHeightMeters) * scale;
            const zCenter = ((d.maxHeightMeters + d.minHeightMeters) / 2) * scale;

            this.debugVisual.setAttribute('geometry', {
                primitive: 'box',
                width: d.flightWidthMeters * scale,
                height: d.flightDepthMeters * scale,
                depth: zRange
            });
            this.debugVisual.setAttribute('material', {
                color: d.debugColor,
                wireframe: true,
                opacity: 0.8,
                transparent: true
            });
            this.debugVisual.setAttribute('position', { x: 0, y: 0, z: zCenter });
            this.debugVisual.setAttribute('visible', true);
        } else {
            this.debugVisual.setAttribute('visible', false);
        }
    },

    tick: function (time, delta) {
        const d = this.data;
        const scale = this.getScaleFactor();
        const timeOffset = d.seed * 1234.5; 
        const t = (((Date.now() / 1000) + timeOffset) % 100000) * d.speed;

        // 内部座標空間での半径
        const lx = (d.flightWidthMeters * scale) / 2;
        const ly = (d.flightDepthMeters * scale) / 2;
        const cz = ((d.maxHeightMeters + d.minHeightMeters) / 2) * scale;
        const rz = ((d.maxHeightMeters - d.minHeightMeters) / 2) * scale;

        // XY平面は楕円/8の字軌道、Zは上下動
        const px = ((Math.sin(t * 0.6) + Math.cos(t * 1.2)) / 2) * lx;
        const py = ((Math.sin(t * 1.1) + Math.cos(t * 0.5)) / 2) * ly;
        const pz = cz + ((Math.sin(t * 0.8) + Math.cos(t * 0.4)) / 2) * rz;

        // 進行方向の計算
        const nt = t + 0.02;
        const nx = ((Math.sin(nt * 0.6) + Math.cos(nt * 1.2)) / 2) * lx;
        const ny = ((Math.sin(nt * 1.1) + Math.cos(nt * 0.5)) / 2) * ly;
        const angle = Math.atan2(ny - py, nx - px) * 180 / Math.PI;

        this.el.object3D.position.set(px, py, pz);
        this.el.object3D.rotation.set(0, 0, angle * Math.PI / 180);

        // GPSテストモード時、中心（0, 0, 0）から自機までの緑線を描画する
        if (window.AR_MODE === 'gps' && window.TestMode) {
            if (!this.lineEl) {
                this.lineEl = document.createElement('a-entity');
                this.el.parentNode.appendChild(this.lineEl);
            }
            this.lineEl.setAttribute('line', {
                start: '0 0 0',
                end: `${px} ${py} ${pz}`,
                color: '#00ff00'
            });
            this.lineEl.setAttribute('visible', true);
        } else {
            if (this.lineEl) {
                this.lineEl.setAttribute('visible', false);
            }
        }
    },

    remove: function () {
        if (this.lineEl && this.lineEl.parentNode) {
            this.lineEl.parentNode.removeChild(this.lineEl);
        }
        if (this.debugVisual && this.debugVisual.parentNode) {
            this.debugVisual.parentNode.removeChild(this.debugVisual);
        }
    }
});