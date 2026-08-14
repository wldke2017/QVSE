(function () {
    var toastEl = document.getElementById('toast');
    var toastMsg = document.getElementById('toastMsg');
    var toastIcon = document.getElementById('toastIcon');
    var tbody = document.getElementById('ratingsTableBody');
    var refreshBtn = document.getElementById('refreshBtn');
    var autoSendToggle = document.getElementById('autoSendToggle');
    var toggleStatusText = document.getElementById('toggleStatusText');

    // ── Toast ────────────────────────────────────────────
    function showToast(message, isError) {
        toastMsg.textContent = message;
        toastIcon.textContent = isError ? '✕' : '✓';
        toastEl.classList.remove('error');
        if (isError) toastEl.classList.add('error');
        toastEl.classList.add('show');
        setTimeout(function () { toastEl.classList.remove('show'); }, 3500);
    }

    // ── Load & Handle Settings ───────────────────────────
    function loadSettings() {
        fetch('/api/admin/settings')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    autoSendToggle.checked = data.auto_send;
                    updateToggleUI(data.auto_send);
                }
            })
            .catch(function () { });
    }

    function updateToggleUI(isOn) {
        toggleStatusText.textContent = isOn ? 'ON' : 'OFF';
        toggleStatusText.className = 'toggle-status-text ' + (isOn ? 'on' : 'off');
    }

    autoSendToggle.addEventListener('change', function () {
        var isChecked = autoSendToggle.checked;
        updateToggleUI(isChecked);

        fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auto_send: isChecked })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    showToast('✅ Auto-Send emails turned ' + (isChecked ? 'ON' : 'OFF'), false);
                } else {
                    showToast('❌ Failed to update auto-send setting', true);
                    autoSendToggle.checked = !isChecked;
                    updateToggleUI(!isChecked);
                }
            })
            .catch(function (err) {
                showToast('❌ Error: ' + err.message, true);
                autoSendToggle.checked = !isChecked;
                updateToggleUI(!isChecked);
            });
    });

    // ── Render star emoji ────────────────────────────────
    function renderStars(n) {
        var map = { 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐' };
        return '<span class="star-rating" title="' + n + ' stars">' + (map[n] || n + '★') + '</span>';
    }

    // ── Render contact info (email or phone) ─────────────
    function renderContact(row) {
        if (row.email) return '<span style="color:#e2e8f0;">' + escapeHtml(row.email) + '</span>';
        if (row.phone_number) return '<span style="color:#94a3b8;">📱 ' + escapeHtml(row.phone_number) + '</span>';
        return '<span style="color:#475569;">—</span>';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Render action buttons (Dual mode) ────────────────
    function renderActionButtons(row) {
        if (!row.email) {
            return '<span style="color:#475569;font-size:12px;">No email</span>';
        }
        var sent = row.email_sent === true || row.email_sent === 'true';
        var plainLabel = sent ? '✉️ Resend Plain' : '✉️ Send Plain (Inbox)';
        var richLabel = sent ? '🎨 Resend Rich' : '🎨 Send Rich (HTML)';
        
        return '<div class="btn-group">'
            + '<button class="btn-action btn-plain" data-id="' + row.id + '" data-type="text" title="Targeted to land in Gmail Primary Inbox with notifications">' + plainLabel + '</button>'
            + '<button class="btn-action btn-rich" data-id="' + row.id + '" data-type="html" title="Full rich HTML visual template">' + richLabel + '</button>'
            + '</div>';
    }

    // ── Render single table row ──────────────────────────
    function renderRow(row) {
        var feedback = row.feedback ? escapeHtml(row.feedback.substring(0, 45)) + (row.feedback.length > 45 ? '…' : '') : '<span style="color:#475569;">—</span>';
        var emailStatus = (row.email_sent === true || row.email_sent === 'true')
            ? '<span class="badge badge-success">✅ Sent</span>'
            : (row.email ? '<span class="badge badge-pending">⏳ Pending</span>' : '<span style="color:#475569;font-size:12px;">N/A</span>');

        return '<tr data-row-id="' + row.id + '">'
            + '<td>' + renderContact(row) + '<div style="font-size:11px;color:#475569;margin-top:2px;">ID #' + row.id + '</div></td>'
            + '<td>' + renderStars(row.rating) + '</td>'
            + '<td title="' + escapeHtml(row.feedback || '') + '">' + feedback + '</td>'
            + '<td>' + emailStatus + '</td>'
            + '<td style="color:#94a3b8;font-size:13px;">' + escapeHtml(row.created_at || '—') + '</td>'
            + '<td>' + renderActionButtons(row) + '</td>'
            + '</tr>';
    }

    // ── Load ratings from API ────────────────────────────
    function loadRatings() {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:40px;color:#94a3b8;">Loading...</td></tr>';

        fetch('/api/admin/ratings')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success || !data.ratings || data.ratings.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No ratings found yet.</td></tr>';
                    return;
                }
                tbody.innerHTML = data.ratings.map(renderRow).join('');
                attachButtonListeners();
            })
            .catch(function (err) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="color:#f87171;">Failed to load ratings: ' + err.message + '</td></tr>';
            });
    }

    // ── Send or Resend email ─────────────────────────────
    function sendEmail(btn, ratingId, templateType) {
        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ Sending...';
        btn.classList.add('btn-disabled');

        fetch('/api/admin/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ratingId, type: templateType })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    showToast('✅ ' + templateType.toUpperCase() + ' Email sent successfully!', false);

                    // Update the status cell in the same row
                    var row = document.querySelector('tr[data-row-id="' + ratingId + '"]');
                    if (row) {
                        var statusCell = row.querySelector('td:nth-child(4)');
                        if (statusCell) statusCell.innerHTML = '<span class="badge badge-success">✅ Sent</span>';
                        
                        // Update buttons to Resend labels
                        var plainBtn = row.querySelector('.btn-plain');
                        var richBtn = row.querySelector('.btn-rich');
                        if (plainBtn) plainBtn.innerHTML = '✉️ Resend Plain';
                        if (richBtn) richBtn.innerHTML = '🎨 Resend Rich';
                    }
                } else {
                    showToast('❌ ' + (data.message || 'Failed to send email'), true);
                }
                btn.disabled = false;
                btn.innerHTML = originalText;
                btn.classList.remove('btn-disabled');
            })
            .catch(function (err) {
                showToast('❌ Error: ' + err.message, true);
                btn.disabled = false;
                btn.innerHTML = originalText;
                btn.classList.remove('btn-disabled');
            });
    }

    // ── Attach click listeners to action buttons ─────────
    function attachButtonListeners() {
        var buttons = tbody.querySelectorAll('.btn-action[data-id]');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var ratingId = parseInt(btn.getAttribute('data-id'), 10);
                var templateType = btn.getAttribute('data-type') || 'html';
                sendEmail(btn, ratingId, templateType);
            });
        });
    }

    // ── Refresh button ───────────────────────────────────
    refreshBtn.addEventListener('click', function () {
        refreshBtn.textContent = '⏳ Refreshing...';
        refreshBtn.disabled = true;
        loadSettings();
        loadRatings();
        setTimeout(function () {
            refreshBtn.innerHTML = '<span>🔄</span> Refresh';
            refreshBtn.disabled = false;
        }, 1000);
    });

    // ── Initialize ───────────────────────────────────────
    loadSettings();
    loadRatings();
})();
