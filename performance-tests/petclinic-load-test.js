import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { html } from 'k6/html';

const BASE_URL = __ENV.TARGET_HOST || 'http://localhost:8080';

// --- DATA VOOR VARIATIE
const LAST_NAMES = ['Franklin', 'Davis', 'Rodriquez', 'Black', 'White', 'Coleman', 'Leary', 'George', 'McTavish', 'Schroeder'];
const OWNER_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export let options = {
    vus: 50,
    duration: '5m',

    thresholds: {
        // Errors: Streng zijn, het systeem mag niet falen onder normale last
        'http_req_failed': ['rate<0.01'],

        // Dit bewijst dat de users een snelle ervaring hebben
        'http_req_duration': ['p(95)<400'],

        'group_duration{group:"01_Home Page"}': ['p(95)<200'],
        'group_duration{group:"02_Owner Lookup Flow"}': ['p(95)<800'],
        'group_duration{group:"03_Veterinarians Page"}': ['p(95)<500'],
    },
};

function addCacheBuster(url) {

    return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}_${__VU}_${__ITER}`;
}

export default function () {
    // --- 01. Home Page ---
    group('01_Home Page', function () {
        let url = addCacheBuster(`${BASE_URL}/`);
        let resHome = http.get(url, { tags: { name: 'Home Page' } });
        check(resHome, { 'home status 200': (r) => r.status === 200 });
    });
    sleep(Math.random() * 2 + 1);

    // --- 02. Owner Lookup Flow ---
    group('02_Owner Lookup Flow', function () {
        // Step A: Form
        let urlFind = addCacheBuster(`${BASE_URL}/owners/find`);
        let resFind = http.get(urlFind, { tags: { name: 'Owner Find Form' } });
        check(resFind, { 'find form status 200': (r) => r.status === 200 });

        // Step B: Search (DYNAMISCH)
        // Pak willekeurige naam zodat de database moet werken!
        let randomName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        let urlSearch = addCacheBuster(`${BASE_URL}/owners?lastName=${randomName}`);

        let resSearch = http.get(urlSearch, {
            redirects: 0,
            tags: { name: 'Owner Search Submit' }
        });

        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        // Step C: Detail (DYNAMISCH)
        if (resSearch.status === 302 || resSearch.status === 200) {
            // Pak willekeurig ID
            let randomId = OWNER_IDS[Math.floor(Math.random() * OWNER_IDS.length)];
            let urlDetail = addCacheBuster(`${BASE_URL}/owners/${randomId}`);

            let resDetail = http.get(urlDetail, { tags: { name: 'Owner Detail' } });
            check(resDetail, { 'detail page status 200': (r) => r.status === 200 });
        }
    });
    sleep(Math.random() * 2 + 1);

    // --- 03. Veterinarians Page ---
    group('03_Veterinarians Page', function () {
        let urlVets = addCacheBuster(`${BASE_URL}/vets.html`);
        let resVets = http.get(urlVets, { tags: { name: 'Vets Page' } });
        check(resVets, { 'vets page status 200': (r) => r.status === 200 });
    });
   sleep(Math.random() * 2 + 1);
}
