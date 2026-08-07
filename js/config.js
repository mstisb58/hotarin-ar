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

    // キャラクターの基本設定 (行動範囲などは実際の現実空間のメートル単位で指定)
    characters: {
        hotarin: {
            flightRadiusMeters: 0.2, // 飛行範囲の半径 (0.2 = 20cm / 直径40cmの円筒)
            minHeightMeters: 0.05,   // 飛行する最小の高さ (0.05 = 5cm)
            maxHeightMeters: 0.35,   // 飛行する最大の高さ (0.35 = 35cm)
            modelScale: 0.6,         // 3Dモデル自体の表示サイズ倍率
            speed: 0.5               // 鑑賞用：ゆっくり優雅に飛ぶ
        },
        hotarin2: {
            flightRadiusMeters: 0.2, // ゲームモード用も同じ円筒範囲
            minHeightMeters: 0.05,
            maxHeightMeters: 0.35,
            modelScale: 0.2,         // ちびほたりん (さらに小さく)
            speed: 1.6               // 早すぎたため少しマイルドに調整
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

    // 等身大・周囲 (Surround) モード設定
    // 自分の周り (半径40mなど、かなり遠く) に等身大のキャラクターを飛ばす
    surround: {
        flightRadiusMeters: 40.0,
        minHeightMeters: 5.0,
        maxHeightMeters: 15.0,
        modelScale: 10.0, // 等身大
        speed: 0.5
    },

    // 周囲 (Surround) ゲームモード用の設定
    // 周囲を旋回するが、捕まえられる程度の近さにする
    surroundGame: {
        flightRadiusMeters: 4.0, // 4m先
        minHeightMeters: 0.5,    // 子供の手が届きそうな高さ
        maxHeightMeters: 2.5,
        modelScale: 1.5,         // 少し大きめ
        speed: 1.2               // やや速め
    },

    // ゲームモード設定
    game: {
        duration: 10,       // 制限時間（秒）
        maxTargets: 7,      // 同時出現最大数
        spawnInterval: 600, // ポップ間隔（ミリ秒）

        catchTarget: "hotarin2", // 獲物キャラクターID
        backgroundTargets: [],

        hashtags: "#横浜ビジネスパーク夏祭り #ほたりん #YBPプラモ部 #楽園夏祭",
        resultMessages: [
            { min: 20, text: "すごい！虫取り名人ですね♪" },
            { min: 10, text: "よくできました！あともう一息！" },
            { min: 5,  text: "なかなかやりますね！次はもっと捕まえられるかも！" },
            { min: 0,  text: "まだまだです。もっとがんばりましょう" }
        ]
    }
};
