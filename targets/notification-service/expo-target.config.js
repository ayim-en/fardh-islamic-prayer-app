/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "notification-service",
  name: "NotificationService",
  deploymentTarget: "16.0",
  copyAssets: ["../../assets/audio/adhan_mishary_rashid_alafasy.caf"],
  buildSettings: {
    SWIFT_VERSION: "5.0",
    IPHONEOS_DEPLOYMENT_TARGET: "16.0",
  },
};