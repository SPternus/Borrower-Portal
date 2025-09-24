import React from 'react';

interface Task {
  id: number;
  title: string;
  priority: string;
  dueDate: string;
  completed: boolean;
}

interface TasksTabProps {
  tasks: Task[];
}

const TasksTab: React.FC<TasksTabProps> = ({ tasks }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Your Tasks</h3>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={task.completed}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-4"
                  readOnly
                />
                <div>
                  <h4 className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </h4>
                  <p className="text-sm text-gray-500">Due: {task.dueDate}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TasksTab; 