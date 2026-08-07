/**
 * アプリケーション設定オブジェクト (AppConfig)
 */
window.AppConfig = {
    // バージョン情報 (GitHub Pages 表示用)
    version: "v4.13",
    commitHash: "9fb0a8a",
    repoUrl: "https://github.com/mstisb58/hotarin-ar",

    // テストモードデフォルト設定
    testModeDefaults: {
        showBounds: true
    },

    // ジオラマモード (MindAR) 設定
    // MindARではローカル1単位が認識画像の幅。
    diorama: {
        targetWidthMeters: 0.3,
        testAnchorDistanceMeters: 1.2,
        testAnchorVerticalOffsetMeters: -0.1
    },

    // モーションとデバッグ表示で共有する相対寸法設定 (NFT幅1を基準)
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
            modelScale: 0.2, // ちびほたりん (さらに小さく)
            speed: 2.5       // ゲームモード用に素早く飛ぶ
        }
    },

    // ARコア基本設定
    core: {
        arsystem: ["hotarin", "hotarin2"],
        masterMind: "./assets/target.mind",

        // 鑑賞モードで出現するキャラクター・個数
        viewModeTargets: [
            { id: "hotarin", count: 2 }
        ]
    },

    // 屋外空間 (GPS AR.js) 設定
    // ジオラマ1mを100m相当に拡大してYBP周辺へ配置
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

    // ゲームモード設定
    game: {
        duration: 10,       // 制限時間（秒）
        maxTargets: 7,      // 同時出現最大数
        spawnInterval: 600, // ポップ間隔（ミリ秒）

        catchTarget: "hotarin2", // 獲物キャラクターID
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
