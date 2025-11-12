import http from 'k6/http';
import { check, sleep, group } from 'k6';


const BASE_URL = 'http://localhost:8080';

export let options = {
    // More realistic scenario with more VUs and longer duration
    vus: 20,          
    duration: '1m',  

    thresholds: {
        // Errors: Less than 1% of requests may fail
        'http_req_failed': ['rate<0.01'],
        // Latency: 95% of requests must complete within 800ms
        'http_req_duration': ['p(95)<800'],
        
        // Specific thresholds for the bundled flows
        'group_duration{group:01_Home Page}': ['p(95)<400'],
        'group_duration{group:02_Owner Lookup Flow}': ['p(95)<1500'], // Multi-step flow has a higher threshold
        'group_duration{group:03_Veterinarians Page}': ['p(95)<500'],
        'group_duration{group:04_Add New Owner Flow}': ['p(95)<2000'], 
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
        //  Go to Find form
        let resFind = http.get(`${BASE_URL}/owners/find`);
        check(resFind, { 'find form status 200': (r) => r.status === 200 });
        sleep(1);

        //  Search for 'Franklin' (simulates a successful search)
        let resSearch = http.get(`${BASE_URL}/owners?lastName=Franklin`, { redirects: 0 });
        
        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        //  View detail page (use owner 1 as an example after redirect)
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

    //  Add New Owner (Write Operation)
    group('04_Add New Owner Flow', function () {
        // Go to the form
        let resForm = http.get(`${BASE_URL}/owners/new`);
        check(resForm, { 'add owner form status 200': (r) => r.status === 200 });
        sleep(1);

        // Generate unique name and telephone number for the POST
        const randomFirstName = `LoadUser_${__VU}`;
        const randomLastName = `Test_${Math.random().toString(36).substring(2, 7)}`; // Unique ID
        
        //  Submit the form
        let resPost = http.post(
            `${BASE_URL}/owners/new`,
            {
                firstName: randomFirstName,
                lastName: randomLastName,
                address: '123 Test Street',
                city: 'Test City',
                telephone: '5551234567',
            }
        );

        // Check for successful redirect to the new owner detail page (status 302)
        check(resPost, {
            'owner creation successful (302)': (r) => r.status === 302,
        });
        
        sleep(Math.random() * 1.5 + 1); // Wait 1 to 2.5 seconds
    });
}
