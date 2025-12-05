import React, { useEffect } from 'react';
import { useAppStore } from '@/store/main';

const GV_NotificationToast: React.FC = () => {
  const notifications = useAppStore(state => state.ui_state.notifications);
  const dismissNotification = useAppStore(state => state.dismiss_notification);

  useEffect(() => {
    // Auto-dismiss notifications with auto_dismiss set to true
    notifications.forEach(notification => {
      if (notification.auto_dismiss && notification.duration) {
        const timer = setTimeout(() => {
          dismissNotification(notification.id);
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, dismissNotification]);

  if (notifications.length === 0) {
    return null;
  }

  const getIconForType = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getColorClasses = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-md w-full pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getColorClasses(notification.type)} border rounded-lg shadow-lg p-4 pointer-events-auto animate-slide-in-right`}
          role="alert"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIconForType(notification.type)}
            </div>
            <div className="ml-3 flex-1">
              {notification.title && (
                <h3 className="text-sm font-semibold mb-1">
                  {notification.title}
                </h3>
              )}
              <p className="text-sm">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="ml-4 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
              aria-label="Close notification"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GV_NotificationToast;
