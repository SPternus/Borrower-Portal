'use client';

import React from 'react';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Badge,
  Avatar,
  AvatarGroup
} from '../../components/ui/modern';

const ModernUIDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Modern UI Component Library
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive collection of modern, accessible, and beautiful UI components 
            built for the Ternus Borrower Portal.
          </p>
        </div>

        <div className="space-y-12">
          {/* Buttons Section */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>
                Modern button components with multiple variants, sizes, and states
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Button Variants */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Variants</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                  </div>
                </div>

                {/* Button Sizes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Sizes</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="xs">Extra Small</Button>
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                  </div>
                </div>

                {/* Button States */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">States</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button>Normal</Button>
                    <Button loading>Loading</Button>
                    <Button disabled>Disabled</Button>
                    <Button leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    }>
                      With Icon
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards Section */}
          <Card>
            <CardHeader>
              <CardTitle>Cards</CardTitle>
              <CardDescription>
                Flexible card components with different variants and layouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card variant="default">
                  <CardHeader>
                    <CardTitle>Default Card</CardTitle>
                    <CardDescription>Standard card with border and shadow</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">This is the default card variant with a clean, minimal design.</p>
                  </CardContent>
                </Card>

                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle>Elevated Card</CardTitle>
                    <CardDescription>Card with enhanced shadow</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">This card has a more prominent shadow for emphasis.</p>
                  </CardContent>
                </Card>

                <Card variant="gradient">
                  <CardHeader>
                    <CardTitle>Gradient Card</CardTitle>
                    <CardDescription>Card with gradient background</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">This card features a subtle gradient background.</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Badges Section */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>
                Status indicators and labels with semantic colors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Variants</h4>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">With Dots</h4>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="success" dot>Online</Badge>
                    <Badge variant="warning" dot>Away</Badge>
                    <Badge variant="error" dot>Busy</Badge>
                    <Badge variant="default" dot>Offline</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Sizes</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge size="sm">Small</Badge>
                    <Badge size="md">Medium</Badge>
                    <Badge size="lg">Large</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avatars Section */}
          <Card>
            <CardHeader>
              <CardTitle>Avatars</CardTitle>
              <CardDescription>
                User profile pictures with fallback initials and status indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Sizes</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name="John Doe" size="xs" />
                    <Avatar name="Jane Smith" size="sm" />
                    <Avatar name="Bob Johnson" size="md" />
                    <Avatar name="Alice Brown" size="lg" />
                    <Avatar name="Charlie Wilson" size="xl" />
                    <Avatar name="Diana Prince" size="2xl" />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">With Status</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name="Online User" showStatus status="online" />
                    <Avatar name="Away User" showStatus status="away" />
                    <Avatar name="Busy User" showStatus status="busy" />
                    <Avatar name="Offline User" showStatus status="offline" />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Variants</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name="Circular" variant="circular" />
                    <Avatar name="Rounded" variant="rounded" />
                    <Avatar name="Square" variant="square" />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Avatar Group</h4>
                  <AvatarGroup max={4}>
                    <Avatar name="John Doe" />
                    <Avatar name="Jane Smith" />
                    <Avatar name="Bob Johnson" />
                    <Avatar name="Alice Brown" />
                    <Avatar name="Charlie Wilson" />
                    <Avatar name="Diana Prince" />
                  </AvatarGroup>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Demo */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Interactive Demo</CardTitle>
              <CardDescription>
                See how components work together in a real application context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Sample Application Card */}
                <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar name="Loan Application" size="md" />
                      <div>
                        <h4 className="font-medium text-gray-900">Investment Property Loan</h4>
                        <p className="text-sm text-gray-600">$750,000 • Created Jun 13, 2024</p>
                      </div>
                    </div>
                    <Badge variant="primary">Processing</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm" dot>Documents Complete</Badge>
                      <Badge variant="warning" size="sm" dot>Appraisal Pending</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View Details</Button>
                      <Button variant="primary" size="sm">Continue</Button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }>
                    New Application
                  </Button>
                  <Button variant="outline">View All Applications</Button>
                  <Button variant="ghost">Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-600">
            Built with modern design principles and accessibility in mind.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModernUIDemo; 