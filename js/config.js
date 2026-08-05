window.AppConfig = {
    // アプリケーションバージョン設定（GitHub Pages表示用）
    version: "v4.13",
    commitHash: "9fb0a8a",
    repoUrl: "https://github.com/mstisb58/hotarin-ar",

    // テストモード設定の初期値
    testModeDefaults: {
        showBounds: true,
        virtualNFT: true
    },

    // ARコア設定（Ver2相当の基本システム用）
    core: {
        // システム全体で読み込むキャラ名（フォルダ名）のリスト（ほたりん専用に最適化）
        arsystem: ["hotarin", "hotarin2"],
        masterMind: "./assets/target.mind", 
        
        // ★ 鑑賞モードで表示するキャラクターとその出現数・パラメータ
        viewModeTargets: [
            { id: "hotarin", count: 2 }
        ]
    },

    // 実空間ARの基準。ジオラマ1mを100m相当に拡大してYBP周辺へ配置する。
    outdoor: {
        center: {
            latitude: 35.454332476881056,
            longitude: 139.59818021935607
        },
        worldScale: 100,
        geolocationOptions: {
            enableHighAccuracy: true,
            timeout: 7000,
            maximumAge: 0
        }
    },
    
    // ゲーム機能拡張設定（今回追加したゲーム要素用）
    game: {
        duration: 10,       // ゲームの制限時間（秒）
        maxTargets: 7,      // 同時に出現できる最大数
        spawnInterval: 600, // ポップ頻度（ミリ秒）
        
        // ★ ゲームモードで出現する獲物（ちびほたりんのみ）
        catchTarget: "hotarin2", 
        backgroundTargets: [],

        hashtags: "#横浜ビジネスパーク夏祭り #ほたりん #YBPプラモ部",
        resultMessages: [
            { min: 20, text: "すごい！虫取り名人ですね♪" },
            { min: 10, text: "よくできました！あともう一息！" },
            { min: 5,  text: "なかなかやりますね！次はもっと捕まえられるかも！" },
            { min: 0,  text: "まだまだです。もっとがんばりましょう" }
        ]
    }
};

// プログラム上のモード階層:
// 1. 空間（ジオラマ / 外）→ 2. 環境（テスト / 実装）→ 3. 体験（鑑賞 / ゲーム）
// UIでは操作頻度の高い体験切り替えを前面に出すが、判定はこの順序で行う。
window.AppMode = {
    get spaceMode() {
        return window.AR_MODE === 'gps' ? 'outdoor' : 'diorama';
    },

    get environmentMode() {
        return window.TestMode ? 'test' : 'implementation';
    },

    get experienceMode() {
        return window.UIManager ? window.UIManager.experienceMode : 'view';
    },

    get hierarchy() {
        return [this.spaceMode, this.environmentMode, this.experienceMode];
    },

    isOutdoor: function() {
        return this.spaceMode === 'outdoor';
    },

    isTest: function() {
        return this.environmentMode === 'test';
    }
};

