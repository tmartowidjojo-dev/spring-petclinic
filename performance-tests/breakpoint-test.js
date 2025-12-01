import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const BASE_URL = __ENV.TARGET_HOST || 'http://localhost:8080';


const MAX_VUS = 600;
const STEP_VUS = 20;
const STEP_DURATION = '30s';

// AANPASSING 3: Data variatie om de database cache te omzeilen
const LAST_NAMES = ['Franklin', 'Davis', 'Rodriquez', 'Black', 'White', 'Coleman', 'Leary', 'George'];
const OWNER_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function generateStages() {
    let stages = [];
    for (let i = STEP_VUS; i <= MAX_VUS; i += STEP_VUS) {
        stages.push({ duration: STEP_DURATION, target: i });
    }
    return stages;
}

export let options = {
    stages: generateStages(),
    thresholds: {

        'http_req_duration': ['p(95)<250'],
        // Stop de test als 5% van de calls faalt
        'http_req_failed': [{ threshold: 'rate<0.05', abortOnFail: true }],
    },
};

function addCacheBuster(url) {
    //iteratie voor extra uniekheid
    return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}_${__VU}_${__ITER}`;
}

export default function () {
    // --- 01. Home Page ---
    group('01_Home Page', function () {
        let resHome = http.get(addCacheBuster(`${BASE_URL}/`), { tags: { name: 'Home' } });
        check(resHome, { 'home status 200': (r) => r.status === 200 });
    });
    sleep(Math.random() * 2 + 1);

    // --- 02. Owner Lookup Flow ---
    group('02_Owner Lookup Flow', function () {
        // Stap A: Formulier
        let resFind = http.get(addCacheBuster(`${BASE_URL}/owners/find`), { tags: { name: 'OwnerFindForm' } });
        check(resFind, { 'find form status 200': (r) => r.status === 200 });

        // Stap B: Zoeken

        let randomName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

        let resSearch = http.get(addCacheBuster(`${BASE_URL}/owners?lastName=${randomName}`), {
            redirects: 0,
            tags: { name: 'OwnerSearch' }
        });

        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        // Stap C: Detail pagina
        if (resSearch.status === 302 || resSearch.status === 200) {

            let randomId = OWNER_IDS[Math.floor(Math.random() * OWNER_IDS.length)];

            let resDetail = http.get(addCacheBuster(`${BASE_URL}/owners/${randomId}`), {
                tags: { name: 'OwnerDetail' }
            });
            check(resDetail, { 'detail page status 200': (r) => r.status === 200 });
        }
    });
    sleep(Math.random() * 2 + 1);

    // --- 03. Veterinarians Page ---
    group('03_Veterinarians Page', function () {
        let resVets = http.get(addCacheBuster(`${BASE_URL}/vets.html`), { tags: { name: 'VetsList' } });
        check(resVets, { 'vets page status 200': (r) => r.status === 200 });
    });
    sleep(Math.random() * 2 + 1);
}
