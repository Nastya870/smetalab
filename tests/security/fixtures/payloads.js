/**
 * Вредоносные payloads для Security тестов
 * 
 * ВНИМАНИЕ: Использовать только для тестирования!
 */

// ============================================
// SQL INJECTION PAYLOADS
// ============================================
export const SQL_PAYLOADS = [
  // Classic SQL injection
  "' OR '1'='1",
  "' OR '1'='1' --",
  "' OR '1'='1' /*",
  "'; --",
  "'; DROP TABLE users; --",
  "'; DROP TABLE projects; --",
  
  // Union-based injection
  "' UNION SELECT * FROM users --",
  "' UNION SELECT NULL, NULL, NULL --",
  "' UNION SELECT username, password FROM users --",
  "1 UNION SELECT * FROM information_schema.tables --",
  
  // Boolean-based blind injection
  "' AND '1'='1",
  "' AND '1'='2",
  "1 AND 1=1",
  "1 AND 1=2",
  
  // Time-based blind injection
  "'; WAITFOR DELAY '0:0:5' --",
  "'; SELECT SLEEP(5) --",
  "1; SELECT pg_sleep(5) --",
  
  // Error-based injection
  "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()))) --",
  "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --",
  
  // Stacked queries
  "1; INSERT INTO users (email) VALUES ('hacker@evil.com') --",
  "1; UPDATE users SET role='admin' WHERE id=1 --",
  "1; DELETE FROM users WHERE id > 0 --",
  
  // Comment injection
  "admin'--",
  "admin'#",
  "admin'/*",
  
  // Numeric injection
  "1 OR 1=1",
  "1) OR (1=1",
  "-1 OR 1=1",
  "1 AND 1=1",
  
  // Special characters
  "';",
  "\"",
  "\\",
  "%27",
  "%22",
  
  // PostgreSQL specific
  "'; SELECT version(); --",
  "'; SELECT current_user; --",
  "'; SELECT current_database(); --",
  "1; SELECT * FROM pg_tables --",
];

// ============================================
// XSS PAYLOADS
// ============================================
export const XSS_PAYLOADS = [
  // Basic script injection
  "<script>alert('XSS')</script>",
  "<script>alert(document.cookie)</script>",
  "<script>alert(document.domain)</script>",
  
  // Event handlers
  "<img src=x onerror=alert('XSS')>",
  "<img src=x onerror='alert(1)'>",
  "<body onload=alert('XSS')>",
  "<svg onload=alert('XSS')>",
  "<input onfocus=alert('XSS') autofocus>",
  "<marquee onstart=alert('XSS')>",
  "<video><source onerror=alert('XSS')>",
  
  // JavaScript protocol
  "javascript:alert('XSS')",
  "javascript:alert(document.cookie)",
  "<a href='javascript:alert(1)'>click</a>",
  
  // Data URI
  "<a href='data:text/html,<script>alert(1)</script>'>click</a>",
  
  // Encoded payloads
  "%3Cscript%3Ealert('XSS')%3C/script%3E",
  "&#60;script&#62;alert('XSS')&#60;/script&#62;",
  "\\x3cscript\\x3ealert('XSS')\\x3c/script\\x3e",
  
  // SVG injection
  "<svg><script>alert('XSS')</script></svg>",
  "<svg/onload=alert('XSS')>",
  
  // CSS injection
  "<style>body{background:url('javascript:alert(1)')}</style>",
  "<div style='background:url(javascript:alert(1))'>",
  
  // Template injection
  "{{constructor.constructor('alert(1)')()}}",
  "${alert('XSS')}",
  "#{alert('XSS')}",
  
  // Breaking out of attributes
  "' onclick='alert(1)'",
  "\" onfocus=\"alert(1)\" autofocus=\"",
  "' onmouseover='alert(1)'",
  
  // HTML entities bypass
  "&lt;script&gt;alert('XSS')&lt;/script&gt;",
  
  // Null byte injection
  "<scr\x00ipt>alert('XSS')</script>",
  
  // Mixed case bypass
  "<ScRiPt>alert('XSS')</sCrIpT>",
  "<IMG SRC=x ONERROR=alert('XSS')>",
];

