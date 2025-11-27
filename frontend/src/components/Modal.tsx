/**
 * Modal.tsx
 * 
 * Purpose: Reusable modal component for notifications and confirmations
 * Corporate modern design with animations
 */

import { useEffect } from 'react';
import { FiX, FiMail, FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  showCloseButton?: boolean;
  autoClose?: number; // Auto close after milliseconds
}

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  showCloseButton = true,
  autoClose 
}: ModalProps) => {
  
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
        return <FiAlertCircle className="w-12 h-12 text-red-500" />;
      case 'warning':
        return <FiMail className="w-12 h-12 text-orange-500" />;
      case 'info':
      default:
        return <FiInfo className="w-12 h-12 text-blue-500" />;
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'success':
        return 'from-green-500 to-emerald-600';
      case 'error':
        return 'from-red-500 to-rose-600';
      case 'warning':
        return 'from-orange-500 via-red-500 to-purple-600';
      case 'info':
      default:
        return 'from-blue-500 to-purple-600';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto transform transition-all duration-300 scale-100 animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${getGradient()} p-6 rounded-t-2xl relative`}>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex flex-col items-center text-white">
              <div className="mb-3 bg-white bg-opacity-20 rounded-full p-4">
                {getIcon()}
              </div>
              <h3 className="text-2xl font-bold text-center">{title}</h3>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-gray-700 text-center leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 px-6 py-3 bg-gradient-to-r ${getGradient()} text-white rounded-lg font-semibold hover:scale-[1.02] transition-transform shadow-lg`}
            >
              Got it!
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default Modal;
