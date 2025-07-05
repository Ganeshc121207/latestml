import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Play, 
  Clock, 
  CheckCircle, 
  FileText, 
  Award,
  Calendar,
  ArrowRight,
  Video,
  Activity,
  Lock,
  PlayCircle
} from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import LectureViewer from './LectureViewer';
import { Course, Week, Lecture, Assignment } from '../../types';
import { getCourses, getWeeks, updateStudentProgress } from '../../services/database';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const CoursesView: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLectureViewer, setShowLectureViewer] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'lectures' | 'assignments'>('overview');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchWeeks(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const coursesData = await getCourses();
      setCourses(coursesData);
      if (coursesData.length > 0 && !selectedCourse) {
        setSelectedCourse(coursesData[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeks = async (courseId: string) => {
    try {
      const weeksData = await getWeeks(courseId);
      setWeeks(weeksData);
    } catch (error) {
      toast.error('Failed to fetch course content');
    }
  };

  const handleLectureSelect = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setShowLectureViewer(true);
  };

  const handleLectureComplete = async () => {
    if (!user || !selectedCourse || !selectedLecture) return;
    
    try {
      await updateStudentProgress(user.uid, selectedCourse.id, {
        completedActivities: [selectedLecture.id],
        lastAccessed: new Date().toISOString()
      });
      toast.success('Lecture completed!');
      setShowLectureViewer(false);
    } catch (error) {
      toast.error('Failed to update progress');
    }
  };

  const handleAssignmentSubmit = async (assignmentId: string) => {
    if (!user || !selectedCourse) return;
    
    try {
      await updateStudentProgress(user.uid, selectedCourse.id, {
        completedAssignments: [assignmentId],
        lastAccessed: new Date().toISOString()
      });
      toast.success('Assignment submitted!');
      setShowAssignmentModal(false);
    } catch (error) {
      toast.error('Failed to submit assignment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (showLectureViewer && selectedLecture) {
    return (
      <LectureViewer
        lecture={selectedLecture}
        onBack={() => {
          setShowLectureViewer(false);
          setSelectedLecture(null);
        }}
        onComplete={handleLectureComplete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">My Courses</h1>
        <p className="text-dark-300">Access your enrolled courses and track your progress</p>
      </div>

      {/* Course Selection */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Available Courses</h2>
          <BookOpen className="h-5 w-5 text-dark-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <motion.div
              key={course.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCourse(course)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCourse?.id === course.id
                  ? 'border-primary-600 bg-primary-600/10'
                  : 'border-dark-600 hover:border-dark-500'
              }`}
            >
              <h3 className="text-white font-semibold mb-2">{course.title}</h3>
              <p className="text-dark-300 text-sm mb-3">{course.description}</p>
              <div className="flex items-center justify-between text-xs text-dark-400">
                <span>{weeks.length} weeks</span>
                <span>Updated {new Date(course.updatedAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {selectedCourse && (
        <>
          {/* Course Content Tabs */}
          <Card className="p-6">
            <div className="flex space-x-1 mb-6">
              {[
                { id: 'overview', label: 'Overview', icon: BookOpen },
                { id: 'lectures', label: 'Lectures', icon: Video },
                { id: 'assignments', label: 'Assignments', icon: FileText }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white'
                        : 'text-dark-300 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-dark-700 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <Calendar className="h-8 w-8 text-primary-400" />
                        <span className="text-2xl font-bold text-white">{weeks.length}</span>
                      </div>
                      <h3 className="text-white font-semibold">Total Weeks</h3>
                      <p className="text-dark-300 text-sm">Course duration</p>
                    </div>
                    <div className="bg-dark-700 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <Video className="h-8 w-8 text-secondary-400" />
                        <span className="text-2xl font-bold text-white">
                          {weeks.reduce((acc, week) => acc + (week.lectures?.length || 0), 0)}
                        </span>
                      </div>
                      <h3 className="text-white font-semibold">Total Lectures</h3>
                      <p className="text-dark-300 text-sm">Video content</p>
                    </div>
                    <div className="bg-dark-700 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <FileText className="h-8 w-8 text-accent-400" />
                        <span className="text-2xl font-bold text-white">
                          {weeks.reduce((acc, week) => acc + (week.assignments?.length || 0), 0)}
                        </span>
                      </div>
                      <h3 className="text-white font-semibold">Total Assignments</h3>
                      <p className="text-dark-300 text-sm">Graded work</p>
                    </div>
                  </div>

                  {/* Weekly Progress */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Course Progress</h3>
                    {weeks.map((week, index) => (
                      <div key={week.id} className="bg-dark-700 p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">{week.weekNumber}</span>
                            </div>
                            <div>
                              <h4 className="text-white font-semibold">{week.title}</h4>
                              <p className="text-dark-300 text-sm">{week.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {week.isActive ? (
                              <span className="px-2 py-1 bg-accent-600 text-white text-xs rounded-full">Active</span>
                            ) : (
                              <span className="px-2 py-1 bg-dark-600 text-dark-300 text-xs rounded-full">Upcoming</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center text-dark-300">
                            <Video className="h-4 w-4 mr-2" />
                            {week.lectures?.length || 0} lectures
                          </div>
                          <div className="flex items-center text-dark-300">
                            <FileText className="h-4 w-4 mr-2" />
                            {week.assignments?.length || 0} assignments
                          </div>
                          <div className="flex items-center text-dark-300">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(week.startDate).toLocaleDateString()} - {new Date(week.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'lectures' && (
                <motion.div
                  key="lectures"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-white">All Lectures</h3>
                  
                  <div className="space-y-4">
                    {weeks.map((week) => 
                      week.lectures?.map((lecture, index) => (
                        <div key={lecture.id} className="bg-dark-700 p-6 rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center">
                                {lecture.videoUrl ? (
                                  <PlayCircle className="h-6 w-6 text-white" />
                                ) : (
                                  <Lock className="h-6 w-6 text-white" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-white font-semibold">{lecture.title}</h4>
                                <p className="text-dark-300 text-sm">Week {week.weekNumber} • {lecture.duration || 0} minutes</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {lecture.isPublished ? (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleLectureSelect(lecture)}
                                  icon={<Play className="h-4 w-4" />}
                                >
                                  Watch
                                </Button>
                              ) : (
                                <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded-full">Coming Soon</span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-dark-300 text-sm mb-4">{lecture.description}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-dark-400">
                            <span>{lecture.resources?.length || 0} resources</span>
                            <span>{lecture.activities?.length || 0} activities</span>
                            {lecture.videoUrl && (
                              <div className="flex items-center">
                                <Video className="h-4 w-4 mr-1" />
                                Video available
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'assignments' && (
                <motion.div
                  key="assignments"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-white">All Assignments</h3>
                  
                  <div className="space-y-4">
                    {weeks.map((week) => 
                      week.assignments?.map((assignment) => (
                        <div key={assignment.id} className="bg-dark-700 p-6 rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-accent-600 rounded-lg flex items-center justify-center">
                                <FileText className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h4 className="text-white font-semibold">{assignment.title}</h4>
                                <p className="text-dark-300 text-sm">Week {week.weekNumber} • {assignment.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {assignment.isPublished ? (
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedAssignment(assignment);
                                    setShowAssignmentModal(true);
                                  }}
                                  icon={<ArrowRight className="h-4 w-4" />}
                                >
                                  Start
                                </Button>
                              ) : (
                                <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded-full">Coming Soon</span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-dark-300 text-sm mb-4">{assignment.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-dark-400">
                            <div className="flex items-center">
                              <Award className="h-4 w-4 mr-1" />
                              {assignment.totalPoints} points
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Due {new Date(assignment.dueDate).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              {assignment.questions?.length || 0} questions
                            </div>
                            <div className="flex items-center">
                              <Activity className="h-4 w-4 mr-1" />
                              {assignment.attempts} attempts
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </>
      )}

      {/* Assignment Modal */}
      <Modal 
        isOpen={showAssignmentModal} 
        onClose={() => setShowAssignmentModal(false)} 
        title={selectedAssignment?.title || 'Assignment'}
        maxWidth="2xl"
      >
        {selectedAssignment && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{selectedAssignment.title}</h3>
              <p className="text-dark-300 mb-4">{selectedAssignment.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-dark-400 mb-6">
                <div className="flex items-center">
                  <Award className="h-4 w-4 mr-1" />
                  {selectedAssignment.totalPoints} points
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Due {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  {selectedAssignment.questions?.length || 0} questions
                </div>
                <div className="flex items-center">
                  <Activity className="h-4 w-4 mr-1" />
                  {selectedAssignment.attempts} attempts
                </div>
              </div>
            </div>
            
            <div className="bg-dark-700 p-6 rounded-lg">
              <h4 className="text-white font-semibold mb-4">Assignment Instructions</h4>
              <p className="text-dark-300 mb-4">
                This is a {selectedAssignment.type} assignment. Please read all questions carefully and submit your answers before the due date.
              </p>
              
              {selectedAssignment.timeLimit && selectedAssignment.timeLimit > 0 && (
                <div className="bg-orange-600/10 border border-orange-600/20 p-4 rounded-lg mb-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-orange-400 mr-2" />
                    <span className="text-orange-400 font-medium">
                      Time Limit: {selectedAssignment.timeLimit} minutes
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowAssignmentModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleAssignmentSubmit(selectedAssignment.id)}>
                Start Assignment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CoursesView;