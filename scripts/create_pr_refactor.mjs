import https from 'https';

const token = process.env.GITHUB_TOKEN || "YOUR_TOKEN_HERE";

const data = JSON.stringify({
    title: "♻️ Refactor EstimateWithSidebar: Hook Integration & Optimization",
    body: `## 🎯 Objective
- Refactor EstimateWithSidebar.jsx to fully use the custom hook \`useEstimateData\`.
- Remove >500 lines of duplicate code.
- Optimize performance by removing redundant renders and states.

## ✅ Changes
- **EstimateWithSidebar.jsx**: Complete rewrite. Delegated logic to \`useEstimateData\`.
- **useEstimateData.js**: Added optimizations (\`handleUpdateWorkPriceInReference\` wrapped in useCallback).
- **Integration**: \`useWorksLibrary\` and \`useMaterialsSearch\` fully integrated.

## 🧪 Testing Scope
- [x] Syntax check passed.
- [ ] Manual verification required for Estimate Logic (Works, Materials, Totals, Save).

This PR establishes a clean architecture for the Estimate page.`,
    head: "feature/refactor-estimate-hook-v2",
    base: "master"
});

const options = {
    hostname: 'api.github.com',
    port: 443,
    path: '/repos/Nastya870/smetalab/pulls',
    method: 'POST',
    headers: {
        'User-Agent': 'Node.js Script',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        if (res.statusCode === 201) {
            const response = JSON.parse(body);
            console.log('✅ PR Created Successfully!');
            console.log('🔗 URL:', response.html_url);
        } else {
            console.error('❌ Error creating PR:', res.statusCode);
            console.error('Response Body:', JSON.stringify(JSON.parse(body), null, 2));
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request Error:', error);
});

req.write(data);
req.end();
