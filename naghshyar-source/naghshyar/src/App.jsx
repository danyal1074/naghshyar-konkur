import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireRole } from './auth';
import Shell from './Shell';
import Landing from './pages/Landing';
import Login from './pages/Login';
import { Today, Plan, Study } from './pages/student1';
import { Exams, TakeExam, ExamResultPage, Progress } from './pages/student2';
import { Practice, Assistant } from './pages/student3';
import { Chat } from './pages/Chat';
import { CounselorHome, StudentDetail } from './pages/counselor1';
import { CExams, ExamBuilder, ExamDetail, Questions, PracticeReview } from './pages/counselor2';
import { AdminHome, AdminPlans } from './pages/admin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/demo" element={<Landing defaultSection="demo" />} />
      <Route path="/features" element={<Landing defaultSection="features" />} />
      <Route path="/plans" element={<Landing defaultSection="plans" />} />
      <Route path="/faq" element={<Landing defaultSection="faq" />} />
      <Route path="/login" element={<Login />} />

      <Route path="/s" element={<RequireRole role="student"><Shell role="student" /></RequireRole>}>
        <Route index element={<Today />} />
        <Route path="plan" element={<Plan />} />
        <Route path="exams" element={<Exams />} />
        <Route path="exams/:id" element={<TakeExam />} />
        <Route path="exams/:id/result" element={<ExamResultPage />} />
        <Route path="progress" element={<Progress />} />
        <Route path="study" element={<Study />} />
        <Route path="chat" element={<Chat />} />
        <Route path="practice" element={<Practice />} />
        <Route path="assistant" element={<Assistant />} />
      </Route>

      <Route path="/c" element={<RequireRole role="counselor"><Shell role="counselor" /></RequireRole>}>
        <Route index element={<CounselorHome />} />
        <Route path="chat" element={<Chat />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="exams" element={<CExams />} />
        <Route path="exams/new" element={<ExamBuilder />} />
        <Route path="exams/:id" element={<ExamDetail />} />
        <Route path="exams/:id/result/:studentId" element={<ExamResultPage />} />
        <Route path="questions" element={<Questions />} />
        <Route path="practice" element={<PracticeReview />} />
      </Route>

      <Route path="/a" element={<RequireRole role="admin"><Shell role="admin" /></RequireRole>}>
        <Route index element={<AdminHome />} />
        <Route path="plans" element={<AdminPlans />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
