import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoFrame } from '@/components/PhotoFrame';
import { ShutterButton } from '@/components/ShutterButton';
import { Text } from '@/components/Text';
import { PAPER } from '@/lib/colors';
import { CLOSE_ICON, EDGE, TAP, TOP_BUTTON_TOP, usePhotoFrame } from '@/lib/layout';
import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { press } from '@/lib/press';

// The Simulator has no camera, so the shutter opens the photo library there instead.
const HAS_CAMERA = Device.isDevice;

export function CameraScreen() {
  const insets = useSafeAreaInsets();
  const frame = usePhotoFrame();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  // the preview is unmounted while the edit screen is on top, so the camera isn't left running
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setBusy(false);
      return () => setFocused(false);
    }, []),
  );

  const useCamera = HAS_CAMERA && permission?.granted;

  const openEditor = (uri: string) => router.push({ pathname: '/edit', params: { uri } });

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) openEditor(result.assets[0].uri);
  };

  const onShutter = async () => {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!useCamera) {
      if (HAS_CAMERA && permission && !permission.granted && permission.canAskAgain) {
        await requestPermission();
        return;
      }
      setBusy(true);
      await pickFromLibrary();
      setBusy(false);
      return;
    }
    if (!ready || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      openEditor(photo.uri);
    } catch (e) {
      setBusy(false);
      Alert.alert("Couldn't Take Photo", (e as Error).message);
    }
  };

  let placeholder = 'No camera here. Tap the button to choose a photo.';
  if (HAS_CAMERA && permission && !permission.granted) {
    placeholder = permission.canAskAgain
      ? 'Tap the button to allow the camera.'
      : 'Camera access is off. Tap the button to choose a photo instead.';
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <PhotoFrame frame={frame} matte={PAPER}>
        {useCamera && focused ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />
        ) : (
          <View style={styles.placeholder}>
            <SymbolView name={HAS_CAMERA ? 'camera' : 'photo.on.rectangle'} size={36} tintColor="#aeaeb2" />
            <Text style={styles.placeholderText}>{placeholder}</Text>
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

      <ShutterButton variant="camera" onPress={onShutter} disabled={busy} accessibilityLabel={useCamera ? 'Take photo' : 'Choose photo'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  // just the X, in a full tap target
  close: { position: 'absolute', left: EDGE, width: TAP, height: TAP, justifyContent: 'center' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  placeholderText: { color: '#8e8e93', fontSize: 18, textAlign: 'center' },
});
