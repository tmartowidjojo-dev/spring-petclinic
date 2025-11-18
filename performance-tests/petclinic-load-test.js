import http from 'k6';
import { check, sleep, group } from 'k6';


const BASE_URL = 'http://petclinic:8080';

export let options = {

    vus: 20,           // 20 Virtual Users
    duration: '1m',    // Test 1 minute

    thresholds: {
        // Errors: Less than 1% of requests may fail
        'http_req_failed': ['rate<0.01'],

        // FIX: Latency - NU EXTREEM LAAG INGESTELD (100ms) om de 1000ms vertraging te breken
        'http_req_duration': ['p(95)<100'],

        // Groep 03 bevat de 1000ms vertraging, dus deze moet falen
        'group_duration{group:01_Home Page}': ['p(95)<100'],
        'group_duration{group:02_Owner Lookup Flow}': ['p(95)<500'],
        'group_duration{group:03_Veterinarians Page}': ['p(95)<150'],
    },
};

// Functie om cache uit te schakelen door een willekeurige parameter toe te voegen
function addCacheBuster(url) {
    return `${url}?t=${Date.now()}_${__VU}`;
}

export default function () {
    //  Home Page
    group('01_Home Page', function () {
        // FIX: Gebruik cache buster
        let resHome = http.get(addCacheBuster(`${BASE_URL}/`));
        check(resHome, { 'home status 200': (r) => r.status === 200 });
        sleep(Math.random() * 0.5 + 1); // Wait 1 to 1.5 seconds
    });

    //  Find an Existing Owner & View Details
    group('02_Owner Lookup Flow', function () {
        // Step A: Go to Find form
        let resFind = http.get(addCacheBuster(`${BASE_URL}/owners/find`));
        check(resFind, { 'find form status 200': (r) => r.status === 200 });
        sleep(1);

        // Step B: Search for 'Franklin' (simulates a successful search)
        // FIX: Gebruik cache buster
        let resSearch = http.get(addCacheBuster(`${BASE_URL}/owners?lastName=Franklin`), { redirects: 0 });

        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        // Step C: View detail page (use owner 1 as an example after redirect)
        if (resSearch.status === 302 || resSearch.status === 200) {
            let resDetail = http.get(addCacheBuster(`${BASE_URL}/owners/1`));
            check(resDetail, { 'detail page status 200': (r) => r.status === 200 });
        }
        sleep(Math.random() * 1.5 + 1); // Wait 1 to 2.5 seconds
    });

    //  View List of Veterinarians
    group('03_Veterinarians Page', function () {
        // FIX: Gebruik cache buster
        let resVets = http.get(addCacheBuster(`${BASE_URL}/vets`));
        check(resVets, { 'vets page status 200': (r) => r.status === 200 });
        sleep(Math.random() * 0.5 + 1);
    });
}
