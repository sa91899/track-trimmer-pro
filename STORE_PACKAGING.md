# Store Packaging Guide

This document outlines the steps needed to package the Track Trimmer Pro app for distribution on Microsoft Store and Apple App Store.

## Prerequisites

### For Microsoft Store:
1. **Windows Developer Account** ($19 one-time or $99/year)
2. **Code Signing Certificate** (required for MSIX)
   - You can get one from:
     - DigiCert
     - Sectigo
     - Or use a self-signed certificate for testing
3. **Windows SDK** (for MSIX packaging)

### For Apple App Store:
1. **Apple Developer Account** ($99/year)
2. **macOS** (required for building Mac apps)
3. **Xcode** (for code signing and notarization)

## Building for Microsoft Store (MSIX)

### Step 1: Update package.json
The `msix` configuration in `package.json` needs to be updated with your actual publisher information:

```json
"msix": {
  "identityName": "YourPublisherName.AudioProcessor",
  "publisher": "CN=Your Publisher Name, O=Your Company, L=City, S=State, C=US",
  "publisherDisplayName": "Your Publisher Name"
}
```

### Step 2: Code Signing
1. Obtain a code signing certificate
2. Install it on your Windows machine
3. Update the build configuration with certificate details

### Step 3: Build MSIX Package
```bash
npm run build
```

The MSIX package will be in the `dist` folder.

### Step 4: Submit to Microsoft Store
1. Go to [Partner Center](https://partner.microsoft.com/dashboard)
2. Create a new app submission
3. Upload the MSIX package
4. Fill in app metadata, screenshots, descriptions
5. Submit for certification

## Building for Mac App Store

### Step 1: Update Entitlements
The `build/entitlements.mac.plist` file is already configured. For App Store distribution, you may need to adjust entitlements based on your app's needs.

### Step 2: Code Signing
1. In Xcode, go to Preferences > Accounts
2. Add your Apple Developer account
3. Download your certificates

### Step 3: Build Mac App
```bash
npm run build
```

### Step 4: Notarize (for distribution outside App Store)
If distributing outside the App Store, you'll need to notarize:
```bash
xcrun notarytool submit AudioProcessor.dmg --keychain-profile "AC_PASSWORD" --wait
```

### Step 5: Submit to App Store
1. Use Xcode or Transporter app
2. Create an app record in App Store Connect
3. Upload the app bundle
4. Submit for review

## Important Notes

### FFmpeg Licensing (LGPL)
Since FFmpeg is LGPL licensed:
1. You must provide source code or link to FFmpeg source
2. Users must be able to replace the FFmpeg binary
3. Include FFmpeg license information in your app
4. Consider including a LICENSE file with FFmpeg attribution

### Testing Before Submission
- Test on clean Windows/Mac systems
- Verify all features work
- Check file permissions
- Test with various audio formats
- Ensure proper error handling

### App Store Requirements
- **Microsoft Store**: App must pass Windows App Certification Kit
- **Apple App Store**: App must pass App Store review guidelines
- Both require privacy policy if collecting any data
- Both require proper app descriptions and screenshots

## Resources

- [Microsoft Store Documentation](https://docs.microsoft.com/en-us/windows/msix/)
- [Apple App Store Documentation](https://developer.apple.com/app-store/)
- [Electron Builder Documentation](https://www.electron.build/)




