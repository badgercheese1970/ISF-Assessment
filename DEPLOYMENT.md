# Deployment Guide

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project: `phoenix-education-123`
- Authenticated with Firebase: `firebase login`

## Deploy to Firebase Hosting

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to assess site:**
   ```bash
   firebase deploy --only hosting:assess
   ```

3. **Deploy Firestore rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Full deployment:**
   ```bash
   firebase deploy
   ```

## Domain Setup

The app will be deployed as the `assess` hosting target on Firebase.

To set up a custom domain (`assess.isf.ltd`):

1. Go to Firebase Console → Hosting
2. Add custom domain
3. Follow DNS configuration instructions
4. Point to the `assess` site

## Environment Variables

### API Keys (already configured in code)

- **Companies House API:** Reads from `/home/moltbot/clawd/.secrets/companies-house-api.json`
- **Firebase:** Embedded in `src/firebase.ts`

### Service Account

For server-side operations (if needed), use:
- `/home/moltbot/clawd/.secrets/google-service-account.json`

## Post-Deployment

1. **Set up authentication:**
   - Enable Email/Password auth in Firebase Console
   - Create user accounts for ISF team members

2. **Test the app:**
   - Search for a school by name or URN
   - Run a full assessment
   - Generate and download a report

3. **Monitor:**
   - Check Firebase Console for usage
   - Review Firestore reads/writes
   - Check for any errors in browser console

## Firestore Setup

The app uses these collections:

### New collections (will be created automatically):
- `assess_reports` — Saved assessment reports
- `assess_users` — Authorized users

### Existing collections (READ ONLY):
- `send_local_authorities` — From SEND Insights
- `independent_schools` — From SEND Insights
- `isochrone_cache` — From SEND Insights

## Troubleshooting

### Build fails
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment fails
```bash
firebase login --reauth
firebase use phoenix-education-123
firebase deploy --only hosting:assess
```

### Data not loading
- Check Firestore rules are deployed
- Verify collections exist in Firebase Console
- Check browser console for errors

## Security Checklist

- ✅ Firestore rules prevent writing to existing collections
- ✅ New collections prefixed with `assess_`
- ✅ Authentication required for saving reports
- ✅ API keys properly secured
- ⚠️ Remember to enable Firebase Authentication before going live!

## Next Steps

1. Enable Firebase Authentication
2. Create user accounts
3. Deploy to production
4. Set up custom domain
5. Train users on the tool
