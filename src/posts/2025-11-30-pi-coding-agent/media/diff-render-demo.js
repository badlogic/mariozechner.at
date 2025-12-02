(() => {
    const terminal = document.getElementById('diff-terminal');
    const info = document.getElementById('diff-info');
    let lines = [];
    let running = false;
    let timeoutId = null;
    
    function render(newLines, description) {
        const oldLines = [...lines];
        lines = newLines;
        
        // Find first changed line
        let firstChanged = -1;
        const maxLen = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
            if (oldLines[i] !== newLines[i]) {
                firstChanged = i;
                break;
            }
        }
        
        // Find last non-empty line (don't count trailing empty lines as redrawn)
        let lastNonEmpty = newLines.length - 1;
        while (lastNonEmpty >= 0 && newLines[lastNonEmpty] === '') {
            lastNonEmpty--;
        }
        
        // Build display
        terminal.innerHTML = '';
        for (let i = 0; i < newLines.length; i++) {
            const div = document.createElement('div');
            div.className = 'diff-render-line';
            div.textContent = newLines[i] || ' ';
            
            if (firstChanged !== -1 && i >= firstChanged && i <= lastNonEmpty) {
                div.classList.add('changed');
            } else if (firstChanged !== -1) {
                div.classList.add('unchanged');
            }
            terminal.appendChild(div);
        }
        
        const linesRedrawn = firstChanged === -1 ? 0 : Math.max(0, lastNonEmpty - firstChanged + 1);
        updateInfo(description, linesRedrawn, newLines.length);
    }
    
    function updateInfo(description, redrawn, total, clickable) {
        const playBtn = running ? '⏹' : '▶';
        if (clickable) {
            info.innerHTML = `<span class="diff-render-playbtn">${playBtn} ${description}</span> | Lines redrawn: ${redrawn}/${total}`;
        } else {
            info.innerHTML = `<span class="diff-render-playbtn">${playBtn}</span>${description} | Lines redrawn: ${redrawn}/${total}`;
        }
        info.querySelector('.diff-render-playbtn').onclick = togglePlay;
    }
    
    function togglePlay() {
        if (running) {
            running = false;
            if (timeoutId) clearTimeout(timeoutId);
            updateInfo('Paused', 0, lines.length);
        } else {
            running = true;
            runDemo();
        }
    }
    
    function delay(ms) {
        return new Promise(resolve => {
            timeoutId = setTimeout(resolve, ms);
        });
    }
    
    async function runDemo() {
        const text = 'What is 2 + 2?';
        const responses = [
            '2 + 2 equals 4.',
            '',
            'This is basic arithmetic. When you',
            'add two and two together, you get',
            'four.',
        ];
        
        while (running) {
            // Initial state with empty editor
            lines = [];
            render([
                '$ pi',
                '╭─────────────────────────────────╮',
                '│ > _                             │',
                '╰─────────────────────────────────╯',
                '',
                '',
                '',
                '',
                '',
                '',
            ], 'Initial state');
            await delay(800);
            if (!running) break;
            
            // Typing phase
            for (let i = 0; i <= text.length; i++) {
                if (!running) break;
                const typed = text.slice(0, i);
                render([
                    '$ pi',
                    '╭─────────────────────────────────╮',
                    '│ > ' + typed + '_' + ' '.repeat(29 - typed.length) + '│',
                    '╰─────────────────────────────────╯',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                ], 'User typing');
                await delay(150);
            }
            if (!running) break;
            await delay(400);
            
            // Submit: show user message, then editor below
            render([
                '$ pi',
                '',
                'You: What is 2 + 2?',
                '',
                '╭─────────────────────────────────╮',
                '│ > _                             │',
                '╰─────────────────────────────────╯',
                '',
                '',
                '',
            ], 'Prompt submitted');
            await delay(800);
            if (!running) break;
            
            // Response streaming
            for (let i = 0; i <= responses.length; i++) {
                if (!running) break;
                const shown = responses.slice(0, i);
                const cursor = i < responses.length ? '▌' : '';
                render([
                    '$ pi',
                    '',
                    'You: What is 2 + 2?',
                    '',
                    ...shown,
                    cursor,
                    '',
                    '╭─────────────────────────────────╮',
                    '│ > _                             │',
                    '╰─────────────────────────────────╯',
                ], 'Agent streaming');
                await delay(500);
            }
            if (!running) break;
            
            // Final state
            render([
                '$ pi',
                '',
                'You: What is 2 + 2?',
                '',
                ...responses,
                '',
                '╭─────────────────────────────────╮',
                '│ > _                             │',
                '╰─────────────────────────────────╯',
            ], 'Response complete');
            await delay(2000);
        }
    }
    
    function initialRender() {
        lines = [];
        const playBtn = '▶';
        info.innerHTML = `<span class="diff-render-playbtn">${playBtn} Click to start</span> | Lines redrawn: 0/10`;
        info.querySelector('.diff-render-playbtn').onclick = togglePlay;
        
        terminal.innerHTML = '';
        const initialLines = [
            '$ pi',
            '╭─────────────────────────────────╮',
            '│ > _                             │',
            '╰─────────────────────────────────╯',
            '',
            '',
            '',
            '',
            '',
            '',
        ];
        for (const line of initialLines) {
            const div = document.createElement('div');
            div.className = 'diff-render-line';
            div.textContent = line || ' ';
            terminal.appendChild(div);
        }
        lines = initialLines;
    }
    
    initialRender();
})();
