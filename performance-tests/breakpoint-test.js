import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.TARGET_HOST || 'http://localhost:8080';

const MAX_VUS = 100;
const STEP_VUS = 10;
const STEP_DURATION = '20s';

function generateStages() {
    let stages = [];
    // Begin bij 10, ga door tot 100, tel er steeds 10 bij op
    for (let i = STEP_VUS; i <= MAX_VUS; i += STEP_VUS) {
        stages.push({ duration: STEP_DURATION, target: i });
    }
    return stages;
}

export let options = {
    // Start met 0 gebruikers
    stages: generateStages(),

    thresholds: {
        // Als p(95) boven de 500ms komt, beschouwen we dat als het breekpunt.
        'http_req_duration': ['p(95)<300'],
    },
};

//om caching te voorkomen
function addCacheBuster(url) {
    return `${url}?t=${Date.now()}_${__VU}`;
}

export default function () {
    // --- 01. Home Page ---
    group('01_Home Page', function () {
        let resHome = http.get(addCacheBuster(`${BASE_URL}/`));
        check(resHome, { 'home status 200': (r) => r.status === 200 });
    });
    sleep(Math.random() * 0.5 + 1);

    // --- 02. Owner Lookup Flow ---
    group('02_Owner Lookup Flow', function () {
        // Stap A: Formulier
        let resFind = http.get(addCacheBuster(`${BASE_URL}/owners/find`));
        check(resFind, { 'find form status 200': (r) => r.status === 200 });

        // Stap B: Zoeken
        let resSearch = http.get(addCacheBuster(`${BASE_URL}/owners?lastName=Franklin`), { redirects: 0 });
        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        // Stap C: Detail pagina
        if (resSearch.status === 302 || resSearch.status === 200) {
            let resDetail = http.get(addCacheBuster(`${BASE_URL}/owners/1`));
            check(resDetail, { 'detail page status 200': (r) => r.status === 200 });
        }
    });
    sleep(Math.random() * 1.5 + 1);

    //- 03. Veterinarians Page
    group('03_Veterinarians Page', function () {
        let resVets = http.get(addCacheBuster(`${BASE_URL}/vets.html`));
        check(resVets, { 'vets page status 200': (r) => r.status === 200 });
    });
    sleep(Math.random() * 0.5 + 1);
}
