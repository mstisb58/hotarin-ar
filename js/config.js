window.AppConfig = {
    // アプリケーションバージョン設定（GitHub Pages表示用）
    version: "v4.13",
    commitHash: "9fb0a8a",
    repoUrl: "https://github.com/mstisb58/hotarin-ar",

    // テストモード設定の初期値
    testModeDefaults: {
        showBounds: true
    },

    // MindARではローカル1単位が認識画像の幅。テスト時も同じ寸法感に合わせる。
    diorama: {
        targetWidthMeters: 0.3,
        testAnchorDistanceMeters: 1.2,
        testAnchorVerticalOffsetMeters: -0.1
    },

    // モーションとデバッグ表示で共有する、NFT幅を1とした相対寸法。
    characters: {
        hotarin: {
            dioramaWidth: 1,
            dioramaDepth: 1,
            minHeight: 0.05,
            maxHeight: 0.3,
            modelScale: 0.6
        },
        hotarin2: {
            dioramaWidth: 1,
            dioramaDepth: 1,
            minHeight: 0.05,
            maxHeight: 0.3,
            modelScale: 0.4
        }
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
