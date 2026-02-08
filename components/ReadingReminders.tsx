import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Clock, Check, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM format
  days: number[]; // 0 = Sunday, 6 = Saturday
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  time: '20:00',
  days: [0, 1, 2, 3, 4, 5, 6] // Every day
};

const DAYS = [
  { id: 0, label: 'Sun', short: 'S' },
  { id: 1, label: 'Mon', short: 'M' },
  { id: 2, label: 'Tue', short: 'T' },
  { id: 3, label: 'Wed', short: 'W' },
  { id: 4, label: 'Thu', short: 'T' },
  { id: 5, label: 'Fri', short: 'F' },
  { id: 6, label: 'Sat', short: 'S' },
];

interface ReadingRemindersProps {
  onSettingsChange?: (settings: ReminderSettings) => void;
}

export function ReadingReminders({ onSettingsChange }: ReadingRemindersProps) {
  const [settings, setSettings] = useState<ReminderSettings>(() => {
    const saved = localStorage.getItem('libris-reminder-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [isNative] = useState(Capacitor.isNativePlatform());
  const scheduleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkNotificationPermission();
    
    // Add notification received listener to prevent re-triggering
    if (isNative) {
      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        console.log('Notification received:', notification.id);
      });
    }
    
    return () => {
      if (isNative) {
        LocalNotifications.removeAllListeners();
      }
    };
  }, []);

  // Debounced settings effect - only reschedule after 500ms of no changes
  useEffect(() => {
    localStorage.setItem('libris-reminder-settings', JSON.stringify(settings));
    onSettingsChange?.(settings);
    
    // Clear any pending reschedule
    if (scheduleTimeoutRef.current) {
      clearTimeout(scheduleTimeoutRef.current);
    }
    
    // Debounce the scheduling to prevent rapid rescheduling
    scheduleTimeoutRef.current = setTimeout(() => {
      if (settings.enabled) {
        scheduleReminders();
      } else {
        cancelAllReminders();
      }
    }, 500);
    
    return () => {
      if (scheduleTimeoutRef.current) {
        clearTimeout(scheduleTimeoutRef.current);
      }
    };
  }, [settings]);

  const checkNotificationPermission = async () => {
    if (isNative) {
      try {
        const result = await LocalNotifications.checkPermissions();
        setPermissionStatus(result.display === 'granted' ? 'granted' : result.display === 'denied' ? 'denied' : 'unknown');
      } catch (e) {
        console.error('Error checking permissions:', e);
        setPermissionStatus('unknown');
      }
    } else if ('Notification' in window) {
      setPermissionStatus(Notification.permission as 'granted' | 'denied' | 'unknown');
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (isNative) {
      try {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';
        setPermissionStatus(granted ? 'granted' : 'denied');
        return granted;
      } catch (e) {
        console.error('Error requesting permissions:', e);
        return false;
      }
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission as 'granted' | 'denied' | 'unknown');
      return permission === 'granted';
    }
    return false;
  };

  const cancelAllReminders = async () => {
    if (isNative) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      } catch (e) {
        console.error('Error canceling notifications:', e);
      }
    }
  };

  const scheduleReminders = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (isNative) {
      try {
        // Cancel existing reminders first
        await cancelAllReminders();
        
        // Schedule daily reminders for each selected day
        const [hours, minutes] = settings.time.split(':').map(Number);
        const notifications: ScheduleOptions['notifications'] = [];
        
        settings.days.forEach((day) => {
          // Create a date for the next occurrence of this day
          const now = new Date();
          const targetDate = new Date();
          const currentDay = now.getDay();
          let daysUntil = day - currentDay;
          if (daysUntil < 0 || (daysUntil === 0 && (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)))) {
            daysUntil += 7;
          }
          targetDate.setDate(now.getDate() + daysUntil);
          targetDate.setHours(hours, minutes, 0, 0);
          
          // Use day-based ID to ensure consistency (1000 + day number)
          // This ensures Sunday=1000, Monday=1001, etc.
          notifications.push({
            id: 1000 + day,
            title: '📚 Time to Read!',
            body: 'Your daily reading reminder from Libris. Pick up where you left off!',
            schedule: {
              at: targetDate,
              repeats: true,
              every: 'week',
              allowWhileIdle: true // Ensures notification fires even in Doze mode
            },
            sound: 'default',
            smallIcon: 'ic_stat_book',
            largeIcon: 'ic_launcher',
            channelId: 'libris-reading-reminders'
          });
        });
        
        if (notifications.length > 0) {
          // Create notification channel first (required for Android 8+)
          try {
            await LocalNotifications.createChannel({
              id: 'libris-reading-reminders',
              name: 'Reading Reminders',
              description: 'Daily reminders to read',
              importance: 4, // HIGH importance
              visibility: 1, // PUBLIC
              sound: 'default',
              vibration: true
            });
          } catch (channelError) {
            // Channel may already exist, continue
            console.log('Channel creation:', channelError);
          }
          
          await LocalNotifications.schedule({ notifications });
          
          // Log scheduled notifications for debugging
          const pending = await LocalNotifications.getPending();
          console.log('Scheduled notifications:', pending.notifications.map(n => ({
            id: n.id,
            schedule: n.schedule
          })));
        }
      } catch (e) {
        console.error('Error scheduling notifications:', e);
      }
    }
  };

  const toggleEnabled = async () => {
    if (!settings.enabled) {
      // Enabling - check permission first
      if (permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          alert('Please enable notifications in your device settings to receive reading reminders.');
          return;
        }
      }
    }
    
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const toggleDay = (dayId: number) => {
    setSettings(prev => ({
      ...prev,
      days: prev.days.includes(dayId)
        ? prev.days.filter(d => d !== dayId)
        : [...prev.days, dayId].sort()
    }));
  };

  const updateTime = (time: string) => {
    setSettings(prev => ({ ...prev, time }));
  };

  return (
    <div className="bg-surface-card rounded-2xl p-5 border border-surface-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${settings.enabled ? 'bg-brand-100 dark:bg-brand-900/30' : 'bg-surface-base'}`}>
            {settings.enabled ? (
              <Bell className="w-5 h-5 text-brand-500" />
            ) : (
              <BellOff className="w-5 h-5 text-text-muted" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Reading Reminders</h3>
            <p className="text-sm text-text-muted">
              {settings.enabled ? 'Daily reminders active' : 'Get daily nudges to read'}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={toggleEnabled}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            settings.enabled ? 'bg-brand-500' : 'bg-surface-border'
          }`}
        >
          <div
            className={`absolute top-1 w-6 h-6 rounded-full bg-surface-card shadow transition-transform ${
              settings.enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-2 text-sm">
          <Check className="w-4 h-4" />
          Reminder settings saved!
        </div>
      )}

      {/* Settings (only show when enabled) */}
      {settings.enabled && (
        <div className="space-y-5">
          {/* Time Picker */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Reminder Time
            </label>
            <input
              type="time"
              value={settings.time}
              onChange={(e) => updateTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-border bg-surface-base text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Day Selector */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Remind me on
            </label>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                    settings.days.includes(day.id)
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-base text-text-secondary hover:bg-surface-border'
                  }`}
                  title={day.label}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>

          {/* Permission Warning */}
          {permissionStatus === 'denied' && (
            <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Notifications are blocked. Please enable them in your {isNative ? 'device' : 'browser'} settings.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReadingReminders;
