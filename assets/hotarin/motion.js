AFRAME.registerComponent('hotarin-logic', {
    schema: {
        flightRadiusMeters: { type: 'number', default: 0.2 },
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

    // 内部座標スケールへの変換係数
    getScaleFactor: function() {
        if (window.AR_MODE === 'surround') return 1;
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
                primitive: 'cylinder',
                radius: d.flightRadiusMeters * scale,
                height: zRange
            });
            // A-FrameのcylinderはY軸方向（縦）に伸びるため、ARのZ軸方向に向けるため90度回転
            this.debugVisual.setAttribute('rotation', '90 0 0');
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

        // 円筒形の内部座標サイズ
        const rMax = d.flightRadiusMeters * scale;
        const cz = ((d.maxHeightMeters + d.minHeightMeters) / 2) * scale;
        const rz = ((d.maxHeightMeters - d.minHeightMeters) / 2) * scale;

        // 極座標 (半径と角度) を使って円筒内に収める
        // 半径は rMax 内でゆらぐ
        const radius = (0.5 + 0.5 * Math.sin(t * 0.7)) * rMax;
        // 角度は時間と共に回転しつつ、少し揺らぐ
        const theta = t * 0.8 + Math.sin(t * 0.5);

        const px = radius * Math.cos(theta);
        const py = radius * Math.sin(theta);
        const pz = cz + ((Math.sin(t * 0.8) + Math.cos(t * 0.4)) / 2) * rz;

        // 進行方向の計算
        const nt = t + 0.02;
        const nRadius = (0.5 + 0.5 * Math.sin(nt * 0.7)) * rMax;
        const nTheta = nt * 0.8 + Math.sin(nt * 0.5);
        const nx = nRadius * Math.cos(nTheta);
        const ny = nRadius * Math.sin(nTheta);
        const angle = Math.atan2(ny - py, nx - px) * 180 / Math.PI;

        this.el.object3D.position.set(px, py, pz);
        this.el.object3D.rotation.set(0, 0, angle * Math.PI / 180);

        // GPSテストモード時、中心（0, 0, 0）から自機までの緑線を描画する
        if (window.AR_MODE === 'surround' && window.TestMode) {
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