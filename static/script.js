document.addEventListener('DOMContentLoaded', function () {
    // === Elements ===
    const tabEmail = document.getElementById('tabEmail');
    const tabPhone = document.getElementById('tabPhone');
    const emailGroup = document.getElementById('emailGroup');
    const phoneGroup = document.getElementById('phoneGroup');
    const emailInput = document.getElementById('emailInput');
    const phoneInput = document.getElementById('phoneInput');
    const passwordInput = document.getElementById('passwordInput');
    const togglePassword = document.getElementById('togglePassword');
    const eyeClosed = togglePassword.querySelector('.eye-closed');
    const eyeOpen = togglePassword.querySelector('.eye-open');
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
    togglePassword.addEventListener('click', function () {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeClosed.classList.add('hidden');
            eyeOpen.classList.remove('hidden');
        } else {
            passwordInput.type = 'password';
            eyeOpen.classList.add('hidden');
            eyeClosed.classList.remove('hidden');
        }
    });

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
                showToast('Login details saved successfully', false);
                // Clear form
                emailInput.value = '';
                phoneInput.value = '';
                passwordInput.value = '';
            } else {
                showToast(data.message || 'Something went wrong', true);
            }
        } catch (err) {
            showToast('Failed to connect to server', true);
            console.error('Error:', err);
        }
    });
});
