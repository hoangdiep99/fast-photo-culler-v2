// Anonymous Telemetry & Usage Analytics for Fast Photo Culler AI (GA4: G-2KR9YP6MS0)

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-2KR9YP6MS0';

// Generate or retrieve persistent anonymous user ID
function getAnonymousUserId(): string {
  let userId = localStorage.getItem('fast_culler_user_id');
  if (!userId) {
    userId = 'usr_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('fast_culler_user_id', userId);
  }
  return userId;
}

export function initAnalytics() {
  try {
    const anonymousId = getAnonymousUserId();

    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_location: 'https://fastphotoculler.app',
        page_title: 'Fast Photo Culler AI v2.0',
        user_id: anonymousId,
        send_page_view: true
      });

      // Track initial app launch event
      window.gtag('event', 'app_launch', {
        app_version: '2.0.0',
        user_id: anonymousId,
        platform: 'windows'
      });
    }
  } catch (err) {
    console.warn('Analytics init warning:', err);
  }
}

export function trackEvent(eventName: string, params: Record<string, any> = {}) {
  try {
    if (window.gtag) {
      window.gtag('event', eventName, {
        app_version: '2.0.0',
        user_id: getAnonymousUserId(),
        ...params
      });
    }
  } catch (err) {
    // Silent fail if offline or blocked
  }
}
