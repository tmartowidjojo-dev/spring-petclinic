import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.TARGET_HOST || 'http://localhost:8080';

export let options = {
    vus: 200,
    duration: '1m',
    thresholds: {
        'http_req_failed': ['rate<0.01'],
        'http_req_duration': ['p(95)<150'],
        'group_duration{group:01_Home Page}': ['p(95)<150'],
        'group_duration{group:02_Owner Lookup Flow}': ['p(95)<400'],
        'group_duration{group:03_Veterinarians Page}': ['p(95)<500'],
    },
};

function addCacheBuster(url) {
    return `${url}?t=${Date.now()}_${__VU}`;
}

export default function () {
    // 01. Home Page
    group('01_Home Page', function () {


        let resHome = http.get(addCacheBuster(`${BASE_URL}/`), {
            tags: { name: 'Home' }
        });

        check(resHome, { 'home status 200': (r) => r.status === 200 });
    });

    sleep(Math.random() * 0.5);

    // 02. Owner Lookup Flow
    group('02_Owner Lookup Flow', function () {
        // Step A: Go to Find form
        let resFind = http.get(addCacheBuster(`${BASE_URL}/owners/find`), {
            tags: { name: 'OwnerFindForm' }
        });

        check(resFind, { 'find form status 200': (r) => r.status === 200 });

        // Step B: Search for 'Franklin'

        let resSearch = http.get(addCacheBuster(`${BASE_URL}/owners?lastName=Franklin`), {
            redirects: 0,
            tags: { name: 'OwnerSearch' }
        });

        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        // Step C: View detail page
        if (resSearch.status === 302 || resSearch.status === 200) {

            let resDetail = http.get(addCacheBuster(`${BASE_URL}/owners/1`), {
                tags: { name: 'OwnerDetail' }
            });

            check(resDetail, { 'detail page status 200': (r) => r.status === 200 });
        }
    });

   sleep(Math.random() * 0.5);

    // 03. Veterinarians Page
    group('03_Veterinarians Page', function () {
        let resVets = http.get(addCacheBuster(`${BASE_URL}/vets.html`), {
            tags: { name: 'VetsList' }
        });

        check(resVets, { 'vets page status 200': (r) => r.status === 200 });
    });

    sleep(Math.random() * 0.5);
}
