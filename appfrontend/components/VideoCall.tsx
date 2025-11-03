'use client';

import { EnhancedTutorMeeting } from './EnhancedTutorMeeting';
import EnhancedStudentMeeting from './EnhancedStudentMeeting';

interface VideoCallProps {
  meetingId: string;
  meetingTitle: string;
  userRole: 'tutor' | 'student';
  tutorName?: string;
  studentId?: string;
  studentName?: string;
  cloudinaryImageUrl?: string;
  onLeave: () => void;
}

export default function VideoCall({
  meetingId,
  meetingTitle,
  userRole,
  tutorName,
  studentId,
  studentName,
  cloudinaryImageUrl,
  onLeave
}: VideoCallProps) {
  if (userRole === 'tutor') {
    return (
      <EnhancedTutorMeeting
        meetingId={meetingId}
        meetingTitle={meetingTitle}
        onLeave={onLeave}
      />
    );
  }

  return (
    <EnhancedStudentMeeting
      meetingId={meetingId}
      meetingTitle={meetingTitle}
      tutorName={tutorName || 'Tutor'}
      studentId={studentId || ''}
      studentName={studentName || 'Student'}
      cloudinaryImageUrl={cloudinaryImageUrl}
      onLeave={onLeave}
    />
  );
}