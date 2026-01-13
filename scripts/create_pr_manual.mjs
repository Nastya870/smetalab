import https from 'https';

const token = process.env.GITHUB_TOKEN || "YOUR_TOKEN_HERE";

const data = JSON.stringify({
    title: "⚡ Optimize N+1 queries for remote database (30-40x faster)",
    body: `## 🎯 Problem
- Loading estimates with 112 items took 6-23 seconds
- Root cause: N+1 queries (112 parallel) to remote DB on Render
- Each query has 100-300ms network latency

## ✅ Solution
- Replace N parallel queries with 1 batch query using WHERE ANY()
- Reduces network round-trips: 114 → 3
- SQL execution also faster: 6s → 0.15s

## 📊 Expected Result
- Loading time: 23s → 0.7s (33x faster)
- Works well with remote database (latency insensitive)

## 🧪 Testing
- [x] Benchmark shows 40x improvement
- [x] Code structure preserved (compatible with frontend)
- [ ] Manual testing in browser needed

## 📝 Changes
- server/repositories/estimatesRepository.js: batch query implementation
- scripts/analyze-performance.mjs: benchmark script
- docs/: comprehensive documentation`,
    head: "feature/optimize-n-plus-1",
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
