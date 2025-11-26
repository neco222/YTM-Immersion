chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === 'TRANSLATE') {
        const { text, apiKey, targetLang } = req.payload;
        const endpoint = apiKey.endsWith(':fx')
            ? 'https://api-free.deepl.com/v2/translate'
            : 'https://api.deepl.com/v2/translate';

        const body = {
            text,
            target_lang: targetLang || 'JA'
        };

        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
        .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
        .then(data => sendResponse({ success: true, translations: data.translations }))
        .catch(err => {
            console.error("DeepL API Error:", err);
            sendResponse({ success: false, error: err.toString() });
        });

        return true;
    }

    if (req.type === 'GET_LYRICS') {
        const { track, artist, youtube_url } = req.payload;

        console.log('[BG] GET_LYRICS', { track, artist, youtube_url });

        fetch('https://lrchub.coreone.work/api/lyrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ track, artist, youtube_url })
        })
        .then(r => r.text())
        .then(text => {
            let lyrics = '';
            try {
                const json = JSON.parse(text);
                console.log('[BG] Lyrics API JSON:', json);
                const res = json.response || json;

                const synced = typeof res.synced_lyrics === 'string' ? res.synced_lyrics.trim() : '';
                const plain  = typeof res.plain_lyrics  === 'string' ? res.plain_lyrics.trim()  : '';

                if (synced) lyrics = synced;
                else if (plain) lyrics = plain;
                else lyrics = text.trim();
            } catch (e) {
                console.warn('[BG] Lyrics API response is not JSON, using raw text');
                lyrics = text.trim();
            }

            console.log('[BG] Base lyrics preview:', lyrics.slice(0, 100));
            sendResponse({ success: !!lyrics, lyrics });
        })
        .catch(err => {
            console.error("Lyrics API Error:", err);
            sendResponse({ success: false, error: err.toString() });
        });

        return true;
    }

    if (req.type === 'GET_TRANSLATION') {
        const { youtube_url, video_id, lang, langs } = req.payload;

        try {
            const url = new URL('https://lrchub.coreone.work/api/translation');
            if (youtube_url) {
                url.searchParams.set('youtube_url', youtube_url);
            } else if (video_id) {
                url.searchParams.set('video_id', video_id);
            }

            const reqLangs = Array.isArray(langs) && langs.length
                ? langs
                : (lang ? [lang] : []);

            reqLangs.forEach(l => url.searchParams.append('lang', l));

            console.log('[BG] GET_TRANSLATION', url.toString());

            fetch(url.toString(), { method: 'GET' })
            .then(r => r.text())
            .then(text => {
                let lrcMap = {};
                let missing = [];
                try {
                    const json = JSON.parse(text);
                    console.log('[BG] Translation API JSON:', json);
                    const translations = json.translations || {};
                    lrcMap = {};
                    reqLangs.forEach(l => {
                        lrcMap[l] = translations[l] || '';
                    });
                    missing = json.missing_langs || [];
                } catch (e) {
                    console.warn('[BG] Translation API response is not JSON');
                    lrcMap = {};
                }
                Object.keys(lrcMap || {}).forEach(k => {
                    console.log(`[BG] Translation[${k}] preview:`, (lrcMap[k] || '').slice(0, 100));
                });
                sendResponse({ success: true, lrcMap, missing });
            })
            .catch(err => {
                console.error('Translation API Error:', err);
                sendResponse({ success: false, error: err.toString() });
            });

        } catch (e) {
            console.error('GET_TRANSLATION build URL error:', e);
            sendResponse({ success: false, error: e.toString() });
        }

        return true;
    }

    if (req.type === 'REGISTER_TRANSLATION') {
        const { youtube_url, video_id, lang, lyrics } = req.payload;

        console.log('[BG] REGISTER_TRANSLATION', { youtube_url, video_id, lang });

        const body = { lang, lyrics };
        if (youtube_url) body.youtube_url = youtube_url;
        else if (video_id) body.video_id = video_id;

        fetch('https://lrchub.coreone.work/api/translation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        .then(r => r.text())
        .then(text => {
            try {
                const json = JSON.parse(text);
                console.log('[BG] REGISTER_TRANSLATION JSON:', json);
                sendResponse({ success: !!json.ok, raw: json });
            } catch (e) {
                console.warn('[BG] REGISTER_TRANSLATION non-JSON response');
                sendResponse({ success: false, error: 'Invalid JSON', raw: text });
            }
        })
        .catch(err => {
            console.error('REGISTER_TRANSLATION Error:', err);
            sendResponse({ success: false, error: err.toString() });
        });

        return true;
    }
});
