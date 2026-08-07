/**
 * モード階層管理オブジェクト (AppMode)
 * 空間 (diorama/outdoor) → 環境 (test/implementation) → 体験 (view/game)
 */
window.AppMode = {
    /** @returns {'surround' | 'diorama'} */
    get space() {
        return window.AR_MODE === 'surround' ? 'surround' : 'diorama';
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
    isSurround: function() {
        return this.space === 'surround';
    },

    /** @returns {boolean} */
    isTest: function() {
        return this.environment === 'test';
    }
};
