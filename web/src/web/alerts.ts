// React Native's Alert does nothing in a browser, so on the web its alerts use the browser's own dialogs:
// one button, a plain message; a choice (Cancel + something), OK/Cancel.
import { Alert, type AlertButton } from 'react-native';

Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  const text = message ? `${title}\n\n${message}` : title;
  const choices = buttons ?? [];
  if (choices.length < 2) {
    window.alert(text);
    choices[0]?.onPress?.();
    return;
  }
  const cancel = choices.find((b) => b.style === 'cancel') ?? choices[0];
  const action = choices.find((b) => b !== cancel) ?? choices[1];
  if (window.confirm(text)) action.onPress?.();
  else cancel.onPress?.();
};
