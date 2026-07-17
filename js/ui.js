// UIおよび画面操作モジュール
window.UIManager = {
    currentMode: 'view',
    lastTouchTime: 0,
    resultImageBlob: null,
    resultImageUrl: null,
    
    init: function() {
        this.bindEvents();
        // 初期状態は鑑賞モード
        this.startViewModeUI();
    },
    
    bindEvents: function() {
        const handleInteraction = (e) => {
            if(this.currentMode === 'game') {
                // タッチとクリックの重複処理を防止
                if (e.type === 'touchstart') {
                    this.lastTouchTime = Date.now();
                } else if (e.type === 'click' && Date.now() - this.lastTouchTime < 300) {
                    return;
                }

                // UIクリック時は反応させない
                if(e.target.closest('#mode-toggle-btn') || e.target.closest('#capture-btn') || e.target.closest('#info-btn') || e.target.closest('#settings-btn') || e.target.closest('#settings-modal') || e.target.closest('.share-btn') || e.target.closest('.result-buttons')) return;
                
                // 座標の取得
                let clientX, clientY;
                if (e.touches && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                this.showBugNet(clientX, clientY);
                // 当たり判定をGameModuleに委譲
                if(window.GameModule) window.GameModule.handleInteraction(clientX, clientY);
            }
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction, { passive: false });
    },
    
    toggleMode: function() {
        if (this.currentMode === 'view' || this.currentMode === 'result') {
            this.startGameModeUI();
        } else {
            this.startViewModeUI();
        }
    },
    
    startViewModeUI: function() {
        this.currentMode = 'view';
        if(window.GameModule) window.GameModule.clearTimers();
        if (window.AR_MODE !== 'gps') {
            window.ARCore.startViewMode();
        }
        
        document.getElementById('result-screen').classList.add('hidden');
        document.getElementById('score-display').classList.add('hidden');
        document.getElementById('timer-display').classList.add('hidden');
        document.getElementById('capture-btn').classList.remove('hidden'); 
        
        const toggleBtn = document.getElementById('mode-toggle-btn');
        if (window.AR_MODE === 'gps') {
            toggleBtn.classList.add('hidden');
        } else {
            toggleBtn.classList.remove('hidden');
            toggleBtn.innerText = "ゲームモードにする";
        }
    },
    
    startGameModeUI: function() {
        this.currentMode = 'game';
        
        document.getElementById('result-screen').classList.add('hidden');
        document.getElementById('capture-btn').classList.add('hidden'); 
        document.getElementById('mode-toggle-btn').classList.add('hidden'); 
        document.getElementById('score-display').classList.remove('hidden');
        document.getElementById('timer-display').classList.remove('hidden');
        
        if(window.GameModule) window.GameModule.startGameMode();
    },

    updateScoreUI: function(score) {
        document.getElementById('score-display').innerText = `捕まえた数: ${score}`;
    },

    updateTimerUI: function(timeLeft) {
        const timerEl = document.getElementById('timer-display');
        timerEl.innerText = `残り時間: ${timeLeft}秒`;
        if (timeLeft <= 3) {
            timerEl.style.background = 'rgba(255, 0, 0, 1)';
        } else {
            timerEl.style.background = 'rgba(255, 100, 100, 0.9)';
        }
    },

    showResultScreen: function(score) {
        const resultScreen = document.getElementById('result-screen');
        const resultScore = document.getElementById('result-score');
        const resultMessage = document.getElementById('result-message');
        
        resultScore.innerText = `${score} 匹捕まえた！`;
        
        const msgs = window.AppConfig.game.resultMessages;
        let msg = msgs[msgs.length - 1].text;
        for (let i = 0; i < msgs.length; i++) {
            if (score >= msgs[i].min) {
                msg = msgs[i].text;
                break;
            }
        }
        resultMessage.innerText = msg;
        
        resultScreen.classList.remove('hidden');
    },

    captureResultImage: function(score) {
        const scene = document.querySelector('a-scene');
        const video = document.querySelector('video');
        if(!video || !scene.renderer) return;
        
        scene.renderer.render(scene.object3D, scene.camera);
        
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        
        if(video.videoWidth) {
            const videoRatio = video.videoWidth / video.videoHeight;
            const canvasRatio = canvas.width / canvas.height;
            let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight;
            
            if (videoRatio > canvasRatio) {
                sWidth = video.videoHeight * canvasRatio;
                sx = (video.videoWidth - sWidth) / 2;
            } else {
                sHeight = video.videoWidth / canvasRatio;
                sy = (video.videoHeight - sHeight) / 2;
            }
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(scene.canvas, 0, 0, canvas.width, canvas.height);
        
        const bgHeight = 160;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, canvas.height - bgHeight, canvas.width, bgHeight);
        
        ctx.fillStyle = '#ff9800';
        const fontSize = Math.min(canvas.width * 0.08, 50); 
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`ほたりんを ${score}匹 捕まえた！`, canvas.width / 2, canvas.height - 90);
        
        const hashSize = Math.min(canvas.width * 0.04, 24);
        ctx.font = `bold ${hashSize}px sans-serif`;
        ctx.fillStyle = '#333333';
        ctx.fillText(window.AppConfig.game.hashtags, canvas.width / 2, canvas.height - 35);
        
        canvas.toBlob((blob) => {
            this.resultImageBlob = blob;
            if(this.resultImageUrl) URL.revokeObjectURL(this.resultImageUrl);
            this.resultImageUrl = URL.createObjectURL(blob);
        }, 'image/jpeg', 0.9);
    },

    shareTo: function() {
        const score = window.GameModule ? window.GameModule.score : 0;
        const hashtags = window.AppConfig.game.hashtags;
        const text = `ARでほたりんを ${score}匹 捕まえたよ！\n${hashtags}`;
        const url = window.location.href;
        
        if (navigator.canShare && this.resultImageBlob) {
            const file = new File([this.resultImageBlob], `hotarin_result_${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({
                    title: 'ほたりん虫取りゲーム',
                    text: text,
                    url: url,
                    files: [file]
                }).catch(console.error);
                return; 
            }
        }
        
        if (this.resultImageUrl) {
            const link = document.createElement('a');
            link.download = `hotarin_result_${Date.now()}.jpg`;
            link.href = this.resultImageUrl;
            link.click();
            alert('結果画像をダウンロードしました。\nお好きなSNSを開いて、画像を添付して投稿してください！\n\n【おすすめハッシュタグ】\n' + hashtags);
        }
    },

    showBugNet: function(x, y) {
        const net = document.createElement('div');
        net.innerText = '🕸️';
        net.style.position = 'fixed';
        net.style.left = (x - 25) + 'px';
        net.style.top = (y - 25) + 'px';
        net.style.fontSize = '50px';
        net.style.pointerEvents = 'none';
        net.style.zIndex = '2000';
        net.style.transition = 'all 0.3s ease-out';
        net.style.transform = 'scale(0)';
        document.body.appendChild(net);

        setTimeout(() => {
            net.style.transform = 'scale(1) rotate(-45deg)';
            net.style.opacity = '1';
        }, 10);
        setTimeout(() => {
            net.style.transform = 'scale(1.2) rotate(0deg)';
            net.style.opacity = '0';
        }, 300);
        setTimeout(() => {
            net.remove();
        }, 600);
    },

    takePhoto: function() {
        const scene = document.querySelector('a-scene');
        const video = document.querySelector('video');
        if(!video) return;
        scene.renderer.render(scene.object3D, scene.camera);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(scene.canvas, 0, 0, canvas.width, canvas.height);
        const link = document.createElement('a');
        link.download = `ar-capture-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    },

    handleTestModeChange: function(checked) {
        if (window.AR_MODE === 'gps') {
            alert("GPSの基準点を再設定するため、ページをリロードします。");
            window.location.reload();
        } else {
            const scene = document.querySelector('a-scene');
            if (scene) {
                const components = ['hotarin-logic', 'hotarin2-logic', 'train-logic', 'sounyan-logic', 'ybp-logic'];
                components.forEach(comp => {
                    const entities = scene.querySelectorAll(`[${comp}]`);
                    entities.forEach(el => {
                        el.setAttribute(comp, 'showDebugBox', checked);
                    });
                });
            }
            // 仮想アンカーの親付け替え同期処理を追加
            if (window.ARCore && typeof window.ARCore.updateAnchorParenting === 'function') {
                window.ARCore.updateAnchorParenting();
            }
        }
    }
};

// HTMLのonclick属性から呼べるようにするグローバル関数
window.toggleMode = () => { window.UIManager.toggleMode(); };
window.startViewMode = () => { window.UIManager.startViewModeUI(); };
window.startGameMode = () => { window.UIManager.startGameModeUI(); };
window.shareTo = () => { window.UIManager.shareTo(); };
window.takePhoto = () => { window.UIManager.takePhoto(); };
window.toggleCredits = () => { document.querySelector('#credits-info').classList.toggle('hidden'); };