// ============================================
// JWT PAYLOADS
// ============================================
export const JWT_PAYLOADS = {
  // Algorithm confusion attacks
  noneAlgorithm: {
    header: { alg: 'none', typ: 'JWT' },
    description: 'Algorithm set to none'
  },
  
  // Signature stripping
  emptySignature: {
    description: 'JWT with empty signature'
  },
  
  // Key confusion (RS256 to HS256)
  algorithmSwitch: {
    header: { alg: 'HS256', typ: 'JWT' },
    description: 'Switch from RS256 to HS256'
  },
  
  // Payload manipulation
  roleEscalation: {
    payload: { role: 'super_admin', isSuperAdmin: true },
    description: 'Escalate role to super_admin'
  },
  
  // Expired token reuse
  expiredToken: {
    payload: { exp: Math.floor(Date.now() / 1000) - 3600 },
    description: 'Token expired 1 hour ago'
  },
  
  // Future token
  futureToken: {
    payload: { iat: Math.floor(Date.now() / 1000) + 86400 },
    description: 'Token issued in the future'
  },
  
  // Invalid audience/issuer
  wrongAudience: {
    payload: { aud: 'wrong-audience' },
    description: 'Invalid audience claim'
  },
};

// ============================================
// PATH TRAVERSAL PAYLOADS
// ============================================
export const PATH_TRAVERSAL_PAYLOADS = [
  "../",
  "..\\",
  "../../../etc/passwd",
  "..\\..\\..\\windows\\system32\\config\\sam",
  "....//....//....//etc/passwd",
  "%2e%2e%2f",
  "%2e%2e/",
  "..%2f",
  "%2e%2e%5c",
  "..%5c",
  "..%255c",
  "..%c0%af",
  "..%c1%9c",
];

// ============================================
// NOSQL INJECTION PAYLOADS
// ============================================
export const NOSQL_PAYLOADS = [
  '{"$gt": ""}',
  '{"$ne": null}',
  '{"$where": "sleep(5000)"}',
  '{"$regex": ".*"}',
  "{ $or: [ {}, { 'a': 'a' } ] }",
  '{"$gt": undefined}',
];

// ============================================
// HEADER INJECTION PAYLOADS
// ============================================
export const HEADER_INJECTION_PAYLOADS = [
  "value\r\nInjected-Header: injected",
  "value\nSet-Cookie: session=hacked",
  "value\r\nX-Injected: true",
  "%0d%0aInjected-Header: injected",
];

// ============================================
// IDOR (Insecure Direct Object Reference) TEST IDs
// ============================================
export const IDOR_TEST_IDS = {
  // UUIDs from different tenants
  otherTenantProject: '00000000-0000-0000-0000-000000000001',
  otherTenantUser: '00000000-0000-0000-0000-000000000002',
  otherTenantEstimate: '00000000-0000-0000-0000-000000000003',
  
  // Invalid/special IDs
  negativeId: -1,
  zeroId: 0,
  maxInt: 2147483647,
  overflow: '99999999999999999999',
  
  // Special strings
  nullString: 'null',
  undefinedString: 'undefined',
  adminString: 'admin',
};

// ============================================
// RATE LIMITING TEST CONFIG
// ============================================
export const RATE_LIMIT_CONFIG = {
  // Login brute force
  login: {
    requests: 100,
    timeWindowMs: 60000, // 1 minute
    expectedLimit: 5,    // Should block after 5 attempts
  },
  
  // API abuse
  api: {
    requests: 1000,
    timeWindowMs: 60000,
    expectedLimit: 100,
  },
  
  // Registration spam
  registration: {
    requests: 20,
    timeWindowMs: 60000,
    expectedLimit: 3,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Генерирует случайный payload из массива
 */
export function getRandomPayload(payloads) {
  return payloads[Math.floor(Math.random() * payloads.length)];
}

/**
 * Кодирует payload для URL
 */
export function urlEncode(payload) {
  return encodeURIComponent(payload);
}

/**
 * Создаёт JWT с модифицированным payload
 */
export function createMaliciousJwt(originalToken, modifications) {
  const parts = originalToken.split('.');
  if (parts.length !== 3) return null;
  
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    // Apply modifications
    Object.assign(payload, modifications);
    
    // Re-encode (signature will be invalid)
    const newHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const newPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    return `${newHeader}.${newPayload}.${parts[2]}`;
  } catch {
    return null;
  }
}
