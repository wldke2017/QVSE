(function () {
    var toastEl = document.getElementById('toast');
    var toastMsg = document.getElementById('toastMsg');
    var toastIcon = document.getElementById('toastIcon');
    var tbody = document.getElementById('ratingsTableBody');
    var refreshBtn = document.getElementById('refreshBtn');

    // ── Toast ────────────────────────────────────────────
    function showToast(message, isError) {
        toastMsg.textContent = message;
        toastIcon.textContent = isError ? '✕' : '✓';
        toastEl.classList.remove('error');
        if (isError) toastEl.classList.add('error');
        toastEl.classList.add('show');
        setTimeout(function () { toastEl.classList.remove('show'); }, 3500);
    }

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

    // ── Render action button ─────────────────────────────
    function renderActionButton(row) {
        if (!row.email) {
            return '<span style="color:#475569;font-size:12px;">No email</span>';
        }
        var sent = row.email_sent === true || row.email_sent === 'true';
        var label = sent ? '🔁 Resend' : '✉️ Send';
        var cls = sent ? 'btn-action btn-resend' : 'btn-action btn-send';
        return '<button class="' + cls + '" data-id="' + row.id + '" data-sent="' + sent + '">' + label + '</button>';
    }

    // ── Render single table row ──────────────────────────
    function renderRow(row) {
        var feedback = row.feedback ? escapeHtml(row.feedback.substring(0, 60)) + (row.feedback.length > 60 ? '…' : '') : '<span style="color:#475569;">—</span>';
        var emailStatus = (row.email_sent === true || row.email_sent === 'true')
            ? '<span class="badge badge-success">✅ Sent</span>'
            : (row.email ? '<span class="badge badge-pending">⏳ Pending</span>' : '<span style="color:#475569;font-size:12px;">N/A</span>');

        return '<tr data-row-id="' + row.id + '">'
            + '<td>' + renderContact(row) + '<div style="font-size:11px;color:#475569;margin-top:2px;">ID #' + row.id + '</div></td>'
            + '<td>' + renderStars(row.rating) + '</td>'
            + '<td title="' + escapeHtml(row.feedback || '') + '">' + feedback + '</td>'
            + '<td>' + emailStatus + '</td>'
            + '<td style="color:#94a3b8;font-size:13px;">' + escapeHtml(row.created_at || '—') + '</td>'
            + '<td>' + renderActionButton(row) + '</td>'
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
    function sendEmail(btn, ratingId) {
        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ Sending...';
        btn.classList.remove('btn-send', 'btn-resend');
        btn.classList.add('btn-disabled');

        fetch('/api/admin/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: ratingId })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    showToast('✅ Email sent successfully!', false);

                    // Update the button inline to "Resend" without page reload
                    btn.disabled = false;
                    btn.innerHTML = '🔁 Resend';
                    btn.classList.remove('btn-disabled');
                    btn.classList.add('btn-resend');
                    btn.setAttribute('data-sent', 'true');

                    // Update the status cell in the same row
                    var row = document.querySelector('tr[data-row-id="' + ratingId + '"]');
                    if (row) {
                        var statusCell = row.querySelector('td:nth-child(4)');
                        if (statusCell) statusCell.innerHTML = '<span class="badge badge-success">✅ Sent</span>';
                    }
                } else {
                    showToast('❌ ' + (data.message || 'Failed to send email'), true);
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                    btn.classList.remove('btn-disabled');
                    btn.classList.add(btn.getAttribute('data-sent') === 'true' ? 'btn-resend' : 'btn-send');
                }
            })
            .catch(function (err) {
                showToast('❌ Error: ' + err.message, true);
                btn.disabled = false;
                btn.innerHTML = originalText;
                btn.classList.remove('btn-disabled');
                btn.classList.add(btn.getAttribute('data-sent') === 'true' ? 'btn-resend' : 'btn-send');
            });
    }

    // ── Attach click listeners to all action buttons ─────
    function attachButtonListeners() {
        var buttons = tbody.querySelectorAll('.btn-action[data-id]');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var ratingId = parseInt(btn.getAttribute('data-id'), 10);
                sendEmail(btn, ratingId);
            });
        });
    }

    // ── Refresh button ───────────────────────────────────
    refreshBtn.addEventListener('click', function () {
        refreshBtn.textContent = '⏳ Refreshing...';
        refreshBtn.disabled = true;
        loadRatings();
        setTimeout(function () {
            refreshBtn.innerHTML = '<span>🔄</span> Refresh';
            refreshBtn.disabled = false;
        }, 1000);
    });

    // ── Initialize ───────────────────────────────────────
    loadRatings();
})();
