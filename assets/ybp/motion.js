// assets/ybp/motion.js
AFRAME.registerComponent('ybp-logic', {
    schema: {
        // 静止ARとしての位置・回転・スケールのコントロール
        posX: { type: 'number', default: 0 },
        posY: { type: 'number', default: 0 },
        height: { type: 'number', default: -1 },

        rotX: { type: 'number', default: 90 },
        rotY: { type: 'number', default: 0 },
        rotZ: { type: 'number', default: 0 }, // 回転角度



        // サイズをX,Y,Zそれぞれ個別に指定
        scaleX: { type: 'number', default: 0.2 },
        scaleY: { type: 'number', default: 0.2 },
        scaleZ: { type: 'number', default: 0.2 },

        showDebugBox: { type: 'boolean', default: false }
    },

    init: function () {
        this.applyTransform();
    },

    update: function () {
        this.applyTransform();
    },

    applyTransform: function () {
        const d = this.data;
        // 個別にスケール適用
        this.el.setAttribute('scale', { x: d.scaleX, y: d.scaleY, z: d.scaleZ });

        // 位置適用 (Z軸高さがheight)
        this.el.object3D.position.set(d.posX, d.posY, d.height);

        // 回転適用 (度数法から弧度法)
        const radX = d.rotX * Math.PI / 180;
        const radY = d.rotY * Math.PI / 180;
        const radZ = d.rotZ * Math.PI / 180;
        this.el.object3D.rotation.set(radX, radY, radZ);
    }
});
