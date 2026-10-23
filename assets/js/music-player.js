const instrumentals = [
    {
        title: 'Tanrı Çekti Tüm Resimleri',
        file: 'Sagopa Kajmer - Tanrı Çekti Tüm Resimleri (Enstrümantal) Bir Pesimistin Gözyaşları Beat Albümü.mp3'
    },
    {
        title: 'Analiz',
        file: 'Sagopa Kajmer - Analiz (Enstrümantal) Bir Pesimistin Gözyaşları Beat Albümü.mp3'
    },
    {
        title: 'Karikatür Komedya',
        file: 'Karikatür Komedya (Instrumental) - Sagopa Kajmer #remake.mp3'
    }
];

window.addEventListener('DOMContentLoaded', () => {
    const audio = document.querySelector('#instrumental-audio');
    const select = document.querySelector('#instrumental-select');
    const playButton = document.querySelector('#toggle-playback');
    const previousButton = document.querySelector('#previous-track');
    const nextButton = document.querySelector('#next-track');
    const progress = document.querySelector('#music-progress');
    const elapsed = document.querySelector('#elapsed-time');
    const duration = document.querySelector('#duration-time');
    const status = document.querySelector('#music-status');

    if (!audio || !select || !playButton || !previousButton || !nextButton || !progress || !elapsed || !duration || !status) {
        return;
    }

    instrumentals.forEach((track, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = track.title;
        select.append(option);
    });

    let currentTrack = 0;

    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds)) {
            return '0:00';
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${minutes}:${remainingSeconds}`;
    };

    const setTrack = (index, playAfterLoad = false) => {
        currentTrack = (index + instrumentals.length) % instrumentals.length;
        const track = instrumentals[currentTrack];
        select.value = String(currentTrack);
        audio.src = `assets/instrumentals/${encodeURIComponent(track.file)}`;
        audio.load();
        progress.value = '0';
        elapsed.textContent = '0:00';
        duration.textContent = '0:00';
        status.textContent = '';

        if (playAfterLoad) {
            audio.play().catch((error) => {
                status.textContent = 'Unable to play this track.';
                console.error('Instrumental playback failed:', error);
            });
        }
    };

    const updatePlaybackButton = () => {
        const isPlaying = !audio.paused;
        const icon = playButton.querySelector('svg path');
        playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
        playButton.setAttribute('aria-pressed', String(isPlaying));
        icon.setAttribute('d', isPlaying ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5l11 7-11 7z');
    };

    playButton.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().catch((error) => {
                status.textContent = 'Unable to play this track.';
                console.error('Instrumental playback failed:', error);
            });
        } else {
            audio.pause();
        }
    });

    previousButton.addEventListener('click', () => {
        setTrack(currentTrack - 1, !audio.paused);
    });

    nextButton.addEventListener('click', () => {
        setTrack(currentTrack + 1, !audio.paused);
    });

    select.addEventListener('change', () => {
        setTrack(Number(select.value), !audio.paused);
    });

    progress.addEventListener('input', () => {
        if (Number.isFinite(audio.duration)) {
            audio.currentTime = (Number(progress.value) / 100) * audio.duration;
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        duration.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
        elapsed.textContent = formatTime(audio.currentTime);
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
            progress.value = String((audio.currentTime / audio.duration) * 100);
        }
    });

    audio.addEventListener('play', updatePlaybackButton);
    audio.addEventListener('pause', updatePlaybackButton);
    audio.addEventListener('ended', () => setTrack(currentTrack + 1, true));
    audio.addEventListener('error', () => {
        status.textContent = 'This instrumental could not be loaded.';
    });

    setTrack(currentTrack);
});
