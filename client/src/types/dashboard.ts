export interface Application {
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

export interface Opportunity {
  id: string;
  name: string;
  amount?: number;
  stageName: string;
  closeDate?: string;
  createdDate: string;
  loanType?: string;
  propertyAddress?: any;
  loanOfficer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  accountId: string;
  mailingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface Task {
  id: number;
  title: string;
  priority: string;
  dueDate: string;
  completed: boolean;
}

export interface Document {
  name: string;
  uploaded: string;
  status: string;
  type: string;
}

export interface Activity {
  date: string;
  action: string;
  status: string;
}

export interface LoanData {
  currentLoan: Application;
  recentActivity: Activity[];
  tasks: Task[];
  documents: Document[];
} 