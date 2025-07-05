import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Quiz, QuizAttempt, VideoProgress, QuizResult, QuestionFeedback } from '../types/quiz';

// Helper function to convert Firestore timestamps
const convertTimestamp = (timestamp: any): string => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp || new Date().toISOString();
};

// Quiz Management
export const saveQuiz = async (lectureId: string, quiz: Quiz): Promise<void> => {
  try {
    const quizRef = doc(db, 'quizzes', lectureId);
    await updateDoc(quizRef, quiz).catch(async () => {
      // If document doesn't exist, create it
      await addDoc(collection(db, 'quizzes'), {
        ...quiz,
        lectureId,
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error saving quiz:', error);
    throw new Error('Failed to save quiz');
  }
};

export const getQuiz = async (lectureId: string): Promise<Quiz | null> => {
  try {
    // First try to get by document ID
    const quizRef = doc(db, 'quizzes', lectureId);
    const quizDoc = await getDoc(quizRef);
    
    if (quizDoc.exists()) {
      return quizDoc.data() as Quiz;
    }
    
    // If not found, query by lectureId field
    const q = query(collection(db, 'quizzes'), where('lectureId', '==', lectureId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Quiz;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return null;
  }
};

export const deleteQuiz = async (lectureId: string): Promise<void> => {
  try {
    const quizRef = doc(db, 'quizzes', lectureId);
    await deleteDoc(quizRef);
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw new Error('Failed to delete quiz');
  }
};

// Quiz Attempts
export const saveQuizAttempt = async (attempt: QuizAttempt): Promise<void> => {
  try {
    const attemptData = {
      ...attempt,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt || serverTimestamp()
    };
    
    await addDoc(collection(db, 'quiz_attempts'), attemptData);
  } catch (error) {
    console.error('Error saving quiz attempt:', error);
    throw new Error('Failed to save quiz attempt');
  }
};

export const getQuizAttempts = async (userId: string, lectureId: string): Promise<QuizAttempt[]> => {
  try {
    const q = query(
      collection(db, 'quiz_attempts'),
      where('userId', '==', userId),
      where('lectureId', '==', lectureId),
      orderBy('startedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      startedAt: convertTimestamp(doc.data().startedAt),
      completedAt: convertTimestamp(doc.data().completedAt)
    })) as QuizAttempt[];
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    return [];
  }
};

export const getBestQuizAttempt = async (userId: string, lectureId: string): Promise<QuizAttempt | null> => {
  try {
    const attempts = await getQuizAttempts(userId, lectureId);
    if (attempts.length === 0) return null;
    
    return attempts.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  } catch (error) {
    console.error('Error fetching best quiz attempt:', error);
    return null;
  }
};

// Video Progress
export const saveVideoProgress = async (progress: VideoProgress): Promise<void> => {
  try {
    const progressRef = doc(db, 'video_progress', `${progress.userId}_${progress.lectureId}`);
    const progressData = {
      ...progress,
      lastWatched: serverTimestamp()
    };
    
    await updateDoc(progressRef, progressData).catch(async () => {
      // If document doesn't exist, create it
      await addDoc(collection(db, 'video_progress'), {
        ...progressData,
        createdAt: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error saving video progress:', error);
    throw new Error('Failed to save video progress');
  }
};

export const getVideoProgress = async (userId: string, lectureId: string): Promise<VideoProgress | null> => {
  try {
    const progressRef = doc(db, 'video_progress', `${userId}_${lectureId}`);
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      return null;
    }
    
    const data = progressDoc.data();
    return {
      ...data,
      lastWatched: convertTimestamp(data.lastWatched)
    } as VideoProgress;
  } catch (error) {
    console.error('Error fetching video progress:', error);
    return null;
  }
};

export const getAllVideoProgress = async (userId: string): Promise<VideoProgress[]> => {
  try {
    const q = query(
      collection(db, 'video_progress'),
      where('userId', '==', userId),
      orderBy('lastWatched', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      lastWatched: convertTimestamp(doc.data().lastWatched)
    })) as VideoProgress[];
  } catch (error) {
    console.error('Error fetching all video progress:', error);
    return [];
  }
};

// Quiz Results and Feedback
export const calculateQuizResult = async (attempt: QuizAttempt, quiz: Quiz): Promise<QuizResult> => {
  const feedback: QuestionFeedback[] = quiz.questions.map(question => {
    const userAnswer = attempt.answers[question.id];
    let isCorrect = false;
    
    if (question.type === 'multiple-choice') {
      isCorrect = userAnswer === question.correctAnswer;
    } else if (question.type === 'short-answer') {
      const correct = question.correctAnswer?.toString().toLowerCase().trim();
      const user = userAnswer?.toString().toLowerCase().trim();
      isCorrect = correct === user;
    } else if (question.type === 'essay') {
      // Essay questions require manual grading
      isCorrect = false;
    }
    
    return {
      questionId: question.id,
      isCorrect,
      userAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      points: question.points,
      earnedPoints: isCorrect ? question.points : 0
    };
  });
  
  return {
    attempt,
    quiz,
    feedback
  };
};

// Analytics
export const getQuizAnalytics = async (lectureId: string): Promise<{
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  completionRate: number;
}> => {
  try {
    const q = query(
      collection(db, 'quiz_attempts'),
      where('lectureId', '==', lectureId)
    );
    const querySnapshot = await getDocs(q);
    
    const allAttempts = querySnapshot.docs.map(doc => doc.data() as QuizAttempt);
    
    if (allAttempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        completionRate: 0
      };
    }
    
    const completedAttempts = allAttempts.filter(a => a.completedAt);
    const passedAttempts = completedAttempts.filter(a => a.passed);
    const averageScore = completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length;
    
    return {
      totalAttempts: allAttempts.length,
      averageScore: Math.round(averageScore),
      passRate: Math.round((passedAttempts.length / completedAttempts.length) * 100),
      completionRate: Math.round((completedAttempts.length / allAttempts.length) * 100)
    };
  } catch (error) {
    console.error('Error fetching quiz analytics:', error);
    return {
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
      completionRate: 0
    };
  }
};

// Validation
export const validateYouTubeUrl = (url: string): boolean => {
  const patterns = [
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[\w-]+/
  ];
  
  return patterns.some(pattern => pattern.test(url));
};

export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};