// プログラム上のモード階層を一か所から参照する。
// 空間（ジオラマ / 外）→ 環境（テスト / 実装）→ 体験（鑑賞 / ゲーム）
window.AppMode = {
    get space() {
        return window.AR_MODE === 'gps' ? 'outdoor' : 'diorama';
    },

    get environment() {
        return window.TestMode ? 'test' : 'implementation';
    },

    get experience() {
        return window.UIManager ? window.UIManager.experienceMode : 'view';
    },

    get hierarchy() {
        return [this.space, this.environment, this.experience];
    },

    isOutdoor: function() {
        return this.space === 'outdoor';
    },

    isTest: function() {
        return this.environment === 'test';
    }
};
