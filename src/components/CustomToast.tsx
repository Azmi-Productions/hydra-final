import React from 'react';
import { toast, Toast } from 'react-hot-toast';
import { Check, X, AlertTriangle, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface CustomToastProps {
  t: Toast;
  type: ToastType;
  message: string;
}

const CustomToast: React.FC<CustomToastProps> = ({ t, type, message }) => {
  const isError = type === 'error';
  const isWarning = type === 'warning';

  let icon = <Check className="w-5 h-5" />;
  let bgColor = 'bg-green-100';
  let textColor = 'text-green-600';
  
  if (isError) {
    icon = <AlertCircle className="w-5 h-5" />;
    bgColor = 'bg-red-100';
    textColor = 'text-red-600';
  } else if (isWarning) {
    icon = <AlertTriangle className="w-5 h-5" />;
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-600';
  }

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
             <div className={`inline-flex items-center justify-center shrink-0 w-8 h-8 rounded-lg ${bgColor} ${textColor}`}>
                {icon}
             </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900 mt-1">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CustomToast;
