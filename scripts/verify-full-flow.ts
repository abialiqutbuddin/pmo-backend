
import axios from 'axios';

const BASE_URL = 'http://localhost:4000';
let sysToken = '';
let tenantToken = '';
let tenantId = '';
let roleId = '';

async function run() {
    try {
        console.log('--- STARTING ROBUST VERIFICATION ---');

        // 1. Login as Super Admin (using existing seeded creds or default)
        // Assuming seeds created 'admin@pmo.app'
        console.log('1. Logging in as System Admin...');
        try {
            const res = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'admin@pmo.app', // from previous steps
                password: 'password123'
            }, { headers: { 'X-Tenant-ID': 'system' } });
            sysToken = res.data.accessToken;
            console.log('   [PASS] Logged in. Token:', sysToken.substring(0, 10) + '...');
        } catch (e: any) {
            // Fallback to what might be in seeds
            console.log('   [WARN] Login failed with admin@pmo.app, trying seed fallback...');
            const res = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'admin@system.com',
                password: 'password'
            }, { headers: { 'X-Tenant-ID': 'system' } });
            sysToken = res.data.accessToken;
            console.log('   [PASS] Logged in with fallback.');
        }

        // 2. Create New Tenant
        const slug = `test-tenant-${Date.now()}`;
        console.log(`2. Creating Tenant '${slug}'...`);
        const tRes = await axios.post(`${BASE_URL}/tenant`, {
            name: 'Test Tenant Corp',
            slug,
            adminName: 'Test Corp Admin',
            adminEmail: `admin@${slug}.com`,
            adminPassword: 'password123'
        }, { headers: { Authorization: `Bearer ${sysToken}` } });

        tenantId = tRes.data.tenant.id;
        console.log('   [PASS] Tenant Created:', tenantId);

        // 3. Tenant Admin Login (Lookup + Login)
        console.log('3. Verifying Tenant Admin Login...');
        // Lookup
        const lRes = await axios.post(`${BASE_URL}/auth/lookup`, { email: `admin@${slug}.com` });
        if (lRes.data.length !== 1 || lRes.data[0].slug !== slug) throw new Error('Lookup failed');
        console.log('   [PASS] Lookup found correct tenant.');

        // Login
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: `admin@${slug}.com`,
            password: 'password123'
        }, { headers: { 'X-Tenant-ID': slug } }); // Using slug header
        tenantToken = loginRes.data.accessToken;
        console.log('   [PASS] Tenant Admin Logged in.');

        // 4. Verify Admin Role Exists (Bootstrapping check)
        // We expect the new user to have 'Admin' role assigned.
        // Fetch profile
        // Note: profile endpoint user fetching might not show roles if not joined? 
        // Let's use List Roles to see if 'Admin' role exists.
        const rolesRes = await axios.get(`${BASE_URL}/roles`, {
            headers: { Authorization: `Bearer ${tenantToken}`, 'X-Tenant-ID': tenantId }
        });
        const hasAdmin = rolesRes.data.some((r: any) => r.name === 'Admin');
        if (!hasAdmin) throw new Error('Admin role was not automatically created!');
        console.log('   [PASS] Admin role exists (bootstrapped).');

        // 5. Create Custom Role
        console.log('5. Creating Custom Role (Project Manager)...');
        const roleRes = await axios.post(`${BASE_URL}/roles`, {
            name: 'Project Manager',
            description: 'Manages projects'
        }, { headers: { Authorization: `Bearer ${tenantToken}`, 'X-Tenant-ID': tenantId } });
        roleId = roleRes.data.id;
        console.log('   [PASS] Role Created:', roleId);

        // 6. List Modules and Assign Permissions
        console.log('6. Assigning Permissions...');
        const modRes = await axios.get(`${BASE_URL}/roles/modules`, {
            headers: { Authorization: `Bearer ${tenantToken}`, 'X-Tenant-ID': tenantId }
        });
        const tasksModule = modRes.data.find((m: any) => m.key === 'tasks');
        if (!tasksModule) throw new Error('Tasks module not found');

        await axios.post(`${BASE_URL}/roles/${roleId}/permissions`, {
            moduleId: tasksModule.id,
            actions: ['read', 'create']
        }, { headers: { Authorization: `Bearer ${tenantToken}`, 'X-Tenant-ID': tenantId } });
        console.log('   [PASS] Permissions assigned.');

        // 7. Verify Permissions Persisted
        console.log('7. Verifying Persistence...');
        const verifyRes = await axios.get(`${BASE_URL}/roles/${roleId}`, {
            headers: { Authorization: `Bearer ${tenantToken}`, 'X-Tenant-ID': tenantId }
        });
        const perms = verifyRes.data.permissions;
        const taskPerm = perms.find((p: any) => p.moduleId === tasksModule.id);
        if (!taskPerm || !taskPerm.actions.includes('create')) throw new Error('Permissions verification failed');
        console.log('   [PASS] Permissions verified.');

        // 8. Cleanup (Delete Tenant?) - Optional, maybe keep for manual inspection
        // console.log('8. Cleaning up...');
        // await axios.delete... (Tenant delete not implemented in controller)

        console.log('--- ALL TESTS PASSED ---');

    } catch (e: any) {
        console.error('FAILED:', e.response?.data || e.message);
        process.exit(1);
    }
}

run();
