'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/modern/Card';
import { Button } from '../ui/modern/Button';
import { Badge } from '../ui/modern/Badge';
import { cn } from '../../lib/utils';

const DebtFundInvestorBanner: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card 
      variant="gradient" 
      className={cn(
        "relative overflow-hidden transition-all duration-500 cursor-pointer group",
        isExpanded ? "min-h-[400px]" : "min-h-[200px]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800" />
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000",
        isHovered ? "translate-x-full" : "-translate-x-full"
      )} />
      
      {/* Floating Elements */}
      <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-8 left-8 w-16 h-16 bg-emerald-400/20 rounded-full blur-lg animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-white/5 rounded-full blur-md animate-pulse delay-500" />

      <CardContent className="relative p-8 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-3">
              <Badge variant="secondary" size="sm" className="bg-white/20 text-white border-white/30">
                🎯 Exclusive Access
              </Badge>
              <Badge variant="outline" size="sm" className="border-white/30 text-white">
                Founders Club Member
              </Badge>
            </div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Ternus Debt Fund Investment
            </h2>
            <p className="text-lg text-gray-200 max-w-2xl">
              As a Founders Club member, you have exclusive access to our institutional-grade debt fund. Higher returns, professional management.
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-300 mb-1">Minimum Investment</div>
            <div className="text-2xl font-bold">$100,000</div>
            <div className="text-sm text-gray-300">Institutional Grade</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">$150M+</div>
            <div className="text-sm text-gray-300">Total Fund Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">1,200+</div>
            <div className="text-sm text-gray-300">Loans Funded</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">18.5%</div>
            <div className="text-sm text-gray-300">Net Annual Returns</div>
          </div>
        </div>

        {/* Expanded Content */}
        <div className={cn(
          "transition-all duration-500 overflow-hidden",
          isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="border-t border-white/20 pt-6">
            <h3 className="text-xl font-semibold mb-4">Institutional-Grade Benefits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <div className="font-medium">First Loss Protection</div>
                  <div className="text-sm text-gray-300">Enhanced protection for senior investors</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <div className="font-medium">Monthly Distributions</div>
                  <div className="text-sm text-gray-300">Regular income with quarterly bonuses</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <div className="font-medium">Priority Deal Access</div>
                  <div className="text-sm text-gray-300">First access to premium opportunities</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <div className="font-medium">Dedicated Support</div>
                  <div className="text-sm text-gray-300">Personal investment advisor</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-2">Recent Performance</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-emerald-300">Q4 2024</div>
                  <div className="font-semibold">19.2%</div>
                </div>
                <div>
                  <div className="text-emerald-300">Q3 2024</div>
                  <div className="font-semibold">17.8%</div>
                </div>
                <div>
                  <div className="text-emerald-300">Q2 2024</div>
                  <div className="font-semibold">18.1%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            size="lg"
            className="bg-white text-emerald-700 hover:bg-gray-100 shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              window.open('https://www.ternus.com/debt-fund/', '_blank');
            }}
          >
            View Fund Details
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-white/30 text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show Less' : 'Learn More'}
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 text-xs text-gray-400">
          * Debt fund investments are subject to risk and qualification requirements. Past performance does not guarantee future results. Founders Club members only.
        </div>
      </CardContent>
    </Card>
  );
};

export default DebtFundInvestorBanner; 