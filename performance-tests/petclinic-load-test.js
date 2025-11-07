import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    vus: 10,          // 10 virtual users
    duration: '30s',  // run for 30 seconds
    thresholds: {
        http_req_failed: ['rate<0.01'],        // fail if more than 1% requests fail
        http_req_duration: ['p(95)<500'],     // 95% of requests must complete <500ms
    },
};

export default function () {
    // Test home page
    let resHome = http.get('http://localhost:8080/');
    check(resHome, { 'home page status 200': (r) => r.status === 200 });

    // Test /owners page
    let resOwners = http.get('http://localhost:8080/owners');
    check(resOwners, { 'owners page status 200': (r) => r.status === 200 });

    sleep(1); // wait 1 second between iterations
}

