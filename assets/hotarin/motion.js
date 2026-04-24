AFRAME.registerComponent('hotarin-logic', {
    schema: {
        dioramaWidth: { type: 'number', default: 1}, // 30cm (1だと大きすぎるかも)
        dioramaDepth: { type: 'number', default: 1 },
        minHeight: { type: 'number', default: 0.05 },
        maxHeight: { type: 'number', default: 0.5 },
        modelScale: { type: 'number', default: 0.1 }, 
        seed: { type: 'number', default: 0 },
        debugColor: { type: 'color', default: '#00ff00' }, 
        speed: { type: 'number', default: 1.0 },
        showDebugBox: { type: 'boolean', default: false }
    },

    init: function () {
        // スケール適用
        const s = this.data.modelScale;
        this.el.setAttribute('scale', { x: s, y: s, z: s });
        
        // デバッグ用ボックスのエンティティを一つ作っておく
        this.debugVisual = document.createElement('a-entity');
        this.el.parentNode.appendChild(this.debugVisual);
    },

    update: function () {
        const d = this.data;
        if (d.showDebugBox) {
            const zRange = Math.abs(d.maxHeight - d.minHeight);
            const zCenter = (d.maxHeight + d.minHeight) / 2;

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
        const cz = (d.maxHeight + d.minHeight) / 2;
        const rz = (d.maxHeight - d.minHeight) / 2;

        const px = ((Math.sin(t * 0.6) + Math.cos(t * 1.2)) / 2) * lx;
        const py = ((Math.sin(t * 1.1) + Math.cos(t * 0.5)) / 2) * ly;
        const pz = cz + ((Math.sin(t * 0.8) + Math.cos(t * 0.4)) / 2) * rz;

        const nt = t + 0.02;
        const nx = ((Math.sin(nt * 0.6) + Math.cos(nt * 1.2)) / 2) * lx;
        const ny = ((Math.sin(nt * 1.1) + Math.cos(nt * 0.5)) / 2) * ly;
        const angle = Math.atan2(ny - py, nx - px) * 180 / Math.PI;

        this.el.object3D.position.set(px, py, pz);
        this.el.object3D.rotation.set(0, 0, angle * Math.PI / 180);
    }
});