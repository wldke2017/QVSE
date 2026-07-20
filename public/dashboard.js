document.addEventListener('DOMContentLoaded', function () {

    // === Mini Chart Rendering ===
    function drawMiniChart(containerId, dataPoints, color) {
        var container = document.getElementById(containerId);
        if (!container) return;

        var width = 80;
        var height = 36;
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        svg.style.display = 'block';

        var min = Math.min.apply(null, dataPoints);
        var max = Math.max.apply(null, dataPoints);
        var range = max - min || 1;

        var points = dataPoints.map(function (val, i) {
            var x = (i / (dataPoints.length - 1)) * width;
            var y = height - ((val - min) / range) * (height - 4) - 2;
            return x + ',' + y;
        }).join(' ');

        var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', '2');
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');

        svg.appendChild(polyline);
        container.appendChild(svg);
    }

    // Generate random-ish chart data
    function generateChartData(seed, trend) {
        var data = [];
        var val = seed;
        for (var i = 0; i < 20; i++) {
            val += (Math.random() - 0.45) * trend;
            data.push(val);
        }
        return data;
    }

    // Draw charts
    drawMiniChart('btcChart', generateChartData(50, 2), '#4caf50');
    drawMiniChart('ethChart', generateChartData(45, 1.8), '#4caf50');
    drawMiniChart('solChart', generateChartData(55, -0.5), '#f44336');
    drawMiniChart('xrpChart', generateChartData(30, 3), '#4caf50');
    drawMiniChart('bnbChart', generateChartData(60, -1), '#f44336');

    // === Toast ===
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toastMessage');

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('error');
        toast.classList.add('show');
        setTimeout(function () { toast.classList.remove('show'); }, 2500);
    }

    // === Quick Action Buttons ===
    document.getElementById('depositBtn').addEventListener('click', function () {
        showToast('Deposit feature coming soon');
    });
    document.getElementById('withdrawBtn').addEventListener('click', function () {
        showToast('Withdraw feature coming soon');
    });
    document.getElementById('tradeBtn').addEventListener('click', function () {
        showToast('Trade feature coming soon');
    });
    document.getElementById('moreBtn').addEventListener('click', function () {
        showToast('More options coming soon');
    });

    // === Bottom Nav ===
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
        item.addEventListener('click', function () {
            navItems.forEach(function (n) { n.classList.remove('active'); });
            item.classList.add('active');
        });
    });

    // === Simulate live price updates ===
    function animateBalance() {
        var balanceEl = document.getElementById('portfolioBalance');
        var base = 12458.32;
        setInterval(function () {
            var change = (Math.random() - 0.48) * 15;
            base += change;
            balanceEl.textContent = '$' + base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }, 3000);
    }
    animateBalance();

    // === Market item click ===
    var marketItems = document.querySelectorAll('.market-item');
    marketItems.forEach(function (item) {
        item.addEventListener('click', function () {
            var coinName = item.querySelector('.coin-name').textContent;
            showToast(coinName + ' details coming soon');
        });
    });
});
