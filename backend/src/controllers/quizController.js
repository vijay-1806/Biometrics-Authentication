const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const Course = require('../models/Course');
const AssessmentSession = require('../models/AssessmentSession');
const BehaviorAlert = require('../models/BehaviorAlert');
const BehaviorSession = require('../models/BehaviorSession');
const { isStudentAuthorizedForExam } = require('../socketHandler');

const canAccessQuiz = async (quiz, user) => {
  const course = await Course.findByRecordId(quiz.course).select('teacher studentsEnrolled');
  if (!course) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'teacher') return String(course.teacher) === String(user._id);
  return course.studentsEnrolled.some((studentId) => String(studentId) === String(user._id));
};

const configureLiveAssessment = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Practice quiz not found.' });
    const course = await Course.findByRecordId(quiz.course).select('teacher');
    if (!course || (String(course.teacher) !== String(req.user._id) && req.user.role !== 'admin')) return res.status(403).json({ message: 'You cannot change this course assessment.' });
    quiz.isExam = Boolean(req.body.isLiveAssessment);
    if (req.body.durationMinutes !== undefined) quiz.durationMinutes = Math.min(240, Math.max(1, Number(req.body.durationMinutes) || 30));
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update the live assessment.' });
  }
};

const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    const course = await Course.findByRecordId(quiz.course).select('teacher');
    if (!course || (String(course.teacher) !== String(req.user._id) && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'You cannot delete a quiz from this course.' });
    }
    const assessmentFilter = { assessment: String(quiz._id) };
    const runningSession = await AssessmentSession.exists({ ...assessmentFilter, status: { $in: ['waiting', 'active'] } });
    if (runningSession) return res.status(409).json({ message: 'End the quiz session before deleting this quiz.' });

    const sessionIds = await AssessmentSession.find(assessmentFilter).distinct('_id');
    await Promise.all([
      Result.deleteMany({ quiz: quiz._id }),
      BehaviorAlert.deleteMany({ exam: String(quiz._id) }),
      BehaviorSession.deleteMany({ $or: [{ exam: quiz._id }, { assessmentSessionId: { $in: sessionIds.map(String) } }] }),
      AssessmentSession.deleteMany(assessmentFilter),
    ]);
    await quiz.deleteOne();
    res.json({ message: 'Quiz and its results were deleted.' });
  } catch (error) {
    console.error('Quiz delete error:', error);
    res.status(500).json({ message: 'Could not delete this quiz.' });
  }
};

