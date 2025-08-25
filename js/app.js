document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const subjectGridView = document.getElementById('subject-grid-view');

    // --- HELPER FUNCTIONS ---
    const formatSubjectName = (subjectId) => {
        return subjectId.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    };

    const getSubjectColor = (subjectId) => {
        const subjectPrefix = subjectId.split('_')[0];
        let h = 220, s = 50, l = 55;
        const colorMap = {
            'bangla':    { h: 205, s: 85, l: 50 }, 'biology':   { h: 145, s: 63, l: 42 },
            'physics':   { h: 260, s: 60, l: 55 }, 'chemistry': { h: 30,  s: 80, l: 50 },
            'math':      { h: 0,   s: 75, l: 48 }, 'higher_math': { h: 340, s: 82, l: 48 },
            'ict':       { h: 180, s: 70, l: 40 },
        };
        if (colorMap[subjectPrefix]) ({ h, s, l } = colorMap[subjectPrefix]);
        if (subjectId.includes('2nd')) l = Math.max(0, l - 10);
        return {
            base: `hsl(${h}, ${s}%, ${l}%)`,
            dark: `hsl(${h}, ${s}%, ${Math.max(0, l - 10)}%)`,
        };
    };

    // --- VIDEO POPUP LOGIC ---
    const initializeVideoPopups = () => {
        document.querySelectorAll('.lecture-card').forEach(card => {
            // Check if a listener is already attached to prevent duplicates
            if (card.dataset.listenerAttached) return;

            card.addEventListener('click', () => {
                const videoId = card.getAttribute('data-videoid');
                if (!videoId) return;

                const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                const popupWidth = 800, popupHeight = 550;
                const left = (screen.width / 2) - (popupWidth / 2);
                const top = (screen.height / 2) - (popupHeight / 2);
                const features = `width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=yes,scrollbars=yes`;
                const popup = window.open('', 'lectureVideo', features);
                
                popup.document.write(`
                    <!DOCTYPE html><html lang="en">
                    <head><title>Video Player</title><style>body,html{margin:0;padding:0;height:100%;overflow:hidden;background-color:#000}iframe{width:100%;height:100%;border:none}</style></head>
                    <body><iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></body>
                    </html>`);
                popup.document.close();
            });
            card.dataset.listenerAttached = 'true';
        });
    };

    // --- PAGE RENDERING LOGIC ---
    const renderHomepage = () => {
        const subjectDetailView = document.getElementById('subject-detail-view');
        if (subjectDetailView) subjectDetailView.remove();
        
        subjectGridView.style.display = 'block';
        document.body.style.cssText = ''; // Reset themed styles
        document.title = 'All Subjects';
    };

    const renderSubjectPage = async (subjectId) => {
        subjectGridView.style.display = 'none';

        // Create or clear the container for the subject details
        let subjectDetailView = document.getElementById('subject-detail-view');
        if (!subjectDetailView) {
            subjectDetailView = document.createElement('div');
            subjectDetailView.id = 'subject-detail-view';
            appContainer.appendChild(subjectDetailView);
        }
        subjectDetailView.innerHTML = '<header><h1>Loading...</h1></header>';

        try {
            const response = await fetch(`./db/${subjectId}_out-from-agent.json`);
            if (!response.ok) throw new Error(`Data for "${subjectId}" not found.`);
            const subjectData = await response.json();

            const subjectName = formatSubjectName(subjectId);
            const colors = getSubjectColor(subjectId);
            let chaptersHtml = '';

            for (const chapterKey in subjectData) {
                const chapterNum = chapterKey.replace('ch', '');
                const lectures = subjectData[chapterKey];
                
                chaptersHtml += `<section class="chapter-section"><h2>Chapter ${chapterNum}</h2><div class="lecture-grid">`;
                lectures.forEach(lecture => {
                    const [title, , , videoIdArr] = lecture;
                    const videoId = videoIdArr && videoIdArr[0] ? videoIdArr[0].trim() : null;
                    if (videoId) {
                        chaptersHtml += `
                            <div class="lecture-card" data-videoid="${videoId}">
                                <div class="thumbnail-container"><img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="Thumbnail for ${title}" class="lecture-thumbnail"><div class="play-icon-overlay"><div class="play-icon">&#9658;</div></div></div>
                                <div class="lecture-info"><h3 class="lecture-title">${title}</h3></div>
                            </div>`;
                    }
                });
                chaptersHtml += `</div></section>`;
            }

            const pageHtml = `
                <header>
                    <a href="#" class="back-link">&larr; Back to Subjects</a>
                    <h1>${subjectName}</h1>
                </header>
                <main>${chaptersHtml}</main>`;
            
            subjectDetailView.innerHTML = pageHtml;
            document.title = `${subjectName} Lectures`;
            document.body.style.setProperty('--subject-color', colors.base);
            document.body.style.setProperty('--subject-color-dark', colors.dark);

            initializeVideoPopups();

        } catch (error) {
            console.error("Failed to render subject page:", error);
            subjectDetailView.innerHTML = `<header><h1>Error</h1></header><main><p>${error.message}</p><a href="#" class="back-link">Return to subjects</a></main>`;
        }
    };

    // --- ROUTER ---
    const handleRouteChange = () => {
        const subjectId = window.location.hash.substring(1);
        if (subjectId) {
            renderSubjectPage(subjectId);
        } else {
            renderHomepage();
        }
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('load', handleRouteChange); // Handle initial page load
});
