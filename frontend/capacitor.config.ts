import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "com.v01dcallsign.schoolhq",
  appName: "School HQ",
  webDir: "out",
  backgroundColor: "#080a0f",
  ios: {
    backgroundColor: "#080a0f",
    contentInset: "never",
    preferredContentMode: "mobile",
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Native,
      style: KeyboardStyle.Dark,
      autoBackdropColor: "dom",
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#080a0fff",
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#080a0f",
      overlaysWebView: true,
      style: "DARK",
    },
  },
};

export default config;
