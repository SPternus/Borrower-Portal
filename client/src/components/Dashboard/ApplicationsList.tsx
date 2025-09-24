import React, { useState, useEffect } from 'react';
import { Clock, Edit, Eye, Plus, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { Application as ApplicationType } from '../../types/dashboard';

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

interface ApplicationsListProps {
  applications: ApplicationType[];
  onViewApplication: (applicationId: string) => void;
  onStartNewApplication: () => void;
  onResumeApplication?: (applicationId: string) => void;
}

interface SavedApplication {
  application_id: string;
  current_step: number;
  form_data: any;
  is_submitted: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({
  applications,
  onViewApplication,
  onStartNewApplication,
  onResumeApplication
}) => {
  const { user } = useAuth0();
  const [savedApplications, setSavedApplications] = useState<SavedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved applications on mount
  useEffect(() => {
    if (user?.sub) {
      loadSavedApplications();
    }
  }, [user?.sub]);

  const loadSavedApplications = async () => {
    if (!user?.sub) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/applications?auth0_user_id=${encodeURIComponent(user.sub)}`);
      
      if (response.ok) {
        const data = await response.json();
        setSavedApplications(data.applications || []);
        console.log('✅ Loaded saved applications:', data.applications?.length || 0);
      }
    } catch (error) {
      console.error('❌ Failed to load saved applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStepTitle = (step: number) => {
    const steps = [
      'Personal Information',
      'Property Details', 
      'Loan Information',
      'Financial Information'
    ];
    return steps[step - 1] || 'Unknown Step';
  };

  const getApplicationProgress = (application: SavedApplication) => {
    const totalSteps = 4;
    const progress = (application.current_step / totalSteps) * 100;
    return Math.round(progress);
  };



  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'under review':
        return 'bg-yellow-100 text-yellow-800';
      case 'documentation required':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Loan Applications</h3>
        <button
          onClick={onStartNewApplication}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Application
        </button>
      </div>

      {/* Draft Applications Section */}
      {savedApplications.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-orange-500" />
            Draft Applications
          </h4>
          <div className="space-y-4">
            {savedApplications
              .filter(app => app.is_draft && !app.is_submitted)
              .map((application) => (
                <div key={application.application_id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h5 className="font-medium text-gray-900 mr-3">
                          Application #{application.application_id.slice(-8)}
                        </h5>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Draft
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        <p>Current Step: {application.current_step} of 4 - {getStepTitle(application.current_step)}</p>
                        <p>Last Updated: {formatDateTime(application.updated_at)}</p>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{getApplicationProgress(application)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getApplicationProgress(application)}%` }}
                          />
                        </div>
                      </div>

                      {/* Form Data Preview */}
                      {application.form_data && (
                        <div className="text-xs text-gray-500 mb-2">
                          {application.form_data.personalInfo?.firstName && application.form_data.personalInfo?.lastName && (
                            <span className="mr-4">
                              👤 {application.form_data.personalInfo.firstName} {application.form_data.personalInfo.lastName}
                            </span>
                          )}
                          {application.form_data.loanInfo?.loanType && (
                            <span className="mr-4">
                              💰 {application.form_data.loanInfo.loanType}
                            </span>
                          )}
                          {application.form_data.loanInfo?.loanAmount && (
                            <span>
                              📊 ${parseInt(application.form_data.loanInfo.loanAmount).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      {onResumeApplication && (
                        <button
                          onClick={() => onResumeApplication(application.application_id)}
                          className="flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Submitted Applications Section */}
      {savedApplications.some(app => app.is_submitted) && (
        <div className="mb-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
            Submitted Applications
          </h4>
          <div className="space-y-4">
            {savedApplications
              .filter(app => app.is_submitted)
              .map((application) => (
                <div key={application.application_id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h5 className="font-medium text-gray-900 mr-3">
                          Application #{application.application_id.slice(-8)}
                        </h5>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Submitted
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <p>Submitted: {application.submitted_at ? formatDateTime(application.submitted_at) : 'Unknown'}</p>
                        <p>Created: {formatDateTime(application.created_at)}</p>
                      </div>

                      {/* Form Data Preview */}
                      {application.form_data && (
                        <div className="text-xs text-gray-500">
                          {application.form_data.personalInfo?.firstName && application.form_data.personalInfo?.lastName && (
                            <span className="mr-4">
                              👤 {application.form_data.personalInfo.firstName} {application.form_data.personalInfo.lastName}
                            </span>
                          )}
                          {application.form_data.loanInfo?.loanType && (
                            <span className="mr-4">
                              💰 {application.form_data.loanInfo.loanType}
                            </span>
                          )}
                          {application.form_data.loanInfo?.loanAmount && (
                            <span>
                              📊 ${parseInt(application.form_data.loanInfo.loanAmount).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Existing SFDC Applications Section */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-blue-500" />
          Current Applications
        </h4>
        
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h4>
            <p className="text-gray-600 mb-4">
              Start your first loan application to get personalized rates and terms.
            </p>
            <button
              onClick={onStartNewApplication}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Start New Application
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.type} • {application.submittedDate}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${application.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${application.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{application.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => onViewApplication(application.id)}
                        className="flex items-center text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsList; 