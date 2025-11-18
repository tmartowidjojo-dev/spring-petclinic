import http from 'k6/http';
import { check, sleep, group } from 'k6';


//  ingesteld in docker-compose.yml

const BASE_URL = __ENV.TARGET_HOST || 'http://localhost:8080';

export let options = {

    vus: 20,           // 20 Virtual Users
    duration: '1m',    // Test 1 minute

    thresholds: {
        // Errors: Less than 1% of requests may fail
        'http_req_failed': ['rate<0.01'],
        // Latency: 95% of requests must complete within 800ms
        'http_req_duration': ['p(95)<800'],

        // Specific thresholds for the bundled flows
        'group_duration{group:01_Home Page}': ['p(95)<400'],
        'group_duration{group:02_Owner Lookup Flow}': ['p(95)<1500'],
        'group_duration{group:03_Veterinarians Page}': ['p(95)<500'],
    },
};

export default function () {
    //  Home Page
    group('01_Home Page', function () {
        let resHome = http.get(`${BASE_URL}/`);
        check(resHome, { 'home status 200': (r) => r.status === 200 });
        sleep(Math.random() * 0.5 + 1); // Wait 1 to 1.5 seconds
    });

    //  Find an Existing Owner & View Details
    group('02_Owner Lookup Flow', function () {
        // Step A: Go to Find form
        let resFind = http.get(`${BASE_URL}/owners/find`);
        check(resFind, { 'find form status 200': (r) => r.status === 200 });
        sleep(1);

        // Step B: Search for 'Franklin' (simulates a successful search)
        let resSearch = http.get(`${BASE_URL}/owners?lastName=Franklin`, { redirects: 0 });

        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        // Step C: View detail page (use owner 1 as an example after redirect)
        if (resSearch.status === 302 || resSearch.status === 200) {
            let resDetail = http.get(`${BASE_URL}/owners/1`);
            check(resDetail, { 'detail page status 200': (r) => r.status === 200 });
        }
        sleep(Math.random() * 1.5 + 1); // Wait 1 to 2.5 seconds
    });

    //  View List of Veterinarians
    group('03_Veterinarians Page', function () {
        let resVets = http.get(`${BASE_URL}/vets`);
        check(resVets, { 'vets page status 200': (r) => r.status === 200 });
        sleep(Math.random() * 0.5 + 1);
    });

}
