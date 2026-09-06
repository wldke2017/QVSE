document.addEventListener('DOMContentLoaded', function () {

    var selectedRating = 0;

    var stars = document.querySelectorAll('.star');
    var ratingLabel = document.getElementById('ratingLabel');
    var feedbackInput = document.getElementById('feedbackInput');
    var charCount = document.getElementById('charCount');
    var ratingForm = document.getElementById('ratingForm');
    var submitBtn = document.getElementById('submitBtn');
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toastMessage');
    var congratsScreen = document.getElementById('congratsScreen');
    var congratsReplay = document.getElementById('congratsReplay');
    var wizardSteps = document.querySelectorAll('.wizard-step');
    var progressDots = document.querySelectorAll('.progress-dot');
    var createRxdtBtn = document.getElementById('createRxdtBtn');
    var wizardContent = document.getElementById('wizardContent');

    var currentStep = 1;
    var totalSteps = wizardSteps.length;
    var RXDT_URL = 'https://www.rxdt.site/#/register?invite=RXN2ZO';

    var labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

    // === Star Rendering ===
    function updateStars(hoverValue) {
        var active = hoverValue > 0 ? hoverValue : selectedRating;
        stars.forEach(function (star) {
            var val = parseInt(star.getAttribute('data-value'));
            if (val <= active) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });

        if (hoverValue > 0) {
            ratingLabel.textContent = labels[hoverValue];
            ratingLabel.classList.add('active-label');
        } else if (selectedRating > 0) {
            ratingLabel.textContent = labels[selectedRating];
            ratingLabel.classList.add('active-label');
        } else {
            ratingLabel.textContent = 'Tap a star to rate';
            ratingLabel.classList.remove('active-label');
        }
    }

    // === Star Events ===
    stars.forEach(function (star) {
        var val = parseInt(star.getAttribute('data-value'));

        star.addEventListener('mouseenter', function () {
            updateStars(val);
        });

        star.addEventListener('mouseleave', function () {
            updateStars(0);
        });

        star.addEventListener('click', function () {
            selectedRating = val;
            updateStars(0);
            // Bounce animation
            star.classList.add('star-bounce');
            setTimeout(function () { star.classList.remove('star-bounce'); }, 300);
        });

        // Touch support
        star.addEventListener('touchend', function (e) {
            e.preventDefault();
            selectedRating = val;
            updateStars(0);
        });
    });

    // === Char Counter ===
    feedbackInput.addEventListener('input', function () {
        var len = feedbackInput.value.length;
        charCount.textContent = len + ' / 500';
        if (len > 450) {
            charCount.classList.add('char-count-warn');
        } else {
            charCount.classList.remove('char-count-warn');
        }
    });

    // === Confetti ===
    function launchConfetti() {
        var container = document.getElementById('confettiContainer');
        var colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98', '#FF9FF3', '#54A0FF'];
        for (var i = 0; i < 90; i++) {
            var piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = (Math.random() * 110 - 5) + '%';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = (Math.random() * 2.5) + 's';
            piece.style.animationDuration = (Math.random() * 2 + 2.5) + 's';
            var size = Math.random() * 9 + 6;
            piece.style.width = size + 'px';
            piece.style.height = size + 'px';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            piece.style.opacity = (Math.random() * 0.4 + 0.6).toString();
            container.appendChild(piece);
        }
    }

    // === Show Announcement / Congrats ===
    function showAnnouncement() {
        var modal = document.getElementById('announcementModal');
        if (modal) modal.classList.add('show');
    }

    var announcementOkBtn = document.getElementById('announcementOkBtn');
    if (announcementOkBtn) {
        announcementOkBtn.addEventListener('click', function () {
            document.getElementById('announcementModal').classList.remove('show');
            showCongrats();
        });
    }

    function showCongrats() {
        launchConfetti();
        currentStep = 1;
        goToStep(1);
        congratsScreen.classList.add('show');
    }

    // === Wizard Navigation ===
    function goToStep(step) {
        currentStep = step;
        wizardSteps.forEach(function (stepEl) {
            var s = parseInt(stepEl.getAttribute('data-step'));
            if (s === step) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.remove('active');
            }
        });
        progressDots.forEach(function (dot, idx) {
            if (idx === step - 1) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        // Scroll wizard content to top on step change
        if (wizardContent) {
            wizardContent.scrollTop = 0;
        }
    }

    function nextStep() {
        if (currentStep < totalSteps) {
            goToStep(currentStep + 1);
        }
    }

    function prevStep() {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    }

    function replayWizard() {
        goToStep(1);
    }

    // === Wizard Button Handlers ===
    // Continue buttons
    document.querySelectorAll('.wizard-btn[data-action="next"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            nextStep();
        });
    });

    // Previous buttons
    document.querySelectorAll('.wizard-btn-prev[data-action="prev"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            prevStep();
        });
    });

    // Replay button
    if (congratsReplay) {
        congratsReplay.addEventListener('click', replayWizard);
    }

    if (createRxdtBtn) {
        createRxdtBtn.addEventListener('click', function () {
            window.open(RXDT_URL, '_blank');
            showToast('RXDT opened in a new tab — your spot is saved here!', false);
        });
    }

    var createRxdtBtnStep1 = document.getElementById('createRxdtBtnStep1');
    if (createRxdtBtnStep1) {
        createRxdtBtnStep1.addEventListener('click', function () {
            window.open(RXDT_URL, '_blank');
            showToast('RXDT opened in a new tab — your spot is saved here!', false);
        });
    }

    var createRxdtBtnStep2 = document.getElementById('createRxdtBtnStep2');
    if (createRxdtBtnStep2) {
        createRxdtBtnStep2.addEventListener('click', function () {
            window.open(RXDT_URL, '_blank');
            showToast('RXDT opened in a new tab — your spot is saved here!', false);
        });
    }

    // === Toast ===
    function showToast(message, isError) {
        toastMessage.textContent = message;
        toast.classList.remove('error');
        if (isError) toast.classList.add('error');
        toast.classList.add('show');
        setTimeout(function () { toast.classList.remove('show'); }, 3000);
    }

    // === Form Submit ===
    ratingForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (selectedRating === 0) {
            showToast('Please select a star rating', true);
            // Shake the stars row
            var row = document.getElementById('starsRow');
            row.classList.add('shake');
            setTimeout(function () { row.classList.remove('shake'); }, 500);
            return;
        }

        var feedback = feedbackInput.value.trim();

        // Get user credentials from localStorage (saved after login)
        var userEmail = '';
        var userPhone = '';
        try {
            userEmail = localStorage.getItem('qvse_user_email') || '';
            userPhone = localStorage.getItem('qvse_user_phone') || '';
        } catch (e) { }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            var response = await fetch('/api/rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: selectedRating,
                    feedback: feedback,
                    email: userEmail,
                    phone_number: userPhone
                })
            });

            var data = await response.json();

            if (data.success) {
                try {
                    localStorage.setItem('qvse_rated', 'true');
                } catch (e) { }
                showAnnouncement();
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
                showToast(data.message || 'Something went wrong', true);
            }
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
            showToast('Failed to connect to server', true);
            console.error('Error:', err);
        }
    });

    // === Re-show wizard if user already rated (so they can view steps again) ===
    try {
        if (localStorage.getItem('qvse_rated') === 'true') {
            // Show wizard immediately on page load, skipping the rating form
            showCongrats();
        }
    } catch (e) { }
});
