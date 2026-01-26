import React from 'react';
import { toast, Toast } from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

interface ConfirmToastProps {
  t: Toast;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmToast: React.FC<ConfirmToastProps> = ({ t, message, onConfirm, onCancel }) => {
  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5 overflow-hidden`}
    >
      <div className="p-4 flex items-start">
        <div className="flex-shrink-0 pt-0.5">
           <div className="inline-flex items-center justify-center shrink-0 w-8 h-8 rounded-lg bg-red-100 text-red-600">
              <AlertCircle className="w-5 h-5" />
           </div>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900 mt-1">
            {message}
          </p>
          <p className="mt-1 text-sm text-gray-500">
             This action cannot be undone.
          </p>
        </div>
      </div>
      
      <div className="flex border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => {
              toast.dismiss(t.id);
              onCancel();
          }}
          className="w-full border-r border-gray-200 p-3 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition focus:outline-none"
        >
          Cancel
        </button>
        <button
          onClick={() => {
              toast.dismiss(t.id);
              onConfirm();
          }}
          className="w-full p-3 flex items-center justify-center text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition focus:outline-none"
        >
          Yes, Delete
        </button>
      </div>
    </div>
  );
};

export default ConfirmToast;
