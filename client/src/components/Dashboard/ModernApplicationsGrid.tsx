'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/modern/Card';
import { Button } from '../ui/modern/Button';
import { Badge } from '../ui/modern/Badge';
import { cn, formatCurrency, formatDate } from '../../lib/utils';

interface Application {
  id: string;
  amount: number;
  type: string;
  name: string;
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

interface ModernApplicationsGridProps {
  applications: Application[];
  onViewApplication: (id: string) => void;
  onStartNewApplication: () => void;
  onResumeApplication: (id: string) => void;
}

const ModernApplicationsGrid: React.FC<ModernApplicationsGridProps> = ({
  applications,
  onViewApplication,
  onStartNewApplication,
  onResumeApplication
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'success';
      case 'under review': return 'warning';
      case 'processing': return 'info';
      case 'rejected': return 'error';
      default: return 'secondary';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-success-500';
    if (progress >= 50) return 'bg-info-500';
    if (progress >= 25) return 'bg-warning-500';
    return 'bg-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Applications</h2>
          <p className="text-gray-600">Manage and track your loan applications</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onStartNewApplication}
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          + New Application
        </Button>
      </div>

      {/* Applications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {applications.map((app) => (
          <Card
            key={app.id}
            variant={hoveredCard === app.id ? "elevated" : "default"}
            className={cn(
              "transition-all duration-300 cursor-pointer group",
              "hover:scale-105 hover:shadow-xl"
            )}
            onMouseEnter={() => setHoveredCard(app.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onViewApplication(app.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {app.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{app.type}</p>
                </div>
                <Badge variant={getStatusColor(app.status)} size="sm">
                  {app.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Amount */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Loan Amount</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(app.amount)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-medium text-gray-900">{app.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      getProgressColor(app.progress)
                    )}
                    style={{ width: `${app.progress}%` }}
                  />
                </div>
              </div>

              {/* Property */}
              <div className="space-y-1">
                <span className="text-sm text-gray-600">Property</span>
                <p className="text-sm text-gray-900 truncate">{app.property}</p>
              </div>

              {/* Next Step */}
              <div className="space-y-1">
                <span className="text-sm text-gray-600">Next Step</span>
                <p className="text-sm text-gray-900">{app.nextStep}</p>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Submitted: {formatDate(app.submittedDate)}</span>
                {app.dueDate && (
                  <span>Due: {formatDate(app.dueDate)}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewApplication(app.id);
                  }}
                >
                  View Details
                </Button>
                {app.isDraft && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResumeApplication(app.id);
                    }}
                  >
                    Resume
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {applications.length === 0 && (
          <div className="col-span-full">
            <Card variant="outlined" className="text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Applications Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start your first loan application to get the funding you need.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onStartNewApplication}
                >
                  Create Your First Application
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {applications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">
                {applications.length}
              </div>
              <div className="text-sm text-gray-600">Total Applications</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success-600">
                {applications.filter(app => app.status === 'Approved').length}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning-600">
                {applications.filter(app => app.status === 'Under Review').length}
              </div>
              <div className="text-sm text-gray-600">Under Review</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-info-600">
                {formatCurrency(applications.reduce((sum, app) => sum + app.amount, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ModernApplicationsGrid; 