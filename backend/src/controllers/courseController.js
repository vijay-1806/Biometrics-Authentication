const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const Result = require('../models/Result');
const BehaviorAlert = require('../models/BehaviorAlert');
const BehaviorSession = require('../models/BehaviorSession');
const AssessmentSession = require('../models/AssessmentSession');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
const getCourses = async (req, res) => {
  try {
    let courses;

    if (req.user.role === 'teacher') {
      // Teachers see their own courses
      courses = await Course.find({ teacher: req.user._id })
        .populate('teacher', 'name email')
        .populate('studentsEnrolled', 'name email');
    } else if (req.user.role === 'admin') {
      // Admins see all courses
      courses = await Course.find()
        .populate('teacher', 'name email')
        .populate('studentsEnrolled', 'name email');
    } else {
      // Students see all available courses
      courses = await Course.find()
        .populate('teacher', 'name email');
    }

    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('studentsEnrolled', 'name email');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify student is enrolled OR user is the teacher of this course OR user is admin
    const isTeacher = course.teacher._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isEnrolled = course.studentsEnrolled.some(
      (student) => student._id.toString() === req.user._id.toString()
    );

    if (!isTeacher && !isAdmin && !isEnrolled) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Course pages expose coding practice only. Legacy quiz records remain available
    // to the cleanup paths so deleting a course also removes its historical data.
    const assignmentDocs = await Assignment.find({ course: course._id }).lean();
    const assignments = req.user.role === 'student' ? assignmentDocs.filter((a) => !a.isLiveAssessment) : assignmentDocs;
    // For students, show coding assignment submissions only.
    let submissions = [];
    if (req.user.role === 'student') {
      submissions = await Submission.find({ student: req.user._id, assignment: { $in: assignments.map(a => a._id) } });
    }

    res.json({
      course,
      assignments,
      studentData: {
        submissions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStudentLiveAssessments = async (req, res) => {
  try {
    const courses = await Course.find({ studentsEnrolled: req.user._id }).select('_id title').lean();
    const courseIds = courses.map(course => course._id);
    const now = new Date();
    const openSessions = await AssessmentSession.find({
      course: { $in: courseIds },
      status: { $in: ['waiting', 'active'] },
      $or: [{ status: 'waiting' }, { endsAt: null }, { endsAt: { $gt: now } }],
    }).sort({ createdAt: -1 }).lean();
    const assignmentIds = [...new Set(openSessions.map(session => String(session.assessment)))];
    const assignments = await Assignment.find({
      _id: { $in: assignmentIds },
      course: { $in: courseIds },
      isLiveAssessment: true,
    }).select('_id course title description durationMinutes language').lean();
    const courseMap = new Map(courses.map(course => [String(course._id), course.title]));
    const sessionsByAssignment = new Map();
    openSessions.forEach(session => {
      const id = String(session.assessment);
      if (!sessionsByAssignment.has(id)) sessionsByAssignment.set(id, session);
    });
    res.json(assignments.map(assignment => ({
      ...assignment,
      kind: 'assignment',
      courseTitle: courseMap.get(String(assignment.course)),
      sessionStatus: sessionsByAssignment.get(String(assignment._id))?.status,
    })));
  } catch (error) {
    console.error('Live assessment list error:', error);
    res.status(500).json({ message: 'Could not load live assessments.' });
  }
};

// @desc    Create a course
// @route   POST /api/courses
// @access  Private (Teacher or Admin)
const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Please add a title and description' });
    }

    const course = await Course.create({
      title,
      description,
      teacher: req.user._id,
      studentsEnrolled: [],
    });

    const populatedCourse = await Course.findById(course._id).populate('teacher', 'name email');

    res.status(201).json(populatedCourse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private (Student only)
const enrollInCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if student is already enrolled
    const alreadyEnrolled = course.studentsEnrolled.some(
      (studentId) => studentId.toString() === req.user._id.toString()
    );

    if (alreadyEnrolled) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    course.studentsEnrolled.push(req.user._id);
    await course.save();

    res.json({ message: 'Enrolled successfully', courseId: course._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private (Teacher or Admin)
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if the user is the teacher of this course or an admin
    if (course.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    const courseSessionFilter = { course: String(course._id) };
    const runningSession = await AssessmentSession.exists({ ...courseSessionFilter, status: { $in: ['waiting', 'active'] } });
    if (runningSession) return res.status(409).json({ message: 'End the course assessment session before deleting this course.' });

    // Find all assignments and quizzes associated with this course
    const assignments = await Assignment.find({ course: course._id });
    const assignmentIds = assignments.map(a => a._id);

    const quizzes = await Quiz.find({ course: course._id });
    const quizIds = quizzes.map(q => q._id);

    const sessionIds = await AssessmentSession.find(courseSessionFilter).distinct('_id');

    // Remove dependent course work and its saved learner/session records.
    await Submission.deleteMany({ assignment: { $in: assignmentIds } });
    await Assignment.deleteMany({ course: course._id });

    await Result.deleteMany({ quiz: { $in: quizIds } });
    const assessmentIds = [...quizIds, ...assignmentIds].map(String);
    await BehaviorAlert.deleteMany({ exam: { $in: assessmentIds } });
    await BehaviorSession.deleteMany({ exam: { $in: assessmentIds } });
    await BehaviorSession.deleteMany({ assessmentSessionId: { $in: sessionIds.map(String) } });
    await AssessmentSession.deleteMany(courseSessionFilter);
    await Quiz.deleteMany({ course: course._id });

    // Delete the course itself
    await Course.findByIdAndDelete(course._id);

    res.json({ message: 'Course and all associated data deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCourses,
  getStudentLiveAssessments,
  getCourseById,
  createCourse,
  enrollInCourse,
  deleteCourse,
};
