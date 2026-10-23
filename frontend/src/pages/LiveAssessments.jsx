import React from 'react';
import Layout from '../components/Common/Layout';
import StudentLiveSessions from '../components/Common/StudentLiveSessions';

export default function LiveAssessments() {
  return <Layout><div className="mx-auto max-w-5xl space-y-6">
    <h1 className="text-2xl font-extrabold text-slate-900">Live assessments</h1>
    <StudentLiveSessions />
  </div></Layout>;
}
