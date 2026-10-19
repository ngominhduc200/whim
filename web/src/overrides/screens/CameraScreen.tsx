// Web version of app/src/screens/CameraScreen.tsx: the same screen (frame, X, shutter), with your computer's
// camera, asked for (the browser's own prompt) as soon as the screen opens. Without a camera, or if it's blocked,
// the shutter picks a photo instead.
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoFrame } from '@/components/PhotoFrame';
import { ShutterButton } from '@/components/ShutterButton';
import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { PAPER } from '@/lib/colors';
import { CLOSE_ICON, EDGE, TAP, TOP_BUTTON_TOP, usePhotoFrame } from '@/lib/layout';
import { press } from '@/lib/press';
import { rememberGranted } from '@/web/permissions';

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
  // ask for the camera as soon as this screen opens (the browser shows its own prompt); once allowed, it's
  // remembered on this device so later visits go straight to asking the browser again, with nothing from whim
  const asked = useRef(false);
  useEffect(() => {
    if (!permission || permission.granted || asked.current || !permission.canAskAgain) return;
    asked.current = true;
    requestPermission();
  }, [permission, requestPermission]);
  useEffect(() => {
    if (granted) rememberGranted('camera');
  }, [granted]);

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
          <View style={styles.empty} />
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
  empty: { flex: 1 },
});
