(function () {
    'use strict';

    var PLUGIN_NAME    = 'CinemaQuality';
    var PLUGIN_VERSION = '1.1.0';

    var QUALITY_MAP = [
        {
            keys: ['4k','uhd','2160p'],
            label:'4K UHD', icon:'◈',
            color:'#ff6d00', glow:'rgba(255,109,0,0.38)',
            bg:'rgba(255,109,0,0.18)'
        },
        {
            keys:['1080p','fhd','blu-ray','bluray','bdrip','brrip'],
            label:'1080p', icon:'✦',
            color:'#ae7cff', glow:'rgba(174,124,255,0.32)',
            bg:'rgba(174,124,255,0.16)'
        },
        {
            keys:['720p','hdrip'],
            label:'HD 720', icon:'',
            color:'#448aff', glow:'rgba(68,138,255,0.30)',
            bg:'rgba(68,138,255,0.16)'
        },
        {
            keys:['webdl','web-dl','web dl'],
            label:'WEB DL', icon:'⬇',
            color:'#00bcd4', glow:'rgba(0,188,212,0.30)',
            bg:'rgba(0,188,212,0.15)'
        },
        {
            keys:['webrip','web-rip','web rip'],
            label:'WEB', icon:'🌐',
            color:'#00e676', glow:'rgba(0,230,118,0.26)',
            bg:'rgba(0,230,118,0.13)'
        },
        {
            keys:['hdts','hd-ts','hd ts'],
            label:'HD TS', icon:'🎞',
            color:'#ffb300', glow:'rgba(255,179,0,0.26)',
            bg:'rgba(255,179,0,0.15)'
        },
        {
            keys:['ts','telesync','tele-sync'],
            label:'TS', icon:'🎥',
            color:'#ff8c00', glow:'rgba(255,140,0,0.28)',
            bg:'rgba(255,140,0,0.16)'
        },
        {
            keys:['cam','camrip','cam-rip','hdcam'],
            label:'CAM', icon:'📷',
            color:'#ff3b3b', glow:'rgba(255,59,59,0.30)',
            bg:'rgba(255,59,59,0.16)'
        },
        {
            keys:['dvdscr','scr','dvdrip','dvd'],
            label:'DVD', icon:'💿',
            color:'#8d6e63', glow:'rgba(141,110,99,0.28)',
            bg:'rgba(141,110,99,0.16)'
        }
    ];

    var CSS = [
        '@import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap");',
        '@keyframes cq-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.72)}}',
        '@keyframes cq-shimmer{0%{left:-110%}55%{left:160%}100%{left:160%}}',
        '@keyframes cq-in{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}',
        '.cq-wrap{position:absolute;top:8px;left:8px;display:flex;flex-direction:column;gap:4px;z-index:50;pointer-events:none;}',
        '.cq-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 7px;border-radius:5px;font-family:"Bebas Neue",sans-serif;font-size:12px;letter-spacing:1.2px;border:1px solid rgba(255,255,255,0.09);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);position:relative;overflow:hidden;white-space:nowrap;animation:cq-in .35s ease both;}',
        '.cq-badge::after{content:"";position:absolute;top:0;left:-110%;width:55%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.11),transparent);animation:cq-shimmer 3.5s 1s infinite;}',
        '.cq-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;animation:cq-pulse 2.4s infinite;}',
        '.cq-icon{font-size:9px;line-height:1;opacity:.9}',
        '.cq-text{line-height:1}'
    ].join('\n');

    function injectCSS() {
        if (document.getElementById('cq-css')) return;
        var s = document.createElement('style');
        s.id = 'cq-css';
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    function detectQuality(text) {
        if (!text) return null;
        var low = text.toLowerCase();
        for (var i = 0; i < QUALITY_MAP.length; i++) {
            var q = QUALITY_MAP[i];
            for (var j = 0; j < q.keys.length; j++) {
                if (low.indexOf(q.keys[j]) !== -1) return q;
            }
        }
        return null;
    }

    function makeBadge(q, delay) {
        var wrap = document.createElement('div');
        wrap.className = 'cq-badge';
        wrap.style.background = q.bg;
        wrap.style.boxShadow = '0 2px 12px ' + q.glow;
        wrap.style.animationDelay = delay + 'ms';

        var dot = document.createElement('span');
        dot.className = 'cq-dot';
        dot.style.background = q.color;
        dot.style.boxShadow = '0 0 6px ' + q.color;

        var text = document.createElement('span');
        text.className = 'cq-text';
        text.textContent = q.label;
        text.style.color = q.color;
        text.style.textShadow = '0 0 8px ' + q.glow;

        wrap.appendChild(dot);
        wrap.appendChild(text);

        if (q.icon) {
            var icon = document.createElement('span');
            icon.className = 'cq-icon';
            icon.textContent = q.icon;
            wrap.appendChild(icon);
        }

        return wrap;
    }

    var cache = {};

    function fetchQualities(movie, cb) {
        var title = movie.original_title || movie.title || '';
        var year  = movie.year || '';
        var key   = title + '|' + year;

        if (cache[key] !== undefined) { cb(cache[key]); return; }

        var url = 'https://kinobox.tv/api/players/main?title='
            + encodeURIComponent(title)
            + (year ? '&year=' + year : '')
            + '&token=open_access';

        fetch(url, { cache: 'force-cache' })
            .then(function(r){ return r.json(); })
            .then(function(data){
                var found = [], seen = {};
                if (Array.isArray(data)) {
                    data.forEach(function(src) {
                        var txt = [src.quality, src.translation, src.name, src.title]
                            .filter(Boolean).join(' ');
                        var q = detectQuality(txt) || detectQuality(JSON.stringify(src));
                        if (q && !seen[q.label]) {
                            seen[q.label] = true;
                            found.push(q);
                        }
                    });
                }
                found.sort(function(a, b) {
                    return QUALITY_MAP.indexOf(a) - QUALITY_MAP.indexOf(b);
                });
                cache[key] = found;
                cb(found);
            })
            .catch(function(){ cache[key] = []; cb([]); });
    }

    function applyBadges(el, movie) {
        if (!el || el._cqDone) return;
        el._cqDone = true;
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

        fetchQualities(movie, function(qualities) {
            if (!qualities.length) return;
            var old = el.querySelector('.cq-wrap');
            if (old) old.remove();
            var wrap = document.createElement('div');
            wrap.className = 'cq-wrap';
            qualities.forEach(function(q, i) {
                wrap.appendChild(makeBadge(q, i * 80));
            });
            el.appendChild(wrap);
        });
    }

    function initPlugin() {
        injectCSS();
        if (typeof Lampa === 'undefined') { setTimeout(initPlugin, 500); return; }

        Lampa.Listener.follow('card', function(e) {
            if (e.type !== 'complite') return;
            var el = e.card && e.card.render && e.card.render();
            if (!e.data || !el) return;
            applyBadges(el instanceof jQuery ? el[0] : el, e.data);
        });

        Lampa.Listener.follow('full', function(e) {
            if (e.type !== 'complite') return;
            var movie = e.data && e.data.movie;
            var el = e.object && e.object.activity && e.object.activity.render && e.object.activity.render();
            if (!movie || !el) return;
            applyBadges(el instanceof jQuery ? el[0] : el, movie);
        });

        console.log('[' + PLUGIN_NAME + '] v' + PLUGIN_VERSION + ' ready');
    }

    if (window.Lampa && Lampa.Plugins) {
        Lampa.Plugins.add({ name: PLUGIN_NAME, version: PLUGIN_VERSION, start: initPlugin });
    } else {
        document.addEventListener('lampa_ready', function() {
            if (window.Lampa && Lampa.Plugins)
                Lampa.Plugins.add({ name: PLUGIN_NAME, version: PLUGIN_VERSION, start: initPlugin });
            else initPlugin();
        });
        setTimeout(initPlugin, 1200);
    }

})();