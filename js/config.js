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
    
    // ゲーム機能拡張設定（今回追加したゲーム要素用）
    game: {
        duration: 10,       // ゲームの制限時間（秒）
        maxTargets: 7,      // 同時に出現できる最大数
        spawnInterval: 600, // ポップ頻度（ミリ秒）
        
        // ★ ゲームモードで出現する獲物と、背景として残すキャラクター
        catchTarget: "hotarin2", 
        backgroundTargets: [
            { id: "hotarin", count: 1 }
        ],

        hashtags: "#横浜ビジネスパーク夏祭り #ほたりん #YBPプラモ部",
        resultMessages: [
            { min: 20, text: "すごい！虫取り名人ですね♪" },
            { min: 10, text: "よくできました！あともう一息！" },
            { min: 5,  text: "なかなかやりますね！次はもっと捕まえられるかも！" },
            { min: 0,  text: "まだまだです。もっとがんばりましょう" }
        ]
    }
};

