window.AppConfig = {
    // ARコア設定（Ver2相当の基本システム用）
    core: {
        // システム全体で読み込むキャラ名（フォルダ名）のリスト
        arsystem: ["hotarin", "hotarin2", "train", "sounyan", "ybp"],
        masterMind: "./assets/target.mind",
        
        // ★ 鑑賞モードで表示するキャラクターとその出現数・パラメータ
        viewModeTargets: [
            { id: "hotarin", count: 2 },
            { id: "train", params: "posY: 1.0; routeAngle: 0; showBuildings: true; buildingOffsetY: -0.125;" },  // 上り線（建物を表示し、下り線との中間に建物をずらす）
            { id: "train", params: "posY: 0.75; routeAngle: 180; interval: 12; showBuildings: false;" },       // 下り線（建物は非表示）
            { id: "sounyan" },
            { id: "ybp", baseRot: "0 0 0" } // motion.jsの数値を優先するためparams指定を削除
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
            { id: "train", params: "posY: 1.0; routeAngle: 0; showBuildings: true; buildingOffsetY: -0.125;" },
            { id: "train", params: "posY: 0.75; routeAngle: 180; interval: 12; showBuildings: false;" },
            { id: "sounyan" },
            { id: "ybp", baseRot: "0 0 0" }
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
