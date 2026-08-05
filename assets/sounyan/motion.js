// assets/sounyan/motion.js
AFRAME.registerComponent('sounyan-logic', {
    schema: {
        // --- 位置とサイズのコントロール ---
        // デフォルト値は駅（-1.5, 1.0）の近くになるように設定しています
        posX: { type: 'number', default: -1.5 },       // X座標
        posY: { type: 'number', default: 0.6 },        // Y座標
        height: { type: 'number', default: 0 },        // Z座標（高さ）

        rotX: { type: 'number', default: 0 },          // X軸の回転
        rotY: { type: 'number', default: 0 },          // Y軸の回転
        rotZ: { type: 'number', default: 0 },          // Z軸の回転（向き）

        modelScale: { type: 'number', default: 0.3 },  // モデルの大きさ

        showDebugBox: { type: 'boolean', default: false } // システム統一用
    },

    init: function () {
        // ★ 初期スケールを適用 (GPSモードの時は0.25、ジオラマ時は0.3)
        const s = (window.AR_MODE === 'gps') ? 0.25 : this.data.modelScale;
        this.el.setAttribute('scale', { x: s, y: s, z: s });

        // ★ 初期位置と回転を適用
        this.applyTransform();
    },

    update: function () {
        // index.html等からパラメータが変更された場合に位置や大きさを再適用する
        const s = (window.AR_MODE === 'gps') ? 0.25 : this.data.modelScale;
        this.el.setAttribute('scale', { x: s, y: s, z: s });
        this.applyTransform();
    },

    applyTransform: function () {
        const d = this.data;
        // 位置を設定
        this.el.object3D.position.set(d.posX, d.posY, d.height);

        // 回転を設定 (度数法から弧度法に変換)
        const radX = d.rotX * Math.PI / 180;
        const radY = d.rotY * Math.PI / 180;
        const radZ = d.rotZ * Math.PI / 180;
        this.el.object3D.rotation.set(radX, radY, radZ);
    }
});
