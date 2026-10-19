// Web version of app/src/screens/CameraScreen.tsx: the same screen (frame, X, shutter), with your computer's
// camera. whim asks first, in the frame, before the browser's own permission prompt; without a camera (or if it's
// blocked) the shutter picks a photo instead.
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoFrame } from '@/components/PhotoFrame';
import { ShutterButton } from '@/components/ShutterButton';
import { Text } from '@/components/Text';
import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { ACCENT, INK, PAPER } from '@/lib/colors';
import { CLOSE_ICON, EDGE, TAP, TOP_BUTTON_TOP, usePhotoFrame } from '@/lib/layout';
import { press } from '@/lib/press';

export function CameraScreen() {
  const insets = useSafeAreaInsets();
  const frame = usePhotoFrame();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setBusy(false);
      return () => setFocused(false);
    }, []),
  );

  const granted = !!permission?.granted;
  // not decided yet: whim asks in the frame first; the browser's prompt only comes after "Allow camera"
  const undecided = !!permission && !permission.granted && permission.canAskAgain;

  const openEditor = (uri: string) => router.push({ pathname: '/edit', params: { uri } });
  const pickPhoto = async () => {
    setBusy(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    setBusy(false);
    if (!result.canceled && result.assets[0]) openEditor(result.assets[0].uri);
  };

  const onShutter = async () => {
    if (busy) return;
    if (!granted || !ready || !cameraRef.current) return pickPhoto();
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      openEditor(photo.uri);
    } catch {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <PhotoFrame frame={frame} matte={PAPER}>
        {granted && focused ? (
          // the preview shows mirrored (like a mirror), but the photo is saved as the camera sees it, as on an iPhone
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" onCameraReady={() => setReady(true)} />
        ) : (
          <View style={styles.placeholder}>
            <DoodleIcon name="cameraButton" size={56} />
            {undecided ? (
              <>
                <Text style={styles.message}>whim would like to use your camera to snap a moment.</Text>
                <Pressable
                  onPress={requestPermission}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.allow, pressed && press.dim]}
                >
                  <Text style={styles.allowLabel}>Allow camera</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.message}>
                {permission ? 'Camera access is off. Tap the button to choose a photo instead.' : ' '}
              </Text>
            )}
          </View>
        )}
      </PhotoFrame>

      <Pressable
        onPress={() => router.dismissAll()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={({ pressed }) => [styles.close, { top: insets.top + TOP_BUTTON_TOP }, pressed && press.dim]}
      >
        <DoodleIcon name="close" size={CLOSE_ICON} />
      </Pressable>

      <ShutterButton variant="camera" onPress={onShutter} disabled={busy} accessibilityLabel={granted ? 'Take photo' : 'Choose photo'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  close: { position: 'absolute', left: EDGE, width: TAP, height: TAP, justifyContent: 'center' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  message: { color: INK, fontSize: 18, textAlign: 'center' },
  allow: { backgroundColor: ACCENT, borderRadius: TAP / 2, height: TAP, paddingHorizontal: 22, justifyContent: 'center' },
  allowLabel: { color: '#fff', fontSize: 17 },
});
