// Verify the saved demo through the same APIs used by the browser.
const assert = require('node:assert/strict');
const lms = process.env.DEMO_LMS_URL || 'http://127.0.0.1:8080';
const ml = process.env.DEMO_ML_URL || lms + '/bio-api';
async function request(base, route, body, token) {
  const response = await fetch(base + route, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {}), 'X-API-Key': 'bio_live_default_lms_key' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  assert.ok(response.ok, `${route}: ${response.status} ${text}`);
  return JSON.parse(text);
}
async function main() {
  const accounts = [
    ['admin@gmail.com', 'LmsAdmin@2026!', 'admin'],
    ['teacher@gmail.com', 'password123', 'teacher'],
    ['teacher-01@gmail.com', 'password123', 'teacher'],
    ['vijay@gmail.com', '123456', 'student'],
    ['ragavan@gmail.com', '123456', 'student'],
    ['sarvanth@gmail.com', '123456', 'student'],
  ];
  for (const [email, password, role] of accounts) {
    const user = await request(lms, '/api/auth/login', {email, password});
    assert.equal(user.role, role);
    const courses = await request(lms, '/api/courses', null, user.token);
    assert.ok(courses.length > 0, email + ': saved courses missing');
    if (role === 'student') {
      const status = await request(ml, '/users/' + user._id + '/status');
      assert.ok(status.samples_collected >= 20, email + ': enrollment missing');
      assert.ok(status.baseline_trained_at, email + ': training missing');
      const events = [];
      const passage = 'the quick brown fox jumps over the lazy dog and this student types a sample';
      for (let i = 0; i < passage.length; i++) {
        events.push({key: passage[i], type: 'down', t: i * 150});
        events.push({key: passage[i], type: 'up', t: i * 150 + 80});
      }
      // Exercise inference, not just the existence of a .joblib file.
      const verification = await request(ml, '/verify', {user_id: user._id, events});
      assert.equal(typeof verification.trust_score, 'number');
    }
  }
  for (const [email, password] of [
    ['admin@bioauth.service', 'BioAuth@2026!'],
    ['vijay@bioauth.io', 'BioAuth@2026!'],
    ...['vijay', 'ragavan', 'sarvanth'].map(name => [name + '@gmail.com', 'DemoStudent@2026!']),
  ]) {
    const result = await request(ml, '/v1/auth/login', {email, password});
    assert.ok(result.session_token, email + ': console login failed');
  }
  console.log('PASS: LMS/console demo logins, teacher courses, student enrollment and trained-model inference.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
