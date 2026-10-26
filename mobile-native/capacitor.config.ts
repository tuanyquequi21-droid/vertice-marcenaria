import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'br.com.verticemarcenaria.gestao',
  appName: 'Vértice Gestão',
  webDir: 'www',
  server: {
    url: 'https://tuanyquequi21-droid.github.io/vertice-marcenaria/mobile/',
    cleartext: false,
    androidScheme: 'https'
  },
  android: { allowMixedContent: false }
};
export default config;
