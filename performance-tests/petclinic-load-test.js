import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { html } from 'k6/html'; // Necessary for parsing the CSRF token

const BASE_URL = 'http://localhost:8080';


const CRITICAL_CHECK_NAME = 'owner_creation_successful_302'; 

export let options = {
    // Define the load profile
    vus: 20,         
    duration: '1m', 

    thresholds: {
        // General reliability: Max 1% of all requests may fail (4xx or 5xx status)
        'http_req_failed': ['rate<0.01'], 
        
        // General speed: 95% of all requests must complete within 800ms
        'http_req_duration': ['p(95)<800'],
        
       
    'checks{owner_creation_successful_302}': ['rate>0.99'], 
        
        // Specific thresholds for the flow duration (SLOs)
        'group_duration{group:01_Home Page}': ['p(95)<400'],
        'group_duration{group:02_Owner Lookup Flow}': ['p(95)<1500'], 
        'group_duration{group:03_Veterinarians Page}': ['p(95)<500'],
        'group_duration{group:04_Add New Owner Flow}': ['p(95)<2000'], 
    },
};

export default function () {
    // 01 Home Page (Read Operation)
    group('01_Home Page', function () {
        let resHome = http.get(`${BASE_URL}/`);
        check(resHome, { 'home status 200': (r) => r.status === 200 });
        sleep(Math.random() * 0.5 + 1);
    });


    // 02 Find an Existing Owner & View Details (Search/Read Operation)
    group('02_Owner Lookup Flow', function () {
        let resFind = http.get(`${BASE_URL}/owners/find`);
        check(resFind, { 'find form status 200': (r) => r.status === 200 });
        sleep(1);

        let resSearch = http.get(`${BASE_URL}/owners?lastName=Franklin`, { redirects: 0 });
        
        check(resSearch, {
            'search redirect (302) or success (200)': (r) => r.status === 302 || r.status === 200,
        });

        if (resSearch.status === 302 || resSearch.status === 200) {
            let resDetail = http.get(`${BASE_URL}/owners/1`);
            check(resDetail, { 'detail page status 200': (r) => r.status === 200 });
        }
        sleep(Math.random() * 1.5 + 1);
    });
    

    // 03 View List of Veterinarians (Read Operation)
    group('03_Veterinarians Page', function () {
        let resVets = http.get(`${BASE_URL}/vets`);
        check(resVets, { 'vets page status 200': (r) => r.status === 200 });
        sleep(Math.random() * 0.5 + 1);
    });

  
    // 04 Add New Owner (Write Operation) - CSRF FIX IMPLEMENTED
    group('04_Add New Owner Flow', function () {
        // 1. GET: Haal het formulier op om de CSRF token te ontvangen
        let resForm = http.get(`${BASE_URL}/owners/new`);
        check(resForm, { 'add owner form status 200': (r) => r.status === 200 });
        
   
     
        const doc = html.parse(resForm.body);
        const csrfToken = doc.find('input[name="_csrf"]').attr('value');
        
        if (!csrfToken) {
            console.error('Fout: CSRF-token niet gevonden. POST zal falen!');
            sleep(1);
            return;
        }

        sleep(1);

        // Genereer unieke data voor elke gebruiker
        const randomFirstName = `LoadUser_${__VU}`;
        const randomLastName = `Test_${Math.random().toString(36).substring(2, 7)}`; 
        
        // 3. POST: Stuur de data INCLUSIEF de token
        const postData = {
            firstName: randomFirstName,
            lastName: randomLastName,
            address: '123 coolStreet',
            city: 'island City',
            telephone: '5551234567', 
            _csrf: csrfToken, 
        };
        
        let resPost = http.post(
            `${BASE_URL}/owners/new`,
            postData, 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        // Check voor succesvolle redirect (status 302)
        check(resPost, {
            [CRITICAL_CHECK_NAME]: (r) => r.status === 302,
        });
        
        // Log de daadwerkelijke status als deze faalt voor directe debugging
        if (resPost.status !== 302) {
             console.error(` POST Failed! Status: ${resPost.status}. Body Preview: ${resPost.body.substring(0, 100)}`);
        }

        sleep(Math.random() * 1.5 + 1);
    });
}
