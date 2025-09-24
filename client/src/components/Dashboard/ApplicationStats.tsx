import React from 'react';

interface Application {
  id: string;
  name: string;
  amount: number;
  type: string;
  status: string;
  progress: number;
  submittedDate: string;
  property: string;
  nextStep: string;
  dueDate: string;
  isDraft: boolean;
  loanOfficer: {
    name: string;
    phone: string;
    email: string;
  };
}

interface ApplicationStatsProps {
  applications: Application[];
}

const ApplicationStats: React.FC<ApplicationStatsProps> = ({ applications }) => {
  const totalApplications = applications.length;
  const inProgress = applications.filter(app => 
    app.status === 'Under Review' || app.status === 'Documentation Required'
  ).length;
  const approved = applications.filter(app => app.status === 'Approved').length;
  const totalAmount = applications.reduce((sum, app) => sum + app.amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <div className="text-3xl mr-4">📋</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
            <p className="text-sm text-gray-500">Total Applications</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <div className="text-3xl mr-4">⏳</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{inProgress}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <div className="text-3xl mr-4">✅</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{approved}</p>
            <p className="text-sm text-gray-500">Approved</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <div className="text-3xl mr-4">💰</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ${totalAmount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Amount</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStats; 