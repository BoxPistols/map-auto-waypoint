import { useState, useCallback } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'info', action = null, persistent = false) => {
    setNotification({ message, type, action, persistent });
    // Don't auto-dismiss persistent notifications (actionable ones)
    if (!persistent && !action) {
      setTimeout(() => setNotification(null), 2500);
    }
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    hideNotification
  };
};
