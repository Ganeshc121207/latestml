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
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Assignment, AssignmentSubmission, AssignmentResult, AssignmentQuestionFeedback } from '../types/assignment';

// Helper function to convert Firestore timestamps
const convertTimestamp = (timestamp: any): string => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp || new Date().toISOString();
};

// Assignment Management
export const saveAssignment = async (weekId: string, assignment: Assignment): Promise<void> => {
  try {
    const assignmentRef = doc(db, 'assignments', assignment.id);
    const assignmentData = {
      ...assignment,
      weekId,
      updatedAt: serverTimestamp()
    };
    
    await setDoc(assignmentRef, assignmentData, { merge: true });
    console.log('Assignment saved successfully:', assignment.id);
  } catch (error) {
    console.error('Error saving assignment:', error);
    throw new Error('Failed to save assignment');
  }
};

export const getAssignment = async (assignmentId: string): Promise<Assignment | null> => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    
    if (assignmentDoc.exists()) {
      const data = assignmentDoc.data();
      return {
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Assignment;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return null;
  }
};

export const getWeekAssignments = async (weekId: string): Promise<Assignment[]> => {
  try {
    const q = query(
      collection(db, 'assignments'),
      where('weekId', '==', weekId)
    );
    const querySnapshot = await getDocs(q);
    
    const assignments = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as Assignment[];

    return assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  } catch (error) {
    console.error('Error fetching week assignments:', error);
    return [];
  }
};

export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'assignments', assignmentId));
    
    // Also delete all submissions for this assignment
    const q = query(collection(db, 'assignment_submissions'), where('assignmentId', '==', assignmentId));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('Assignment deleted successfully:', assignmentId);
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw new Error('Failed to delete assignment');
  }
};

// Assignment Submissions
export const saveAssignmentSubmission = async (submission: AssignmentSubmission): Promise<void> => {
  try {
    const submissionData = {
      ...submission,
      submittedAt: submission.submittedAt || serverTimestamp(),
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'assignment_submissions'), submissionData);
    console.log('Assignment submission saved successfully');
  } catch (error) {
    console.error('Error saving assignment submission:', error);
    throw new Error('Failed to save assignment submission');
  }
};

export const getAssignmentSubmissions = async (userId: string, assignmentId: string): Promise<AssignmentSubmission[]> => {
  try {
    const q = query(
      collection(db, 'assignment_submissions'),
      where('userId', '==', userId),
      where('assignmentId', '==', assignmentId)
    );
    const querySnapshot = await getDocs(q);
    
    const submissions = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      submittedAt: convertTimestamp(doc.data().submittedAt),
      gradedAt: convertTimestamp(doc.data().gradedAt)
    })) as AssignmentSubmission[];
    
    return submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (error) {
    console.error('Error fetching assignment submissions:', error);
    return [];
  }
};

export const getLatestSubmission = async (userId: string, assignmentId: string): Promise<AssignmentSubmission | null> => {
  try {
    const submissions = await getAssignmentSubmissions(userId, assignmentId);
    return submissions.length > 0 ? submissions[0] : null;
  } catch (error) {
    console.error('Error fetching latest submission:', error);
    return null;
  }
};

// Auto-grading
export const autoGradeSubmission = async (submission: AssignmentSubmission, assignment: Assignment): Promise<number> => {
  let totalPoints = 0;
  let earnedPoints = 0;

  assignment.questions.forEach(question => {
    totalPoints += question.points;
    const userAnswer = submission.answers[question.id];
    
    if (question.type === 'multiple-choice') {
      if (userAnswer === question.correctAnswer) {
        earnedPoints += question.points;
      }
    } else if (question.type === 'short-answer') {
      const correct = question.correctAnswer?.toString().toLowerCase().trim();
      const user = userAnswer?.toString().toLowerCase().trim();
      if (correct === user) {
        earnedPoints += question.points;
      }
    }
    // Essay and file-upload questions require manual grading
  });

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  
  // Apply late penalty if applicable
  let finalScore = score;
  if (submission.isLate && assignment.latePenalty) {
    const daysLate = Math.ceil((new Date(submission.submittedAt).getTime() - new Date(assignment.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const penalty = Math.min(assignment.latePenalty * daysLate, 100);
    finalScore = Math.max(0, score - penalty);
  }

  return finalScore;
};

// Assignment Results and Feedback
export const calculateAssignmentResult = async (submission: AssignmentSubmission, assignment: Assignment): Promise<AssignmentResult> => {
  const now = new Date();
  const dueDate = new Date(assignment.dueDate);
  const canViewAnswers = assignment.showAnswersAfterDeadline && now > dueDate;

  const feedback: AssignmentQuestionFeedback[] = assignment.questions.map(question => {
    const userAnswer = submission.answers[question.id];
    let isCorrect: boolean | undefined = undefined;
    let earnedPoints = 0;
    
    if (question.type === 'multiple-choice') {
      isCorrect = userAnswer === question.correctAnswer;
      earnedPoints = isCorrect ? question.points : 0;
    } else if (question.type === 'short-answer') {
      const correct = question.correctAnswer?.toString().toLowerCase().trim();
      const user = userAnswer?.toString().toLowerCase().trim();
      isCorrect = correct === user;
      earnedPoints = isCorrect ? question.points : 0;
    } else {
      // Essay and file-upload questions require manual grading
      earnedPoints = 0; // Will be updated when manually graded
    }
    
    return {
      questionId: question.id,
      isCorrect,
      userAnswer,
      correctAnswer: canViewAnswers ? question.correctAnswer : undefined,
      explanation: canViewAnswers ? question.explanation : undefined,
      points: question.points,
      earnedPoints,
      feedback: undefined // Will be added during manual grading
    };
  });
  
  return {
    submission,
    assignment,
    feedback,
    canViewAnswers
  };
};

// Utility functions
export const isAssignmentOverdue = (assignment: Assignment): boolean => {
  return new Date() > new Date(assignment.dueDate);
};

export const canSubmitAssignment = (assignment: Assignment, submissions: AssignmentSubmission[]): boolean => {
  const now = new Date();
  const dueDate = new Date(assignment.dueDate);
  
  // Check if past due date and late submissions not allowed
  if (now > dueDate && !assignment.allowLateSubmission) {
    return false;
  }
  
  // Check if max attempts reached
  if (submissions.length >= assignment.maxAttempts && assignment.maxAttempts > 0) {
    return false;
  }
  
  return true;
};

export const getTimeRemaining = (dueDate: string): string => {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Overdue';
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};