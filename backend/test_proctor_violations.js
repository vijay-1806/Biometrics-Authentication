const mongoose = require('mongoose');
const { scoreWindow, extractFeatures } = require('./src/controllers/behaviorController');
const BehaviorAlert = require('./src/models/BehaviorAlert');
const BehaviorSession = require('./src/models/BehaviorSession');
const User = require('./src/models/User');
require('dotenv').config();

// Helper to mock express req/res
function mockReqRes(body, user) {
  const req = { body, user };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };
  return { req, res };
}

async function runTests() {
  console.log('\n=== Testing Copy, Paste & Tab Switch Detection ===\n');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms_demo');

  // Find or create test student
  let student = await User.findOne({ role: 'student' });
  if (!student) {
    student = await User.create({
      name: 'Test Student',
      email: 'test_student_violation@example.com',
      password: 'password123',
      role: 'student'
    });
  }

  const testExamId = new mongoose.Types.ObjectId();

  // Test 1: Paste Event
  console.log('1. Testing Paste Detection in Session A...');
  const pastePayload = {
    examId: testExamId,
    session: 'sess_active_exam_A',
    events: [
      { type: 'paste', length: 120, timestamp: Date.now() }
    ],
    deviceInfo: { userAgent: 'test-agent', screenWidth: 1920, screenHeight: 1080 }
  };
  const { req: pReq, res: pRes } = mockReqRes(pastePayload, student);
  await scoreWindow(pReq, pRes);

  if (pRes.statusCode !== 200) {
    console.error(`[FAIL] Paste request returned status ${pRes.statusCode}:`, pRes.data);
    process.exit(1);
  }
  const pasteAlert = await BehaviorAlert.findOne({ student: student._id, alertType: 'paste_detected' }).sort({ createdAt: -1 });
  if (!pasteAlert) {
    console.error('[FAIL] No paste_detected alert was created in database!');
    process.exit(1);
  }
  console.log(`[PASS] Paste alert created! Chars: ${pasteAlert.topDeviatingFeatures.totalPastedChars}`);

  // Test 2: Tab Switch / Blur Event in Session A
  console.log('\n2. Testing Tab Switch Detection in Session A...');
  const tabPayload = {
    examId: testExamId,
    session: 'sess_active_exam_A',
    events: [
      { type: 'visibilitychange', hidden: true, timestamp: Date.now() }
    ],
    deviceInfo: { userAgent: 'test-agent', screenWidth: 1920, screenHeight: 1080 }
  };
  const { req: tReq, res: tRes } = mockReqRes(tabPayload, student);
  await scoreWindow(tReq, tRes);

  if (tRes.statusCode !== 200) {
    console.error(`[FAIL] Tab switch request returned status ${tRes.statusCode}:`, tRes.data);
    process.exit(1);
  }
  console.log('[PASS] Tab switch recorded in Session A!');

  // Test 3: Copy Event in Session A
  console.log('\n3. Testing Copy Detection in Session A...');
  const copyPayload = {
    examId: testExamId,
    session: 'sess_active_exam_A',
    events: [
      { type: 'copy', length: 85, timestamp: Date.now() }
    ],
    deviceInfo: { userAgent: 'test-agent', screenWidth: 1920, screenHeight: 1080 }
  };
  const { req: cReq, res: cRes } = mockReqRes(copyPayload, student);
  await scoreWindow(cReq, cRes);

  if (cRes.statusCode !== 200) {
    console.error(`[FAIL] Copy request returned status ${cRes.statusCode}:`, cRes.data);
    process.exit(1);
  }
  console.log('[PASS] Copy recorded in Session A!');

  // Test 4: Cumulative Counts in Session A
  console.log('\n4. Verifying Session A Cumulative Counters...');
  const sessionA = await BehaviorSession.findOne({ student: student._id, exam: testExamId, session: 'sess_active_exam_A' });
  if (!sessionA) {
    console.error('[FAIL] Session A not found!');
    process.exit(1);
  }
  console.log(`Session A cumulative counts: Tab Switches=${sessionA.tabBlurCount}, Pastes=${sessionA.pasteCount}, Copies=${sessionA.copyCount}`);
  if (sessionA.tabBlurCount !== 1 || sessionA.pasteCount !== 1 || sessionA.copyCount !== 1) {
    console.error('[FAIL] Session A cumulative counters did not match expected 1/1/1!');
    process.exit(1);
  }
  console.log('[PASS] Session A accumulated violations correctly!');

  // Test 5: Brand New Session B Must Start with 0 Counts (Refreshed!)
  console.log('\n5. Verifying Brand New Session B Starts at 0 (Not Bleeding Over)...');
  const sessionBPayload = {
    examId: testExamId,
    session: 'sess_brand_new_B',
    events: [
      { type: 'keydown', key: 'a', timestamp: Date.now() },
      { type: 'keyup', key: 'a', timestamp: Date.now() + 50 },
      { type: 'keydown', key: 'b', timestamp: Date.now() + 100 },
      { type: 'keyup', key: 'b', timestamp: Date.now() + 150 },
      { type: 'keydown', key: 'c', timestamp: Date.now() + 200 },
      { type: 'keyup', key: 'c', timestamp: Date.now() + 250 },
      { type: 'keydown', key: 'd', timestamp: Date.now() + 300 },
      { type: 'keyup', key: 'd', timestamp: Date.now() + 350 },
      { type: 'keydown', key: 'e', timestamp: Date.now() + 400 },
      { type: 'keyup', key: 'e', timestamp: Date.now() + 450 },
      { type: 'keydown', key: 'f', timestamp: Date.now() + 500 }
    ],
    deviceInfo: { userAgent: 'test-agent', screenWidth: 1920, screenHeight: 1080 }
  };
  const { req: bReq, res: bRes } = mockReqRes(sessionBPayload, student);
  await scoreWindow(bReq, bRes);

  const sessionB = await BehaviorSession.findOne({ student: student._id, exam: testExamId, session: 'sess_brand_new_B' });
  if (!sessionB) {
    console.error('[FAIL] Session B was not created!');
    process.exit(1);
  }
  console.log(`Session B counts: Tab Switches=${sessionB.tabBlurCount}, Pastes=${sessionB.pasteCount}, Copies=${sessionB.copyCount}`);
  if (sessionB.tabBlurCount !== 0 || sessionB.pasteCount !== 0 || sessionB.copyCount !== 0) {
    console.error('[FAIL] Session B inherited counters from Session A! Counters must start at 0!');
    process.exit(1);
  }
  console.log('[PASS] Session B started fresh with 0 tab switches, 0 pastes, and 0 copies!');

  // Cleanup test alerts and sessions
  await BehaviorAlert.deleteMany({ exam: testExamId.toString() });
  await BehaviorSession.deleteMany({ exam: testExamId });

  console.log('\n✅ ALL PROCTOR VIOLATION & SESSION ISOLATION TESTS PASSED!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test threw unhandled error:', err);
  process.exit(1);
});
