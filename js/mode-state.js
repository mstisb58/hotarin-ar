/**
 * モード階層管理オブジェクト (AppMode)
 * 空間 (diorama/outdoor) → 環境 (test/implementation) → 体験 (view/game)
 */
window.AppMode = {
    /** @returns {'outdoor' | 'diorama'} */
    get space() {
        return window.AR_MODE === 'gps' ? 'outdoor' : 'diorama';
    },

    /** @returns {'test' | 'implementation'} */
    get environment() {
        return window.TestMode ? 'test' : 'implementation';
    },

    /** @returns {'view' | 'game'} */
    get experience() {
        return window.UIManager ? window.UIManager.experienceMode : 'view';
    },

    /** @returns {Array<string>} */
    get hierarchy() {
        return [this.space, this.environment, this.experience];
    },

    /** @returns {boolean} */
    isOutdoor: function() {
        return this.space === 'outdoor';
    },

    /** @returns {boolean} */
    isTest: function() {
        return this.environment === 'test';
    }
};
