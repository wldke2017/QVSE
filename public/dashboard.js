document.addEventListener('DOMContentLoaded', function () {

    // === Coin Dataset ===
    var coins = [
        { id: 'BTC', name: 'BTC', pair: 'BTC/USDT', price: 65091.80, change: 1.05, color: '#f7931a' },
        { id: 'ETH', name: 'ETH', pair: 'ETH/USDT', price: 1894.56, change: 1.88, color: '#627eea' },
        { id: 'TRUMP', name: 'TRUMP', pair: 'TRUMP/USDT', price: 1.60, change: -1.90, color: '#e8aa3a' },
        { id: 'XTZ', name: 'XTZ', pair: 'XTZ/USDT', price: 0.23, change: -0.62, color: '#0f62ff' },
        { id: 'ADA', name: 'ADA', pair: 'ADA/USDT', price: 0.17, change: 1.52, color: '#0033ad' },
        { id: 'TRX', name: 'TRX', pair: 'TRX/USDT', price: 0.33, change: 0.00, color: '#ef0027' },
        { id: 'BNB', name: 'BNB', pair: 'BNB/USDT', price: 571.55, change: 0.60, color: '#f3ba2f' },
        { id: 'YFI', name: 'YFI', pair: 'YFI/USDT', price: 2111.58, change: 1.14, color: '#006ae3' },
        { id: 'A', name: 'A', pair: 'A/USDT', price: 0.07, change: 0.30, color: '#2ebac6' },
        { id: 'MELANIA', name: 'MELANIA', pair: 'MELANIA/USDT', price: 0.08, change: -0.63, color: '#e8417c' },
        { id: 'ETC', name: 'ETC', pair: 'ETC/USDT', price: 6.96, change: 0.29, color: '#34fa99' },
        { id: 'XRP', name: 'XRP', pair: 'XRP/USDT', price: 1.11, change: 2.05, color: '#23292f' },
        { id: 'SOL', name: 'SOL', pair: 'SOL/USDT', price: 77.41, change: 2.09, color: '#14f195' },
        { id: 'USDC', name: 'USDC', pair: 'USDC/USDT', price: 1.00, change: 0.00, color: '#2775ca' },
        { id: 'LTC', name: 'LTC', pair: 'LTC/USDT', price: 47.12, change: -0.88, color: '#bebebe' },
        { id: 'KNC', name: 'KNC', pair: 'KNC/USDT', price: 0.11, change: -1.10, color: '#11cd98' },
        { id: 'DOGE', name: 'DOGE', pair: 'DOGE/USDT', price: 0.07, change: -0.68, color: '#c2a633' },
        { id: 'VET', name: 'VET', pair: 'VET/USDT', price: 0.02, change: 0.64, color: '#15bdff' },
        { id: 'SHIB', name: 'SHIB', pair: 'SHIB/USDT', price: 0.000018, change: 2.42, color: '#ff6200' },
        { id: 'QTUM', name: 'QTUM', pair: 'QTUM/USDT', price: 0.72, change: -0.58, color: '#229cfb' }
    ];

    // Historical points for sparkline trends
    var historyData = {};

    function initHistory() {
        coins.forEach(function (coin) {
            var points = [];
            var curr = coin.price;
            for (var i = 0; i < 12; i++) {
                curr = curr * (1 + (Math.random() * 0.03 - 0.015));
                points.push(curr);
            }
            historyData[coin.id] = points;
        });
    }

    // === Render Sparklines on Canvas ===
    function drawSparkline(canvasId, points, isPositive) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        var width = canvas.width;
        var height = canvas.height;
        
        var min = Math.min.apply(null, points);
        var max = Math.max.apply(null, points);
        var range = max - min === 0 ? 1 : max - min;

        ctx.beginPath();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = isPositive ? '#00c896' : '#ff4a5a';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        points.forEach(function (val, idx) {
            var x = (idx / (points.length - 1)) * width;
            var y = height - ((val - min) / range) * (height - 6) - 3;
            if (idx === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    }

    // === Render Coin List in HTML ===
    function renderCoinList() {
        var coinList = document.getElementById('coinList');
        if (!coinList) return;
        coinList.innerHTML = '';

        coins.forEach(function (coin) {
            var points = historyData[coin.id];
            var isPositive = coin.change >= 0;
            var changeClass = isPositive ? 'dash-change-up' : 'dash-change-down';
            var changeSign = isPositive ? '+' : '';
            
            // Format price: handling very small decimal values like SHIB
            var formattedPrice = coin.price >= 1 ? coin.price.toFixed(2) : coin.price.toFixed(6);

            var row = document.createElement('div');
            row.className = 'dash-coin-row';
            row.innerHTML = `
                <div class="dash-coin-info">
                    <div class="dash-coin-icon" style="background-color: ${coin.color}">
                        ${coin.id.substring(0, 2)}
                    </div>
                    <div class="dash-coin-meta">
                        <span class="dash-coin-name">${coin.name}</span>
                        <span class="dash-coin-pair">${coin.pair}</span>
                    </div>
                </div>
                <div class="dash-coin-trend">
                    <canvas id="canvas-${coin.id}" class="dash-trend-canvas" width="72" height="28"></canvas>
                </div>
                <div class="dash-coin-price-block">
                    <span class="dash-price-val" id="price-${coin.id}">$${formattedPrice}</span>
                    <span class="dash-price-change ${changeClass}">${changeSign}${coin.change.toFixed(2)}%</span>
                </div>
            `;
            coinList.appendChild(row);
            drawSparkline('canvas-' + coin.id, points, isPositive);

            // Add click action to row
            row.addEventListener('click', function () {
                showToast(coin.name + ' trading details coming soon!');
            });
        });
    }

    // === Real-time Price Fluctuations ===
    function updatePrices() {
        coins.forEach(function (coin) {
            var changePercent = (Math.random() * 0.006 - 0.003); // -0.3% to +0.3%
            var oldPrice = coin.price;
            coin.price = coin.price * (1 + changePercent);
            
            var points = historyData[coin.id];
            points.shift();
            points.push(coin.price);
            
            var startVal = points[0];
            coin.change = ((coin.price - startVal) / startVal) * 100;

            var priceEl = document.getElementById('price-' + coin.id);
            if (priceEl) {
                var formattedPrice = coin.price >= 1 ? coin.price.toFixed(2) : coin.price.toFixed(6);
                priceEl.textContent = '$' + formattedPrice;
                
                // Color flash visual indication
                if (coin.price > oldPrice) {
                    priceEl.style.color = '#00c896';
                } else {
                    priceEl.style.color = '#ff4a5a';
                }
                
                // Reset text color after short flash duration
                setTimeout(function () {
                    priceEl.style.color = '#ffffff';
                }, 250);
            }
            
            drawSparkline('canvas-' + coin.id, points, coin.change >= 0);
        });

        // Update change indicators
        var rows = document.querySelectorAll('.dash-coin-row');
        coins.forEach(function (coin, idx) {
            var row = rows[idx];
            if (!row) return;
            var changeEl = row.querySelector('.dash-price-change');
            if (changeEl) {
                var isPositive = coin.change >= 0;
                changeEl.className = 'dash-price-change ' + (isPositive ? 'dash-change-up' : 'dash-change-down');
                changeEl.textContent = (isPositive ? '+' : '') + coin.change.toFixed(2) + '%';
            }
        });
    }

    // === Toast Notifications ===
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toastMessage');

    function showToast(message) {
        if (!toast || !toastMessage) return;
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(function () {
            toast.classList.remove('show');
        }, 2200);
    }

    // === Initialize State ===
    initHistory();
    renderCoinList();

    // Loop price updates every 3 seconds
    setInterval(updatePrices, 3000);

    // === Top Menu Handlers ===
    var depositBtn = document.getElementById('depositBtn');
    var shareBtn = document.getElementById('shareBtn');
    var supportBtn = document.getElementById('supportBtn');
    var withdrawBtn = document.getElementById('withdrawBtn');
    var profileBtn = document.getElementById('profileBtn');

    if (depositBtn) depositBtn.addEventListener('click', function () { showToast('Deposit option coming soon!'); });
    if (shareBtn) shareBtn.addEventListener('click', function () { showToast('Referral link copied to clipboard!'); });
    if (supportBtn) supportBtn.addEventListener('click', function () { showToast('Connecting to online support...'); });
    if (withdrawBtn) withdrawBtn.addEventListener('click', function () { showToast('Withdrawal panel coming soon!'); });
    if (profileBtn) profileBtn.addEventListener('click', function () { showToast('Account overview coming soon!'); });

    // === Bottom Navigation Menu ===
    var navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(function (item) {
        item.addEventListener('click', function () {
            navItems.forEach(function (nav) { nav.classList.remove('active'); });
            item.classList.add('active');
            var pageName = item.querySelector('span').textContent;
            showToast(pageName + ' view activated');
        });
    });
});

