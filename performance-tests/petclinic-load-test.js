import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { html } from 'k6/html';

const BASE_URL = __ENV.TARGET_HOST || 'http://localhost:8080';

export let options = {

    vus: 20,
    duration: '1m',

    thresholds: {
        // Errors: Minder dan 1% mag falen
        'http_req_failed': ['rate<0.01'],

        // Latency target
        'http_req_duration': ['p(95)<150'],

        // Groep targets
        'group_duration{group:"01_Home Page"}': ['p(95)<150'],
        'group_duration{group:"02_Owner Lookup Flow"}': ['p(95)<400'],
        'group_duration{group:"03_Veterinarians Page"}': ['p(95)<500'],
    },
};

function addCacheBuster(url) {
    return `${url}?t=${Date.now()}_${__VU}`;
}

export default function () {
    // --- 01. Home Page ---
    group('01_Home Page', function () {
        let url = addCacheBuster(`${BASE_URL}/`);

        let resHome = http.get(url, { tags: { name: 'Home Page' } });
        check(resHome, { 'home status 200': (r) => r.status === 200 });
    });
    sleep(Math.random() * 0.2);

    // --- 02. Owner Lookup Flow ---
    group('02_Owner Lookup Flow', function () {
        // Step A: Go to Find form
        let urlFind = addCacheBuster(`${BASE_URL}/owners/find`);

        let resFind = http.get(urlFind, { tags: { name: 'Owner Find Form' } });
        check(resFind, { 'find form status 200': (r) => r.status === 200 });

        // Step B: Search for 'Franklin'
        let urlSearch = addCacheBuster(`${BASE_URL}/owners?lastName=Franklin`);

        let resSearch = http.get(urlSearch, {
            redirects: 0,
            tags: { name: 'Owner Search Submit' }
        });

        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        // Step C: View detail page
        if (resSearch.status === 302 || resSearch.status === 200) {
            let urlDetail = addCacheBuster(`${BASE_URL}/owners/1`);

            let resDetail = http.get(urlDetail, { tags: { name: 'Owner Detail' } });
            check(resDetail, { 'detail page status 200': (r) => r.status === 200 });
        }
    });
    sleep(Math.random() * 0.2);

    // --- 03. Veterinarians Page ---
    group('03_Veterinarians Page', function () {
        let urlVets = addCacheBuster(`${BASE_URL}/vets.html`);

        let resVets = http.get(urlVets, { tags: { name: 'Vets Page' } });
        check(resVets, { 'vets page status 200': (r) => r.status === 200 });
    });
   sleep(Math.random() * 0.2);
}