// @desc    Create a quiz
// @route   POST /api/quizzes
// @access  Private (Teacher or Admin)
const createQuiz = async (req, res) => {
  try {
    const { course, title, description, durationMinutes, questions, isExam } = req.body;

    if (!course || !title || !description || !questions || questions.length === 0) {
      return res.status(400).json({ message: 'Please provide course, title, description, and questions' });
    }

    // Verify course exists and belongs to the teacher
    const courseObj = await Course.findByRecordId(course);
    if (!courseObj) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (courseObj.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to add quizzes to this course' });
    }

    const normalizedQuestions = questions.map((question) => ({
      questionText: String(question.questionText || '').trim(),
      options: Array.isArray(question.options) ? question.options.map((option) => String(option).trim()) : [],
      correctAnswerIndex: Number(question.correctAnswerIndex),
    }));
    if (normalizedQuestions.some((question) => !question.questionText || question.options.length < 2 || question.options.some((option) => !option) || !Number.isInteger(question.correctAnswerIndex) || question.correctAnswerIndex < 0 || question.correctAnswerIndex >= question.options.length)) {
      return res.status(400).json({ message: 'Every question needs text, at least two options, and a valid answer key.' });
    }
    const safeDuration = Math.min(240, Math.max(1, Number(durationMinutes) || 30));
    const quiz = await Quiz.create({
      course,
      title,
      description,
      durationMinutes: safeDuration,
      isExam: Boolean(isExam),
      questions: normalizedQuestions,
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get quiz by ID
// @route   GET /api/quizzes/:id
// @access  Private
const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (!(await canAccessQuiz(quiz, req.user))) return res.status(403).json({ message: 'Join this course before opening its assessment.' });

    const authCheck = quiz.isExam && req.user?.role === 'student'
      ? await isStudentAuthorizedForExam(req.user._id, req.params.id)
      : { authorized: true };
    const canViewQuestions = authCheck.authorized && (!quiz.isExam || authCheck.status === 'active');

    // Secure correct answers: strip correctAnswerIndex for student roles
    if (req.user.role === 'student') {
      const sanitizedQuestions = quiz.questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
      }));

      return res.json({
        _id: quiz._id,
        course: quiz.course,
        title: quiz.title,
        description: quiz.description,
        durationMinutes: quiz.durationMinutes,
        isExam: quiz.isExam,
        questions: canViewQuestions ? sanitizedQuestions : [],
        questionCount: quiz.questions.length,
        requiresSessionPin: !canViewQuestions,
        sessionEndsAt: authCheck.endsAt || null,
      });
    }

    res.json(quiz);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Submit quiz answers and score them
// @route   POST /api/quizzes/:id/submit
// @access  Private (Student only)
const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body; // Array of { questionIndex: Number, selectedAnswerIndex: Number }
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (!(await canAccessQuiz(quiz, req.user))) return res.status(403).json({ message: 'Join this course before submitting its assessment.' });

    if (quiz.isExam && req.user && req.user.role === 'student') {
      const authCheck = await isStudentAuthorizedForExam(req.user._id, req.params.id, true);
      if (!authCheck.authorized || !['active', 'ended'].includes(authCheck.status)) {
        return res.status(403).json({ message: 'Active assessment session required to submit quiz.' });
      }
    }

    const existingAttempt = await Result.findOne({ student: req.user._id, quiz: quiz._id });
    if (quiz.isExam && existingAttempt) return res.status(409).json({ message: 'An attempt has already been submitted for this proctored assessment.' });

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Please provide answers array' });
    }

    let correctCount = 0;
    const gradedAnswers = quiz.questions.map((question, idx) => {
      // Find matching student answer
      const studentAns = answers.find((ans) => ans.questionIndex === idx);
      const selectedAnswerIndex = studentAns ? studentAns.selectedAnswerIndex : -1;
      const isCorrect = selectedAnswerIndex === question.correctAnswerIndex;

      if (isCorrect) {
        correctCount++;
      }

      return {
        questionIndex: idx,
        selectedAnswerIndex,
        isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    const sessionAuth = quiz.isExam ? await isStudentAuthorizedForExam(req.user._id, req.params.id, true) : null;
    const result = await Result.create({
      student: req.user._id,
      assessmentSessionId: sessionAuth?.session?.assessmentSessionId || null,
      quiz: quiz._id,
      score: correctCount,
      totalQuestions,
      percentage,
      answers: gradedAnswers,
    });

    res.status(201).json({
      result,
      correctAnswers: quiz.questions.map((q) => q.correctAnswerIndex), // Return correct keys to let student see their results page
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get results for a quiz
// @route   GET /api/quizzes/:id/results
// @access  Private
const getQuizResults = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (!(await canAccessQuiz(quiz, req.user))) return res.status(403).json({ message: 'Join this course before viewing assessment results.' });

    let results;

    if (req.user.role === 'student') {
      // Students see their own results
      results = await Result.find({
        quiz: req.params.id,
        student: req.user._id,
      }).sort({ createdAt: -1 });
    } else {
      // Teachers and Admins see all results
      results = await Result.find({ quiz: req.params.id })
        .populate('student', 'name email')
        .sort({ createdAt: -1 });
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createQuiz,
  configureLiveAssessment,
  deleteQuiz,
  getQuizById,
  submitQuiz,
  getQuizResults,
};
