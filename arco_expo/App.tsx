import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  Image,
  Animated,
  BackHandler,
  Platform,
  Dimensions,
  SafeAreaView,
  StatusBar as RNStatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { WebView, WebViewNavigation } from 'react-native-webview';

// --- الثوابت والإعدادات ---
const APP_URL = 'https://hr-amr.vercel.app/';
const BACKGROUND_LOCATION_TASK = 'ARCO_BACKGROUND_LOCATION_TASK';
const NOTIFICATION_CHANNEL_ID = 'arco-alerts-channel';
const EXPO_PROJECT_ID = '4f5511c4-01de-467c-99fa-60fc77fd5017';

// الإصدار ورقم البناء المعتمد (v1.4.1 - Build 9)
const CURRENT_APP_VERSION = '1.4.1';
const CURRENT_VERSION_CODE = 9;

// سكريبت يتم حقنه لإنشاء جسر مباشر بين الويب وإشعارات الهاتف
const INJECTED_SESSION_HANDLER = `
  (function() {
    try {
      window.__ARCO_APP_VERSION__ = '${CURRENT_APP_VERSION}';
      window.__ARCO_VERSION_CODE__ = ${CURRENT_VERSION_CODE};
      window.__ARCO_IS_LATEST_BUILD__ = true;
      
      // دالة عامة لتمكين الويب من إرسال إشعار مباشر يظهر على شاشة الهاتف وشاشة القفل
      window.sendMobileNotification = function(title, message) {
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SHOW_NOTIFICATION',
              title: title || 'إشعار جديد من ARCO HR',
              message: message || ''
            }));
          }
        } catch (err) {}
      };

      // الميتا تاج للعرض المتناسق
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        document.getElementsByTagName('head')[0].appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    } catch (e) {}
  })();
  true;
`;

// ضبط معالج الإشعارات بالأولوية القصوى (الشاشة الرئيسية وشاشة القفل)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// تسجيل مهمة العمل في الخلفية وتتبع الموقع بشكل صامت
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      console.log('ARCO silent background tracking active');
    }
  }
});

export default function App() {
  const [canGoBack, setCanGoBack] = useState(false);
  const [isWebLoaded, setIsWebLoaded] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const splashFadeAnim = useRef(new Animated.Value(1)).current;
  const webViewRef = useRef<WebView>(null);

  // إدارة زر الرجوع في هواتف أندرويد
  useEffect(() => {
    const handleBackPress = () => {
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [canGoBack]);

  // إخفاء شاشة اللوجو بسلاسة بعد تحميل صفحة الويب
  const handleWebLoadEnd = () => {
    setTimeout(() => {
      Animated.timing(splashFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsWebLoaded(true);
      });
    }, 350);

    // حقن Push Token بمجرد انتهاء تحميل صفحة الويب
    if (expoPushToken) {
      injectPushToken(expoPushToken);
    }
  };

  const injectPushToken = (token: string) => {
    webViewRef.current?.injectJavaScript(`
      try {
        localStorage.setItem('arco_expo_push_token', '${token}');
        if (window.onNativePushToken) {
          window.onNativePushToken('${token}');
        }
      } catch (e) {}
    `);
  };

  // تهيئة الصلاحيات وقناة الإشعارات والحصول على Expo Push Token للإشعارات عند إغلاق التطبيق
  useEffect(() => {
    (async () => {
      try {
        // 1. إنشاء قناة إشعارات عالية الأولوية لشاشة القفل والتنبيه المنبثق
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
            name: 'تنبيهات ARCO HR الرسمية',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D4AF37',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'default',
            enableVibrate: true,
            enableLights: true,
            bypassDnd: false,
            showBadge: true,
          });
        }

        // 2. طلب صلاحيات الإشعارات والحصول على Push Token
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
            android: {},
          });
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: Constants.expoConfig?.extra?.eas?.projectId || EXPO_PROJECT_ID,
            });
            const token = tokenData.data;
            setExpoPushToken(token);
            injectPushToken(token);
          } catch (tokenErr) {
            console.warn('Push token error:', tokenErr);
          }
        }

        // 3. صلاحيات الموقع الصامت
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus === 'granted') {
          await Location.requestBackgroundPermissionsAsync();
          
          const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          if (!isTaskRegistered) {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Highest,
              timeInterval: 300000, // كل 5 دقائق
              distanceInterval: 50,
              showsBackgroundLocationIndicator: false,
            });
          }
        }
      } catch (e) {}
    })();
  }, []);

  // معالجة الرسائل الواردة من الويب
  const handleMessageFromWeb = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'GET_LOCATION') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        webViewRef.current?.injectJavaScript(`
          if (window.onNativeLocation) {
            window.onNativeLocation(${JSON.stringify(location.coords)});
          }
        `);
      } else if (data.type === 'SHOW_NOTIFICATION') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: data.title || 'تنبيه من ARCO HR',
            body: data.message || '',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
            channelId: NOTIFICATION_CHANNEL_ID,
            color: '#D4AF37',
          },
          trigger: null,
        });
      }
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#050505" translucent={false} />

      <View style={styles.container}>
        {/* WebView Container */}
        <WebView
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={styles.webView}
          containerStyle={styles.webViewContainer}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          originWhitelist={['*']}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          mixedContentMode="always"
          allowsBackForwardNavigationGestures={true}
          injectedJavaScriptBeforeContentLoaded={INJECTED_SESSION_HANDLER}
          onNavigationStateChange={(navState: WebViewNavigation) => setCanGoBack(navState.canGoBack)}
          onMessage={handleMessageFromWeb}
          onLoadEnd={handleWebLoadEnd}
          startInLoadingState={false}
          scalesPageToFit={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
        />

        {/* شاشة اللوجو المخصصة التي تظل ثابتة ومستمرة حتى يفتح الويب بالكامل */}
        {!isWebLoaded && (
          <Animated.View
            style={[
              styles.splashContainer,
              { opacity: splashFadeAnim },
            ]}
            pointerEvents="none"
          >
            <View style={styles.logoWrapper}>
              <Image
                source={{ uri: 'https://hr-amr.vercel.app/arco-logo.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const ANDROID_STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
    paddingTop: ANDROID_STATUS_BAR_HEIGHT,
  },
  container: {
    flex: 1,
    backgroundColor: '#050505',
    overflow: 'hidden',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  webView: {
    flex: 1,
    backgroundColor: '#050505',
    width: '100%',
    height: '100%',
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  logoWrapper: {
    width: width * 0.65,
    maxWidth: 260,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
});
