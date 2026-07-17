AFRAME.registerComponent('hotarin2-logic', {
    schema: {
        dioramaWidth: { type: 'number', default: 1 }, // 30cm (1だと大きすぎるかも)
        dioramaDepth: { type: 'number', default: 1 },
        minHeight: { type: 'number', default: 0.05 },
        maxHeight: { type: 'number', default: 0.5 },
        modelScale: { type: 'number', default: 0.1 }, // ゲーム用：ちびほたりん
        seed: { type: 'number', default: 1 },
        debugColor: { type: 'color', default: '#ff0000' },
        speed: { type: 'number', default: 1 }, // ゲーム用：素早く飛び回る
        showDebugBox: { type: 'boolean', default: false }
    },

    init: function () {
        // スケール適用 (GPSモードの時は0.4(4倍)、ジオラマ時は0.1)
        const s = (window.AR_MODE === 'gps') ? 0.4 : this.data.modelScale;
        this.el.setAttribute('scale', { x: s, y: s, z: s });
        
        // 高度の上限 (GPSモード時は0.3、ジオラマ時は0.5)
        this.maxHeight = (window.AR_MODE === 'gps') ? 0.3 : this.data.maxHeight;

        // デバッグ用ボックスのエンティティを一つ作っておく
        this.debugVisual = document.createElement('a-entity');
        this.el.parentNode.appendChild(this.debugVisual);
    },

    update: function () {
        const d = this.data;
        if (d.showDebugBox) {
            const zRange = Math.abs(this.maxHeight - d.minHeight);
            const zCenter = (this.maxHeight + d.minHeight) / 2;

            // 形状を設定
            this.debugVisual.setAttribute('geometry', {
                primitive: 'box',
                width: d.dioramaWidth,
                height: d.dioramaDepth,
                depth: zRange
            });
            // マテリアルを設定
            this.debugVisual.setAttribute('material', {
                color: d.debugColor,
                wireframe: true,
                opacity: 0.8,
                transparent: true
            });
            // 位置を設定（ターゲットの中心からの相対位置）
            this.debugVisual.setAttribute('position', { x: 0, y: 0, z: zCenter });
            this.debugVisual.setAttribute('visible', true);
        } else {
            this.debugVisual.setAttribute('visible', false);
        }
    },

    tick: function (time, delta) {
        const d = this.data;
        const timeOffset = d.seed * 1234.5;
        const t = (((Date.now() / 1000) + timeOffset) % 100000) * d.speed;

        const lx = d.dioramaWidth / 2;
        const ly = d.dioramaDepth / 2;
        const cz = (this.maxHeight + d.minHeight) / 2;
        const rz = (this.maxHeight - d.minHeight) / 2;

        // 動きを複雑で不規則にする（サイン波の係数を複雑化）
        const px = ((Math.sin(t * 1.6) + Math.cos(t * 2.2)) / 2) * lx;
        const py = ((Math.sin(t * 2.1) + Math.cos(t * 1.5)) / 2) * ly;
        const pz = cz + ((Math.sin(t * 1.8) + Math.cos(t * 1.4)) / 2) * rz;

        const nt = t + 0.02;
        const nx = ((Math.sin(nt * 1.6) + Math.cos(nt * 2.2)) / 2) * lx;
        const ny = ((Math.sin(nt * 2.1) + Math.cos(nt * 1.5)) / 2) * ly;
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