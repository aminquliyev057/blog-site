(() => {
    const canvas = document.querySelector('#rain-canvas');
    const toggle = document.querySelector('#rain-toggle');

    if (!canvas || !toggle) {
        return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
        console.error('Rain effect could not initialize a 2D canvas context.');
        return;
    }

    const storageKey = 'rain-effect-enabled';
    const drops = [];
    let animationFrame = 0;
    let lastFrameTime = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resizeCanvas = () => {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * pixelRatio);
        canvas.height = Math.floor(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const dropCount = Math.min(160, Math.ceil((width * height) / 10500));
        drops.length = 0;
        for (let index = 0; index < dropCount; index += 1) {
            drops.push({
                x: Math.random() * width,
                y: Math.random() * height,
                length: 8 + Math.random() * 17,
                speed: 260 + Math.random() * 360,
                opacity: 0.12 + Math.random() * 0.28
            });
        }
    };

    const drawRain = (time) => {
        if (!document.body.classList.contains('rain-active')) {
            animationFrame = 0;
            return;
        }

        const delta = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.05) : 0;
        lastFrameTime = time;
        context.clearRect(0, 0, width, height);
        context.lineWidth = 1;

        drops.forEach(drop => {
            context.strokeStyle = `rgba(206, 174, 125, ${drop.opacity})`;
            context.beginPath();
            context.moveTo(drop.x, drop.y);
            context.lineTo(drop.x - 3, drop.y + drop.length);
            context.stroke();

            drop.x -= drop.speed * delta * 0.08;
            drop.y += drop.speed * delta;
            if (drop.y > height + drop.length || drop.x < -10) {
                drop.x = Math.random() * (width + 80);
                drop.y = -drop.length - Math.random() * height * 0.2;
            }
        });

        animationFrame = window.requestAnimationFrame(drawRain);
    };

    const setEnabled = (enabled, persist = true) => {
        toggle.checked = enabled;
        document.body.classList.toggle('rain-active', enabled);

        if (persist) {
            try {
                window.localStorage.setItem(storageKey, String(enabled));
            } catch (error) {
                console.warn('Could not save rain effect preference:', error);
            }
        }

        if (enabled && !animationFrame) {
            lastFrameTime = 0;
            animationFrame = window.requestAnimationFrame(drawRain);
        } else if (!enabled) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
            context.clearRect(0, 0, width, height);
        }
    };

    let savedPreference = false;
    try {
        savedPreference = window.localStorage.getItem(storageKey) === 'true';
    } catch (error) {
        console.warn('Could not read rain effect preference:', error);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    toggle.addEventListener('change', () => setEnabled(toggle.checked));
    setEnabled(savedPreference, false);
})();
